'use strict';

const mongoose = require('mongoose');

const Schema = mongoose.Schema;

// Configuring Mongoose to use Promises
mongoose.Promise = require('bluebird');

const type = {
  values: 'applications services infrastructure'.split(' '),
  message: '`{VALUE}` is an invalid `{PATH}`.',
};

const aliases = new Schema({
  name: { type: String, trim: true, required: true },
  category: { type: String, trim: true, required: true, enum: type, lowercase: true },
  entityId: { type: String, trim: true, required: false, unique: true },
  display: {
    audible: { type: String, trim: true, required: false, index: false },
    visual: { type: String, trim: true, required: false, index: false },
  },
  aliases: [{ type: String, trim: true }],
}, {
  timestamps: true,
});

const model = mongoose.model('Aliases', aliases);

module.exports = model;
