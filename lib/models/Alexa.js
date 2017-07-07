'use strict';

const mongoose = require('mongoose');
const crypto = require('crypto');

const Schema = mongoose.Schema;

// Configuring Mongoose to use Promises
mongoose.Promise = require('bluebird');

const AlexaSchema = new Schema({
  userId: { type: String, trim: true, required: true, unique: true },
  applicationId: { type: String, trim: true, required: true },
  timesAccessed: { type: Number, default: 0 },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Alexa', AlexaSchema);
