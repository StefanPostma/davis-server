'use strict';

const moment = require('moment-timezone');
const _ = require('lodash');
const slackConf = require('../../config/slack');

const COLORS = {
  OPEN: '#dc172a',
  CLOSED: '#7dc540',
  RED: '#dc172a',
  GREEN: '#7dc540',
};

const FILTER_ICON = 'https://s3.amazonaws.com/dynatrace-davis/assets/images/filter_blue_15_15.png';
const FILTER_AUTHOR = 'filtered';

class Alias {
  constructor(entity) {
    this.entity = (entity.toObject) ?
      entity.toObject() :
      entity;
  }

  slack() {
    return this.entity.display.visual;
  }

  audible() {
    return this.entity.display.audible;
  }

  toString() {
    return this.entity.display.visual;
  }
}

class Link {
  constructor(url, text) {
    this.url = url;
    this.text = text;
  }

  slack() {
    return (this.text) ? `<${this.url}|${this.text}>` : this.url;
  }

  toString() {
    return this.text;
  }
}

class TimeStamp {
  constructor(ts, tz, compact, timeOnly) {
    this.ts = (moment.isMoment(ts)) ? ts.valueOf() : ts || moment().valueOf();
    this.tz = tz || 'Etc/UTC';
    this.compact = Boolean(compact);
    this.timeOnly = Boolean(timeOnly);
  }

  future() {
    return (moment().valueOf() < this.ts);
  }

  // <!date^1392734382^{date_num} {time_secs}|2014-02-18 6:39:42 AM>
  slack() {
    if (this.ts === -1) return 'now';

    if (this.timeOnly) {
      return `<!date^${Math.floor(this.ts / 1000)}^{time}|${this}>`;
    }

    if (this.compact) {
      return `<!date^${Math.floor(this.ts / 1000)}^{date_short_pretty} {time}|${this}>`;
    }

    return `<!date^${Math.floor(this.ts / 1000)}^{date_long_pretty} at {time}|${this}>`;
  }

  toString() {
    if (this.ts === -1) return 'now';

    const ts = moment.tz(this.ts, this.tz);

    if (this.timeOnly) {
      return ts.format('h:mm A');
    }

    return ts.calendar().toLowerCase();
  }
}

class TimeRange {
  constructor(range, tz, compact) {
    if (Object.keys(range).length === 0) {
      this.now = true;
    }
    this.start = new TimeStamp(range.startTime, tz, compact);
    this.stop = new TimeStamp(range.stopTime || range.endTime || moment().valueOf(), tz, compact);
    this.tz = tz || 'Etc/UTC';
    this.compact = Boolean(compact);
  }

  slack() {
    if (this.now) { return 'In the last few minutes'; }
    const start = this.start.slack();
    const stop = (this.stop.future()) ? 'now' : this.stop.slack();
    return (this.compact) ?
      `${start} - ${stop}` :
      `between ${start} and ${stop}`;
  }

  toString() {
    if (this.now) { return 'In the last few minutes'; }
    return (this.compact) ?
      `${this.start} - ${this.stop}` :
      `between ${this.start} and ${this.stop.future() ? 'now' : this.stop}`;
  }
}

function slackify(inp, rec) {
  if (inp === undefined || inp === null) return '';
  if (inp.constructor === Array) {
    const textArr = inp.map(e => slackify(e, true));
    let out = '';
    textArr.forEach((text) => {
      if (text === '.') {
        out = out.trim();
        out += '. ';
      } else {
        out += `${text} `;
      }
    });
    out = out
      .trim()
      .split(/\s+/)
      .join(' ')
      .split('. ')
      .join('.  ');
    if (!rec) {
      out = out.charAt(0).toUpperCase() + out.slice(1);
    }
    return out;
  }
  return (inp.slack) ? inp.slack() : inp.toString();
}

function stringify(inp, rec) {
  if (inp === null) return '';
  if (inp.constructor === Array) {
    const textArr = inp.map(e => stringify(e, true));
    let out = '';
    textArr.forEach((text) => {
      if (text === '.') {
        out = out.trim();
        out += '. ';
      } else if (text === ',') {
        out = out.trim();
        out += ', ';
      } else {
        out += `${text} `;
      }
    });
    out = out.trim();
    if (!rec) {
      out = out.charAt(0).toUpperCase() + out.slice(1);
    }
    return out;
  }
  let out = inp.toString();
  if (!rec) {
    out = out.charAt(0).toUpperCase() + out.slice(1);
  }
  return out;
}

function audible(inp) {
  if (inp === null) return '';
  if (inp.constructor === Array) {
    const textArr = inp.map(e => audible(e));
    let out = '';
    textArr.forEach((text) => {
      if (text === '.') {
        out = out.trim();
        out += '. ';
      } else if (text === ',') {
        out = out.trim();
        out += ', ';
      } else {
        out += `${text} `;
      }
    });
    return out.trim();
  }
  const out = (inp.audible) ? inp.audible() : inp.toString();
  return out;
}

class Card {
  constructor() {
    this.title = [];
    this.link = null;
    this.text = [];
    this.pretext = [];
    this.fallback = [];
    this.fields = [];
    this.color = null;
    this.footer = [];
    this.filtered = false;
  }

  setFiltered(filtered) {
    this.filtered = filtered;
    return this;
  }

  addTitle(title) {
    if (title === null) return this;
    if (title.constructor === Array) {
      title.forEach(e => this.addTitle(e));
      return this;
    }
    this.title.push(title);
    return this;
  }

  addPretext(text) {
    if (text === null) return this;
    if (text.constructor === Array) {
      text.foreach(e => this.addPretext(e));
      return this;
    }
    this.pretext.push(text);
    return this;
  }

  addText(text) {
    if (text === null) return this;
    if (text.constructor === Array) {
      text.forEach(e => this.addText(e));
      return this;
    }
    this.text.push(text);
    return this;
  }

  addFooter(text) {
    if (text === null) return this;
    if (text.constructor === Array) {
      text.forEach(e => this.addFooter(e));
      return this;
    }
    this.footer.push(text);
    return this;
  }

  addFallback(fallback) {
    if (fallback === null) return this;
    if (fallback.constructor === Array) {
      fallback.forEach(e => this.addFallback(e));
      return this;
    }
    this.fallback.push(fallback);
    return this;
  }

  setLink(link) {
    this.link = link;
    return this;
  }

  setColor(color) {
    this.color = _.get(COLORS, color, color);
    return this;
  }

  setAuthor(author) {
    this.author = author;
    return this;
  }

  setAuthorIcon(icon) {
    this.authorIcon = icon;
    return this;
  }

  addField(title, value, short) {
    const field = {};
    if (!_.isNil(title)) field.title = title;
    if (!_.isNil(value)) field.value = value;
    if (!_.isNil(short)) field.short = short;

    this.fields.push(field);
    return this;
  }

  slack() {
    const ret = {
      mrkdwn_in: [
        'text',
        'pretext',
        'fields',
      ],
    };

    if (this.title.length > 0) ret.title = slackify(this.title);
    if (this.text.length > 0) ret.text = slackify(this.text);
    if (this.footer.length > 0) ret.footer = slackify(this.footer);
    if (this.pretext.length > 0) ret.pretext = slackify(this.pretext);
    if (this.fallback.length > 0) {
      ret.fallback = slackify(this.fallback);
    } else if (this.text.length > 0) {
      ret.fallback = stringify(this.text);
    }

    if (this.fields.length > 0) {
      const fields = this.fields.map((field) => {
        const out = {};
        if (!_.isNil(field.title)) out.title = slackify(field.title);
        if (!_.isNil(field.value)) out.value = slackify(field.value);
        if (!_.isNil(field.short)) out.short = field.short;
        return out;
      });
      ret.fields = fields;
    }

    if (!_.isNil(this.link)) ret.title_link = this.link;
    if (!_.isNil(this.color)) ret.color = this.color;
    if (!_.isNil(this.author)) ret.author_name = this.author;
    if (!_.isNil(this.authorIcon)) ret.author_icon = this.authorIcon;

    if (this.filtered) {
      ret.author_icon = FILTER_ICON;
      ret.author_name = ret.author || FILTER_AUTHOR;
    }

    return ret;
  }
}

class Message {
  constructor() {
    this.text = [];
    this.buttonGroup = null;
    this.followUp = null;
    this.greeting = null;
    this.cards = [];
    this.filtered = false;
    this.state = null;
  }

  base() {
    const out = this.slack();

    const tAtt = _.filter(out.attachments, att => att.text);

    if (out.text) return out.text;
    if (tAtt.length > 0) return tAtt[0].text;
    return 'Slack Message does not have a base';
  }

  setState(state) {
    this.state = state;
    return this;
  }

  setFiltered(filtered) {
    this.filtered = filtered;
    return this;
  }

  setGreeting(greeting) {
    this.greeting = greeting;
    return this;
  }

  setFollowUp(followUp) {
    this.followUp = followUp;
    return this;
  }

  addText(text) {
    this.text.push(text);
    return this;
  }

  addCard(card) {
    if (card === null) return this;
    const type = card.constructor;
    if (type === Array) {
      card.forEach((e) => { this.addCard(e); });
    } else if (type === Card) {
      this.cards.push(card);
    }
    return this;
  }

  setButtons(buttonGroup) {
    this.buttonGroup = buttonGroup;
    return this;
  }

  slack(scope) {
    const ret = { attachments: [] };

    if (this.followUp && this.buttonGroup) {
      this.buttonGroup.addText(this.followUp);
    } else if (this.followUp && this.cards.length > 0) {
      this.addCard(new Card().addText(this.followUp));
    } else if (this.followUp) {
      this.addText(this.followUp);
    }

    if (this.cards.length > 0) ret.attachments = this.cards.map(card => card.slack());

    if (this.text.length > 0) {
      const text = slackify(this.text);
      const fallback = stringify(this.text);
      ret.attachments.unshift(new Card().addText(text).addFallback(fallback).slack());
    }

    if (!_.isNil(this.buttonGroup)) ret.attachments.push(this.buttonGroup.slack(scope));

    if (this.state && ret.attachments && ret.attachments.length > 0) {
      ret.attachments[ret.attachments.length - 1].footer =
        slackConf.STATES[this.state.toUpperCase()].TEXT;

      ret.attachments[ret.attachments.length - 1].footer_icon =
        slackConf.STATES[this.state.toUpperCase()].ICON;
    }

    if (this.greeting && ret.text) {
      ret.text = `${slackify(this.greeting)}  ${ret.text}`;
    } else if (this.greeting && ret.attachments && ret.attachments.length > 0) {
      ret.attachments[0].text = `${slackify(this.greeting)}  ${ret.attachments[0].text || ''}`.trim();
    } else if (this.greeting) {
      ret.text = slackify(this.greeting);
    }

    if (this.filtered) {
      ret.attachments[0].author_icon = FILTER_ICON;
      ret.attachments[0].author_name = FILTER_AUTHOR;
    }

    return ret;
  }
}

class ButtonGroup {
  constructor(callbackId) {
    this.callbackId = callbackId;
    this.text = [];
    this.actions = [];
  }

  addAction(name, text, value, type) {
    const button = {
      name,
      text,
      value,
      type: type || 'button',
    };

    this.actions.push(button);
    return this;
  }

  addText(text) {
    if (text === null) return this;
    if (text.constructor === Array) {
      text.foreach(e => this.addText(e));
      return this;
    }
    this.text.push(text);
    return this;
  }

  slack(scope) {
    const actions = this.actions.map((action) => {
      const raw = _.isObject(action.value) ? action.value : { value: action.value };
      if (scope) raw.scope = scope;
      const value = JSON.stringify(raw);

      return {
        name: action.name,
        text: action.text,
        value,
        type: action.type,
      };
    });

    const ret = {
      text: slackify(this.text),
      callback_id: this.callbackId,
      actions,
    };
    return ret;
  }
}

/* eslint-disable no-unused-expressions */

ButtonGroup.fromSlack = function (spec) {
  const buttons = new ButtonGroup(spec.callback_id);

  spec.text && buttons.addText(spec.text);
  spec.actions && spec.actions.forEach((action) => {
    try {
      const value = JSON.parse(action.value);
      buttons.addAction(action.name, action.text, value, action.type);
    } catch (e) {
      buttons.addAction(action.name, action.text, action.value, action.type);
    }
  });

  return buttons;
};

Card.fromSlack = function (spec) {
  const card = new Card();

  spec.title && card.addTitle(spec.title);
  spec.title_link && card.setLink(spec.title_link);
  spec.text && card.addText(spec.text);
  spec.pretext && card.addText(spec.pretext);
  spec.fallback && card.addFallback(spec.fallback);
  spec.color && card.setColor(spec.color);
  spec.author_name && card.setAuthor(spec.author);
  spec.author_icon && card.setAuthorIcon(spec.author_icon);
  spec.fields && spec.fields.forEach(field =>
      card.addField(field.title, field.value, field.short || false));
  spec.footer && card.addFooter(spec.footer);
  return card;
};

Message.fromSlack = function (spec) {
  const msg = new Message();

  spec.text && msg.addText(spec.text);

  const cards = _.filter(spec.attachments, att => !att.callback_id);
  const buttons = _.find(spec.attachments, att => att.callback_id);

  if (spec.attachments && spec.attachments.length > 0) {
    const lastCard = spec.attachments[spec.attachments.length - 1];
    if (lastCard.footer) {
      const states = Object.keys(slackConf.STATES);
      states.forEach((state) => {
        if (slackConf.STATES.TEXT === lastCard.footer) {
          msg.setState(state);
          delete lastCard.footer;
        }
      });
    }
  }

  if (cards.length > 0) {
    cards.forEach(card => msg.addCard(Card.fromSlack(card)));
    if (cards[0].author_name === 'filtered') {
      msg.setFiltered(true);
    }
  }

  if (buttons) {
    msg.setButtons(ButtonGroup.fromSlack(buttons));
  }

  return msg;
};
/* eslint-enable no-unused-expressions */

module.exports = {
  Link,
  Message,
  Card,
  ButtonGroup,
  Alias,
  TimeStamp,
  TimeRange,
  slackify,
  stringify,
  audible,
};

