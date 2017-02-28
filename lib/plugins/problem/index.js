'use strict';

const _ = require('lodash');

class Problem {
  constructor(davis, options) {
    this.davis = davis;
    this.options = options;

    this.intents = {
      problem: {
        title: 'Discover problems',
        usage: 'Ask about current or historical problems',
        examples: [
          'What happened yesterday?',
          'What is happening?',
          'Are there any capacity issues right now?',
        ],
        phrases: [
          "what's up?",
          'what is up?',
          "How's {{APP}} doing?",
          'any issues',
          'Are there any issues at the moment?',
          'Are there any on going issues?',
          'Did anything happen to {{APP}} {{DATETIME}}?',
          'Did anything happen to {{APP}}?',
          'Did anything happen with {{APP}} {{DATETIME}}?',
          'Did anything happen {{DATETIME}}',
          'Did anything happen',
          'Did anything happened to {{APP}} {{DATETIME}}?',
          'did anything happened {{DATETIME}}?',
          'what happened with {{APP}} {{DATETIME}}',
          'What happened {{DATETIME}} with {{APP}}?',
          'What happened {{DATETIME}}?',
          'Are there any capacity issues?',
          'Are there any capacity issues {{DATETIME}}?',
          'Are there any capacity issues affecting {{APP}}?',
          'Are there any scalability issues?',
          'Are there any scalability issues {{DATETIME}}?',
          'Are there any scalability issues affecting {{APP}}?',
          'How is my application scaling?',
          'How is {{APP}} scaling?',
          "How's my application scaling?",
          "How's {{APP}} scaling?",
          "How's my app scaling?",
          'how are we scaling {{DATETIME}}?',
          'Tell me about the latest problem.',
          'What was the most recent issue?',
          'What was the latest problem?',
        ],
        lifecycleEvents: [
          'gatherData',
          'decide',
          'problem',
        ],
        nlp: true,
        clarification: 'I think you were asking about problems.',
      },
    };

    this.hooks = {
      'problem:gatherData': this.gatherData.bind(this),
      'problem:problem': this.problem.bind(this),
    };
  }

  gatherData(exchange) {	
	const th = this.davis.textHelpers;
    const isInfra = /infrastructure|scalability|scaling|capacity/i.test(exchange.getRawRequest());
    const isLast = /(last|most recent|latest) (issue|problem)/i.test(exchange.getRawRequest());
    const tense = this.davis.utils.getTense(exchange);

    const eContext = {
      isLast,
      tense,
      category: (isInfra) ? 'INFRASTRUCTURE' : null,
    };

    exchange.addExchangeContext(eContext);

    exchange
      .setTarget('problemDetails');

    if (isLast) {
      return this.davis.dynatrace.getFilteredProblemsDay(exchange)
        .then((ret) => {
          const problems = ret.toArray();
          const lastProblem = problems.slice(0, 1);
          exchange
            .addContext({ problems: lastProblem });
        });
    }

    exchange
      .setLinkUrl(th.buildProblemsUrl(null, exchange.getTimeRange()));

    return this.davis.dynatrace.getFilteredProblems(exchange)
      .then((ret) => {
        let problems = ret.toArray();
        problems = (isInfra) ?
          _.filter(problems, p =>
            p.impactLevel === 'APPLICATION' &&
            p.affectedCounts.INFRASTRUCTURE + p.recoveredCounts.INFRASTRUCTURE > 0) : problems;

        exchange
          .addContext({ problems });
      });
  }

  problem(exchange, context) {
    const VB = this.davis.classes.VB;
    const nlp = exchange.getNlpData();
    const app = nlp.app.name;
    this.davis.logger.debug('the current NLP : ' + JSON.stringify(nlp));
	// end custom
    const dateRange = new VB.TimeRange(nlp.timeRange, exchange.user.timezone);

    const problems = _.map(context.problems, problem =>
        this.problemSummary(problem, exchange, context));

    if (context.tense === 'future') {
      return exchange.response("I can't see the future yet!").smartEnd();
    }

    if (context.isLast) {
      if (context.problems.length > 0) {
        exchange.selected = context.problems[0].id;
        exchange.addContext({ paging: null });
        return this.davis.pluginManager.run(exchange, 'problemDetails');
      }

      return (app) ?
        exchange.response(`There were no recent issues affecting ${app}.`).smartEnd() :
        exchange.response('There were no recent issues.').smartEnd();
    }

    let leadArr;

    const problemsLink = this.problemsLink(problems, exchange.getTimeRange(), context.category);

    if (context.problems.length === 0) {
      if (context.tense === 'present') {
        if (app) {
          leadArr = ['Looks like', problemsLink, 'are affecting', app, 'right now.'];
        } else {
          leadArr = ['Looks like', problemsLink, 'are occurring right now.'];
        }
        const out = {
          text: VB.stringify(leadArr),
          show: new VB.Message().addText(leadArr).setFiltered(exchange.filtered),
        };
        return exchange.response(out).smartEnd();
      }

      if (app) {
        leadArr = ['Looks like', problemsLink, 'affected', app, dateRange, '.'];
      } else {
        leadArr = ['Looks like', problemsLink, 'occurred', dateRange, '.'];
      }
      const out = {
        text: VB.stringify(leadArr),
        show: new VB.Message().addText(leadArr).setFiltered(exchange.filtered),
      };
      return exchange.response(out).smartEnd();
    } else if (context.problems.length === 1) {
      if (context.tense === 'present') {
        if (app) {
          leadArr = ['Looks like', problemsLink, 'is affecting', app, 'right now.'];
        } else {
          leadArr = ['Looks like', problemsLink, 'is occurring right now.'];
        }
      } else if (app) {
        leadArr = ['Looks like', problemsLink, 'affected', app, dateRange, '.'];
      } else {
        leadArr = ['Looks like', problemsLink, 'occurred', dateRange, '.'];
      }
    } else if (context.tense === 'present') {
      if (app) {
        leadArr = ['Looks like', problemsLink, 'are affecting', app, 'right now.'];
      } else {
        leadArr = ['Looks like', problemsLink, 'are occurring right now.'];
      }
    } else if (app) {
      leadArr = ['Looks like', problemsLink, 'affected', app, dateRange, '.'];
    } else {
      leadArr = ['Looks like', problemsLink, 'occurred', dateRange, '.'];
    }

    if (context.problems.length > 4) {
      leadArr.push('After giving it some thought, I think you should check out these three issues first.');
    }

    const lead = {
      show: new VB.Card().addText(leadArr),
      text: VB.stringify(leadArr),
    };

    lead.show.setFiltered(exchange.filtered);

    lead.show = lead.show.slack();

    exchange
      .addContext({
        paging: {
          lead,
          intent: 'problemDetails',
          index: 0,
          items: problems,
        },
      });

    return this.davis.pluginManager.run(exchange, 'showPage');
  }

  problemSummary(problem, exchange, context) {
    const id = problem.id;
    const VB = this.davis.classes.VB;
    const th = this.davis.textHelpers;
    const isOpen = problem.status === 'OPEN';

    const applications = context.entities.applications;
    const services = context.entities.services;

    const affectedEntities = problem.rankedImpacts.map(e =>
        e.entityId);


    const affectedApps = applications.filter(e =>
        affectedEntities.indexOf(e.entityId) !== -1);

    const affectedServices = services.filter(e =>
        affectedEntities.indexOf(e.entityId) !== -1);

    const appsText = affectedApps.map((app) => {
      const visual = app.display.visual;
      return visual;
    });

    const servicesText = affectedServices.map((service) => {
      const visual = service.display.visual;
      return th.stripPorts(visual);
    });

    const topEvent = th.eventTitle(problem.rankedImpacts[0]);
    const timeFrame = new VB.TimeRange(problem, exchange.user.timezone, true);
    const problemTitle = th.problemTitle(problem, appsText);

    const show = new VB.Card()
      .setColor(problem.status)
      .addTitle(problemTitle)
      .setLink(th.buildProblemUrl(problem))
      .addField('Time Frame', timeFrame)
      .addField('Top Event', topEvent, true);

    if (affectedApps.length > 0) {
      show.addField('Affected Applications', appsText.slice(0, 3).join('\n'), true);
    } else if (affectedServices.length > 0) {
      show.addField('Affected Services', servicesText.slice(0, 3).join('\n'), true);
    }

    const text = [th.friendlyEventFirstAlias(problem.rankedImpacts[0].eventType)];

    if (!isOpen) {
      if (appsText.length > 0) {
        text.push(`that affected ${appsText[0]}`);
        if (appsText.length > 1) {
          const others = appsText.length - 1;
          text.push(`and ${others} other${(others > 1) ? 's' : ''}.`);
        } else {
          text.push('.');
        }
      } else if (servicesText.length > 0) {
        text.push(`that affected ${servicesText[0]}`);
        if (servicesText.length > 1) {
          const others = servicesText.length - 1;
          text.push(`and ${others} other${(others > 1) ? 's' : ''}.`);
        } else {
          text.push('.');
        }
      } else {
        text.push('.');
      }
    } else if (appsText.length > 0) {
      text.push(`that is currently affecting ${appsText[0]}`);
      if (appsText.length > 1) {
        const others = appsText.length - 1;
        text.push(`and ${others} other${(others > 1) ? 's' : ''}.`);
      } else {
        text.push('.');
      }
    } else if (servicesText.length > 0) {
      text.push(`that is currently affecting ${servicesText[0]}`);
      if (servicesText.length > 1) {
        const others = servicesText.length - 1;
        text.push(`and ${others} other${(others > 1) ? 's' : ''}.`);
      } else {
        text.push('.');
      }
    } else {
      text.push('is currently ongoing but not affecting any applications.');
    }

    return {
      intent: 'problemDetails',
      show: show.slack(),
      text: VB.stringify(text),
      id,
    };
  }

  problemsLink(problems, timeRange, category) {
    const VB = this.davis.classes.VB;
    const num = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'][problems.length] || problems.length;
    const s = (num !== 'one') ? 's' : '';
    const url = this.davis.textHelpers.buildProblemsUrl(null, timeRange);
    const text = (category) ?
      `${num} ${category.toLowerCase()} related problem${s}` :
      `${num} problem${s}`;
    return new VB.Link(url, text);
  }
}

module.exports = Problem;

