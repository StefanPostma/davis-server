'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcrypt-nodejs');
const token = require('rand-token');

const Schema = mongoose.Schema;

// Configuring Mongoose to use Promises
mongoose.Promise = require('bluebird');

const timezone = require('../config/timezones');

const timezoneEnum = {
  values: timezone,
  message: '`{VALUE}` is an invalid timezone',
};

const UserSchema = new Schema({
  email: { type: String, trim: true, require: true, lowercase: true, index: { unique: true } },
  password: { type: String, trim: true, required: true, select: false },
  name: {
    first: { type: String, trim: true, required: true },
    last: { type: String, trim: true, required: true },
  },
  timezone: { type: String, trim: true, enum: timezoneEnum, default: 'Etc/UTC' },
  lang: { type: String, trim: true, default: 'en-us' },
  admin: { type: Boolean, default: false },
  internal: { type: Boolean, default: false },
  demo: { type: Boolean, default: true },
  chromeToken: {
    type: String,
    trim: true,
    minlength: 16,
    maxlength: 32,
    default: () => token.generate(32),
    select: false,
  },
  routerTokens: { type: [{ client: String, token: String }], select: false },
  alexa_ids: [
    { type: String, trim: true },
  ],
  slack_ids: [
    { type: String, trim: true },
  ],
  lastProblemTS: Date,
}, {
  timestamps: true,
});

UserSchema.pre('save', function (next) {
  const user = this;

  if (!user.isModified('password')) return next();

  return bcrypt.hash(user.password, null, null, (err, hash) => {
    if (err) return next(err);

    user.password = hash;
    return next();
  });
});

UserSchema.methods.comparePassword = function (password) {
  const user = this;

  return bcrypt.compareSync(password, user.password);
};

UserSchema.methods.updateProblemTS = function () {
  this.lastProblemTS = new Date();
  return this.save();
}

module.exports = mongoose.model('User', UserSchema);
