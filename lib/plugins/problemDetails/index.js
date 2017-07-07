'use strict';

const _ = require('lodash');
const handlers = require('./handlers');
const Problems = require('../../classes/Dynatrace/Problems');

function groupEvents(problem) {
  return _.groupBy(problem.rankedEvents, e => e.eventType);
}

class ProblemDetails {
  constructor(davis, options) {
    this.davis = davis;
    this.options = options;

    this.intents = {
      problemDetails: {
        skipHelp: true,
        usage: 'Problem details',
        examples: [
          'Tell me about the third problem.',
        ],
        phrases: [

        ],
        lifecycleEvents: [
          'problemDetails',
        ],
        clarification: 'I think you were asking about problem details.',
      },
    };

    this.hooks = {
      'problemDetails:problemDetails': this.problemDetails.bind(this),
    };
  }

  problemDetails(exchange, context) {
    const problems = context.problems;
    let choice = context.choice;
    let idx = -1;

    if (exchange.selected) {
      return this.reply(exchange, exchange.selected, context);
    }

    if (exchange.button) {
      const pid = context.button.value;

      if (pid === 'no') {
        choice = false;
      } else if (pid === 'yes') {
        choice = true;
      } else {
        return this.reply(exchange, pid, context);
      }
    }

    if (_.isNumber(choice)) {
      if (choice < problems.length) {
        idx = choice;
      } else {
        return exchange.response("There weren't that many problems.");
      }
    } else if (_.isBoolean(choice)) {
      if (!choice) {
        return exchange.response('OK, no problem.').end();
      } else if (problems.length === 1) {
        idx = 0;
      } else {
        return exchange.response('Which problem would you like to hear about?').skipFollowUp();
      }
    } else if (_.isString(choice)) {
      if (choice === 'middle') {
        idx = (problems.length / 2).toFixed() - 1;
      } else if (choice === 'last') {
        idx = problems.length - 1;
      }
    }

    if (idx !== -1) {
      const pid = problems[idx].id;
      return this.reply(exchange, pid, context);
    }

    return exchange.response("I'm not sure what problem you were trying to choose.").skipFollowUp();
  }

  reply(exchange, pid, context) {
    const paging = context.paging;
    const VB = this.davis.classes.VB;
    const th = this.davis.textHelpers;

    exchange.addContext({ pid });

    return this.davis.dynatrace.problemDetails(pid) // eslint-disable-line
      .then((problem) => {
        const say = [];
        const show = new VB.Message()
          .addText('Below are the problem details you requested');


        // Create cards for ranked events
        problem.groupedEvents = groupEvents(problem);
        const eventTypes = Object.keys(problem.groupedEvents);
        const roots = problem
          .rankedEvents
          .filter(e => e.isRootCause);

        const rootEventTypes = roots
          .map(e => e.eventType)
          .filter((value, i, self) => self.indexOf(value) === i);

        const impactLevel = problem.impactLevel;
        const titleEvent = _.find(problem.rankedEvents, { impactLevel });
        const eventType = titleEvent.eventType;
        say.push(`There is ${th.friendlyEventFirstAlias(eventType)}`);

        const events = _.map(eventTypes, (e) => {
          const base = handlers.DEFAULT(problem.groupedEvents[e]);
          const handler = _.get(handlers, e);
          if (handler) {
            const out = handler(problem.groupedEvents[e], base);
            out.show.setLink(this.davis.linker.event(problem, problem.groupedEvents[e][0]));
            return out;
          }
          this.davis.logger.debug(`No handler for ${e}. Using default.`);

          base.show.setLink(this.davis.linker.event(problem, problem.groupedEvents[e][0]));

          return base;
        });

        const rootEvents = _.map(rootEventTypes, (e) => {
          const base = handlers.DEFAULT(problem.groupedEvents[e]);
          const handler = _.get(handlers, e);
          if (handler) {
            const out = handler(problem.groupedEvents[e], base);
            out.show.setLink(this.davis.linker.event(problem, problem.groupedEvents[e][0]));
            return out;
          }
          this.davis.logger.debug(`No handler for ${e}. Using default.`);

          base.show.setLink(this.davis.linker.event(problem, problem.groupedEvents[e][0]));

          return base;
        });

        const eventCards = events.map(e => e.show);
        const eventSays = events.map(e => e.say);
        const rootEventSays = rootEvents.map(e => e.say);

        const summaryCard = new VB.Card()
          .setColor(problem.status)
          .addTitle(Problems.title(problem, this.davis))
          .setLink(this.davis.linker.problem(problem))
          .addField('Time Frame', new VB.TimeRange(problem, exchange.user.timezone, true), false);

        const affectedApps = this.affectedApps(problem, context);

        if (affectedApps.length > 0) {
          summaryCard
            .addField(
                'Applications Affected',
                affectedApps.map(e => e.display.visual)
                  .join('\n'),
                false);

          const sayApps = affectedApps.map(e => e.display.audible);
          if (problem.status === 'OPEN') {
            say.push('that is affecting');
          } else {
            say.push('that affected');
          }
          say.push(`${th.humanList(sayApps, 3)}`);
          if (affectedApps.length > 3) {
            say.push(`, and ${affectedApps.length - 3} other event types`);
          }
        }

        say.push(new VB.TimeRange(problem, exchange.user.timezone), '.');

        if (rootEventSays.length === 1) {
          say.push('The root cause was');
          say.push(rootEventSays[0]);

          if (eventSays.length - rootEventSays.length > 0) {
            say.push(', but there were', eventSays.length - rootEventSays.length, 'other event types as well.');
          } else {
            say.push('.');
          }
        } else if (rootEventSays.length > 1) {
          say.push('The root causes were');
          say.push(th.humanList(rootEventSays));

          if (eventSays.length - rootEventSays.length > 0) {
            say.push(', but there were', eventSays.length - rootEventSays.length, 'other event types as well.');
          } else {
            say.push('.');
          }
        }

        show
          .addCard(summaryCard)
          .addCard(eventCards);

        if (exchange.eligibleToPushLink()) {
          exchange.followUp('Would you like me to show you this problem in your browser?')
            .addContext({ targetIntent: 'pushLink' });
        } else if (context.paging) {
          exchange.followUp('Would you like to go back to the list?')
            .addContext({ targetIntent: 'showPage' });
        }

        if (paging && paging.intent === 'problemDetails') {
          const buttons = new VB.ButtonGroup('pageRoute')
            .addAction('Back', 'Back to List', paging.index);

          show.setButtons(buttons);
        }


        //if (roots.length === 0) {
          //exchange
            //.setLinkUrl(this.davis.linker.event(problem, problem.rankedEvents[0]));
        //} else {
        exchange
          .setLinkUrl(this.davis.linker.problem(problem));

        exchange
          .addContext({
            problem,
          })
          .response({ show: show.slack(), say: VB.stringify(say) }).smartEnd();
      });
  }

  affectedApps(problem, context) {
    const impactedEntities = problem.rankedEvents.map(e => e.entityId);
    const impactedApps = context.entities.applications.filter(e =>
        impactedEntities.indexOf(e.entityId) !== -1);
    return impactedApps; // .map(e => e.display.visual);
  }
}

module.exports = ProblemDetails;
