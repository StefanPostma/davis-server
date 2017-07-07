'use strict';

const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

// Configuring Mongoose to use Promises
mongoose.Promise = require('bluebird');

// Defines the exchange schema
const exchange = new Schema({
  _conversation: {
    type: ObjectId,
    ref: 'Conversation',
  },
  source: { type: String, required: true },
  scope: { type: String, required: true },
  startTime: { type: Date, default: Date.now },
  endTime: Date,
  request: {
    raw: String,
    analysed: Object,
  },
  template: {},
  intent: [],
  notificationScope: [{ type: String, trim: true }],
  state: {},
  conversationContext: {
    type: Object,
    default: {},
  },
  response: {
    audible: {
      ssml: String,
    },
    reprompt: String,
    visual: {
      card: Object,
      text: String,
    },
    finished: { type: Boolean, default: false },
  },
  createdAt: { type: Date, expires: '7d' },
}, {
  timestamps: true,
  minimize: false,
});

module.exports = mongoose.model('Exchange', exchange);
