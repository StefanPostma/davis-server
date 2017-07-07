'use strict';

const router = require('express').Router();  // eslint-disable-line new-cap

router.post('/', (req, res) => {
  const davis = req.app.get('davis');
  const logger = davis.logger;
  const alexa = davis.sources.alexa;

  if (!req.alexaVerified && !process.env.MANAGED && process.env.NODE_ENV === 'production') {
    logger.error('Received an unauthentic Alexa request');
    return res.status(401).json({ status: 'failure', reason: 'Not an authentic Alexa request' });
  }

  logger.info('Received a request from Alexa!');

  return alexa.askDavis(req).then(response => res.json(response));
});

module.exports = router;
