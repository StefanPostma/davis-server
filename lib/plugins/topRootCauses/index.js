'use strict';

const _ = require('lodash');

class TopRootCauses {
  constructor(davis, options) {
    this.davis = davis;
    this.options = options;

    this.intents = {
      topRootCauses: {
        title: 'Discover the top root causes in a time range',
        usage: 'Ask about current or historical time ranges',
        examples: [
          'What were the top root causes in the last 24 hours?',
          'What are the top root causes affecting my application?',
        ],
        phrases: [
          'What were the top root causes {{DATETIME}}',
          'What are the top root causes affecting {{APP}}',
          'What are the top root causes affecting {{APP}} {{DATETIME}}',
        ],
        lifecycleEvents: [
          'topRootCauses',
        ],
        clarification: 'I think you were asking about root causes.',
      },
    };

    this.hooks = {
      'topRootCauses:topRootCauses': this.topRootCauses.bind(this),
    };
  }

  topRootCauses(exchange, context) {
    const th = this.davis.textHelpers;
    const VB = this.davis.classes.VB;

    exchange
      .setTarget('eventDetails');

    if (!exchange.explicitTimeRange()) {
      exchange.forceTimeRange('1w');
    }

    const timeRange = new VB.TimeRange(exchange.getTimeRange());
    const app = (context.app) ? new VB.Alias(context.app) : null;

    return this.davis.dynatrace.getFilteredProblems(exchange)
      .then((ret) => {
        const problems = ret.toArray();
        const names = {};

        // Get a list of all root cause events
        const rooted = problems.filter(p => p.hasRootCause);
        const roots = _.flatMap(rooted, problem => problem.rankedEvents)
          .filter(event => event.isRootCause);

        if (roots.length === 0) {
          // no app, no range
          if (!app && exchange.forcedRange) {
            return ['In the past week, there were no problems with detectable root causes.'];
          }

          // no app, range
          if (!app && !exchange.forcedRange) {
            return [timeRange, ',', 'there were no problems with detectable root causes.'];
          }

          // app, no range
          if (app && exchange.forcedRange) {
            return ['In the past week, there were no problems that affected', app, 'with detectable root causes.'];
          }

          // app, range
          return [timeRange, ',', 'there were no problems that affected', app, 'with detectable root causes.'];
        }

        roots.forEach((root) => {
          names[root.entityId] = root.entityName;
        });

        // Get all major groupings
        const eventTypes = _.groupBy(roots, 'eventType');
        const entities = _.groupBy(roots, 'entityId');
        // const eventsOnEntities = _.groupBy(roots, root => `${root.entityId}:${root.eventType}`);
        // const impactLevels = _.groupBy(roots, 'impactLevel');
        // const severities = _.groupBy(roots, 'severityLevel');

        const mostCommon = th.humanize(_.maxBy(_.keys(eventTypes), type =>
              eventTypes[type].length));
        const entityId = _.maxBy(_.keys(entities), entity => entities[entity].length);
        const entity = this.davis.pluginManager.getAliasById(entityId);
        const entityName = (entity) ? new VB.Alias(entity) : names[entityId];
        const entityType = entityId.split('-')[0].toLowerCase();

        // const eventOnEntity = _.maxBy(_.keys(eventsOnEntities), event =>
            // eventsOnEntities[event].length);

        // const top = {
          // entity: eventOnEntity.split(':')[0],
          // event: th.humanize(eventOnEntity.split(':')[1]),
        // };

        // top.entity = this.davis.pluginManager.getAliasById(top.entity) || names[top.entity];

        // if (!_.isString(top.entity)) {
          // top.entity = new VB.Alias(top.entity);
        // }

        // no app, no range
        if (!app && exchange.forcedRange) {
          // return ['In the past week, the most common root cause was', top.event, 'on', top.entity, ',', 'which occurred', eventsOnEntities[eventOnEntity].length, 'times.'];
          return ['In the past week, the most common event type was', mostCommon, ',', 'and the', entityType, 'that caused the most problems was', entityName, '.'];
        }

        // no app, range
        if (!app && !exchange.forcedRange) {
          // return [timeRange, ',', 'the most common root cause was', top.event, 'on', top.entity, ',', 'which occurred', eventsOnEntities[eventOnEntity].length, 'times.'];
          return [timeRange, ',', 'the most common event type was', mostCommon, ',', 'and the', entityType, 'that caused the most problems was', entityName, '.'];
        }

        // app, no range
        if (app && exchange.forcedRange) {
          // return ['In the past week, the most common root cause to affect', app, 'was', top.event, 'on', top.entity, ',', 'which occurred', eventsOnEntities[eventOnEntity].length, 'times.'];
          return ['In the past week, the most common event type was', mostCommon, ',', 'and the', entityType, 'that caused the most problems was', entityName, '.'];
        }

        // app, range
        // return [timeRange, ',', 'the most common root cause to affect', app, 'was', top.event, 'on', top.entity, ',', 'which occurred', eventsOnEntities[eventOnEntity].length, 'times.'];
        return [timeRange, ',', 'the most common event type to affect', app, ' was', mostCommon, ',', 'and the', entityType, 'that caused the most problems was', entityName, '.'];
      })
      .then((response) => {
        exchange.response(VB.stringify(response));
      });
  }

}

module.exports = TopRootCauses;

