'use strict';

const _ = require('lodash');

class UserActivity {
  constructor(davis, options) {
    this.davis = davis;
    this.options = options;

    this.intents = {
      userActivity: {
        usage: 'Ask about current activity levels',
        examples: [
          'Tell me about user activity.',
          'What is the current user activity for my application?',
          'What were user activity levels like yesterday?',
        ],
        phrases: [
          'tell me about user activity',
          'tell me about user activity {{DATETIME}}',
          'update me on user activity',
          'can you tell me about user activity levels {{DATETIME}}?',
          'tell me about use activity on {{APP}} {{DATETIME}}',
          'give me an update on user activity',
          'use activity {{APP}} {{DATETIME}}',
          'user activity {{APP}} {{DATETIME}}',
          'what is the current user activity',
        ],
        lifecycleEvents: [
          'userActivity',
        ],
        clarification: 'I think you were asking about user activity.',
      },
    };

    this.hooks = {
      'userActivity:userActivity': (exchange) => {
        const nlp = exchange.getNlpData();

        let result;
        let entity;
        let appName;

        const params = {
          timeseriesId: 'com.dynatrace.builtin:app.useractionsperminute',
          queryMode: 'series',
          aggregationType: 'count',
          entity: _.get(nlp, 'app.app.entityId'),
        };

        return this.davis.dynatrace.getFilteredTimeseriesData(exchange, params)
          .then(res => {
            result = res;
            appName = (_.get(nlp, 'app.name') || (result.entities.length === 1)) ? result.entities[Object.keys(result.entities)[0]] : null;
            entity = (appName) ? _.find(this.davis.pluginManager.entities.applications, { name: appName })
              : _.find(this.davis.pluginManager.entities.applications, { entityId: _.get(res, 'stats.maxMean.entity') });
            if (_.isNil(entity)) return this.noAppResponse(exchange, result, res);
            params.entity = entity.entityId;
            params.relativeTime = '30mins';
            params.predict = 'true';
            return this.davis.dynatrace.getFilteredTimeseriesData(exchange, params);
          })
          .then(res => {
            return (appName) ? this.appResponse(exchange, result, res, entity)
              : this.noAppResponse(exchange, result, res, entity);
          });
      },
    };
  }

  appResponse(exchange, data, dataPredict, app) {
    const VB = this.davis.classes.VB;
    const stats = data.stats[app.entityId];

    const nlp = exchange.getNlpData();


    if (data.stats.maxMean.value === 0) {
      return this.noActivity(exchange, app);
    }

    const pointPredict = dataPredict.dataPoints[app.entityId];
    let averagePredict = Math.ceil(pointPredict[pointPredict.length - 1][1]);
    if (averagePredict < 0) averagePredict = 0;

    const timeRange = new VB.TimeRange(nlp.timeRange, exchange.user.timezone);
    const alias = new VB.Alias(app);
    const mints = new VB.TimeStamp(stats.minTime, exchange.user.timezone);
    const maxts = new VB.TimeStamp(stats.maxTime, exchange.user.timezone);

    const text = [timeRange, alias, 'experienced an average load of',
      stats.average, 'user actions', 'per minute. The greatest load was',
      stats.max, 'user actions per', 'minute', maxts, '.',
      'The least active time was', mints, 'when', stats.min,
      'user actions occurred.', 'In the next half hour,',
      'expect around', averagePredict,
      'user actions per minute.'];

    const out = {
      say: VB.audible(text),
      show: VB.stringify(text),
      text: VB.slackify(text),
    };

    return exchange
      .setLinkUrl(this.davis.linker.userActivity(app.entityId, exchange.getTimeRange()))
      .response(out);
  }

  noAppResponse(exchange, data, dataPredict, app) {
    const VB = this.davis.classes.VB;
    const nlp = exchange.getNlpData();
    this.davis.logger.debug('No app found, searching for application with highest activity.');
    if (data.stats.maxMean.value === 0) {
      return this.noActivity(exchange);
    }

    if (_.isNil(app) || _.isNil(app.entityId) || _.isNil(data.stats.maxMean.entity)) {
      return exchange.response('No user activity data found.').skipFollowUp();
    }

    const pointPredict = dataPredict.dataPoints[app.entityId];
    let averagePredict = Math.ceil(pointPredict[pointPredict.length - 1][1]);
    if (averagePredict < 0) averagePredict = 0;

    const stats = data.stats[app.entityId];

    const timeRange = new VB.TimeRange(nlp.timeRange, exchange.user.timezone);
    const alias = (app) ? new VB.Alias(app) : data.stats[data.stats.maxMean.entity].name;
    const mints = new VB.TimeStamp(stats.minTime, exchange.user.timezone);
    const maxts = new VB.TimeStamp(stats.maxTime, exchange.user.timezone);

    const text = [timeRange, alias, 'was your most active application,',
      'experiencing an average load of', stats.average, 'user actions',
      'per minute. The greatest load was', stats.max, 'user actions per',
      'minute', maxts, '.', 'The least active time was', mints, 'when',
      stats.min, 'user actions occurred.', 'In the next half hour,',
      'expect around', averagePredict,
      'user actions per minute.'];

    const out = {
      say: VB.audible(text),
      show: VB.stringify(text),
      text: VB.slackify(text),
    };

    return exchange
      .setLinkUrl(this.davis.linker.userActivity(app.entityId, exchange.getTimeRange()))
      .response(out);
  }

  noActivity(exchange, app) {
    const VB = this.davis.classes.VB;
    const nlp = exchange.getNlpData();
    const timeRange = new VB.TimeRange(nlp.timeRange, exchange.user.timezone);

    if (app) {
      const alias = new VB.Alias(app);
      const text = [timeRange, alias, 'did not experience any user actions'];
      return {
        say: VB.audible(text),
        show: VB.slackify(text),
        text: VB.stringify(text),
      };
    }

    const text = [timeRange, 'none of your apps experienced any user actions'];
    return {
      say: VB.audible(text),
      show: VB.slackify(text),
      text: VB.stringify(text),
    };
  }
}

module.exports = UserActivity;
