'use strict';

const _ = require('lodash');
const BbPromise = require('bluebird');
const AlexaModel = require('../models/Alexa');

const ALEXA_RESPONSE_VERSION = '1.0';
const ALEXA_LAUNCH_PHRASE = 'Start davis';
const ALEXA_STOP_PHRASE = 'timeout';
const ALEXA_REQUEST_SOURCE = 'alexa';

const INTENTS = {
  'AMAZON.YesIntent': 'yes',
  'AMAZON.NoIntent': 'no',
  'AMAZON.NextIntent': 'next',
  'AMAZON.PreviousIntent': 'previous',
  'AMAZON.HelpIntent': 'help',
  'AMAZON.CancelIntent': 'stop',
  'AMAZON.StopIntent': 'stop',
};

class Alexa {
  constructor(davis) {
    this.logger = davis.logger;
    this.pluginManager = davis.pluginManager;
    this.users = davis.users;
    this.Exchange = davis.classes.Exchange;

    this.davis = davis;
  }

  askDavis(req) {
    return BbPromise.resolve()
      .then(() => this._logRequest(req))
      .then(() => this.users.validateAlexaUser(req))
      .then((user) => {
        const exchange = new this.Exchange(this.davis, user);
        return exchange.start(this._getRawRequest(req), ALEXA_REQUEST_SOURCE, `${ALEXA_REQUEST_SOURCE}:${_.get(req, 'body.session.user.userId')}`);
      })
      .then(exchange => this.pluginManager.run(exchange))
      .then(exchange => this._formatResponse(exchange))
      .catch(err => this._formatErrorResponse(err));
  }

  _logRequest(req) {
    const applicationId = _.get(req, 'body.session.application.applicationId');
    const userId = _.get(req, 'body.session.user.userId');

    return AlexaModel
      .findOneAndUpdate(
        { userId },
        { userId, applicationId, $inc: { timesAccessed: 1 } },
        { upsert: true, setDefaultsOnInsert: true });
  }

  _getRawRequest(req) {
    const requestType = _.get(req, 'body.request.type');
    let phrase;
    if (requestType === 'LaunchRequest') {
      phrase = ALEXA_LAUNCH_PHRASE;
    } else if (requestType === 'IntentRequest') {
      const intent = _.get(req, 'body.request.intent.name');
      phrase = INTENTS[intent] || _.get(req, 'body.request.intent.slots.command.value');
      if (!phrase) {
        this.logger.error('The Alexa request did not send a phrase');
      }
    } else if (requestType === 'SessionEndedRequest') {
      const reasonForError = _.get(req, 'body.request.reason', 'of an unknown reason');
      if (reasonForError === 'EXCEEDED_MAX_REPROMPTS') {
        // Simulates a stop intent if the user simply doesn't respond to Alexa
        phrase = ALEXA_STOP_PHRASE;
      } else {
        this.logger.debug(`The session is ending because ${reasonForError}.`);
        throw new this.davis.classes.Error('End session received.');
      }
    } else {
      throw new this.davis.classes.Error(`Received an unknown request type ${requestType}!`);
    }
    return phrase;
  }

  _formatErrorResponse(err) {
    let message;
    if (err.name === 'DavisError') {
      message = err.message;
    } else {
      // Adding a generic error message and logging the exception.
      message = 'Unfortunately an unhandled error has occurred.';
      this.davis.utils.logError(err);
    }
    return this._alexaResponse(message, true);
  }

  _formatResponse(exchange) {
    const response = exchange.getAudibleResponse();
    const endConversation = exchange.shouldConversationEnd();
    return this._alexaResponse(response, endConversation);
  }

  _alexaResponse(response, endSession) {
    return {
      version: ALEXA_RESPONSE_VERSION,
      sessionAttributes: {},
      response: {
        shouldEndSession: endSession,
        outputSpeech: {
          type: 'SSML',
          ssml: `<speak>${response}</speak>`,
        },
      },
    };
  }
}

module.exports = Alexa;
