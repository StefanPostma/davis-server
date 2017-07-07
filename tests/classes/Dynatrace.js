'use strict';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const nock = require('nock');
const _ = require('lodash');

const Davis = require('../../lib/Davis');

const problemSummary = require('../mock_data/dynatrace/summary.json');

chai.use(chaiAsPromised);
chai.should();

describe('Dynatrace', () => {
  const davis = new Davis();

  // Makes sure the nock doesn't interfere with the next test.
  after(() => nock.cleanAll());

  it('should load in the Davis config', done => {
    davis.config.load()
      .then(() => done());
  });

  it('should get a filtered list of problems', done => {
    // Simulating Dynatrace call
    nock(davis.config.getDynatraceUrl())
      .get('/api/v1/problem/feed')
      .query(true)
      .reply(200, problemSummary);

    // Creating a fake exchange
    const exchange = { getScope: () => 'test', getTimeRange: () => ({ startTime: 1465571160000, stopTime: 1465572960000 }) };
    _.set(exchange, 'model.request.analysed.timeRange.startTime', 1465571160000);
    _.set(exchange, 'model.request.analysed.timeRange.stopTime', 1465572960000);

    davis.dynatrace.getFilteredProblems(exchange)
      .then(problems => {
        problems.length.should.equal(15);
        done();
      });
  });

  it('should filter the list of problems', done => {
    nock(davis.config.getDynatraceUrl())
      .get('/api/v1/problem/feed')
      .query(true)
      .reply(200, problemSummary);

    // Creating a fake exchange
    const exchange = { getScope: () => 'test', getTimeRange: () => ({ startTime: 1465571160000, stopTime: 1465572960000 }) };
    _.set(exchange, 'model.request.analysed.timeRange.startTime', 1465571160000);
    _.set(exchange, 'model.request.analysed.timeRange.stopTime', 1465572960000);

    davis.dynatrace.getFilteredProblems(exchange)
      .then(problems => {
        const openProblems = problems.filter(e => e.status === 'OPEN');
        openProblems.length.should.equal(1);
        done();
      });
  });

  it('should sort the list of problems', done => {
    nock(davis.config.getDynatraceUrl())
      .get('/api/v1/problem/feed')
      .query(true)
      .reply(200, problemSummary);

    // Creating a fake exchange
    const exchange = { getScope: () => 'test', getTimeRange: () => ({ startTime: 1465571160000, stopTime: 1465572960000 }) };
    _.set(exchange, 'model.request.analysed.timeRange.startTime', 1465571160000);
    _.set(exchange, 'model.request.analysed.timeRange.stopTime', 1465572960000);

    davis.dynatrace.getFilteredProblems(exchange)
      .then(problems => {
        const openProblems = problems.filter(e => e.status === 'OPEN');
        const closedProblems = problems.filter(e => e.status === 'CLOSED');
        openProblems[0].should.eql(problems[0]);
        closedProblems[0].should.eql(problems[1]);
        done();
      });
  });
});
