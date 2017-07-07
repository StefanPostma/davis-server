'use strict';

const mongoose = require('mongoose');

const Schema = mongoose.Schema;

// Configuring Mongoose to use Promises
mongoose.Promise = require('bluebird');

const problemDetails = new Schema({
  id: { type: String, trim: true, required: true },
  startTime: Number,
  endTime: Number,
  displayName: String,
  impactLevel: String,
  status: String,
  severityLevel: String,
  tagsOfAffectedEntities: [{}],
  rankedEvents: [{}],
  createdAt: { type: Date, expires: '31d' },
}, {
  timestamps: true,
});

const model = mongoose.model('ProblemDetails', problemDetails);

module.exports = model;
