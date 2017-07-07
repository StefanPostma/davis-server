'use strict';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const nock = require('nock');
const _ = require('lodash');

chai.use(chaiAsPromised);
chai.should();

const Davis = require('../../lib/Davis');

const problemSummary = require('../mock_data/dynatrace/summary.json');

describe('Filters', () => {
  const davis = new Davis();

  // Makes sure the nock doesn't interfere with the next test.
  after(() => nock.cleanAll());

  it('should load in the Davis config', done => {
    davis.config.load()
      .then(() => done());
  });

  it('should create a global infrastructure filter', () => {
    // Simulating Dynatrace call
    nock(davis.config.getDynatraceUrl())
      .get('/api/v1/problem/feed')
      .query(true)
      .reply(200, problemSummary);

    // Creating a fake exchange
    const exchange = { getScope: () => 'test', getTimeRange: () => ({ startTime: 1465571160000, stopTime: 1465572960000 }) };
    _.set(exchange, 'model.request.analysed.timeRange.startTime', 1465571160000);
    _.set(exchange, 'model.request.analysed.timeRange.stopTime', 1465572960000);

    return davis.users.getSystemUser()
      .then((user) => {
        return davis.filters.createFilter({
          name: 'test global filter',
          owner: user.id,
          scope: 'global',
          impact: ['INFRASTRUCTURE'],
        })
      })
      .then(() => {
        return davis.dynatrace.getFilteredProblems(exchange)
      })
      .then((problems) => {
        problems.length.should.equal(4);
      })
  });
});
