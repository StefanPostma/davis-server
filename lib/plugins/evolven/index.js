'use strict';

const rp = require('request-promise');
const _ = require('lodash');
//const et = require("elementtree")
const xml2js = require('xml2js');
var token = '';
var EVOLVEN_USER = '';
var EVOLVEN_PASSWORD = '';
var EVOLVEN_URL = '' ;

/**
 * The DavisWeather class is the core of the plugin and an
 * instance of DavisWeather is what will be loaded into Davis
 */
class Evolven {
  /**
   * The main body of work is done in the constructor.
   */
  constructor(davis, options) {
	  this.davis = davis;
	  this.options = options;
	  this.config = davis.config;
	  
    // This is where we declare our intents.
    this.intents = {
      // Our intent name
    	evolven: {
        // A basic description of the intent
        usage: 'Check Evolven',

        // Phrases that will trigger our intent. Note that they will not
        // need to be matched exactly in order for the intent to run.
        phrases: [
          'What changed?',
          'Check the status in evolven',
          'Did anything changed?',
          'How is Evolven doing',
          'Did any high risk activaty happend?',
          'How is {{APP}} doing in evolven',
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
          clarification: 'I think you were asking about what changed.',
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
    
    	'evolven:authenticate': (exchange, context) => {
    			var url = this.config.getEvolvenApiUrl() +"?action=login&user=" + this.config.getEvolvenUsername() +"&pass=" + this.config.getEvolvenPassword();
    			 const opts = {
  					method: 'GET',
  					uri: url,	
  			  		json: false,
  			  }
  			davis.logger.debug(JSON.stringify(opts)); 
  			  return rp(opts)
  			    .then(resp => {
  			    davis.logger.debug("Got the following respond from Evolven: " + resp);
  			    var regex = /(<ID>)(.+)(<\/ID>)/
  				var result = resp.match(regex);
  				var ID = result[2];
   		        this.token = ID;
  		
  			    })
  			  .catch(function (err) {
  				  davis.logger.debug('API call failed.'); 
  				  davis.logger.debug(err.toString()); 
  		    })
  		},
  		
  		'evolven:gatherData': (exchange, context) => {
			var url = this.config.getEvolvenUrl() + "/html/scripts/changes-tree-summary.jsp?envId=209827&EvolvenSessionKey=" + this.token
  			const opts = {
				method: 'GET',
				uri: url,
		  		json: false,
		  	}
			  return rp(opts)
			    .then(resp => {    
			    	
			        davis.logger.debug("Got the following respond from Evolven: " + resp);
			        var regex1 = /(<Name>).(\w+\s\w+\s\w+\s)/
			        var nameResult = resp.match(regex2);
			        var appName = nameResult[2];
	  			    var regex2 = /Risk\sName=(\w+)\sValue=(\d+)/
	  				var riskResult = resp.match(regex2);
	  				var riskLevel = riskResult[1];
	  				var riskAmount = riskResult[2];
	   		        this.token = ID;
	   		        exchange.addContext({EvolvenApplication : appName  , riskLevel : riskLevel , HighRisk: riskAmnount})
			    })
		},
  			
		
      'evolven:respond': (exchange, context) => {
    	  const choice = context.choice;
    	  let out = 'For Application  ';
    	   	  out += context.EvolvenApplication;
    		  out += ' Evolven Found ';
    		  out += context.HighRisk;
    		  out += context.riskLevel;
    		  out += ' Changes';
    		  exchange
    		  .response(out)
    		  .followUp('Would you like to know more?')
    		  .addContext({ targetIntent: 'giveChangeInfo' });
		//  .smartEnd(); // end the conversation if appropriate
		},
		
		 'giveChangeInfo:giveChangeInfo': this.giveChangeInfo.bind(this),
		// 'giveMoreInfoAboutApplication:giveMoreInfoAboutApplication': this.giveMoreInfoAboutApplication.bind(this),
		
    };
  }

  giveChangeInfo(exchange, context) {
	  const choice = context.choice;
	  if (_.isBoolean(choice)) {
			      if (choice) { // user said yes
			    	  let out = 'You have the following applications connected to Evolven: ';
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
	       return exchange.response('OK, no problem.')
	       				  .smartEnd();
	       //.followUp('Would you like to hear a joke?');
	        // .addContext({ targetIntent: 'problemDetails' })
	     }  
	  }
  }
  
}



// export the plugin so it can be used
module.exports = Evolven;