'use strict';

const _ = require('lodash');
const moment = require('moment-timezone');

const MINUTES_BETWEEN_HELP = 120;

const thingsToTry = [
  'Try asking if there were any problems yesterday',
  'Try asking me about user activity',
  'Try asking if there are any open issues',
];

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
          'hey',
          'hi',
          'yo',
        ],
        lifecycleEvents: [
          'launch',
        ],
        regex: /^(davis|(hey|hi|launch|start|ask)( davis))?$/i,
        clarification: 'It sounds like you wanted to chat.',
      },
    };

    this.hooks = {
      'launch:launch': this.launch.bind(this),
    };
  }

  launch(exchange) {
    const phrase = _.sample([
      "What's up?",
      'How can I be of service?',
      'How can I help you?',
    ]);

    const extendedPhrase = `Hello, I'm davis. ${phrase} ${_.sample(thingsToTry)}, or say 'help' for more options.`;

    // Determines how long ago we talked
    const lastTime = moment(_.get(exchange, 'history.lastInteraction.updatedAt', 0));
    const diff = moment().diff(lastTime, 'minutes');

    const response = (diff > MINUTES_BETWEEN_HELP) ?
      extendedPhrase :
      phrase;

    exchange
      .response(response)
      .skipFollowUp();
  }
}

module.exports = Launch;
