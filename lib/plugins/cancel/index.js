'use strict';

class Cancel {
  constructor(davis, options) {
    this.davis = davis;
    this.options = options;

    this.intents = {
      cancel: {
        skipHelp: true,
        usage: 'Cancel',
        phrases: [
          'cancel',
          'never mind',
          'nevermind',
          'forget it',
        ],
        lifecycleEvents: [
          'cancel',
        ],
        regex: /^cancel$/i,
      },
    };

    this.hooks = {
      'cancel:cancel': this.cancel.bind(this),
    };
  }

  cancel(exchange) {
    this.davis.logger.debug('Cancelling the current conversation.');

    return this.davis.pluginManager.run(exchange, 'stop');
  }
}

module.exports = Cancel;
