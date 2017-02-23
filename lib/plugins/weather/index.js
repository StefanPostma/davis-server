'use strict';

const rp = require('request-promise');
const API_KEY = '2701dc6f37f85e7d';

/**
 * The DavisWeather class is the core of the plugin and an
 * instance of DavisWeather is what will be loaded into Davis
 */
class Weather {

  /**
   * The main body of work is done in the constructor.
   */
  constructor(davis, options) {
    this.davis = davis;
    this.options = options;

    // This is where we declare our intents.
    this.intents = {
      // Our intent name
    	Weather: {
        // A basic description of the intent
        usage: 'Check the weather in Utrecht',

        // Phrases that will trigger our intent. Note that they will not
        // need to be matched exactly in order for the intent to run.
        phrases: [
          'What is the weather like in Utrech?',
          'Check the weather in Utrecht',
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
    
    		'davisWeather:gatherData': (exchange, context) => {
    			  // Weather Underground API options
    			  const opts = {
    			    uri: `http://api.wunderground.com/api/${API_KEY}/conditions/q/MI/Utrecht.json`,
    			    json: true,
    			  }

    			  // Hooks can optionally return a promise. The next hook will not run until
    			  // the returned promise is resolved or rejected.
    			  return rp(opts)
    			    .then(resp => {
    			      // Here we add the weather data to the context object. The conversation
    			      // context survives accross multiple exchanges, making it useful for
    			      // communicating data between hooks.
    			      exchange.addContext({
    			        weather: resp['current_observation'],
    			      })
    			    })
    		},
    			
    			
    		'davisWeather:respond': (exchange, context) => {
    			// Building the weather output.
    			let out = 'The weather in Utrecht is currently ';
    			out += context.weather.weather;
    			out += ' with a temperature of ';
    			out += context.weather.temp_f;
    			out += ' degrees, and a ';
    			out += context.weather.wind_string;
    			out += ' wind out of the ';
    			out += context.weather.wind_dir;
    			out += '.';

    			exchange
    			  .response(out) // respond to the user
    			  .smartEnd(); // end the conversation if appropriate
    			},
    };
  }
}

// export the plugin so it can be used
module.exports = Weather;