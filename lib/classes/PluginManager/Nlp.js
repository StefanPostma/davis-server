'use strict';

const natural = require('natural');
const rp = require('request-promise');
const _ = require('lodash');
const moment = require('moment-timezone');
const createHash = require('crypto').createHash;
const BbPromise = require('bluebird');
const path = require('path');
const fs = require('fs');

/**
 * Natural Language Processor
 * @constructor
 */
class Nlp {
  /**
   * Creates an instance of Nlp.
   *
   * @param {Object} options
   * @param {string} options.stemmer ['natural.PorterStemmer'] - The natural stemmer to use.
   * @param {boolean} options.keepStops [true]
   * @param {Object} options.classifier [new natural.LogisticRegressionClassifier()] - The natural classifer to use.
   * @param {number} options.threshold [0.8] - The confidence level the classifer should achieve.
   * @param {string} options.url ['https://ogj1j3zad0.execute-api.us-east-1.amazonaws.com/prod/datetime'] - The URI to the hosted datetime parser.
   * @param {string} options.timezone ['Etc/UTC'] - The timezone that should be used when parsing the datetime.
   * @param {Array} options.apps - An array of application names that could be parsed out.
   *
   * @memberOf Nlp
   */
  constructor(pluginManager, options) {
    const configObject = options || {};
    this.pluginManager = pluginManager;
    this.stemmer = configObject.stemmer || natural.PorterStemmer;
    this.keepStops = configObject.keepStops || true;
    this.classifier = configObject.classifier || new natural.LogisticRegressionClassifier();
    this.threshold = configObject.threshold || 0.85;
    this.uri = configObject.uri || 'https://ogj1j3zad0.execute-api.us-east-1.amazonaws.com/prod/datetime';
    this.timezone = configObject.timezone || 'Etc/UTC';
    this.logger = pluginManager.logger;

    this.classifier.stemmer = this.stemmer;
    this.documents = {};
    this.stats = {};

    this.trained = false;
  }

  /**
   * Strip app entities from text
   *
   * @param {String} text - Text to be stripped
   *
   * @returns {App}
   * @memberOf Nlp
   */
  stripApp(text) {
    let r = { stripped: text };
    _.forEach(_.get(this, 'pluginManager.entities.applications', []), (app) => {
      const aliases = app.aliases.slice();
      aliases.push(app.name);
      _.forEach(aliases, (alias) => {
        const n = alias.length;
        const idx = text.toLowerCase().indexOf(alias.toLowerCase());
        if (idx >= 0) {
          const stripped = `${text.substr(0, idx)}{{APP}}${text.substr(idx + n)}`;
          this.logger.debug(`Found ${app.name} in "${stripped}"`);
          r = {
            _text: text,
            body: text.substr(idx, n),
            name: app.name,
            app,
            start: idx,
            end: idx + n,
            stripped,
          };
        }
      });
    });
    return r;
  }

  /**
   * Strip a datetime entity from an expression with respect to a timezone
   *
   * @param {String} expression - The expression a datetime object is to be stripped from
   * @param {String} tz - The timezone to use as the current timezone
   *
   * @returns {StrippedDatetime}
   *
   * @memberOf Nlp
   */
  stripDateTimes(expression, tz) {
    const timezone = tz || this.timezone;
    const options = {
      method: 'POST',
      uri: this.uri,
      body: { expression, timezone },
      json: true,
      transform: (body, response) => {
        this.logger.info(`DAVIS-PARSER: returned ${response.statusCode} in ${response.elapsedTime} ms.`);
        return body;
      },
      time: true,
    };
    return rp(options)
      .then((parsedBody) => {
        let res = parsedBody._text;
        const latent = parsedBody.latent;
        const body = parsedBody.body;
        if (_.isNil(parsedBody.body)) {
          return { stripped: undefined, value: undefined };
        }
        if (!latent) {
          res = res.replace(body, '{{DATETIME}}');
        }
        return ({
          stripped: res,
          value: parsedBody,
        });
      }).catch(() => {
        this.logger.error('Datetime Extraction Failed');
      });
  }

  /**
   * Strip app and datetime from an expression with respect to a timezone
   *
   * @param {String} text - The input text to be stripped
   * @param {String} tz - The timezone
   *
   * @memberOf Nlp
   */
  strip(text, tz) {
    const app = this.stripApp(text);
    return this.stripDateTimes(app.stripped, tz)
      .then((res) => {
        const ret = {
          text,
          stripped: _.get(res, 'stripped', text),
          app,
          datetime: res,
        };
        return ret;
      })
      .catch((err) => {
        this.logger.error(err);
      });
  }

  stripAndAddDocument(text, intent) {
    return this.strip(text.toLowerCase())
      .then((res) => {
        const stems = this.tokenizeAndStem(res.stripped, this.keepStops);
        this.classifier.addDocument(stems, intent);
      });
  }

  addDocument(stripped, intent) {
    const stems = this.tokenizeAndStem(stripped.toLowerCase(), this.keepStops);
    this.classifier.addDocument(stems, intent);
    if (_.isNil(this.documents[intent])) {
      this.documents[intent] = [];
    }
    this.documents[intent].push(stems);
  }

  addDocuments(expressions, intent) {
    expressions.map(exp => this.addDocument(exp, intent));
  }

  tokenizeAndStem(text) {
    const t = new natural.RegexpTokenizer({ pattern: /[^A-Za-zА-Яа-я0-9_{}]+/ });
    const tokens = t.tokenize(text.toLowerCase());
    const stems = tokens.map(this.stemmer.stem);
    return stems;
  }

  sum() {
    const data = _.sortBy(_.toPairs(this.documents), e => e[0]);
    const doc = JSON.stringify(data);
    return createHash('sha1')
      .update(doc, 'utf8').digest('hex');
  }

  save(fname) {
    if (!fs.existsSync('data')) fs.mkdirSync('data');
    return new BbPromise((resolve, reject) => {
      this.classifier.save(fname, (err, classifier) => {
        if (!err) {
          resolve(classifier);
        } else {
          reject(err);
        }
      });
    });
  }

  load(fname) {
    if (!fs.existsSync('data')) return null;

    return new BbPromise((resolve, reject) => {
      natural.LogisticRegressionClassifier.load(fname, null, (err, classifier) => {
        if (!err) {
          resolve(classifier);
        } else {
          reject(err);
        }
      });
    });
  }


  train() {
    const stats = {};
    const documents = _.values(this.documents);
    const shasum = this.sum();
    const fname = path.join('data', `${this.sum()}.json`);
    let promise;

    this.logger.debug(`Training data hashed to ${shasum}`);

    if (fs.existsSync(fname)) {
      this.logger.info('Loading classifier from file');
      promise = this.load(fname)
        .then((classifier) => { this.classifier = classifier; });
    } else {
      this.logger.info('Training new classifier');
      this.classifier.train();
      promise = this.save(fname);
    }

    return promise.then(() => {
      this.trained = true;
      stats.intents = documents.length;
      stats.phrases = _.flatten(documents).length;
      this.stats = stats;
      this.logger.info(`Learned ${stats.intents} intents with a combined ${stats.phrases} phrases.`);
    });
  }

  // ping the service to start the lambda function
  hotStart() {
    const options = {
      method: 'POST',
      uri: this.uri,
      body: { expression: 'hot start now', timezone: 'Etc/UTC' },
      json: true,
    };
    return rp(options);
  }

  parseTimeValue(datetime) {
    let timeRange;
    switch (datetime.grain) {
      case 'second':
      case 'minute':
        timeRange = {
          startTime: moment.parseZone(datetime.value).subtract(5, 'minutes').valueOf(),
          stopTime: moment.parseZone(datetime.value).add(5, 'minutes').valueOf(),
        };
        break;
      case 'hour':
        timeRange = {
          startTime: moment.parseZone(datetime.value).subtract(15, 'minutes').valueOf(),
          stopTime: moment.parseZone(datetime.value).add(15, 'minutes').valueOf(),
        };
        break;
      case 'day':
        timeRange = {
          startTime: moment.parseZone(datetime.value).startOf('day').valueOf(),
          stopTime: moment.parseZone(datetime.value).endOf('day').valueOf(),
        };
        break;
      case 'week':
        timeRange = {
          startTime: moment.parseZone(datetime.value).startOf('week').valueOf(),
          stopTime: moment.parseZone(datetime.value).endOf('week').valueOf(),
        };
        break;
      case 'month':
        timeRange = {
          startTime: moment.parseZone(datetime.value).startOf('month').valueOf(),
          stopTime: moment.parseZone(datetime.value).endOf('month').valueOf(),
        };
        break;
      case 'year':
        timeRange = {
          startTime: moment.parseZone(datetime.value).startOf('year').valueOf(),
          stopTime: moment.parseZone(datetime.value).endOf('year').valueOf(),
        };
        break;
      default:
        this.logger.error(`Passed in an unknown granularity: ${datetime.grain}`);
    }
    return timeRange;
  }

  parseTimeRange(datetime) {
    let timeRange = {};
    if (datetime.to) {
      timeRange = {
        startTime: moment.parseZone(datetime.from.value).valueOf(),
        stopTime: moment.parseZone(datetime.to.value).subtract(1, datetime.to.grain).valueOf(),
      };
    } else {
      timeRange = {
        startTime: moment.parseZone(datetime.from.value).valueOf(),
        stopTime: moment().valueOf(),
      };
    }
    return timeRange;
  }

  /**
   * Mine NlpData from an exchange object
   *
   * @param {Object} exchange - A Davis exchange object
   *
   * @return {NlpData}
   *
   * @memberOf Nlp
   */
  process(exchange) {
    const text = exchange.getRawRequest();
    const tz = exchange.getTimezone() || 'Etc/UTC';
    this.logger.debug(`Parsing with timezone ${tz}`);
    let timeRange = {};
    return this.strip(text, tz)
      .then((res) => {
        const datetime = _.get(res, 'datetime.value.entities.datetime', { type: null });
        if (datetime.type) {
          if (datetime.type === 'value') {
            this.logger.debug('parsing time value');
            timeRange = this.parseTimeValue(datetime);
            this.logger.debug(`found: ${moment.tz(timeRange.startTime, tz).format()} to ${moment.tz(timeRange.stopTime, tz).format()}.`);
          } else if (datetime.type === 'interval') {
            this.logger.debug('parsing time interval');
            timeRange = this.parseTimeRange(datetime);
            this.logger.debug(`found: ${moment.tz(timeRange.startTime, tz).format()} to ${moment.tz(timeRange.stopTime, tz).format()}.`);
          } else {
            this.logger.error(`Unknown datetime type ${datetime.type}.`);
          }
        }
        return {
          text,
          stripped: _.get(res, 'stripped'),
          datetime: _.get(res, 'datetime.value'),
          timeRange,
          app: _.get(res, 'app'),
        };
      });
  }

  /**
   * Classify a phrase
   *
   * @param {String} phrase
   *
   * @return {Intent}
   *
   * @memberOf Nlp
   */
  classify(text) {
    if (!this.trained) throw new this.pluginManager.davis.classes.Error('Cannot classify before training');
    const stems = this.tokenizeAndStem(text.toLowerCase());
    const probs = this.classifier.getClassifications(stems);
    const intent = (probs[0].value < this.threshold) ? 'unknown' : probs[0].label;
    return {
      intent,
      probabilities: _.take(probs, 3),
    };
  }

  /**
   * @typedef {Object} App
   * @property {String} _text - The original text
   * @property {String} body - The body of the stripped app text
   * @property {String} app - App name
   * @property {number} start - The start index of the body in the original text
   * @property {number} end - The end index of the body in the original text
   * @property {String} stripped - The text with the App stripped out
   * @memberOf Nlp
   */

  /**
   *
   * @typedef {Object} Intent
   * @property {String} text
   * @property {String} intent
   * @property {Array} probabilities
   * @memberOf Nlp
   */

  /**
   *
   * @typedef {Object} TimeRange
   * @property {Moment} startTime
   * @property {Moment} stopTime
   * @memberOf Nlp
   */

  /**
   *
   * @typedef {Object} NlpData
   * @property {String} text
   * @property {String} stripped
   * @property {Datetime} datetime
   * @property {TimeRange} timeRange
   * @property {App} app
   * @memberOf Nlp
   */

  /**
   * @typedef {Object} Datetime
   * @property {String} _text - The original text
   * @property {String} body - The body of the stripped datetime
   * @property {number} start - The start index of the body in the original text
   * @property {number} end - The end index of the body in the original text
   * @property {boolean} latent - Is this a latent datetime
   * @property {Object} entities - Object holding the datetime value
   * @memberOf Nlp
   */

  /**
   * @typedef {Object} StrippedDatetime
   * @property {String} stripped - The text with the body stripped out
   * @property {Datetime} value - The datetime entity
   * @memberOf Nlp
   */
}

module.exports = Nlp;
