'use strict';

const nunjucks = require('nunjucks');
const _ = require('lodash');
const moment = require('moment-timezone');
const S = require('string');
const events = require('../../Dynatrace/events');

require('moment-round');

// Date formatting
const startFormat = {
  normal: {
    sameDay: '[today] h:mm A',
    lastDay: '[yesterday] h:mm A',
    lastWeek: 'dddd [at] h:mm A',
    sameElse: 'MM/DD/YYYY [at] h:mm A',
  },
  between: {
    sameDay: '[today between] h:mm A',
    lastDay: '[yesterday between] h:mm A',
    lastWeek: '[between] dddd [at] h:mm A',
    sameElse: '[between] MM/DD/YYYY [at] h:mm A',
  },
};

const stopFormat = {
  normal: {
    sameDay: '[today] h:mm A',
    lastDay: '[yesterday] h:mm A',
    lastWeek: 'dddd [at] h:mm A',
    sameElse: 'MM/DD/YYYY [at] h:mm A',
  },
  sameday: {
    sameDay: 'h:mm A',
    lastDay: 'h:mm A',
    lastWeek: 'dddd [at] h:mm A',
    sameElse: 'MM/DD/YYYY [at] h:mm A',
  },
};

/**
 * Entity's alias if one exists under demo/aliases/applications.js
 * @param {Object} name
 * @param {String} displayType - undefined, 'audible' or 'visual'
 * @return {String}
 */
function friendlyApplicationName(name) {
  // const type = displayType || 'audible';
  // return getFriendlyEntityName(aliases, 'applications', name, type);
  const appName = name.split(':')[0];
  return S(appName).humanize().titleCase().s;
}

/**
 * Entity's alias if one exists under demo/aliases/
 * @param {Object} entity
 * @param {String} displayType - undefined, 'audible' or 'visual'
 * @return {String} getFriendlyEntityName()
 */
function friendlyEntityName(entity) {
  // const type = displayType || 'audible';
  const eventName = entity.entityName.split(':')[0];
  return S(eventName).humanize().s.toLowerCase();
  // return this.getFriendlyEntityName(aliases, getEntityType(entity), entity.entityName, type);
}

function friendlyEvent(eventName) {
  const event = _.find(events, e => e.name === eventName);

  if (_.isNil(event)) {
    // this.davis.logger.warn(`unable to find a friendly event for ${eventName}`);
    return S(eventName).humanize().s.toLowerCase();
  }
  return _.sample(event.friendly);
}

/**
 * Friendly problem status
 * @param {String} status - OPEN or CLOSED
 */
function friendlyStatus(status) {
  let response;
  if (status.toUpperCase() === 'OPEN') {
    response = _.sample(['ongoing', 'active']);
  } else {
    response = _.sample(['closed', 'finished']);
  }
  return response;
}

/**
 * Formatted version of a date, taking into account the user's timezone
 * @param {String} time
 * @param {Object} user
 * @param {String} displayType - undefined, 'audible' or 'visual'
 * @return {String} moment.tz().cal() - Moment JS timezone and calendar format
 */
function time(timestamp, user, displayType) {
  if (timestamp === -1) {
    return 'recently';
  }
  if (displayType === 'visual') {
    const fallback = moment.tz(timestamp, user.timezone).calendar(null, {
      sameDay: '[today at] h:mm A z',
      lastDay: '[yesterday at] h:mm A z',
      lastWeek: 'dddd [at] h:mm A z',
    });
    return `<!date^${moment.tz(timestamp, user.timezone).unix()}^{date_short_pretty} at {time}|${fallback}>`;
  }
  return moment.tz(timestamp, user.timezone).calendar(null, {
    sameDay: '[today at] h:mm A',
    lastDay: '[yesterday at] h:mm A',
    lastWeek: 'dddd [at] h:mm A',
  });
}

function capitalizeFirstCharacter(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function capitalizeFirstCharacters(text) {
  let title = text;
  const titleArray = title.split(' ');
  if (titleArray[0] === 'a') {
    titleArray[0] = '';
  }
  title = '';
  titleArray.forEach((word) => {
    title += `${capitalizeFirstCharacter(word)} `;
  });
  return title.trim();
}

/**
 * Formatted version of a date with time rounded down to nearest multiple of 5
 * taking into account the user's timezone
 * @param {String} time
 * @param {Object} user
 * @param {String} displayType - undefined, 'audible' or 'visual'
 * @return {String} moment.tz().floor().cal() - Moment JS timezone, floor, and calendar format
 */
function friendlyTime(timeExpression, user, displayType) {
  // Checks for an incorrect timeExpression and chooses a reasonable default
  if (timeExpression === -1) {
    return 'recently';
  } else if (displayType === 'visual') {
    return moment.tz(timeExpression, user.timezone).floor(5, 'minutes').calendar(null, {
      sameDay: '[around] h:mm A z',
      lastDay: '[yesterday around] h:mm A z',
      lastWeek: 'dddd [around] h:mm A z',
    });
  }
  return moment.tz(timeExpression, user.timezone).floor(5, 'minutes').calendar(null, {
    sameDay: '[around] h:mm A',
    lastDay: '[yesterday around] h:mm A',
    lastWeek: 'dddd [around] h:mm A',
  });
}

function slackTimeRange(timeRange, user, compact) {
  const start = time(timeRange.startTime, user, 'audible');
  const stop = time(timeRange.stopTime, user, 'audible');

  const slackStart = `<!date^${timeRange.startTime.unix()}^{date_short_pretty} {time}|${start}>`;
  const slackStop = `<!date^${timeRange.stopTime.unix()}^{date_short_pretty} {time}|${stop}>`;
  const l = `between ${slackStart} and ${slackStop}`;
  const s = `${slackStart} -\\n${slackStop}`;
  return (compact) ? s : l;
}

function friendlyTimeRange(timeRange, user, isCompact, displayType) {
  // assume no time range is now
  if (_.isNil(timeRange.startTime)) {
    return 'now';
  }

  const type = displayType || 'audible';
  const mStart = moment.tz(timeRange.startTime, user.timezone);
  const mStop = moment.tz(timeRange.stopTime, user.timezone);

  if (timeRange.stopTime === -1) {
    return `Started ${time(timeRange.startTime, user, type)}`;
  }

  let sentence;

  if (type === 'visual') {
    return slackTimeRange({ startTime: mStart, stopTime: mStop }, user, isCompact);
  } else if (isCompact) {
    sentence = `${mStart.calendar(null, startFormat.normal).trim()}`;
    sentence = capitalizeFirstCharacter(sentence);

    if (!timeRange.stopTime > timeRange.startTime) {
      return sentence.trim();
    }

    if (moment().isBefore(mStop)) {
      sentence += ' - now';
    } else if (moment.duration(mStop.diff(mStart, 'hours')) < 24) {
      sentence += ` - ${capitalizeFirstCharacter(mStop.calendar(null, stopFormat.sameday)).trim()}`;
    } else {
      sentence += ` - \\n${capitalizeFirstCharacter(mStop.calendar(null, stopFormat.normal)).trim()}`;
    }
  } else {
    sentence = `${mStart.calendar(null, startFormat.between).trim()} and `;

    if (moment().isBefore(mStop)) {
      sentence += 'now';
    } else if (moment.duration(mStop.diff(mStart, 'hours')) < 24) {
      const part = `${mStop.calendar(null, stopFormat.sameday).trim()}`;
      sentence += part;
    } else {
      const part = `${mStop.calendar(null, stopFormat.normal).trim()}`;
      sentence += part;
    }
  }


  return sentence.trim();
}


class Nunjucks {
  constructor(davis) {
    this.env = new nunjucks.Environment(
      [
        new nunjucks.FileSystemLoader([
          davis.dir,
          process.cwd(),
        ]),
      ], {
        autoescape: false,
        trimBlocks: true,
        lstripBlocks: true,
      });

    // Registers custom filters from Nunjucks.
    this.env.addFilter('friendlyApplicationName', friendlyApplicationName);
    this.env.addFilter('friendlyEntityName', friendlyEntityName);
    this.env.addFilter('friendlyStatus', friendlyStatus);
    this.env.addFilter('time', time);
    this.env.addFilter('friendlyEvent', friendlyEvent);
    this.env.addFilter('friendlyTime', friendlyTime);
    this.env.addFilter('slackTimeRange', slackTimeRange);
    this.env.addFilter('friendlyTimeRange', friendlyTimeRange);
    this.env.addFilter('capitalizeFirstCharacter', capitalizeFirstCharacter);
    this.env.addFilter('capitalizeFirstCharacters', capitalizeFirstCharacters);

    this.env.addFilter('buildProblemUrl', problem =>
        davis.linker.problem(problem));

    this.env.addFilter('buildProblemsUrl', (problems, timeRange) =>
        davis.linker.problems(timeRange));

    this.env.addFilter('buildEventUrl', (problem, event) =>
        davis.linker.event(problem, event));

    this.env.addFilter('toTitleCase',
        davis.textHelpers.toTitleCase.bind(davis.textHelpers));

    this.env.addFilter('capitalizeAcronyms',
        davis.textHelpers.capitalizeAcronyms.bind(davis.textHelpers));

    this.env.addFilter('friendlyEventFirstAlias',
        davis.textHelpers.friendlyEventFirstAlias.bind(davis.textHelpers));

    this.davis = davis;
  }

  /**
   * Loads the template and creates a response using the context data
   *
   * @param {string} template - The name of the template.
   * @param {Object} context - The data used to combined with the template.
   * @returns {String}
   *
   * @memberOf Nunjucks
   */
  render(template, context) {
    return this.env.render(template, context);
  }

  /**
   * Renders the string as a template using the context data
   *
   * @param {string} string - A raw string template
   * @param {Object} context - The data used to combined with the template.
   * @returns {String}
   *
   * @memberOf Nunjucks
   */
  renderString(string, context) {
    return this.env.renderString(string, context);
  }
}

module.exports = Nunjucks;
