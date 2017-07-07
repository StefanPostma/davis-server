'use strict';

const BbPromise = require('bluebird');
const Config = require('./classes/Config');
const Exchange = require('./classes/Exchange');
const TextHelpers = require('./classes/Utils/TextHelpers');
const Linker = require('./classes/Utils/Linker');
const PluginManager = require('./classes/PluginManager');
const Service = require('./classes/Service');
const Dynatrace = require('./classes/Dynatrace');
const Users = require('./classes/Users');
const Utils = require('./classes/Utils');
const Notifications = require('./classes/Notifications');
const VB = require('./classes/Utils/VisualBuilder');
const Filters = require('./classes/Filters');
const Server = require('./server/Server');
const Alexa = require('./sources/Alexa');
const Slack = require('./sources/Slack');
const Web = require('./sources/Web');
const Version = require('./../package.json').version;
const path = require('path');
const CronJob = require('cron').CronJob;
const ProblemDetails = require('./models/ProblemDetail');
const moment = require("moment");

moment.locale("en");

// Allows users to define config defaults
require('dotenv').config({ silent: true });

class Davis {
  constructor(config) {
    const configObject = config || {};

    this.version = Version;
    this.dir = path.join(__dirname, '..');

    this.logger = new Utils.Logger(this, configObject.logLevel);
    this.event = new Utils.Events(this);
    this.notifications = new Notifications(this);
    this.utils = Utils;

    this.config = new Config(this, configObject);
    this.service = new Service(this);
    this.filters = new Filters(this);
    this.dynatrace = new Dynatrace(this);
    this.server = new Server(this);
    this.users = new Users(this);
    this.textHelpers = new TextHelpers(this);
    this.linker = new Linker(this);

    this.pluginManager = new PluginManager(this);
    this.userPlugins = configObject.userPlugins || [];

    this.classes = {};
    this.classes.Error = Utils.DError;
    this.classes.Exchange = Exchange;
    this.classes.VB = VB;

    this.sources = {};
    this.sources.alexa = new Alexa(this);
    this.sources.slack = new Slack(this);
    this.sources.web = new Web(this);

    this.models = {};
    this.models.ProblemDetails = ProblemDetails;

    this.cronJobs = {};

    process.stdin.resume();
    process.on('SIGINT', () => {
      this.sources.slack.stop()
        .then(() => {
          console.log();
          process.exit(0);
        });
    });
  }

  addCron(cronTime, onTick, name, run) {
    const fname = name || 'anonymous cron';

    const fn = function () {
      try {
        this.logger.debug(`CRON: ${fname}`);
        onTick.call(this);
      } catch (e) {
        this.logger.warn(`CRON: ${fname} failed`);
      }
    };

    const cron = new CronJob({
      cronTime,
      onTick: fn,
      start: true,
      context: this,
      runOnInit: Boolean(run),
    });

    this.cronJobs[fname] = cron;
  }

  removeCron(name) {
    if (this.cronJobs[name]) {
      this.cronJobs[name].stop();
      delete this.cronJobs[name];
    }
  }

  run() {
    const startTime = Date.now();
    return BbPromise.resolve()
      .then(() => this.logger.asciiGreeting())
      .then(() => this.service.connectToMongoDB())
      .then(() => this.config.load())
      .then(() => {
        const admin = this.users.adminExists()
          .then((exists) => {
            if (!exists) {
              return this.users.createDefaultUser();
            }
            return null;
          });
        return admin;
      })
      .then((admin) => {
        if (admin) this.logger.info('A default user has been created.');

        let n;
        this.logger.info('Learning everything there is to know about APM.');
        n = this.pluginManager.loadCorePlugins();
        this.pluginManager.stats.plugins.core += n;
        this.logger.info(`Loaded ${n} core plugins`);
        n = this.pluginManager.loadUserPlugins(this.userPlugins);
        this.pluginManager.stats.plugins.user += n;
        this.logger.info(`Loaded ${n} user plugins`);
      })
      .then(() => this.pluginManager.train())
      .then(() => this.logger.info("I would say it's safe to consider me an APM expert now!"))
      .then(() => this.pluginManager.loadEntities())
      .then(() => {
        this.addCron('0 0 0 * * *', () => {
          this.pluginManager.loadEntities();
        }, 'update entities');
      })
      .then(() => this.server.start())
      .then(() => this.sources.slack.start())
      .then(() => this.logger.info(`Server started successfully after ${Date.now() - startTime} ms.`));
  }


  /**
   * Returns the version number found in package.json
   * @returns {string} - Version number
   * @memberOf Davis
   */
  getVersion() {
    return this.version;
  }

}

module.exports = Davis;
module.exports.logError = Utils.logError;
