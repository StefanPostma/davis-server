'use strict';

// Seconds of inactivity until Davis goes to sleep
const INACTIVITY_TIMEOUT = 15;

const SLACK_REQUEST_SOURCE = 'slack';

const ERROR_MESSAGE = 'Sorry about that, I\'m having issues responding to your request at this time.';

const CACHE_CRON_NAME = 'update Slack user and channel cache';

// Listening States
const STATES = {
  STOPPED: {
    ICON: 'https://s3.amazonaws.com/dynatrace-davis/assets/images/grey-dot.png',
    TEXT: 'Stopped',
  },
  LISTENING: {
    ICON: 'https://s3.amazonaws.com/dynatrace-davis/assets/images/green-dot.png',
    TEXT: 'Listening',
  },
  SLEEPING: {
    ICON: 'https://s3.amazonaws.com/dynatrace-davis/assets/images/grey-dot.png',
    TEXT: 'Wake me by saying "Hey Davis"',
  },
  RESPONDED: {
    ICON: 'https://s3.amazonaws.com/dynatrace-davis/assets/images/grey-dot.png',
    TEXT: 'Responded',
  },
  NOTIFICATION: {
    ICON: 'https://s3.amazonaws.com/dynatrace-davis/assets/images/grey-dot.png',
    TEXT: 'Notification',
  },
  CLICKED: {
    ICON: 'https://s3.amazonaws.com/dynatrace-davis/assets/images/grey-dot.png',
    TEXT: 'Clicked',
  },
};

// Launch phrases
const PHRASES = [
  'hey davis',
  'hey, davis',
  'okay davis',
  'okay, davis',
  'ok davis',
  'ok, davis',
  'hi davis',
  'hi, davis',
  'hello davis',
  'hello, davis',
  'yo davis',
  'yo, davis',
  'launch davis',
  'ask davis',
  'davis',
  'davis,'
];

const MESSAGES = {
  JOINED: 'Hi, I\'m davis, your personal DevOps assistant. It looks like we may not have met before. I\'m here to help answer questions about your app\'s current and past performance. You can interact with me by sending me text or clicking any buttons that are attached to my responses. To get you started, ask me "Hey Davis, did anything happen today?"',
};

module.exports = {
  INACTIVITY_TIMEOUT,
  SLACK_REQUEST_SOURCE,
  ERROR_MESSAGE,
  CACHE_CRON_NAME,
  STATES,
  PHRASES,
  MESSAGES,
};
