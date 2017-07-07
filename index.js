#!/usr/bin/env node

'use strict';

const BbPromise = require('bluebird');

(() => BbPromise.resolve().then(() => {
  // require here so that if anything goes wrong during require,
  // it will be caught.
  const Davis = require('@dynatrace/davis'); // eslint-disable-line global-require

  const davis = new Davis({
    // Valid log levels are error, warn, info, debug
    // Removing this property will disable logging.
    logLevel: 'info',
    // userPlugins: ['./plugins/weather'], // uncomment this line to load the davisWeather plugin
  });

  return davis.run();
}))();
