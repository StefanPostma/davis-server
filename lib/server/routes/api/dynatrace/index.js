'use strict';

const _ = require('lodash');

const router = require('express').Router();

router.get('/applications', (req, res) => {
  const davis = req.app.get('davis');
  const logger = davis.logger;

  logger.debug(`Received a request for applications.`);
  res.send({ success: true, applications: davis.pluginManager.entities.applications });
});

router.get('/services', (req, res) => {
  const davis = req.app.get('davis');
  const logger = davis.logger;

  logger.debug(`Received a request for services.`);
  res.send({ success: true, services: davis.pluginManager.entities.services });
});

module.exports = router;
