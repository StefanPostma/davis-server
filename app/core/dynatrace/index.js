'use strict';

const rp = require('request-promise'),
    moment = require('moment-timezone'),
    _ = require('lodash'),
    BbPromise = require('bluebird'),
    S = require('string'),
    natural = require('natural'),
    logger = require('../../utils/logger');

const STRING_DISTANT_THRESHOLD = .75;

class Dynatrace {
    /**
     * Dynatrace API
     * @constructs Dynatrace
     * @param {string} tenantUrl - The URL for your tenant (https://example.live.dynatrace.com)
     * @param {string} apiKey - The API key authorized to make requests to the tenant
     * @param {Object} config - Davis config object
     * @param {boolean} validateCerts [true] - Allows a connection to self signed certs.  This is useful when connecting to a Dynatrace managed instance.
     */
    constructor(tenantUrl, apiKey, config, validateCerts) {
        this.validateCerts = (_.isNil(validateCerts)) ? true : validateCerts;
        this.url = tenantUrl + '/api/v1/';
        this.key = apiKey;
        this.config = config;

        this.options = (url, parameters) => {
            return {
                uri: this.url + url,
                strictSSL: this.validateCerts,
                qs: parameters || {},
                headers: {
                    Authorization: 'Api-Token ' + this.key
                },
                json: true
            };
        };
    }

    /**
     * Creates a standard time range object
     * @params {Object} datetime - The datetime object typically received from WIT.AI
     * @returns {Object} timerange
     * @static
     */
    static generateTimeRange(datetime) {
        let timeRange;

        try {
            if (_.isEmpty(datetime)) {
                return timeRange = null;
            } else if (datetime.type === 'value') {
                switch (datetime.grain) {
                case 'second':
                case 'minute':
                    timeRange = {
                        startTime: moment.parseZone(datetime.value).subtract(5, 'minutes'),
                        stopTime: moment.parseZone(datetime.value).add(5, 'minutes')
                    };
                    break;
                case 'hour':
                    timeRange = {
                        startTime: moment.parseZone(datetime.value).subtract(15, 'minutes'),
                        stopTime: moment.parseZone(datetime.value).add(15, 'minutes')
                    };
                    break;
                case 'day':
                    timeRange = {
                        startTime: moment.parseZone(datetime.value).startOf('day'),
                        stopTime: moment.parseZone(datetime.value).endOf('day')
                    };
                    break;
                case 'week':
                    timeRange = {
                        startTime: moment.parseZone(datetime.value).startOf('week'),
                        stopTime: moment.parseZone(datetime.value).endOf('week')
                    };
                    break;
                case 'month':
                    timeRange = {
                        startTime: moment.parseZone(datetime.value).startOf('month'),
                        stopTime: moment.parseZone(datetime.value).endOf('month')
                    };
                    break;
                default:
                    logger.error('Passed in an unknown granularity: ' + datetime.grain);
                }
            } else if (datetime.type === 'interval') {
                timeRange = {
                    startTime: datetime.from.value,
                    stopTime: datetime.to.value
                };
            }
        } catch (e) {
            throw new Error('Unable to extract a time range!');
        }
        return timeRange;
    }

    /************************************************************
     *                   Problem API Section
     * 
     *   https://help.ruxit.com/api-documentation/v1/problems/
     * 
     ***********************************************************/

    /**
     * @returns {Object} - a high level summary of problems
     */
    problemStatus() {
        return rp(this.options('problem/status'));
    }

    /**
     * @param {Object} [parameters] - Key/Value pair that becomes part of the query string
     * @returns {Object} - Problem feed
     */
    problemFeed(parameters) {
        return rp(this.options('problem/feed', parameters || {}));
    }

    /** 
     * @param {string} problemId - The specific ID of a problem.  This can typically be found in the problem feed.
     * @returns {Object} - Problem details
     */
    problemDetails(problemId) {
        if (typeof problemId === 'undefined') {
            throw new Error('You must provide a problem ID!');
        }
        return rp(this.options('problem/details/' + problemId));
    }

    /** 
     * @returns {Object} - Active problems only
     */
    activeProblems() {
        return rp(this.options('problem/feed', { status: 'open' }));
    }

    /**
     * Returns a filtered list of problems
     * @param {Object} [timeRange=null] - The timerange generated by generateTimeRange
     * @param {(string|string[])} [applications=null] - An application or array of applications
     * @returns {Promise}
     */
    getFilteredProblems(timeRange, applications) {

        return new BbPromise((resolve, reject) => {

            if (_.isNil(timeRange)) {
                logger.info('The user is interested in currently open problems');

                rp(this.options('problem/feed', { relativeTime: 'hour', status: 'open' }))
                    .then( response => {
                        logger.debug(`The prefiltered list is ${response.result.problems.length}`);
                        response.result.problems = _.filter(response.result.problems, problem => {
                            return filterApplicationProblems(applications, problem, this.config.aliases);
                        });
                        logger.debug(`The post filtered list is ${response.result.problems.length}`);

                        resolve(response);
                    })
                    .catch( err => {
                        reject(err);
                    });
            } else {
                logger.info('The user has requested problems from a specific timeframe');

                rp(this.options('problem/feed', getTimeFilter(timeRange.startTime)))
                    .then( response => {
                        logger.debug(`The prefiltered list is ${response.result.problems.length}`);
                        response.result.problems = _.filter(response.result.problems, problem => {
                            return isProblemInRange(timeRange.startTime, timeRange.stopTime, problem.startTime, problem.endTime) &&
                                filterApplicationProblems(applications, problem, this.config.aliases);
                        });
                        logger.debug(`The post filtered list is ${response.result.problems.length}`);

                        resolve(response);
                    })
                    .catch( err => {
                        reject(err);
                    });
            }
        });
    }  
}

/**
 * Helps filter the problem list based on application names
 * @param {(string|string[])} applications - An application or array of applications
 * @param {Problem} [currentTime]
 * @returns {boolean}
 */
function filterApplicationProblems(applications, problem, aliases) {
    if (!_.isNil(applications)) {
        if (_.isArray(applications)) {
            return _.some(applications, application => {
                return isApplicationAffected(application, problem, aliases);
            });
        } else {
            return isApplicationAffected(applications, problem, aliases);
        }
    } else {
        return true;
    }
}

/**
 * Used to create a query string parameter object for relative time
 * @param {(string|moment object)} [startTime] - The starting timestamp for the problems you're interested in
 * @param {(string|moment object)} [currentTime]
 * @returns {{relativeTime: *}} Returns a time filter that can be passed in a Dynatrace API request.
 */
function getTimeFilter(startTime, currentTime) {
    startTime = moment(startTime) || moment().subtract(10, 'minutes');
    currentTime = moment(currentTime) || moment();

    //assuming 31 days a month
    const intervals = {
        60: 'hour',
        120: '2hours',
        360: '6hours',
        1440: 'day',
        10080: 'week',
        44640: 'month'
    };

    const diff = currentTime.diff(startTime, 'minutes');

    for (let interval in intervals) {
        if (intervals.hasOwnProperty(interval) && diff < interval) {
            return { relativeTime: intervals[interval] };
        }
    }

    logger.warn('The user has requested data older than a month.');
    return { relativeTime: 'month' };
}

/**
 * Used to check if a problem was active during a certain timeframe
 * @param {(string|moment object)} requestStart - The start of the time range
 * @param {(string|moment object)} requestStop - The end of the time range
 * @param {(string|moment object)} problemStart - The start of the problem
 * @param {(string|moment object)} [problemStop] - The end of the problem
 * @returns {boolean} Returns true if a problem was active during the range
 */
function isProblemInRange(requestStart, requestStop, problemStart, problemStop) {
    requestStart = moment(requestStart);
    requestStop = moment(requestStop);
    problemStart = moment(problemStart);

    if (_.isNil(problemStop) || problemStop === -1) {
        if (problemStart.isSameOrBefore(requestStop)) {
            return true;
        } else {
            return false;
        }
    }

    problemStop = moment(problemStop);
    if ((requestStart.isSameOrBefore(problemStop)) && (requestStop.isSameOrAfter(problemStart))) {
        return true;
    }
    return false;
}

/**
 * Used to check if an application was affected by a problem
 * @param {string} appName - The name of the application
 * @param {Object} problem - The problem to analysis
 * @returns {Boolean} Returns true if the application was affected by the problem.
 */
function isApplicationAffected(appName, problem, aliases) {
    let appAffected = false;

    if (problem.impactLevel === 'APPLICATION') {
        // Checking the user defined alias list for a match
        let alias = _.find(aliases.applications, application => {
            return appName.toLowerCase() === application.name.toLowerCase() ||
                _.some(application.aliases, alias => {
                    return appName.toLowerCase() === alias.toLowerCase();
                });
        });

        if (alias !== undefined) {
            // Sets appAffected to true only if an exact match is found
            appAffected = _.some(problem.rankedImpacts, impact => {
                return (impact.impactLevel === 'APPLICATION') && (alias.name.toLowerCase() === impact.entityName.toLowerCase());
            });
        } else {
            logger.verbose('Please consider updating the aliases list!');

            appAffected = _.some(problem.rankedImpacts, impact => {
                if (impact.impactLevel === 'APPLICATION') {
                    let applicationAffected = S(impact.entityName).humanize().s,
                        applicationSearched = S(appName).humanize().s,
                        distance = natural.JaroWinklerDistance(applicationAffected, applicationSearched);

                    if (distance > STRING_DISTANT_THRESHOLD) {
                        logger.verbose(`'${applicationSearched}' and '${applicationAffected}' have a distance of ${distance}`);
                        return true;
                    }
                }
                return false;
            });
        }
    }
    return appAffected;
}

module.exports = Dynatrace;