'use strict';

const BbPromise = require('bluebird');
const _ = require('lodash');
const Decide = require('./Decide');
const moment = require('moment');

const ConversationModel = require('../../models/Conversation');
const ExchangeModel = require('../../models/Exchange');

/**
 * Davis Exchange object
 * @constructor
 */
class Exchange {
  /**
   *
   * @param {Davis} davis
   * @param {User} user
   *
   * @memberOf Exchange
   */
  constructor(davis, user) {
    this.logger = davis.logger;
    this.user = user;

    this._shouldGreet = false;
    this._shouldFollowUp = true;
    this.exchangeContext = {};
    this.rawResponse = {};
    this.rawResponse.string = {};
    this.rawResponse.templatePath = {};
    this.rawResponse.templateString = {};
    this.question = '';
    this.decide = new Decide(davis);
    this.depth = 0;
    this.maxDepth = 10;
    this.intents = [];
    this.filtered = false;

    this.davis = davis;
  }

  /**
   * Starts a new exchange
   *
   * @param {string} request - The request from the user.
   * @param {string} source - The source of the user request.
   * @param {Object} meta - Additional information about the source.
   * @returns {Promise<Exchange>}
   *
   * @memberOf Exchange
   */
  start(request, source, scope) {
    return BbPromise.try(() => {
      if (!request) throw new this.davis.classes.Error('A user request is required!');
      if (!source) throw new this.davis.classes.Error('A source is required!');
      if (!scope) throw new this.davis.classes.Error('A scope is required!');
      this.logger.info(`Starting a new exchange from ${source}: '${request}'`);
    })
      .then(() => this.getConversation(this.user.id, scope))
      .then(conversation => this.getConversationHistory(conversation))
      .then((conversation) => {
        this.model = new ExchangeModel({
          _conversation: conversation.id,
          source,
          scope,
          request: {
            raw: request.trim(),
          },
          conversationContext: this.conversationContext,
        });
        return this;
      });
  }

  startInternal(scope) {
    return this.start(' ', 'internal', scope || 'internal');
  }

  /**
   * Tells the response builder to include a greeting
   *
   * @returns {Exchange} this
   *
   * @memberOf Exchange
   */
  greet() {
    this._shouldGreet = true;
    return this;
  }

  /**
   * Add context that does not persist between exchanges
   *
   * @returns {Exchange} this
   *
   * @memberOf Exchange
   */
  addExchangeContext(exchangeContext) {
    _.assign(this.exchangeContext, exchangeContext);
    return this;
  }

  addTemplateContext(exchangeContext) { // deprecated
    this.logger.warn('Template context deprecated, please use exchange context.');
    return this.addExchangeContext(exchangeContext);
  }

  /**
   * Get context object for user in templates
   *
   * @returns {Object} context
   *
   * @memberOf Exchange
   */
  getExchangeContext() {
    return _.assign({},
      this.model.conversationContext,
      this.exchangeContext,
      {
        choice: this.choice,
        user: this.user,
        timeRange: this.getTimeRange(),
        nlp: this.getNlpData(),
        app: _.get(this.getNlpData(), 'app.app'),
        scope: this.getScope(),
        filtered: this.filtered,
        entities: this.davis.pluginManager.getEntities(),
      });
  }

  getTemplateContext() { // deprecated
    this.logger.warn('Template context deprecated, please use exchange context.');
    return this.getExchangeContext();
  }

  /**
   *  The response that should be processed and sent to the user.
   *
   * @param {(string|Response)} response
   * @returns {Exchange} this
   *
   * @memberOf Exchange
   */
  response(response) {
    if (_.isNil(response)) {
      throw new this.davis.classes.Error('No response was provided by the intent.');
    } else if (!response) {
      // exchange.response(false) should not respond
      this.noResponse = true;
    } else if (_.isString(response)) {
      // Text response
      if (response.length === 0) {
        throw new this.davis.classes.Error('Unable to use an empty string.');
      }
      this.rawResponse.string.text = response;
    } else {
      if (_.has(response, 'text')) this.rawResponse.string.text = response.text;
      if (_.has(response, 'say')) this.rawResponse.string.say = response.say;
      if (_.has(response, 'show')) this.rawResponse.string.show = response.show;
      if (_.has(response, 'textPath')) this.rawResponse.templatePath.text = response.textPath;
      if (_.has(response, 'sayPath')) this.rawResponse.templatePath.say = response.sayPath;
      if (_.has(response, 'showPath')) this.rawResponse.templatePath.show = response.showPath;
      if (_.has(response, 'textString')) this.rawResponse.templateString.text = response.textString;
      if (_.has(response, 'sayString')) this.rawResponse.templateString.say = response.sayString;
      if (_.has(response, 'showString')) this.rawResponse.templateString.show = response.showString;
    }
    return this;
  }

  /**
   * Ask a follow up question
   *
   * @param {String} question
   * @returns {Exchange} this
   *
   * @memberOf Exchange
   */
  followUp(question) {
    this.question = question;
    return this;
  }

  /**
   * Tell the exchange not to follow up
   *
   * @memberOf Exchange
   */
  skipFollowUp() {
    this._shouldFollowUp = false;
    return this;
  }

  /**
   * Get the current follow up question
   *
   * @returns {String}
   * @memberOf Exchange
   */
  getFollowUpQuestion() {
    return this.question;
  }

  /**
   * Ends the conversation if this is the first exchange
   *
   * @returns {Object} this
   *
   * @memberOf Exchange
   */
  smartEnd() {
    this.model.response.finished = _.get(this, 'history.newConversation');
    return this;
  }

  /**
   * Ends the current conversation
   *
   * @returns {Object} this
   *
   * @memberOf Exchange
   */
  end() {
    this.model.response.finished = true;
    return this;
  }

  /**
   * Saves the current exchange to MongoDB
   *
   * @returns {Promise<Exchange>}
   *
   * @memberOf Exchange
   */
  save() {
    return this.model.save().then(() => this);
  }

  /**
   * Creates or reuses a conversation
   *
   * @param {Object} conversation - The conversation object from MongoDB.
   * @returns {Promise<Conversation>}
   *
   * @memberOf Exchange
   */
  getConversation(uid, scope) {
    return ConversationModel.findOne({ userId: uid, scope })
      .then((conversation) => {
        if (_.isNull(conversation)) {
          this.logger.info('We\'ve never talked to this user in this scope before.  Starting a new conversation');
          const conversationModel = new ConversationModel({ userId: uid, scope });
          return conversationModel.save();
        }
        return conversation;
      });
  }

  /**
   * Gathers the users history based on prior exchanges
   *
   * @param {Object} conversation - The conversation object from MongoDB.
   * @returns {Promise<Array>}
   *
   * @memberOf Exchange
   */
  getConversationHistory(conversation) {
    return BbPromise.resolve()
      .then(() => ExchangeModel
        .find({ _conversation: conversation.id })
        .limit(10)
        .sort({ createdAt: -1 })
        .exec())
      .then((history) => {
        if (history.length === 0) {
          this.conversationContext = {};
          this.logger.debug('First exchange, creating context object.');
        } else if (moment(history[0].createdAt).isBefore(moment().subtract(2, 'h'))) {
          this.conversationContext = {};
          this.logger.debug('Previous exchange older than 2 hours, creating new context object');
        } else {
          this.conversationContext = history[0].conversationContext;
        }
        this.history = {
          firstInteraction: (history.length === 0),
          newConversation: (history.length === 0 || _.get(history, '[0].response.finished') === true),
          lastInteraction: _.get(history, '[0]'),
        };
        return conversation;
      });
  }

  /**
   * Get conversation context
   *
   * @returns {Object}
   *
   * @memberOf Exchange
   */
  getContext() {
    if (_.isNil(this.model.conversationContext)) {
      this.model.conversationContext = {};
    }
    return this.getExchangeContext();
  }

  /**
   * Add conversation context
   *
   * @param {Object} context
   * @returns {Exchange}
   *
   * @memberOf Exchange
   */
  addContext(obj) {
    if (_.isNil(this.model.conversationContext)) {
      this.model.conversationContext = {};
    }
    _.assign(this.model.conversationContext, obj);
    this.model.markModified('conversationContext');
    return this;
  }

  /**
   * Override conversation context
   *
   * @param {Object} context
   * @returns {Exchange}
   *
   * @memberOf Exchange
   */
  setContext(obj) {
    this.model.conversationContext = obj;
    return this;
  }

  /**
   * Set routing target intent
   *
   * @param {String} targetIntent
   * @returns {Exchange}
   *
   * @memberOf Exchange
   */
  setTarget(targetIntent) {
    this.model.set('conversationContext.targetIntent', targetIntent);
    // this.addContext({ targetIntent });
    return this;
  }

  /**
   * Adds an array of scopes that can be used when pushing notifications
   *
   * @param {array} scopeArr - An array of filter scopes
   * @returns {Exchange}
   *
   * @memberOf Exchange
   */
  setNotificationScope(scopeArr) {
    this.model.notificationScope = _.uniq(scopeArr);
    return this;
  }

  /**
   * Reset the conversation context
   *
   * @returns {Exchange}
   *
   * @memberOf Exchange
   */
  resetContext() {
    this.model.conversationContext = undefined;
    return this;
  }

  /**
   * Set a single property of the conversation context
   *
   * @param {String} property - The property to set
   * @param {Object} value - The value to set it to
   *
   * @returns {Exchange}
   *
   * @memberOf Exchange
   */
  setContextProperty(prop, value) {
    if (_.isNil(this.model.conversationContext)) {
      this.model.conversationContext = {};
    }
    this.model.conversationContext[prop] = value;
    return this;
  }

  /**
   * Is this the first interaction for a user?
   *
   * @returns {Boolean}
   */
  isFirstInteraction() {
    return this.history.firstInteraction;
  }

  /**
   * Adds the processed response from Davis NLP
   *
   * @param {Nlp.NlpData} data - Processed user request.
   * @returns {Exchange}
   *
   * @memberOf Exchange
   */
  addNlpData(data) {
    this.model.request.analysed = data;
    return this;
  }

  /**
   * Get the NLP Data
   *
   * @returns {Nlp.NlpData}
   *
   * @memberOf Exchange
   */
  getNlpData() {
    return this.model.request.analysed;
  }

  /**
   * Get an array of scopes that can be used for push notifications
   *
   * @return {Array}
   *
   * @memberOf Exchange
   */
  getNotificationScopes() {
    return this.model.notificationScope;
  }

  /**
   * Get analysed request time range
   *
   * @returns {Nlp.TimeRange}
   *
   * @memberOf Exchange
   */
  getTimeRange() {
    return (this.forcedRange) ?
      this.forcedRange :
      _.get(this, 'model.request.analysed.timeRange', {});
  }

  explicitTimeRange() {
    const range = _.get(this, 'model.request.analysed.timeRange', {});
    return Boolean(range.startTime);
  }

  forceTimeRange(start, stop) {
    if (_.isNil(start)) {
      // If called with no arguments, force no time range
      this.forcedRange = {};
      return this;
    }

    if (!start) {
      // If called with false, remove forced time range
      this.forcedRange = null;
      return this;
    }

    if (start.constructor === Object) {
      // If called with an object, set that to the timeRange
      this.forcedRange = start;
      return this;
    }

    if (start.constructor === String) {
      // If called with a string, parse into a range
      const match = /(\d+)([smhdw]o?)/.exec(start);
      const num = parseInt(match[1], 10);
      const unit = match[2];

      const factors = {
        s: 1000,
        m: 1000 * 60,
        h: 1000 * 60 * 60,
        d: 1000 * 60 * 60 * 24,
        w: 1000 * 60 * 60 * 24 * 7,
        mo: 1000 * 60 * 60 * 24 * 30,
      };

      const factor = factors[unit];
      const stopTime = moment().valueOf();
      const startTime = stopTime - (num * factor);

      this.forcedRange = { startTime, stopTime };
      return this;
    }

    // set time range from start to end or now
    this.forcedRange = {
      startTime: start,
      stopTime: stop || moment().valueOf(),
    };
    return this;
  }

  /**
   * Add audible response
   *
   * @param {String} text - SSML String
   *
   * @returns {Exchange}
   *
   * @memberOf {Exchange}
   */
  say(text) {
    this.model.response.audible.ssml = text;
    return this;
  }

  /**
   * Add visual (slack) response
   *
   * @param {String} text - SSML String
   *
   * @returns {Exchange}
   *
   * @memberOf {Exchange}
   */
  show(card) {
    this.model.response.visual.card = card;
    return this;
  }

  /**
   * Determines if it's approprate to offer to push the link to the user.
   * Users in demo mode should not recieve this offer because it happens
   * automatically when setLinkUrl() is called.
   *
   * @returns {Boolean}
   *
   * @memberOf {Exchange}
   */
  eligibleToPushLink() {
    const source = this.getRequestSource().toLowerCase();
    return (source === 'web' || source === 'alexa')
      && this.davis.server.isSocketConnected(this.user)
      && this.user.demo !== true;
  }


  getRawResponse() {
    return this.rawResponse;
  }

  /**
   * Set audible, visual, and text response
   *
   * @param {Object} response - Response object
   * @param {String} response.say - SSML String for TTS
   * @param {String} response.text - Raw text response
   * @param {String} response.card - Slack card in JSON format
   *
   * @memberOf {Exchange}
   */
  setResponse(response) {
    this.model.response.audible.ssml = response.say;
    this.model.response.visual.text = response.text;
    this.model.response.visual.card = response.show;
  }

  /**
   * Get audible response
   *
   * @returns {String}
   *
   * @memberOf Exchange
   */
  getAudibleResponse() {
    return _.get(this, 'model.response.audible.ssml');
  }

  /**
   * Get text response
   *
   * @returns {String}
   *
   * @memberOf Exchange
   */
  getTextResponse() {
    return _.get(this, 'model.response.visual.text');
  }

  /**
   * Get slack card response
   *
   * @returns {String}
   *
   * @memberOf Exchange
   */
  getVisualResponse() {
    return _.get(this, 'model.response.visual.card');
  }

  /**
   * Shortcut setter for conversation context _linkUrl property
   *
   * @param {String} url
   *
   * @returns Exchange
   *
   * @memberOf Exchange
   */
  setLinkUrl(url) {
    this.addContext({ _linkUrl: url });

    const source = this.getRequestSource().toLowerCase();

    if (this.user.demo && source !== 'web') {
      this.logger.debug(`Automatically pushing ${url} since the user is in demo mode.`);
      this.davis.server.pushLinkToUser(this.user, url);
    } else if (!this.user.demo) {
      this.logger.debug('Demo mode on this user has been disabled.');
    }

    return this;
  }

  /**
   * Shortcut getter for conversation context _linkUrl property
   *
   * @returns {String}
   *
   * @memberOf Exchange
   */
  getLinkUrl() {
    return _.get(this, 'model.conversationContext._linkUrl');
  }

  /**
   * Should the response end the conversation
   *
   * @returns {Boolean}
   *
   * @memberOf Exchange
   */
  shouldConversationEnd() {
    return this.model.response.finished;
  }

  /**
   * Should the response follow up with a question
   *
   * @returns {Boolean}
   *
   * @memberOf Exchange
   */
  shouldFollowUp() {
    return this._shouldFollowUp;
  }

  /**
   * Should the response greet the user
   *
   * @returns {Boolean}
   *
   * @memberOf Exchange
   */
  shouldGreet() {
    return this._shouldGreet;
  }

  /**
   * Shortcut getter for raw request
   *
   * @returns {String}
   *
   * @memberOf Exchange
   */
  getRawRequest() {
    return this.modifiedRequest || this.model.request.raw;
  }

  /**
   * Shortcut setter for exchange timezone
   *
   * @param {String} - timezone
   *
   * @memberOf Exchange
   */
  setTimezone(zone) {
    this.timezone = zone;
  }

  /**
   * Shortcut getter for exchange timezone
   *
   * @returns {String}
   *
   * @memberOf Exchange
   */
  getTimezone() {
    return this.timezone || this.user.timezone;
  }

  /**
   * Shortcut getter for the filter scope
   *
   * @returns {String}
   *
   * @memberOf Exchange
   */
  getScope() {
    return this.model.scope;
  }

  /**
   * Shortcut getter for request source type
   *
   * @returns {String}
   *
   * @memberOf Exchange
   */
  getRequestSource() {
    const source = (this.model.source === 'internal') ? this.model.scope.split(':')[0] : this.model.source;
    return _.startCase(source);
  }

  getUserIdentifier() {
    const first = _.get(this, 'user.name.first');
    const last = _.get(this, 'user.name.last');
    const clicker = _.get(this, 'conversationContext.clicker');
    const email = _.get(this, 'user.email', 'Davis');

    if (first || last) return `${first} ${last}`.trim();
    if (clicker) return clicker;
    return email;
  }

/**
 * @typedef User
 * @property {string} id - A unique ID for the user.
 * @property {string} email - The email address of the user.
 * @property {string} name.first - The first name of the user.
 * @property {string} name.last - The last name of the user.
 * @property {string} timezone - The canonical timezone of the user.
 */

/**
 * @typedef Response
 * @property {string} text
 * @property {string} say
 * @property {string} show
 * @property {string} textPath
 * @property {string} sayPath
 * @property {string} showPath
 * @property {string} textString
 * @property {string} sayString
 * @property {string} showString
 * @memberOf Exchange
 */

}

module.exports = Exchange;
