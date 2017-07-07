'use strict';

const mongoose = require('mongoose');

const Schema = mongoose.Schema;

// Configuring Mongoose to use Promises
mongoose.Promise = require('bluebird');

// Defines the conversation schema
const conversation = new Schema({
  userId: { type: String, required: true, unique: false },
  scope: { type: String, required: true, unique: false },
  metadata: {},
}, {
  createdAt: 'startTime',
  updatedAt: 'lastInteraction',
});

conversation.index({ userId: 1, scope: 2 }, { unique: true });
module.exports = mongoose.model('Conversation', conversation);
