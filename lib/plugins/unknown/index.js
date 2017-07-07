'use strict';

const _ = require('lodash');

class Unknown {
  constructor(davis, options) {
    this.davis = davis;
    this.options = options;

    this.intents = {
      unknown: {
        skipHelp: true,
        usage: 'Default intent if no others are matched',
        phrases: [],
        lifecycleEvents: [
          'unknown',
        ],
      },

      didYouMean: {
        usage: 'Run intent confirmed by user',
        phrases: [],
        lifecycleEvents: [
          'run',
        ],
      },
    };

    this.hooks = {
      'unknown:unknown': this.unknown.bind(this),
      'didYouMean:run': (exchange, context) => {
        exchange.modifiedRequest = context.oldRawRequest;
        exchange.addNlpData(context.oldNlp);
        return (context.choice) ?
        this.davis.pluginManager.run(exchange, context.mostLikely, true) :
        this.davis.pluginManager.run(exchange, 'stop');
      },
    };
  }

  unknown(exchange) {
    const previousIntent = _.get(exchange, 'history.lastInteraction.request.analysed.intent');

    const nlp = exchange.getNlpData();
    const mostLikely = nlp.probabilities[0];
    if (mostLikely && mostLikely.value > 0.7 && mostLikely.label !== 'routing') {
      const intent = this.davis.pluginManager.getIntent(mostLikely.label);
      const msg = _.get(intent, 'clarification', `I think you meant ${mostLikely.label}.`);
      exchange
        .addContext({
          targetIntent: 'didYouMean',
          mostLikely: mostLikely.label,
          oldNlp: exchange.getNlpData(),
          oldRawRequest: exchange.getRawRequest(),
        })
        .response(msg)
        .followUp('Is that correct?');
      return;
    }

    if (previousIntent === 'unknown') {
      exchange
        .addContext({ targetIntent: 'help' })
        .response("Unfortunately, I'm still a bit confused.")
        .followUp('Would you be interested in hearing about my current area of expertise?');
    } else {
      const excuse = _.sample([
        "I'm sorry but I didn't quite understand what you were asking.",
        'I know a lot, about a little!  Please, go easy on me.',
        "I don't know how to respond to this... yet!",
        "Hmmm, I'm not sure how to respond to that.",
        "Sorry, I didn't understand the question.",
        "My apologies but I don't know how to help with that at the moment.",
        "Sorry, I can't help with that yet.",
        "Sorry, I'm not sure how to help.",
      ]);

      exchange
        .response(excuse)
        .skipFollowUp();
    }
  }
}

module.exports = Unknown;
