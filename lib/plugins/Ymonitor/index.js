'use strict';

const rp = require('request-promise');
const _ = require('lodash');
var token = '';
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
          'Check the status in ymonitor',
          'How are my Ymonitor chains doing',
          'How is Ymonitor doing',
          'How are my applications doing',
        ],

        // Lifecycle Events are friendly names for the steps that an intent
        // needs to take in order to run successfully. For instance, our intent
        // will need to gather data from the weather underground API, then will
        // need to respond to the user, so I have broken it up into those events.
        lifecycleEvents: [
          'authenticate',
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
    		'Ymonitor:authenticate': (exchange, context) => {
  			  // request token from Ymonitor API
  			  const opts = {
  			    method: 'POST',
  			    uri: `https://api.ymonitor.nl/authenticate`,
  			    headers: {
  			    	'Content-Type': 'application/json',
  			    	'Accept': 'application/json'
  			    },
  			    body: {
  			    	"username": "DavisUser", "password":"D@visForYmor2017"
  			    },
  			    json: true,
  			  }

  			  // Hooks can optionally return a promise. The next hook will not run until
  			  // the returned promise is resolved or rejected.
  			  return rp(opts)
  			    .then(resp => {
  			      // Here we add the weather data to the context object. The conversation
  			      // context survives accross multiple exchanges, making it useful for
  			      // communicating data between hooks.
  			    	this.token = resp['token']
  			    	
  			  //  exchange.addContext({
  			  //      weather: resp['current_observation'],
  			  //    })
  			    	
  			    })
  			  .catch(function (err) {
  				  davis.logger.debug('API call failed due to Ymonitor API not available.'); 
  		    })
  		},
  		
  		'Ymonitor:gatherData': (exchange, context) => {
			  // Weather Underground API options
			  const opts = {
				method: 'GET',
				uri: `https://api.ymonitor.nl/ketens`,
					headers: {
						'authToken':  this.token
		  			    	
		  			 },
		  		json: true,
		  	}
			  // Hooks can optionally return a promise. The next hook will not run until
			  // the returned promise is resolved or rejected.
			  return rp(opts)
			    .then(resp => {
			      // Here we add the weather data to the context object. The conversation
			      // context survives accross multiple exchanges, making it useful for
			      // communicating data between hooks.
			      
			      var myJson = context.keten;
			      var data = JSON.parse(myJson); // you missed that...
			      for(var i = 0; i < data.length; i++) {
			    	  exchange.addContext({
					        id: data[i].id,
					        displayName: data[i].displayName,
					      })
			      }
			    //  var stringAnwser = JSON.stringify(context.keten);
			      //davis.logger.debug(stringAnwser);
			      //
			    })
		},
  			
		
      'Ymonitor:respond': (exchange, context) => {
        let out = 'i found the ';
		out += context.displayName;
		out += ' chain but ';
		out += 'i forgot the rest';
		out += '.';

		exchange
		  .response(out) // respond to the user
		  .smartEnd(); // end the conversation if appropriate
		},
    };
  }
}

// export the plugin so it can be used
module.exports = Ymonitor;