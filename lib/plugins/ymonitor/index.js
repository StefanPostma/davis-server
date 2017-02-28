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
	  const configObject = options || {};
	  this.apps = configObject.apps || [];
	  this.davis.logger.debug('the apps in the config : ' + JSON.stringify(apps));

    // This is where we declare our intents.
    this.intents = {
      // Our intent name
    	ymonitor: {
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
          'How is {{APP}} doing in ymonitor',
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
        giveChainOverview: {
            skipHelp: true,
            usage: 'this item will give an textual overview of all you chains',
            lifecycleEvents: [
              'giveChainOverview',
            ],
            phrases: [],
          },
          giveMoreInfoAboutApplication: {
              skipHelp: true,
              usage: 'this item will give an textual overview of all you chains',
              lifecycleEvents: [
                'giveMoreInfoAboutApplication',
              ],
              phrases: [],
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
    
    		'ymonitor:authenticate': (exchange, context) => {
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
  			  return rp(opts)
  			    .then(resp => {
  			    	this.token = resp['token']
  			    })
  			  .catch(function (err) {
  				  davis.logger.debug('API call failed due to Ymonitor API not available.'); 
  		    })
  		},
  		
  		'ymonitor:gatherData': (exchange, context) => {
			  const opts = {
				method: 'GET',
				uri: `https://api.ymonitor.nl/ketens`,
					headers: {
						'authToken':  this.token
		  			    	
		  			 },
		  		json: true,
		  	}
			  return rp(opts)
			    .then(resp => {    
			    	exchange.addContext({ketens : resp['keten'] ,})
			    	davis.logger.debug("Got the following respond from Ymonitor: " + JSON.stringify(resp['keten']));
			    })
		},
  			
		
      'ymonitor:respond': (exchange, context) => {
    	  const choice = context.choice;
    	  let out = 'You have ';
    	   	  out += context.ketens.length;
    		  out += ' chains in Ymonitor';
    		  exchange
    		  .response(out)
    		  .followUp('Would you like to know more?')
    		  .addContext({ targetIntent: 'giveChainOverview' });
		//  .smartEnd(); // end the conversation if appropriate
		},
		
		 'giveChainOverview:giveChainOverview': this.giveChainOverview.bind(this),
		 'giveMoreInfoAboutApplication:giveMoreInfoAboutApplication': this.giveMoreInfoAboutApplication.bind(this),
		
    };
  }

  giveChainOverview(exchange, context) {
	  const choice = context.choice;
	  if (_.isBoolean(choice)) {
			      if (choice) { // user said yes
			    	  let out = 'You have the following applications connected to Ymonitor: ';
			    	  var nlp = exchange.getNlpData();
			    	//  var nlpObject = JSON.parse(nlp);
			    	  this.davis.logger.debug('the current NLP : ' + JSON.stringify(nlp));
			    	  var obj = JSON.parse(JSON.stringify(nlp));
			    	  this.davis.logger.debug('the converted NLP : ' + JSON.stringify(obj));
			    	  for(var myKey in context.ketens) {
			    		  var data = context.ketens[myKey];
			    		  this.davis.logger.debug('the NLP within loop : ' + JSON.stringify(obj));
			    		  obj[myKey] = {"name": data.displayName,"category":"applications","entityId":data.id};
			    		  out += data.displayName;
			    		  out += " , ";
			    		
			    	  	  
			    	  }
			    	  this.davis.logger.debug('the new NLP : ' + JSON.stringify(obj));
			    	  exchange.addNlpData(obj);
			    	  return exchange
			    	  		.response(out)
			    	  		.followUp('Would you like more about one of the applications?')
			    	  		.addContext({ targetIntent: 'giveMoreInfoAboutApplication' });
			    	  
			      } else { // user said no
			       return exchange.response('OK, no problem.').followUp('Perhaps you would you like to hear a joke?').end();
			        // .addContext({ targetIntent: 'problemDetails' })
			     }
			   } else if (!_.isNil(choice)) {
			     // if user didn't answer yes or no, did they mean to ask about another problem?
			    return this.davis.pluginManager.run(exchange, 'problemDetails');
			   	return exchange.response('Nothing to see here!').end();
			    }
			    else{
			  	
			   }
  }

  giveMoreInfoAboutApplication(exchange, context){
	  const isInfra = /infrastructure|scalability|scaling|capacity/i.test(exchange.getRawRequest());
	  const tense = this.davis.utils.getTense(exchange)
	  var nlp = exchange.getNlpData();
	//  const dateRange = new VB.TimeRange(nlp.timeRange, exchange.user.timezone);
	 // const app = nlp.app.name;
	  this.davis.logger.debug(' is infra? : ' + isInfra); 
	  this.davis.logger.debug('Get Tense : ' + tense); 
	  this.davis.logger.debug('Get NLP : ' + JSON.stringify(nlp));
	//  this.davis.logger.debug(`There were no recent issues affecting ${app}.`); 
	  const choice = context.choice;
	  if (_.isBoolean(choice)) {
	      if (choice) { // user said yes
	    	  let out = '' ;
	    	  return exchange
	    	  		.response("sorry i cannot help u yet.")
	    	  		.smartEnd(); // end the conversation if appropriate
	      } else { // user said no
	       return exchange.response('OK, no problem.').followUp('Would you like to hear a joke?');
	        // .addContext({ targetIntent: 'problemDetails' })
	     }  
	  }
  }
  
}



// export the plugin so it can be used
module.exports = Ymonitor;