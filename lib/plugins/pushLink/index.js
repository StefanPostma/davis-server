'use strict';

const BbPromise = require('bluebird');
const _ = require('lodash');

class PushLink {
  constructor(davis, options) {
    this.davis = davis;
    this.options = options;

    this.intents = {
      showMe: {
        usage: 'Push link to browser',
        lifecycleEvents: [
          'showMe',
        ],
        phrases: [
          'Push that to my browser.',
          'Show me in my browser.',
          'Send me that link.',
          'Show me that link.',
          'Send that to my browser.',
          'open dynatrace',
          'display dynatrace',
          'show me dynatrace',
          'show dynatrace',
          'display dynatrace',
          'dynatrace dashboard',
          'open dashboard',
          'show dashboard',
          'show me the root cause',
          'open root cause',
          'display root cause',
        ],
        regex: /^show me|^open /i,
        clarification: 'I think you were asking me to send a link to your browser.',
      },
      pushLink: {
        skipHelp: true,
        usage: 'Push link to user via socket to Chrome extension',
        lifecycleEvents: [
          'pushLink',
        ],
        phrases: [],
      },
    };

    this.hooks = {
      'showMe:showMe': (exchange) => {
        exchange.addContext({ choice: true });
        return this.davis.pluginManager.run(exchange, 'pushLink');
      },
      'pushLink:pushLink': this.pushLink.bind(this),
    };
  }

  pushLink(exchange, context) { // eslint-disable-line consistent-return
    const raw = exchange.getRawRequest();
    const choice = context.choice;
    const linkUrl = exchange.getLinkUrl();

    // data extraction
    const vrp = /resolution path|vrp/i.test(raw);
    const system = /system|smart/i.test(raw);
    const dynatrace = /dashboard|dynatrace|d(i|y).{0,10}trace/i.test(raw);
    const rootcause = /root cause|rootcause|root|cause/i.test(raw);
    const list = /list/i.test(raw);
    const router = this.davis.pluginManager.getIntent('routing').regex.test(raw);

    if (router) {
      return this.davis.pluginManager.run(exchange, 'routing');
    }

    if (list) {
      if (context.paging) {
        return this.davis.pluginManager.run(exchange, 'showPage');
      }

      return exchange.response('There is currently nothing to list.');
    }

    if (!this.davis.server.isSocketConnected(exchange.user)) {
      return exchange.response("Unfortunetly, it appears that you don't have the Voice Navigator (Chrome extension) enabled. Look for a download link under the Chrome section in the Davis account settings. For more information, see the davis GitHub wiki on enabling the Voice Navigator.");
    }

    if (_.isNil(choice)) {
      if (vrp) {
        // user asked about visual resolution path

        if (!context.pid) {
          return exchange.response("I'm not sure which problem you are referring to.");
        }
        return this.davis.dynatrace.problemDetails(context.pid)
          .then((detail) => {
            if (!detail.rankedEvents[0].isRootCause) {
              return exchange.response("I'm sorry, I can only show you the visual resolution path for problems that have detected root causes.");
            }

            this.davis.server.pushLinkToUser(exchange.user, this.davis.linker.vrp(context.pid), true);
            return exchange.response(`Here is the visual resolution path for problem ${detail.displayName}.`);
          });
      } else if (system) {
        // user asked about their system

        this.davis.server.pushLinkToUser(exchange.user, this.davis.linker.smartScape(), true);
        return BbPromise.all([
          exchange.davis.dynatrace.getApplicationEntities(),
          exchange.davis.dynatrace.getServiceEntities(),
          exchange.davis.dynatrace.getInfrastructureEntities(),
        ]).spread((applications, services, hosts) => {
          const numOfApps = _.filter(applications, app => app.applicationType !== 'SYNTHETIC').length;
          const numOfServices = services.length;
          const numOfHosts = hosts.length;
          const app = (numOfApps === 1) ? 'application' : 'applications';
          const service = (numOfServices === 1) ? 'service' : 'services';
          const host = (numOfHosts === 1) ? 'host' : 'hosts';
          return exchange.response(`Okay, here is your Dynatrace SmartScape.  Currently, it includes ${numOfApps} active ${app} consisting of around ${numOfServices} ${service} across ${numOfHosts} ${host}!`);
        });
      } else if (dynatrace) {
        // user asked to open dynatrace

        this.davis.server.pushLinkToUser(exchange.user, this.davis.linker.home(), true);
        return exchange.davis.dynatrace.problemStatus()
          .then((problems) => {
            const currentProblemCount = problems.result.totalOpenProblemsCount;
            const phrase = "Okay, no problem, here's your Dynatrace dashboard.";
            if (currentProblemCount === 0) {
              return exchange.response(`${phrase}  Good news!  It looks like there are no active issues.`);
            } else if (currentProblemCount === 1) {
              return exchange
                .setTarget('problem')
                .response(phrase)
                .followUp('Would you like to investigate the open issue?');
            }
            return exchange
              .setTarget('problem')
              .response(phrase)
              .followUp(`Would you like to investigate the ${currentProblemCount} active issues?`);
          });
      } else if (rootcause) {
        // user asked to open root cause

        if (!context.pid) {
          return exchange.response("I'm not sure which problem you are referring to.");
        }
        return this.davis.dynatrace.problemDetails(context.pid)
          .then((detail) => {
            if (!detail.rankedEvents[0].isRootCause) {
              return exchange.response("This problem doesn't appear to have a detected root cause.");
            }

            this.davis.server.pushLinkToUser(exchange.user, this.davis.linker.rootCause(detail), true);
            return exchange.response("Got it, here's some details about this problem's root cause.");
          });
      }

      if (linkUrl) {
        this.davis.server.pushLinkToUser(exchange.user, linkUrl, true);
        return exchange.response("I'm sending the link to you now!").end();
      }
      return exchange.response("I couldn't find a link to send you.");
    }

    // user gave a yes/no answer
    if (_.isBoolean(choice)) {
      if (choice) { // user said yes
        if (_.isNil(linkUrl)) {
          this.davis.logger.warn('linkUrl undefined');
          exchange.response('Sorry, the link is unavailable.');
        } else {
          this.davis.server.pushLinkToUser(exchange.user, linkUrl, true);
          exchange.response("I'm sending the link to you now!").end();
        }
      } else { // user said no
        exchange
          .addContext({ targetIntent: 'problemDetails' })
          .response('OK, no problem.')
          .followUp('Would you like to hear about another problem?');
      }
    } else if (!_.isNil(choice)) {
      // if user didn't answer yes or no, did they mean to ask about another problem?
      return this.davis.pluginManager.run(exchange, 'problemDetails');
    }
  }
}

module.exports = PushLink;
