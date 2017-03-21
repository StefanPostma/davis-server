'use strict';

const BbPromise = require('bluebird');
const _ = require('lodash');
const path = require('path');

const ConfigModel = require('../models/Config');

class Config {
  constructor(davis, config) {
    this.logger = davis.logger;
    this.event = davis.event;
    this.davisPath = path.join(__dirname, '..');

    this.userDefinedConfig = _.merge({}, config);
    this.davis = davis;
  }

  load() {
    return ConfigModel.findOne({}).exec()
      .then(config => this._getConfiguration(config))
      .then((config) => {
        this.logger.debug('Successfully pulled the latest configuration from MongoDB.');
        this.model = config;
        return this;
      });
  }

  reload() {
    this.logger.debug('Reloading the configuration from MongoDB.');
    return this.load();
  }

  _getConfiguration(config) {
    return BbPromise.resolve()
      .then(() => {
        if (_.isNull(config)) {
          this.logger.info('No existing configuration data found!');
          const configModel = new ConfigModel({
            dynatrace: {
              url: _.get(this, 'userDefinedConfig.dynatrace.url', process.env.DYNATRACE_URL) || '',
              apiUrl: _.get(this, 'userDefinedConfig.dynatrace.apiUrl', process.env.DYNATRACE_API_URL) || '',
              token: _.get(this, 'userDefinedConfig.dynatrace.token', process.env.DYNATRACE_TOKEN) || '',
              strict: _.get(this, 'userDefinedConfig.dynatrace.apiUrl', process.env.DYNATRACE_STRICT) || '',
            }, ymonitor: {
                url: _.get(this, 'userDefinedConfig.ymonitor.url', process.env.YMONITOR_URL) || '',
                apiUrl: _.get(this, 'userDefinedConfig.ymonitor.apiUrl', process.env.YMONITOR_API_URL) || '',
                token: _.get(this, 'userDefinedConfig.ymonitor.token', process.env.YMONITOR_TOKEN) || '',
                token: _.get(this, 'userDefinedConfig.ymonitor.username', process.env.YMONITOR_USERNAME) || '',
                token: _.get(this, 'userDefinedConfig.ymonitor.password', process.env.YMONITOR_PASSWORD) || '',
                strict: _.get(this, 'userDefinedConfig.ymonitor.apiUrl', process.env.YMONITOR_STRICT) || '',
              },
              evolven: {
                  url: _.get(this, 'userDefinedConfig.evolven.url', process.env.EVOLVEN_URL) || '',
                  apiUrl: _.get(this, 'userDefinedConfig.evolven.apiUrl', process.env.EVOLVEN_API_URL) || '',
                  token: _.get(this, 'userDefinedConfig.evolven.token', process.env.EVOLVEN_TOKEN) || '',
                  token: _.get(this, 'userDefinedConfig.evolven.username', process.env.EVOLVEN_USERNAME) || '',
                  token: _.get(this, 'userDefinedConfig.evolven.password', process.env.EVOLVEN_PASSWORD) || '',
                  strict: _.get(this, 'userDefinedConfig.evolven.apiUrl', process.env.EVOLVEN_STRICT) || '',
                },
            slack: {
              enabled: _.get(this, 'userDefinedConfig.slack.enabled', process.env.SLACK_ENABLED) || '',
              clientId: _.get(this, 'userDefinedConfig.slack.clientId', process.env.SLACK_CLIENT_ID) || '',
              clientSecret: _.get(this, 'userDefinedConfig.slack.clientSecret', process.env.SLACK_CLIENT_SECRET) || '',
              redirectUri: _.get(this, 'userDefinedConfig.slack.redirectUri', process.env.SLACK_REDIRECT_URI) || '',
            },
          });
          return configModel.save();
        }
        return config;
      });
  }

  createSlackNotification(rule) {
    this.model.slack.notifications.rules.push(rule);
    return this.model.save()
      .then(() => this.reload());
  }

  getSlackNotification(id) {
    return BbPromise.resolve()
      .then(() => this.model.slack.notifications.rules.id(id));
  }

  updateSlackNotification(id, update) {
    const rule = this.model.slack.notifications.rules.id(id);
    _.assign(rule, update);
    return this.model.save()
      .then(() => this.reload());
  }

  deleteSlackNotification(id) {
    return BbPromise.try(() => {
      const rule = this.model.slack.notifications.rules.id(id);

      if (!rule) throw new this.davis.classes.Error(`A rule with the ID '${id}' wasn't found.`);
      return rule;
    })
    .then(rule => rule.remove())
    .then(() => this.model.save())
    .then(() => this.reload());
  }

  getConfiguration() {
    return this.load()
      .then(config => _.omit(config.model.toObject(), ['_id', '__v', 'jwtToken']));
  }

  updateConfig(type, config) {
    _.merge(this.model[type], config);
    return this.model.save()
      .then(() => this.reload());
  }

  getDavisPort() {
    return this.port || process.env.PORT || 3000;
  }

  getMongoDBConnectionString() {
    return process.env.MONGODB_URI || 'mongodb://localhost/davis';
  }

  getJwtToken() {
    return this.model.jwtToken;
  }

  getDynatraceUrl() {
    return this.model.dynatrace.url.replace(/\/+$/, '');
  }

  getDynatraceApiUrl() {
    if (this.model.dynatrace.apiUrl === '') {
      return this.getDynatraceUrl();
    }
    return this.model.dynatrace.apiUrl.replace(/\/+$/, '');
  }

  getDynatraceToken() {
    return this.model.dynatrace.token;
  }

  getDynatraceValidateCert() {
    return this.model.dynatrace.strictSSL;
  }
  
  // ymonitor
  getYmonitorUrl() {
	    return this.model.ymonitor.url.replace(/\/+$/, '');
	  }

	  getYmonitorApiUrl() {
	    if (this.model.ymonitor.apiUrl === '') {
	      return this.getYmonitorUrl();
	    }
	    return this.model.ymonitor.apiUrl.replace(/\/+$/, '');
	  }

	  getYmonitorToken() {
	    return this.model.ymonitor.token;
	  }
	  
	  getYmonitorUsername() {
		    return this.model.ymonitor.username;
	  
	  }
	  getYmonitorPassword() {
		    return this.model.ymonitor.password;
	  }

	  getYmonitorValidateCert() {
	    return this.model.ymonitor.strictSSL;
	  }
  
  // end ymonitor
	  
	  // evolven
	  getEvolvenUrl() {
		    return this.model.evolven.url.replace(/\/+$/, '');
		  }

		  getEvolvenApiUrl() {
		    if (this.model.evolven.apiUrl === '') {
		      return this.getEvolvenUrl();
		    }
		    return this.model.evolven.apiUrl.replace(/\/+$/, '');
		  }

		  getEvolvenToken() {
		    return this.model.evolven.token;
		  }
		  
		  getEvolvenUsername() {
			    return this.model.evolven.username;
		  
		  }
		  getEvolvenPassword() {
			    return this.model.evolven.password;
		  }

		  getEvolvenValidateCert() {
		    return this.model.evolven.strictSSL;
		  }
	  
	  // end evolven

  isWatsonEnabled() {
    return this.model.watson.enabled;
  }

  getWatsonTtsUser() {
    return this.model.watson.tts.user;
  }

  getWatsonTtsPassword() {
    return this.model.watson.tts.password;
  }

  getWatsonSttUser() {
    return this.model.watson.stt.user;
  }

  getWatsonSttPassword() {
    return this.model.watson.stt.password;
  }

  isSlackEnabled() {
    return this.model.slack.enabled;
  }

  getSlackClientId() {
    return this.model.slack.clientId;
  }

  getSlackClientSecret() {
    return this.model.slack.clientSecret;
  }

  getSlackRedirectUri() {
    return this.model.slack.redirectUri;
  }

  isSlackAlertsEnabled() {
    return _.get(this, 'model.slack.notifications.enabled', false);
  }
  getSlackAlertRules() {
    return _.get(this, 'model.slack.notifications.rules', []);
  }

  getApiEventsToken() {
    return this.model.api.events;
  }
}

module.exports = Config;
