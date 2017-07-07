'use strict';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const UserModel = require('../../lib/models/User');

chai.use(chaiAsPromised);

chai.should();

const Davis = require('../../lib/Davis');

describe('Users', () => {
  const davis = new Davis();
  const users = davis.users;

  const email = 'testuser@dynatrace.com';

  after(() => {
    return users.createUser({ email: 'admin@localhost', password: 'changeme', name: { first: 'admin', last: 'user' }, admin: true })
      .then(() => users.deleteUser(email));
  });

  it('should return a list of timezones',
    () => users.getValidTimezones().should.contain('America/Detroit'));

  it('should not find a valid Alexa user',
    () => users.validateAlexaUser({ headers: {}, body: { session: { user: { userId: 'shouldNotExist' } } } }).should.eventually.be.rejected);

  it('should find a valid Alexa user', () => {
    const alexaID = 'shouldExist';

    return davis.config.load()
      .then(() => users.createUser( { email, password: 'supersecret', name: { first: 'admin', last: 'user' }, admin: true }))
      .then(() => users.updateUser(email, { alexa_ids: [alexaID] }))
      .then(() => users.validateAlexaUser({ headers: {}, body: { session: { user: { userId: alexaID } } } }))
      .then(user => (user.email).should.equal(email));
  });

  it('should fail to update the timezone',
    () => users.updateUser(email, { timezone: 'invalid' }).should.eventually.be.rejected);

  it('should successfully update the timezone',
    () => users.updateUser(email, { timezone: 'America/Detroit' }).should.eventually.be.resolved);

  it('should create an internal user', () => {
    return davis.config.load()
      .then(() => users.getSystemUser())
      .then(user => {
        user.url.should.equal(process.env.DYNATRACE_URL);
      })
  })
});
