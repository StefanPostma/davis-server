'use strict';

const _ = require('lodash');
const moment = require('moment-timezone');
const rp = require('request-promise');
const BbPromise = require('bluebird');
const Problems = require('./Problems');
const events = require('./events');

class Dynatrace {
  constructor(davis) {
    this.logger = davis.logger;
    this.config = davis.config;
    this.event = davis.event;
    this.events = events;

    this.davis = davis;
  }

  _get(url, parameters) {
    const baseUrl = this.config.getDynatraceApiUrl();

    return this._interact({
      uri: `${baseUrl}/api/v1/${url}`,
      qs: parameters || {},
    });
  }

  _post(url, body) {
    const baseUrl = this.config.getDynatraceApiUrl();

    return this._interact({
      method: 'POST',
      uri: `${baseUrl}/api/v1/${url}`,
      body,
    });
  }

  _interact(options, retry) {
    const dynatrace = this.config.getDynatraceTokens();
    const validateCerts = this.config.getDynatraceValidateCert();
    const index = _.get(retry, 'index', dynatrace.active);
    const remainingAttempts = _.get(retry, 'remainingAttempts', dynatrace.tokens.length - 1);
    const token = dynatrace.tokens[index];

    _.merge(options, {
      strictSSL: validateCerts,
      headers: {
        Authorization: `Api-Token ${token}`,
      },
      json: true,
      timeout: 20000,
      transform: (body, response, resolveWithFullResponse) => {
        // Adds response time information to logs
        const path = response.req.path.split('?')[0];
        this.logger.info(`DYNATRACE API: ${path} ${response.statusCode} - ${response.elapsedTime} ms`);
        return resolveWithFullResponse || !/^2/.test(`${response.statusCode}`) ? response : body;
      },
      time: true,
      followRedirect: false,
    });

    return BbPromise.try(() => {
      if (_.isEmpty(token)) throw new this.davis.classes.Error('The Dynatrace API token is undefined!');
    })
      .then(() => rp(options))
      .then((res) => {
        if (index !== dynatrace.active) {
          this.logger.info(`Changing active token from ${dynatrace.active} to ${index}.`);
          this.config.setDynatraceActiveToken(index);
        }
        return res;
      })
      .catch((err) => {
        if (err.statusCode === 302 || err.statusCode === 307) {
          options.uri = err.response.headers.location;
          this.logger.debug(`Redirecting to ${err.response.headers.location}`);
          delete options.qs;
          return this._interact(options, retry);
        } else if (err.statusCode === 400) {
          if (_.has(err, 'response.error.message')) {
            throw new this.davis.classes.Error(`Unable to contact Dynatrace!  ${err.response.error.message}`);
          }
          throw new this.davis.classes.Error('Unable to contact Dynatrace!  Are you sure you set the correct URL?');
        } else if (err.statusCode === 401) {
          // Indexes shouldn't be the same
          if (dynatrace.tokens.length > 0 && (remainingAttempts > 0)) {
            const newIndex = (index + 1) % dynatrace.tokens.length;
            return this._interact(options, { index: newIndex, remainingAttempts: remainingAttempts - 1 });
          }
          throw new this.davis.classes.Error('The configured Dynatrace API token is invalid!');
        } else if (err.name === 'DavisError') {
          throw err;
        } else if (err.error && err.error.code === 'ENOENT') {
          throw new this.davis.classes.Error('Unable to contact Dynatrace!  Are you sure you have an active network connection?');
        } else {
          this.logger.error(`Dynatrace responded with an unhandled status code of ${err.statusCode}.`);
          throw new this.davis.classes.Error('Unfortunately, there was an issue communicating with Dynatrace.');
        }
      });
  }

  /** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** **
   *            Topology and Smartscape API Section
   *
   *   https://help.dynatrace.com/api-documentation/v1/topology/
   *
   ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** **/
  getAllEntities() {
    return this._get('entity');
  }

  getApplicationEntities() {
    return this._get('entity/applications')
      .then(res => _.filter(res, app => app.applicationType !== 'SYNTHETIC'));
  }

  getServiceEntities() {
    return this._get('entity/services');
  }

  getInfrastructureEntities() {
    return this._get('entity/infrastructure/hosts');
  }

  /** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** **
   *                   Problem API Section
   *
   *   https://help.ruxit.com/api-documentation/v1/problems/
   *
   ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** **/

  /**
   * @returns {Object} - a high level summary of problems
   */
  problemStatus() {
    return this._get('problem/status');
  }

  /**
   * @param {Object} [parameters] - Key/Value pair that becomes part of the query string
   * @returns {Object} - Problem feed
   */
  problemFeed(parameters) {
    return this._get('problem/feed', parameters);
  }

  /**
   * @param {string} problemId - The specific ID of a problem.
   * @returns {Object} - Problem details
   */
  problemDetails(problemId) {
    return BbPromise.try(() => {
      if (typeof problemId === 'undefined') {
        throw new this.davis.classes.Error('You must provide a problem ID!');
      }
    })
    .then(() => this.davis.models.ProblemDetails.findOne({ id: problemId }))
    .then((detail) => {
      if (detail) {
        return detail;
      }
      return this._get(`problem/details/${problemId}`);
    })
    .then((detail) => {
      if (!detail._id) {
        if (detail.result.status === 'OPEN') return detail.result;
        const newDetail = new this.davis.models.ProblemDetails(detail.result);
        return newDetail.save();
      }
      return detail;
    })
    .then(d => (d.toObject && d.toObject()) || d);
  }

  /**
   * @param {string} problemId - The specific ID of a problem.
   * @returns {Object} - Comments
   */
  getCommentsOnProblem(problemId) {
    return BbPromise.try(() => {
      if (typeof problemId === 'undefined') {
        throw new this.davis.classes.Error('You must provide a problem ID!');
      }
    }).then(() => this._get(`problem/details/${problemId}/comments`));
  }

  /**
   * @param {Object} exchange - The current exchange object.
   * @param {string} problemId - The specific ID of a problem.
   * @param {string} comment - The comment you would like to add to the problem.
   * @returns {Promise}
   */
  addCommentToProblem(exchange, problemId, comment) {
    const context = `Davis - ${exchange.getRequestSource()}`;
    return BbPromise.try(() => {
      if (typeof problemId === 'undefined') {
        throw new this.davis.classes.Error('You must provide a problem ID!');
      } else if (typeof comment === 'undefined') {
        throw new this.davis.classes.Error('You must provide a comment!');
      }
    }).then(() => this._post(`problem/details/${problemId}/comments`, { comment, user: exchange.getUserIdentifier(), context }));
  }

  /**
   * @returns {Object} - Active problems only
   */
  activeProblems() {
    return this._get('problem/feed', { status: 'open' });
  }

  getFilteredProblems(exchange, forceFilter) {
    const timerange = exchange.getTimeRange();
    const app = _.get(exchange, 'model.request.analysed.app', {});
    const filter = forceFilter || {};

    if (_.isNil(forceFilter)) {
      if (_.isNil(timerange.startTime)) {
        filter.status = 'OPEN';
      } else {
        filter.relativeTime = this._getTimeFilter(timerange.startTime);
        this.logger.debug(`Getting problems for the past ${filter.relativeTime} from the Dynatrace API.`);
      }
    }

    return BbPromise.resolve()
      .then(() => this.problemFeed(filter))
      .then(res => res.result.problems)
      .then((problems) => {
        this.logger.debug(`The pre-filtered problem list is ${problems.length}.`);
        if (_.isNil(forceFilter)) {
          return this._filterProblemsByTime(timerange, problems);
        }
        return problems;
      })
      .then(problems => // eslint-disable-line
        (app.name) ?
          problems :
          this._filterProblemsByDavisFilters(exchange, problems))
      .then(problems => this._filterProblemsByApps(app, problems))
      // Grab the problemdetails for any problem with a root cause
      .then((problems) => {
        const details = problems.map((problem) => {
          if (problem.hasRootCause) {
            return this.problemDetails(problem.id);
          }
          return null;
        });
        return [problems, BbPromise.all(details)];
      })
      // Merge the problem details into the problem non-recursively, overwriting any conflicting fields
      .spread((problems, details) =>
        problems.map(problem =>
          _.assign(problem, _.find(details, { id: problem.id }))))
      .then((problems) => {
        this.logger.debug(`The post-filtered problem list is ${problems.length}.`);
        return new Problems(this.davis, problems);
      });
  }

  /** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** **
   *                   Timeseries API Section
   *
   *   https://help.ruxit.com/api-documentation/v1/timeseries/
   *
   ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** **/

  /**
   * @param {Object} [parameters] - Key/Value pair that becomes part of the query string
   * @returns {Object} - Timeseries data
   */
  getTimeseriesData(parameters) {
    return this._get('timeseries', parameters);
  }

  getFilteredTimeseriesData(exchange, parameters) {
    // TODO add global filtering options
    const timerange = _.get(exchange, 'model.request.analysed.timeRange', {});
    const filter = {};

    if (parameters.relativeTime) {
      filter.relativeTime = parameters.relativeTime;
    } else if (_.isNil(timerange.startTime)) {
      filter.relativeTime = parameters.relativeTime || 'day';
      _.set(exchange, 'model.request.analysed.timeRange.startTime', moment().subtract(1, 'd').valueOf());
      _.set(exchange, 'model.request.analysed.timeRange.stopTime', moment().valueOf());
    } else {
      filter.startTimestamp = timerange.startTime;
      filter.endTimestamp = timerange.stopTime;
    }

    // Allows users to override the default settings if they want.
    _.assign(filter, parameters);

    return BbPromise.try(() => {
      if (!_.isString(parameters.timeseriesId)) {
        throw new this.davis.classes.Error('You must provide a timeseries ID!');
      }
    })
    .then(() => [this.getTimeseriesData(filter), this.davis.filters.getFiltersByScope(exchange.getScope(), 'QUESTION')])
    .spread((result, filters) => {
      this.logger.debug(`Evaluating ${filters.length} filter(s) for timeseries`);

      if (_.get(exchange.getNlpData(), 'app.app')) {
        return result.result;
      }

      const entities = Object.keys(result.result.entities);
      if (entities.length === 0) return result.result;
      if (filters.length === 0) return result.result;

      const filterEntities = _.flatten(_.map(filters, f => f.entity));
      if (filterEntities.length === 0) return result.result;


      const applicationFilterEntities = _.map(_.filter(filterEntities, entity =>
        entity.category === 'applications'), app => app.entityId);

      const serviceFilterEntities = _.map(_.filter(filterEntities, entity =>
        entity.category === 'services'), app => app.entityId);

      if (/^APPLICATION/.test(entities[0])) {
        // treat as application filter
        if (applicationFilterEntities.length === 0) return result.result;

        exchange.filtered = true;
        return {
          dataPoints: _.pick(result.result.dataPoints, applicationFilterEntities),
          timeseriesId: result.result.timeseriesId,
          unit: result.result.unit,
          entities: _.pick(result.result.entities, applicationFilterEntities),
          resolutionInMillisUTC: result.result.resolutionInMillisUTC,
          aggregationType: result.result.aggregationType,
        };
      } else if (/^SERVICE/.test(entities[0])) {
        // treat as service filter
        if (serviceFilterEntities.length === 0) return result.result;

        exchange.filtered = true;
        return {
          dataPoints: _.pick(result.result.dataPoints, serviceFilterEntities),
          timeseriesId: result.result.timeseriesId,
          unit: result.result.unit,
          entities: _.pick(result.result.entities, serviceFilterEntities),
          resolutionInMillisUTC: result.result.resolutionInMillisUTC,
          aggregationType: result.result.aggregationType,
        };
      }


      // fall back on returning the raw results
      // should never hit this line
      this.logger.warn(`unhandled entity type detected ${entities[0]}`);
      exchange.filtered = false;
      return result.result;
    })
    .then((result) => {
      const entities = Object.keys(result.dataPoints);
      result.stats = {};
      entities.forEach((entity) => {
        const stats = this._extract(result.dataPoints, entity);
        result.stats[entity] = stats;
        result.stats[entity].name = result.entities[entity];
        if (!result.stats.maxMean || result.stats.maxMean.value < stats.average) {
          result.stats.maxMean = {
            entity,
            value: stats.average,
          };
        }

        if (!result.stats.minMean || result.stats.minMean.value > stats.average) {
          result.stats.minMean = {
            entity,
            value: stats.average,
          };
        }
      });
      return result;
    });
  }

  /** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** **
   *                    Helper functions
   *
   ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** **/

  /**
   * Used to create a query string parameter object for relative time
   *
   * @param {(string|Object<Moment>)} [start] - The starting timestamp for the problems you're interested in
   * @returns {{relativeTime: *}} Returns a time filter that can be passed in a Dynatrace API request.
   *
   */
  _getTimeFilter(start) {
    const startTime = (start) ? moment(start) : moment().subtract(10, 'minutes');
    const diff = moment().diff(startTime, 'minutes');

    let relativeTime;
    if (diff <= 60) {
      relativeTime = 'hour';
    } else if (diff <= 120) {
      relativeTime = '2hours';
    } else if (diff <= 360) {
      relativeTime = '6hours';
    } else if (diff <= 1440) {
      relativeTime = 'day';
    } else if (diff <= 10080) {
      relativeTime = 'week';
    } else if (diff <= 44640) {
      relativeTime = 'month';
    } else {
      this.logger.warn('The user has requested data older than a month.');
      relativeTime = 'month';
    }

    return relativeTime;
  }

  _filterProblemsByTime(timerange, problems) {
    // No need to filter if a timerange wasn't provided
    if (_.isNil(timerange)) return problems;

    const filteredProblems = _.filter(problems, problem => this._isProblemInRange(timerange.startTime, timerange.stopTime, problem.startTime, problem.endTime));
    return filteredProblems;
  }

  _filterProblemsByDavisFilters(exchange, problems) {
    return this.davis.filters.getFiltersByScope(exchange.getScope(), 'QUESTION')
      .then((filters) => {
        if (filters.length > 0) {
          this.logger.debug(`Evaluating ${filters.length} filter(s).`);
          exchange.filtered = true;
          return _.filter(problems, (problem) => {
            for (const filter of filters) {
              if (filter.problemMatch(problem)) {
                this.logger.debug(`The filter '${filter.name}' matched ${problem.id}.`);
                return true;
              }
            }
            return false;
          });
        }
        this.logger.debug('No filter found.');
        return problems;
      });
  }

  _filterProblemsByApps(inp, res) {
    const app = inp || {};
    const name = app.name;
    if (_.isNil(name)) return res;

    const problems = _.filter(res, (problem) => {
      let impacted = false;
      const impacts = _.filter(problem.rankedImpacts, impact => impact.entityName === name);
      if (impacts.length !== 0) {
        impacted = true;
      }
      return impacted;
    });
    this.logger.debug(`Filtering problems by app: ${name}.`);
    return problems;
  }

  /**
  * Used to check if a problem was active during a certain time frame
  *
  * @param {(string|Object<Moment>)} requestStart - The start of the time range
  * @param {(string|Object<Moment>)} requestStop - The end of the time range
  * @param {(string|Object<Moment>)} problemStart - The start of the problem
  * @param {(string|Object<Moment>)} [problemStop] - The end of the problem
  * @returns {boolean} Returns true if a problem was active during the range
  *
  */
  _isProblemInRange(requestStart, requestStop, problemStart, problemStop) {
    const momentRequestStart = moment(requestStart);
    const momentRequestStop = moment(requestStop);
    const momentProblemStart = moment(problemStart);

    if (_.isNil(problemStop) || problemStop === -1) {
      return momentProblemStart.isSameOrBefore(requestStop);
    }

    const momentProblemStop = moment(problemStop);
    return momentRequestStart.isSameOrBefore(momentProblemStop)
      && momentRequestStop.isSameOrAfter(momentProblemStart);
  }

  /**
   * Used to extract min/max/mean and their timestamps from timeseries data
   * for a given entity id
   */
  _extract(data, appId) {
    const appData = data[appId];

    if (_.isNil(appData) || appData.length === 0) {
      return null;
    }
    const activity = _.map(appData, (dp) => {
      let datapoint = dp[1];
      if (typeof datapoint === 'string') {
        datapoint = (datapoint === 'AVAILABLE') ? 1 : 0;
      }
      return [dp[0], Number(datapoint)];
    });
    const min = _.minBy(activity, dp => dp[1]);
    const max = _.maxBy(activity, dp => dp[1]);
    const mean = _.meanBy(activity, dp => dp[1]);
    return {
      average: _.round(mean),
      min: _.round(min[1]),
      minTime: min[0],
      max: _.round(max[1]),
      maxTime: max[0],
    };
  }
}

module.exports = Dynatrace;
