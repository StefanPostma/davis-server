'use strict';

const chai = require('chai');
const BbPromise = require('bluebird');

chai.use(require('chai-as-promised'));

chai.should();

const Davis = require('../../lib/Davis');

describe('ResponseBuilder', () => {
  const davis = new Davis();
  const Exchange = davis.classes.Exchange;

  it('should respond with text inputs', () => {
    const e1 = new Exchange(davis, { id: 'testuser', timezone: 'America/Detroit' });
    const e2 = new Exchange(davis, { id: 'testuser', timezone: 'America/Detroit' });
    const e3 = new Exchange(davis, { id: 'testuser', timezone: 'America/Detroit' });

    const p1 = e1.start('what happened yesterday with testapp', 'alexa', 'test')
      .then(e => {
        e.response({
          text: 'Test response.',
        }).end();
        e.model.request.analysed = {};
        e.model.request.analysed.timeRange = null;
        return davis.pluginManager.responseBuilder.build(e);
      });

    const p2 = e2.start('what happened yesterday with testapp', 'alexa', 'test')
      .then(e => {
        e.response({
          say: 'Test response.',
        }).end();
        e.model.request.analysed = {};
        e.model.request.analysed.timeRange = null;
        return davis.pluginManager.responseBuilder.build(e);
      });

    const p3 = e3.start('what happened yesterday with testapp', 'alexa', 'test')
      .then(e => {
        e.response({
          show: {
            text: 'Test response.',
            attachments: [],
          },
        }).end();
        e.model.request.analysed = {};
        e.model.request.analysed.timeRange = null;
        return davis.pluginManager.responseBuilder.build(e);
      });

    return BbPromise.all([p1, p2, p3])
      .spread((r1, r2, r3) => {
        const r = {
          text: 'Test response.',
          say: 'Test response.',
          show: {
            attachments: [
              {
                fallback: 'Test response.',
                mrkdwn_in: [
                  'text',
                  'pretext',
                  'fields',
                ],
                text: 'Test response.',
              }
            ],
          },
        };
        r1.should.eql(r);
        r2.should.eql(r);
        r3.should.eql(r);
      });
  });

  it('should respond with text template input', () => {
    const e1 = new Exchange(davis, { id: 'testuser', timezone: 'America/Detroit' });
    const e2 = new Exchange(davis, { id: 'testuser', timezone: 'America/Detroit' });
    const e3 = new Exchange(davis, { id: 'testuser', timezone: 'America/Detroit' });

    const p1 = e1.start('what happened yesterday with testapp', 'alexa', 'test')
      .then(e => {

        e.addExchangeContext({
          variable: "response",
        });
        e.model.request.analysed = {};
        e.model.request.analysed.timeRange = null;
        e.response({
          textString: 'Test {{variable}}.',
        }).end();

        return davis.pluginManager.responseBuilder.build(e);
      });

    const p2 = e2.start('what happened yesterday with testapp', 'alexa', 'test')
      .then(e => {
        e.addExchangeContext({
          variable: "response",
        });
        e.response({
          sayString: 'Test {{variable}}.',
        }).end();
        e.model.request.analysed = {};
        e.model.request.analysed.timeRange = null;
        return davis.pluginManager.responseBuilder.build(e);
      });

    const p3 = e3.start('what happened yesterday with testapp', 'alexa', 'test')
      .then(e => {
        e.addExchangeContext({
          variable: "response",
        });
        e.response({
          showString: '{"text": "Test {{variable}}."}',
        }).end();
        e.model.request.analysed = {};
        e.model.request.analysed.timeRange = null;
        return davis.pluginManager.responseBuilder.build(e);
      });

    return BbPromise.all([p1, p2, p3])
      .spread((r1, r2, r3) => {
        const r = {
          text: 'Test response.',
          say: 'Test response.',
          show: {
            attachments: [
              {
                fallback: 'Test response.',
                mrkdwn_in: [
                  'text',
                  'pretext',
                  'fields',
                ],
                text: 'Test response.',
              }
            ],
          },
        };
        r1.should.eql(r);
        r2.should.eql(r);
        r3.should.eql(r);
      });
  });

  it('should ask a follow up question', () => {
    const e1 = new Exchange(davis, { id: 'testuser', timezone: 'America/Detroit' });
    const e2 = new Exchange(davis, { id: 'testuser', timezone: 'America/Detroit' });
    const e3 = new Exchange(davis, { id: 'testuser', timezone: 'America/Detroit' });

    const p1 = e1.start('what happened yesterday with testapp', 'alexa', 'test')
      .then(e => {
        e.response({
          text: 'Test response.',
        }).followUp('Who am I?');
        e.model.request.analysed = {};
        e.model.request.analysed.timeRange = null;
        return davis.pluginManager.responseBuilder.build(e);
      });

    const p2 = e2.start('what happened yesterday with testapp', 'alexa', 'test')
      .then(e => {
        e.response({
          say: 'Test response.',
        }).followUp('Who am I?');
        e.model.request.analysed = {};
        e.model.request.analysed.timeRange = null;
        return davis.pluginManager.responseBuilder.build(e);
      });

    const p3 = e3.start('what happened yesterday with testapp', 'alexa', 'test')
      .then(e => {
        e.response({
          show: {
            text: 'Test response.',
            attachments: [],
          },
        }).followUp('Who am I?');
        e.model.request.analysed = {};
        e.model.request.analysed.timeRange = null;
        return davis.pluginManager.responseBuilder.build(e);
      });

    return BbPromise.all([p1, p2, p3])
      .spread((r1, r2, r3) => {
        const r = {
          text: 'Test response.  Who am I?',
          say: 'Test response.  Who am I?',
          show: {
            attachments: [
              {
                fallback: 'Test response.  Who am I?',
                mrkdwn_in: [
                  'text',
                  'pretext',
                  'fields',
                ],
                text: 'Test response.  Who am I?',
              }
            ],
          },
        };
        r1.should.eql(r);
        r2.should.eql(r);
        r3.should.eql(r);
      });
  });
});

