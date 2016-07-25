'use strict';

const moment = require('moment-timezone'),
    _ = require('lodash'),
    S = require('string'),
    logger = require('../../../utils/logger'),
    events = require('../../../config/internal-aliases');

require('moment-round');

/************************************************************
 *                   Nunjucks Filter Section
 * 
 *   https://mozilla.github.io/nunjucks/api.html#custom-filters
 * 
 ***********************************************************/
const filters = function(env, aliases) {
    /**
     * @param {Object} entity
     * @param {string} displayName - undefined, 'say' or 'show'
     */
    env.addFilter('friendlyEntityName', function(entity, displayType) {
        return getFriendlyEntityName(aliases, getEntityType(entity), entity.entityName, displayType);
    });

    env.addFilter('friendlyTime', function(time, user) {
        //return moment.tz(time, timezone).floor(5, 'minutes').format('h:mm A');
        return moment.tz(time, user.timezone).floor(5, 'minutes').calendar(null , {
            sameDay: '[today around] h:mm A',
            lastDay: '[yesterday around] h:mm A',
            lastWeek: 'dddd [around] h:mm A'
        });
    });

    env.addFilter('friendlyEvent', function(eventName) {
        let event = _.find(events.events, e => e.name === eventName);

        if (_.isNil(event)) {
            logger.warn(`Unable to find a friendly event for '${eventName}'!  Please consider adding one.`);
            return S(eventName).humanize().s.toLowerCase();
        } else  {
            return _.sample(event.friendly);
        }
    });
};

function getEntityType(entity) {
    if (entity.impactLevel === 'APPLICATION') {
        return 'applications';
    } else if (entity.impactLevel === 'SERVICE') {
        return 'services';
    } else if (entity.impactLevel === 'INFRASTRUCTURE') {
        return 'infrastrcture';
    } else {
        logger.warn(`Unknown inpact level: ${entity.impactLeve}`);
        return;
    }
}

function getFriendlyEntityName(aliases, type, name, displayType) {
    // Strips off any port numbers if they exist
    let modifiedName = name.toLowerCase().split(':')[0];

    let alias = _.find(aliases[type], function(o) {
        // ToDo Add a case insensitive include
        return o.name.toLowerCase() === name.toLowerCase() ||
            o.name.toLowerCase() === modifiedName || 
            _.includes(o.aliases, name);
    }) || null;

    if (!_.isNull(alias)) {
        logger.debug(`Found a user defined ${type} alias for ${name}.`);
        // Returning the alias display type if defined otherwise returning the name
        if (_.isNil(displayType)) {
            return alias.name;
        } else {
            return _.get(alias, `display.${displayType}`, alias.name);
        }
    } else {
        logger.warn(`Unable to find a user defined alias for '${name}'!  Please consider adding one.`);
        return S(name).humanize().s.toLowerCase();
    }
}

module.exports = filters;