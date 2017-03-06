'use strict';

const mongoose = require('mongoose');
const token = require('rand-token');

const Schema = mongoose.Schema;

// Configuring Mongoose to use Promises
mongoose.Promise = require('bluebird');

const config = new Schema({
  jwtToken: { type: String, default: token.generate(16) },
  dynatrace: {
    url: { type: String, trim: true, required: false, unique: false, index: false, default: '' },
    apiUrl: { type: String, trim: true, required: false, unique: false, index: false, default: '' },
    token: { type: String, trim: true, required: false, unique: false, index: false, default: '' },
    strictSSL: { type: Boolean, required: false, unique: false, index: false, default: true },
  },
  ymonitor: {
	    url: { type: String, trim: true, required: false, unique: false, index: false, default: '' },
	    apiUrl: { type: String, trim: true, required: false, unique: false, index: false, default: '' },
	    token: { type: String, trim: true, required: false, unique: false, index: false, default: '' },
	    username: { type: String, trim: true, required: false, unique: false, index: false, default: '' },
	    password: { type: String, trim: true, required: false, unique: false, index: false, default: '' },
	    strictSSL: { type: Boolean, required: false, unique: false, index: false, default: true },
	  },
  watson: {
    enabled: { type: Boolean, required: false, unique: false, index: false, default: false },
    stt: {
      user: { type: String, trim: true, required: false, unique: false, index: false, default: '' },
      password: { type: String, trim: true, required: false, unique: false, index: false, default: '' },
    },
    tts: {
      user: { type: String, trim: true, required: false, unique: false, index: false, default: '' },
      password: { type: String, trim: true, required: false, unique: false, index: false, default: '' },
    },
  },
  slack: {
    enabled: { type: Boolean, required: false, unique: false, index: false, default: false },
    clientId: { type: String, trim: true, required: false, unique: false, index: false, default: '' },
    clientSecret: { type: String, trim: true, required: false, unique: false, index: false, default: '' },
    redirectUri: { type: String, trim: true, required: false, unique: false, index: false, default: '' },
  },
  api: {
    events: { type: String, trim: true, minlength: 16, maxlength: 32, default: token.generate(32) },
  },
});

module.exports = mongoose.model('Config', config, 'config');
