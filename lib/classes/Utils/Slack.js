'use strict';

const slack = require('../../config/slack');
const _ = require('lodash');

function setListeningStateFooter(message, state) {
  const out = _.cloneDeep(message);
  if (!out.attachments || out.attachments.length === 0) {
    out.attachments = [{}];
  }
  out.attachments[out.attachments.length - 1].footer_icon = slack.STATES[state.toUpperCase()].ICON;
  out.attachments[out.attachments.length - 1].footer = slack.STATES[state.toUpperCase()].TEXT;
  return out;
}

function removeButtons(message, user, action) {
  const newMessage = _.cloneDeep(message);

  const text = (user && action) ?
    `<@${user}> clicked button "${action}"` :
    'Buttons removed';

  newMessage.attachments = _.map(message.attachments, (att) => {
    const a = _.cloneDeep(att);
    if (_.has(a, 'callback_id')) {
      a.text = text;
      a.callback_id = null;
      a.actions = null;
    }
    return a;
  });

  return newMessage;
}

/**
 * Adds the recipient's username to author_name property of message
 *
 * @param {Object} message
 * @param {String} username
 *
 * @return {Object} message
 */
function addUsernameAsAuthor(message, username) {
  const out = _.cloneDeep(message);
  if (!out.attachments) out.attachments = [];
  if (out.attachments.length === 0) out.attachments.push({});
  out.attachments[0].author_name = username;
  return out;
}

/**
 * Adds a listening state to the message's footer
 *
 * @param {Object} message - Slack message to be edited
 * @param {Boolean} isListening - Bots listening state
 * @param {Boolean} isNotification - New problem notification
 * @return {Object} message - Edited message
 */
function addListeningStateFooter(original, isListening, isNotification) {
  const message = _.cloneDeep(original);

  // ensure there is always attachment list
  if (!message.attachments) {
    message.attachments = [];
  }

  // Move all pretext property values to text property values if text property isn't already used
  message.attachments.forEach((atm, index) => {
    if (atm.pretext && atm.pretext.length > 0 && (!atm.text || atm.text.trim().length === 0)) {
      message.attachments[index].text = atm.pretext;
      delete message.attachments[index].pretext;
    }
  });

  // Add footer to existing attachment if an image_url doesn't exist
  if (message.attachments.length > 0 && !message.attachments[message.attachments.length - 1].image_url) {
    if (isNotification) {
      message.attachments[message.attachments.length - 1].footer_icon = slack.STATES.NOTIFICATION.ICON;
      message.attachments[message.attachments.length - 1].footer = slack.STATES.NOTIFICATION.TEXT;
    } else {
      message.attachments[message.attachments.length - 1].footer_icon = (isListening) ? slack.STATES.LISTENING.ICON : slack.STATES.SLEEPING.ICON;
      message.attachments[message.attachments.length - 1].footer = (isListening) ? slack.STATES.LISTENING.TEXT : slack.STATES.SLEEPING.TEXT;
    }

  // Add footer to new attachment
  } else if (message.attachments.length > 0) {
    if (isNotification) {
      message.attachments.push({
        text: '',
        footer_icon: slack.STATES.NOTIFICATION.ICON,
        footer: slack.STATES.NOTIFICATION.TEXT,
      });
    } else {
      message.attachments.push({
        text: '',
        footer_icon: (isListening) ? slack.STATES.LISTENING.ICON : slack.STATES.SLEEPING.ICON,
        footer: (isListening) ? slack.STATES.LISTENING.TEXT : slack.STATES.SLEEPING.TEXT,
      });
    }

  // Define attachments and add footer to new attachment
  } else if (isNotification) {
    message.attachments = [{
      footer_icon: slack.STATES.NOTIFICATION.ICON,
      footer: slack.STATES.NOTIFICATION.TEXT,
    }];
  } else {
    message.attachments = [{
      footer_icon: (isListening) ? slack.STATES.LISTENING.ICON : slack.STATES.SLEEPING.ICON,
      footer: (isListening) ? slack.STATES.LISTENING.TEXT : slack.STATES.SLEEPING.TEXT,
    }];
  }

  // Move any buttons in the bottom-most attachment to beneath follow up question in footer
  if (message.attachments.length > 1 && message.attachments[message.attachments.length - 2].actions) {
    message.attachments[message.attachments.length - 1].callback_id = message.attachments[message.attachments.length - 2].callback_id;
    message.attachments[message.attachments.length - 1].actions = message.attachments[message.attachments.length - 2].actions;
    delete message.attachments[message.attachments.length - 2].callback_id;
    delete message.attachments[message.attachments.length - 2].actions;
  }

  return message;
}

module.exports = {
  addListeningStateFooter,
  addUsernameAsAuthor,
  removeButtons,
  setListeningStateFooter,
};

