'use strict';

/**
 * The DavisWeather class is the core of the plugin and an
 * instance of DavisWeather is what will be loaded into Davis
 */
class Ymonitor {

  /**
   * The main body of work is done in the constructor.
   */
  constructor(davis, options) {
    this.davis = davis;
    this.options = options;

    // This is where we declare our intents.
    this.intents = {
      // Our intent name
    	Ymonitor: {
        // A basic description of the intent
        usage: 'Check Ymonitor alerts',

        // Phrases that will trigger our intent. Note that they will not
        // need to be matched exactly in order for the intent to run.
        phrases: [
          'What is the status of my ymonitor chains?',
          'Check the status of ymonitor',
          'How are my Ymonitor chains doing',
          'How is Ymonitor doing',
          'How are my applications doing',
        ],

        // Lifecycle Events are friendly names for the steps that an intent
        // needs to take in order to run successfully. For instance, our intent
        // will need to gather data from the weather underground API, then will
        // need to respond to the user, so I have broken it up into those events.
        lifecycleEvents: [
          'gatherData',
          'respond',
          ],
          clarification: 'I think you were asking about Ymonitor.',
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
      'Ymonitor:gatherData': (exchange, context) => null,
      'Ymonitor:respond': (exchange, context) => {
        const resp = 'Right now i cannot connect to ymonitor';

        exchange
          .response(resp) // respond to the user
          .smartEnd(); // end the conversation if appropriate
      },
    };
  }
}

// export the plugin so it can be used
module.exports = Ymonitor;