'use strict';

const fse = require('fs-extra');
const error = require('./Error');
const Logger = require('./Logger');
const Events = require('./Events');
const moment = require('moment');
const Slack = require('./Slack');

module.exports.fileExistsSync = function (filePath) {
  try {
    const stats = fse.lstatSync(filePath);
    return stats.isFile();
  } catch (e) {
    return false;
  }
};

module.exports.readFileSync = function (filePath) {
  let content;

  content = fse.readFileSync(filePath);

  if (filePath.endsWith('.json')) {
    content = JSON.parse(content);
  } else {
    content = content.toString().trim();
  }

  return content;
};

module.exports.getTense = function (exchange) {
  const timeRange = exchange.getTimeRange();
  const now = moment().valueOf;

  if (!timeRange.startTime) return 'present';
  if (timeRange.startTime && now < timeRange.startTime) {
    return 'future';
  }
  return 'past';
};

module.exports.DError = error.DError;
module.exports.logError = error.logError;
module.exports.Logger = Logger;
module.exports.Events = Events;
module.exports.Slack = Slack;
