'use strict';

const _ = require('lodash');
const router = require('express').Router();

router.route('/')
  // returns all the current configuration values
  .get((req, res) => {
    const davis = req.app.get('davis');
    const config = davis.config;

    config.getConfiguration()
      .then((c) => {
        res.send({ success: true, config: c });
      })
      .catch((err) => {
        res.send({ success: false, message: err.message });
      });
  });

router.route('/:category(dynatrace|slack|watson|ymonitor)')
  // returns a specific configuration based on the category
  .get((req, res) => {
    const davis = req.app.get('davis');
    const config = davis.config;
    const category = req.params.category;

    config.getConfiguration()
      .then((c) => {
        const data = c[category];
        res.send({ success: true, [category]: data });
      })
      .catch((err) => {
        res.send({ success: false, message: err.message });
      });
  })

  // updates the configuration based on the category
  .put((req, res) => {
    const davis = req.app.get('davis');
    const config = davis.config;
    const category = req.params.category;

    config.updateConfig(category, req.body)
      .then(() => {
        res.send({ success: true, message: `${_.capitalize(category)} configuration successfully updated!` });
      })
      .catch((err) => {
        res.send({ success: false, message: err.message });
      });
  });

router.route('/mongodb/validate')
  // validates the MongoDB connection
  .get((req, res) => {
    const davis = req.app.get('davis');
    const service = davis.service;

    if (service.isConnectedToMongoDB()) {
      return res.send({ success: true, message: 'Successfully connected to MongoDB!' });
    }
    return res.send({ success: false, message: 'Unable to connect to MongoDB' });
  });

router.route('/dynatrace/validate')
  // validates the Dynatrace connection
  .get((req, res) => {
    const davis = req.app.get('davis');
    const dynatrace = davis.dynatrace;

    dynatrace.problemStatus()
      .then((status) => {
        if (status.result) {
          res.send({ success: true, message: 'Successfully contacted Dynatrace!' });
        } else {
          res.send({ success: false, message: 'The configured Dynatrace Tenant URL is invalid!' });
        }
      })
      .catch((err) => {
        res.send({ success: false, message: err.message });
      });
  });


module.exports = router;
