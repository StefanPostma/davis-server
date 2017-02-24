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
        usage: 'Check Ymonitor',

        // Phrases that will trigger our intent. Note that they will not
        // need to be matched exactly in order for the intent to run.
        phrases: [
          'Which applications are in ymonitor?',
          'What is the status of my ymonitor chains?',
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
			      
			    	exchange.addContext({ketens : resp['keten'] ,})
			    	davis.logger.debug("Got the following respond from Ymonitor: " + JSON.stringify(resp['keten']));
			     
			    
			      
			    //  var stringAnwser = JSON.stringify(context.keten);
			      //davis.logger.debug(stringAnwser);
			      //
			    })
		},
  			
		
      'Ymonitor:respond': (exchange, context) => {
    	  const choice = context.choice;
    	 exchange.addContext({ targetIntent: 'giveChainOverview' });
    	  let out = '';
    	  for(var myKey in context.ketens) {
    		  davis.logger.debug(context.ketens.length);
    		  out += 'You have '
    	      out += context.ketens.length;
    		  out += ' chains in Ymonitor';
    		  exchange
    		  .response(out)
    		  .followUp('Would you like to know more?');
    		  
    		  davis.logger.debug("key:"+myKey+", value:"+JSON.stringify(context.ketens[myKey]));
	    	  var data = context.ketens[myKey]; // you missed that...
	    	  davis.logger.debug(data.displayName);
	    	  out += data.displayName;
	    	  out += " and the ";
	    	}
    	  
		out += '.';

		//exchange
		 // .response(out) // respond to the user
		//  .smartEnd(); // end the conversation if appropriate
		},
		
		'Ymonitor:giveChainOverview': this.giveChainOverview.bind(this),
		
    };
  }

  giveChainOverview(exchange, context) {
	  if (_.isBoolean(choice)) {
	      if (choice) { // user said yes
	          exchange.response("I'm sending the information to you now!");
	      } else { // user said no
	        exchange
	         // .addContext({ targetIntent: 'problemDetails' })
	          .response('OK, no problem.')
	          .followUp('Would you like to hear a joke?');
	      }
	    } else if (!_.isNil(choice)) {
	      // if user didn't answer yes or no, did they mean to ask about another problem?
	     // return this.davis.pluginManager.run(exchange, 'problemDetails');
	    	 exchange
	         // .addContext({ targetIntent: 'problemDetails' })
	          .response('Nothing to see here!').end();
	    }
	 
  }
}



// export the plugin so it can be used
module.exports = Ymonitor;