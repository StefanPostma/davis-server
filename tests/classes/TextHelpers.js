'use strict';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

const Davis = require('../../lib/Davis');

chai.use(chaiAsPromised);
chai.should();

describe('TextHelpers', () => {
  const davis = new Davis();
  const th = davis.textHelpers;

  it('should capitalize common acronyms', () => {
    th.capitalizeAcronyms('cpu elb cpuelb').should.eql('CPU ELB cpuelb');
  });

  it('should properly titleify problems', () => {
    th.problemTitle({
      status: 'OPEN',
      impactLevel: 'INFRASTRUCTURE',
      displayName: 123,
    }).should.eql('Open Infrastructure Level Problem (123)');
  });
});
