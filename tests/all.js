'use strict';

const mongoose = require('mongoose');
const utils = require('./utils');

before(() => {
  if (mongoose.connection.readyState === 0) {
    mongoose.connect('127.0.0.1:27017/davis-test', err => {
      if (err) {
        throw new Error('Not connected to MongoDB!');
      }
      return utils.clearDB();
    });
  } else {
    return utils.clearDB();
  }
});

after(() => {
  return mongoose.disconnect();
});

// require('./classes/Davis');
// require('./classes/Service');

require('./classes/Users');
require('./classes/Dynatrace');
require('./classes/Exchange');
require('./classes/Decide');
require('./classes/Nlp');
require('./classes/ResponseBuilder');
require('./classes/PluginManager');
require('./classes/Nunjucks');
require('./classes/Filters');
require('./classes/TextHelpers');
// express tests must be last
//require('./classes/Express');
