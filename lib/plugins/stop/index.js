'use strict';

const _ = require('lodash');
const phrases = require('./phrases');

class Stop {
  constructor(davis, options) {
    this.davis = davis;
    this.options = options;

    this.intents = {
      stop: {
        usage: 'Stop',
        skipHelp: true,
        examples: [
          'Davis, stop.',
          'Talk to you later.',
          'Good bye',
        ],
        phrases,
        lifecycleEvents: [
          'stop',
        ],
        regex: /^stop$/i,
      },

      timeout: {
        skipHelp: true,
        phrases: [],
        lifecycleEvents: [
          'timeout',
        ],
        regex: /^timeout$/,
      },
    };

    this.hooks = {
      'stop:stop': (exchange) => {
        exchange.resetContext();
        this.stop(exchange);
      },
      'timeout:timeout': this.stop.bind(this),
    };
  }

  stop(exchange) {
    this.davis.logger.debug('Ending the current conversation.');
    const response = _.sample([
      'Okay, have a good one.',
      'Talk to you later.',
      'See you later.',
      'Have a nice day.',
    ]);
    exchange.response(response).end();
  }
}

module.exports = Stop;
