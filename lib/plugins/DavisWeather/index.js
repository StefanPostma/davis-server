'use strict';

/**
 * The DavisWeather class is the core of the plugin and an
 * instance of DavisWeather is what will be loaded into Davis
 */
class DavisWeather {

  /**
   * The main body of work is done in the constructor.
   */
  constructor(davis, options) {
    this.davis = davis;
    this.options = options;

    // This is where we declare our intents.
    this.intents = {
      // Our intent name
      davisWeather: {
        // A basic description of the intent
        usage: 'Check the weather in Detroit',

        // Phrases that will trigger our intent. Note that they will not
        // need to be matched exactly in order for the intent to run.
        phrases: [
          'What is the weather like in Detroit?',
          'Check the weather in Detroit',
        ],

        // Lifecycle Events are friendly names for the steps that an intent
        // needs to take in order to run successfully. For instance, our intent
        // will need to gather data from the weather underground API, then will
        // need to respond to the user, so I have broken it up into those events.
        lifecycleEvents: [
          'gatherData',
          'respond',
        ],
      },
    };

    // Hooks give intents functionality.
    // They are called serially when an intent is run.
    // They are named using the 'intentName:lifecycleEvent'
    // Each hook is called with 2 arguments: the exchange object,
    // and a context object. The exchange object is the primary
    // interface between Davis, a user, and a plugin. The context
    // object holds any state carried over from previous exchanges.
    this.hooks = {
      'davisWeather:gatherData': (exchange, context) => null,
      'davisWeather:respond': (exchange, context) => {
        const resp = 'Right now the weather intent does nothing.';

        exchange
          .response(resp) // respond to the user
          .smartEnd(); // end the conversation if appropriate
      },
    };
  }
}

// export the plugin so it can be used
module.exports = DavisWeather;