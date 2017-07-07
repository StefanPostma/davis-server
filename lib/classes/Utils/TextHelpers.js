'use strict';

const S = require('string');
const natural = require('natural');
const nounInflector = new natural.NounInflector();
const _ = require('lodash');

const events = require('../Dynatrace/events');

const ACRONYMS = [
  'CPU',
  'ELB',
  'DB',
  'RDS',
  'PGI',
  'HTTP',
  'JS',
  'GC',
  'RMQ',
  'OSI',
  'EBS',
  'VM',
  'ESXI',
];

class TextHelpers {
  constructor(davis) {
    this.davis = davis;
  }

  capitalize(str) {
    return S(str).capitalize().s;
  }

  numString(num) {
    return ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'][num] || num;
  }

  pluralize(str, amount) {
    return (typeof amount === 'undefined' || amount > 1) ? nounInflector.pluralize(str) : str;
  }

  eventTitle(event) {
    return this.toTitleCase(this.friendlyEventFirstAlias(event.eventType)).replace('A ', '');
  }

  friendlyEntityName(entity) {
    return S(entity.entityName.split(':')[0])
      .humanize().s.toLowerCase();
  }

  friendlyEventFirstAlias(eventName) {
    const event = _.find(events, e => e.name === eventName);
    return (_.isNil(event)) ?
      S(eventName).humanize().toLowerCase().s :
      event.friendly[0];
  }

  problemTitle(problem) {
    const root = problem.hasRootCause ? '[Root Cause]' : '';
    const title = this.toTitleCase(`${problem.status} ${problem.impactLevel} level problem (${problem.displayName})`);
    return `${title} ${root}`.trim();
  }

  stripPorts(name) {
    return name.replace(/:\d+\b/g, '');
  }

  humanize(str) {
    return S(str).humanize().toLowerCase().s;
  }

  toTitleCase(str) {
    return this.capitalizeAcronyms(S(str).toLowerCase().titleCase().s);
  }

  capitalizeAcronyms(str) {
    let out = str;
    ACRONYMS.forEach(acronym => {
      out = out.replace(new RegExp(`\\b${acronym}\\b`, 'i'), acronym.toUpperCase());
    });
    return out;
  }

  humanList(inp, max) {
    const lst = inp.slice(0, max || inp.length);

    if (lst.length === 0) {
      return null;
    } else if (lst.length === 1) {
      return lst[0];
    } else if (lst.length === 2) {
      return `${lst[0]} and ${lst[1]}`;
    }

    return `${lst.slice(0, lst.length - 1).join(', ')}, and ${lst[lst.length - 1]}`;
  }
}

module.exports = TextHelpers;

