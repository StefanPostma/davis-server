'use strict';

const moment = require('moment');

class CatchUp {
  constructor(davis, options) {
    this.davis = davis;
    this.options = options;

    this.intents = {
      catchUp: {
        usage: 'Catch up on recent issues',
        phrases: [
          'Catch me up on the latest problems.',
          'What happened since the last time I asked?',
          'what happened since the last time we talked?',
          'Any problems since the last time I asked?',
          'any problems since the last time we talked?',
        ],
        lifecycleEvents: [
          'catchUp',
        ],
        regex: /^catch me up/i,
        clarification: 'I think you were asking about recent issues?',
      },
    };

    this.hooks = {
      'catchUp:catchUp': this.catchUp.bind(this),
    };
  }

  catchUp(exchange) {
    const lastProblemTS = exchange.user.lastProblemTS || moment().subtract(2, 'days').toDate();
    const startTime = moment(lastProblemTS).valueOf();
    const stopTime = moment().add(1, 'minute').valueOf();

    exchange.forceTimeRange({ startTime, stopTime });

    return this.davis.pluginManager.run(exchange, 'problem');
  }
}

module.exports = CatchUp;
