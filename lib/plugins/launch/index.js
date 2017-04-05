'use strict';

const _ = require('lodash');

class Launch {
  constructor(davis, options) {
    this.davis = davis;
    this.options = options;

    this.intents = {
      launch: {
        skipHelp: true,
        usage: 'Launch Davis',
        phrases: [
          'davis',
          'hey davis',
          'hi davis',
          'launch',
          "let's get started",
          'start davis',
          'start',
          'hello',
          'start romy',
          'Hi romy',
          'hey romy',
          'Yrik',
          'hi Yrik',
          'Hi Yrika',
          'Yron',
          'hi Yron',
          'Hey Yron',
        ],
        lifecycleEvents: [
          'launch',
        ],
        regex: /^(davis|(hey|hi|launch|start|ask)( davis))?$/i,
      },
    };

    this.hooks = {
      'launch:launch': this.launch.bind(this),
    };
  }

  launch(exchange) {
    const response = _.sample([
      "What's up?",
      'How can I be of service?',
      'How can I help you?',
    ]);

    exchange
      .greet()
      .response(response)
      .skipFollowUp();
  }
}

module.exports = Launch;
