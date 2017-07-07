'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const chaiAsPromised = require('chai-as-promised');
const Server = require('../../lib/server/Server');
const Davis = require('../../lib/Davis');
const mongoose = require('mongoose');
const BbPromise = require('bluebird');
const applicationEntities = require('../mock_data/dynatrace/applicationEntities.json');
const AliasModel = require('../../lib/models/Aliases');

const davis = new Davis();
const server = new Server(davis);
const app = server.app;
const users = davis.users;
const aid = 'amzn1.ask.account.AHZZYDXEVM4U6Y3NLH4ZFWUNZJYADXOD2446HZ6GEN34PKEXFFL3KQZDBQVTTHI3ZKTBHIWTWJAYIE6SR5K42GGPHZYQZ5O6VITG2SNGQOYW227MO3SYJFSHTHKPHQL2SNSYTUZZLP46QKMPHZDASADII2IFDMW5I34X746FJQZXFTVQN2UK3JCZPDOPSKBSLLROOTOACAUPFGA';

const alexa_payload_json = `{ "version": "1.0", "session": { "new": false, "sessionId": "amzn1.echo-api.session.abeee1a7-aee0-41e6-8192-e6faaed9f5ef", "application": { "applicationId": "amzn1.echo-sdk-ams.app.000000-d0ed-0000-ad00-000000d00ebe" }, "attributes": {}, "user": { "userId": "${aid}" } }, "request": { "type": "IntentRequest", "requestId": "amzn1.echo-api.request.6919844a-733e-4e89-893a-fdcb77e2ef0d", "timestamp": "2015-05-13T12:34:56Z", "intent": { "name": "", "slots": { "command": { "value": "Launch Davis" } } } } }`

function genPayload(phrase) {
  const alexa_payload = JSON.parse(alexa_payload_json);
  alexa_payload.request.intent.slots.command.value = phrase;
  return alexa_payload;
}

chai.use(chaiAsPromised);
chai.use(chaiHttp);
chai.should();


describe('Express', () => {
  const adminemail = 'admin@localhost';
  const testemail = 'test@localhost';
  const name = { first: 'test', last: 'user' };

  const password = 'changeme';
  const admin = true;
  let token;


  before(() => {
    let m;
    if (mongoose.connection.readyState === 0) {
      m = mongoose.connect('127.0.0.1:27017/davis-test')
        .catch((err) => { throw new Error('Not connected to MongoDB!') });
    } else {
      m = BbPromise.resolve();
    }

    return m.then(() => {
      const colls = [];
      for (let i in mongoose.connection.collections) {
        colls.push(mongoose.connection.collections[i].remove());
      }
      return BbPromise.all(colls);
    })
    .then(() => davis.config.load())
    .then(() => davis.users.createDefaultUser())
    .then(() => davis.users.authenticateUser(adminemail, password))
    .then(() => davis.pluginManager.loadCorePlugins())
    .then(() => davis.pluginManager.loadUserPlugins(['./lib/plugins/debug/routingDebug']))
    .then(() => davis.pluginManager.train());
  });

  // POST /api/v1/authenticate
  it('Should validate user on /api/v1/authenticate POST', () => {
    return chai.request(app)
      .post('/api/v1/authenticate')
      .set('Content-Type', 'application/json')
      .send({
        email: adminemail,
        password,
      })
      .then(res => {
        token = res.body.token;
        res.body.success.should.eql(true);
      });
  });

  it('Should reject invalid credentials', () => {
    return chai.request(app)
      .post('/api/v1/authenticate')
      .set('Content-Type', 'application/json')
      .send({
        email: adminemail,
        name,
        password: 'wrong',
      })
      .then(res => {
        res.body.success.should.eql(false);
      });
  });

  // GET|PUT /api/v1/system/config/:category(dynatrace|slack|watson)

  // GET /api/v1/system/users
  it('Should list all users', () => {
    return chai.request(app)
      .get('/api/v1/system/users')
      .set('Content-Type', 'application/json')
      .set('X-Access-Token', token)
      .then((res) => {
        res.body.users.length.should.eql(1);
      });
  });

  // POST|GET|PUT|DELETE /api/v1/system/users/:user_email
  it('Should create a user', () => {
    return chai.request(app)
      .post(`/api/v1/system/users/${testemail}`)
      .set('Content-Type', 'application/json')
      .set('X-Access-Token', token)
      .send({
        password,
        name,
        admin,
      })
      .then(res => {
        res.body.success.should.eql(true);
      });
  });

  it('Should reject default credentials after user creation', () => {
    return chai.request(app)
      .post('/api/v1/authenticate')
      .set('Content-Type', 'application/json')
      .send({
        email: adminemail,
        name,
        password,
      })
      .then(res => {
        res.body.success.should.eql(false);
      });
  });

  it('Should validate new user', () => {
    return chai.request(app)
      .post('/api/v1/authenticate')
      .set('Content-Type', 'application/json')
      .send({
        email: testemail,
        name,
        password,
      })
      .then(res => {
        token = res.body.token;
        res.body.success.should.eql(true);
      });
  });

  it('Should get a user', () => {
    return chai.request(app)
      .get(`/api/v1/system/users/${testemail}`)
      .set('X-Access-Token', token)
      .then((res) => {
        res.body.user.email.should.eql(testemail);
      })
  });

  it('Should modify a user', () => {
    return chai.request(app)
      .put(`/api/v1/system/users/${testemail}`)
      .set('X-Access-Token', token)
      .set('Content-Type', 'application/json')
      .send({
        timezone: 'America/Detroit',
        alexa_ids: [aid],
      })
      .then((res) => {
        res.body.success.should.eql(true);
      });
  });

  it('Should not be able to delete the last admin', () => {
    return chai.request(app)
      .delete(`/api/v1/system/users/${testemail}`)
      .set('X-Access-Token', token)
      .set('Content-Type', 'application/json')
      .then((res) => {
        res.body.success.should.eql(false);
      });
  });

  it('Should create and delete a user', () => {
    return chai.request(app)
      .post(`/api/v1/system/users/deleteme@localhost`)
      .set('Content-Type', 'application/json')
      .set('X-Access-Token', token)
      .send({
        password,
        name,
        admin,
      })
      .then(res => {
        res.body.success.should.eql(true);
      })
      .then(() => {
        return chai.request(app)
          .delete(`/api/v1/system/users/deleteme@localhost`)
          .set('X-Access-Token', token)
          .set('Content-Type', 'application/json')
          .then((res) => {
            res.body.success.should.eql(true);
          });
      });
  });

  it('Should get the current configuration', () => {
    return chai.request(app)
      .get('/api/v1/system/config')
      .set('X-Access-Token', token)
      .then(res => {
        res.body.success.should.eql(true);
      });
  });

  it('Should get the current configuration for each category', () => {
    const p = ['dynatrace', 'slack', 'watson'].map(category => {
      return chai.request(app)
        .get(`/api/v1/system/config/${category}`)
        .set('X-Access-Token', token)
        .then(res => {
          res.body.success.should.eql(true);
        });
    });
    return BbPromise.all(p);
  });

  it('Should update configuration value', () => {
    return chai.request(app)
      .put('/api/v1/system/config/dynatrace')
      .set('X-Access-Token', token)
      .send({
        strictSSL: false,
      })
      .then(res => {
        res.body.success.should.eql(true);
      });
  });

  it('Should launch davis on an alexa request', () => {
    return chai.request(app)
      .post('/alexa')
      .set('X-Access-Token', token)
      .send(genPayload('launch davis'))
      .then(res => {
        res.body.response.outputSpeech.should.have.property('ssml');
        res.body.response.shouldEndSession.should.be.false;
      })
  });

  it('Should ask about a problem through alexa', () => {
    return chai.request(app)
      .post('/alexa')
      .set('X-Access-Token', token)
      .send(genPayload('what happened yesterday'))
      .then(res => {
        res.body.response.outputSpeech.should.have.property('ssml');
        const contains = res.body.response.outputSpeech.ssml.includes('problem')
          || res.body.response.outputSpeech.ssml.includes('issue');
        contains.should.eql(true);
     });
  });

  it('Should ask about a problem through rest', () => {
    return chai.request(app)
      .post('/api/v1/web')
      .set('X-Access-Token', token)
      .send({ phrase: 'What happened yesterday' })
      .then(res => {
        res.body.success.should.eql(true);
        res.body.intents.should.eql(['problem']);
      });
  });

  it('Should route to the first problem', () => {
    return chai.request(app)
      .post('/api/v1/web')
      .set('X-Access-Token', token)
      .send({ phrase: 'the first one' })
      .then(res => {
        res.body.success.should.eql(true);
        res.body.intents.should.eql(['routing', 'showPage', 'pageRoute', 'problemDetails']);
      });
  });

  it('should go back to the problem list', () => {
    return chai.request(app)
      .post('/api/v1/web')
      .set('X-Access-Token', token)
      .send({ phrase: 'back' })
      .then(res => {
        res.body.success.should.eql(true);
        res.body.intents.should.eql(['setPage', 'showPage']);
      });
  });

  it('should go to the last page', () => {
    return chai.request(app)
      .post('/api/v1/web')
      .set('X-Access-Token', token)
      .send({ phrase: 'last page' })
      .then(res => {
        const match = res.body.response.visual.card.attachments[0].footer.match(/^Page (\d+) of (\d+)$/);
        match[1].should.eql(match[2]);
        res.body.success.should.eql(true);
        res.body.intents.should.eql(['setPage', 'showPage']);
      });
  });

  /*it('should not be able to go after the last page', () => {
    return chai.request(app)
      .post('/api/v1/web')
      .set('X-Access-Token', token)
      .send({ phrase: 'next page' })
      .then(res => {
        res.body.response.visual.card.attachments[0].text.should.match(/^Already on the last page/);
        res.body.success.should.eql(true);
        res.body.intents.should.eql(['setPage']);
      });
  });*/

  it('should go to the first page', () => {
    return chai.request(app)
      .post('/api/v1/web')
      .set('X-Access-Token', token)
      .send({ phrase: 'first page' })
      .then(res => {
        res.body.response.visual.card.attachments[0].footer.should.match(/^Page 1/);
        res.body.success.should.eql(true);
        res.body.intents.should.eql(['setPage', 'showPage']);
      });
  });

  /*it('should not be able to go before the first page', () => {
    return chai.request(app)
      .post('/api/v1/web')
      .set('X-Access-Token', token)
      .send({ phrase: 'previous page' })
      .then(res => {
        res.body.response.visual.card.attachments[0].text.should.match(/^Already on the first page/)
        res.body.success.should.eql(true);
        res.body.intents.should.eql(['setPage']);
      });
  });*/

  it('should go to the next page', () => {
    return chai.request(app)
      .post('/api/v1/web')
      .set('X-Access-Token', token)
      .send({ phrase: 'next' })
      .then(res => {
        res.body.response.visual.card.attachments[0].footer.should.match(/^Page 2/);
        res.body.success.should.eql(true);
        res.body.intents.should.eql(['setPage', 'showPage']);
      });
  });

  it('should go to the previous page', () => {
    return chai.request(app)
      .post('/api/v1/web')
      .set('X-Access-Token', token)
      .send({ phrase: 'back' })
      .then(res => {
        res.body.response.visual.card.attachments[0].footer.should.match(/^Page 1/);
        res.body.success.should.eql(true);
        res.body.intents.should.eql(['setPage', 'showPage']);
      });
  });

  it('should button click to the next page', () => {
    return chai.request(app)
      .post('/api/v1/web')
      .set('X-Access-Token', token)
      .send({ callback_id: 'pageRoute', button: { name: 'Next', value: 3 } })
      .then(res => {
        res.body.response.visual.card.attachments[0].footer.should.match(/^Page 2/);
        res.body.success.should.eql(true);
        res.body.intents.should.eql(['pageRoute', 'showPage']);
      });
  });

  it('should button click to the previous page', () => {
    return chai.request(app)
      .post('/api/v1/web')
      .set('X-Access-Token', token)
      .send({ callback_id: 'pageRoute', button: { name: 'Previous', value: 0 } })
      .then(res => {
        res.body.response.visual.card.attachments[0].footer.should.match(/^Page 1/);
        res.body.success.should.eql(true);
        res.body.intents.should.eql(['pageRoute', 'showPage']);
      });
  });

  it('Should ask for help', () => {
    return chai.request(app)
      .post('/api/v1/web')
      .set('X-Access-Token', token)
      .send({ phrase: 'help' })
      .then(res => {
        res.body.success.should.eql(true);
        res.body.intents.should.eql(['help']);
      });
  });

  it('Should respond to version query', () => {
    return chai.request(app)
      .post('/api/v1/web')
      .set('X-Access-Token', token)
      .send({ phrase: 'which version' })
      .then(res => {
        res.body.success.should.eql(true);
        res.body.intents.should.eql(['davisVersion']);
      });
  });

  /*it('Debug routing one two three first middle last yes no all', () => {
    return chai.request(app)
      .post('/api/v1/web')
      .set('X-Access-Token', token)
      .send({ phrase: 'Debug routing intent' })
      .then(res => {
        res.body.success.should.eql(true);
        res.body.intents.should.eql(['startRoutingDebug']);
      })
      .then(() => {
        const routes = [];
        routes.push(BbPromise.resolve()
          .then(() => {
            return chai.request(app)
              .post('/api/v1/web')
              .set('X-Access-Token', token)
              .send({ phrase: 'the first one' })
                .then(res => {
                  res.body.success.should.eql(true);
                  res.body.response.visual.text.should.include('0');
                });
          }));
        routes.push(BbPromise.resolve()
          .then(() => {
            return chai.request(app)
              .post('/api/v1/web')
              .set('X-Access-Token', token)
              .send({ phrase: 'the second one' })
                .then(res => {
                  res.body.success.should.eql(true);
                  res.body.response.visual.text.should.include('1');
                });
          }));
        routes.push(BbPromise.resolve()
          .then(() => {
            return chai.request(app)
              .post('/api/v1/web')
              .set('X-Access-Token', token)
              .send({ phrase: 'the third one' })
                .then(res => {
                  res.body.success.should.eql(true);
                  res.body.response.visual.text.should.include('2');
                });
          }));
        routes.push(BbPromise.resolve()
          .then(() => {
            return chai.request(app)
              .post('/api/v1/web')
              .set('X-Access-Token', token)
              .send({ phrase: 'yes' })
                .then(res => {
                  res.body.success.should.eql(true);
                  res.body.response.visual.text.should.include('true');
                });
          }));
        routes.push(BbPromise.resolve()
          .then(() => {
            return chai.request(app)
              .post('/api/v1/web')
              .set('X-Access-Token', token)
              .send({ phrase: 'no' })
                .then(res => {
                  res.body.success.should.eql(true);
                  res.body.response.visual.text.should.include('false');
                });
          }));
        routes.push(BbPromise.resolve()
          .then(() => {
            return chai.request(app)
              .post('/api/v1/web')
              .set('X-Access-Token', token)
              .send({ phrase: 'the last one' })
                .then(res => {
                  res.body.success.should.eql(true);
                  res.body.response.visual.text.should.include('last');
                });
          }));
        routes.push(BbPromise.resolve()
          .then(() => {
            return chai.request(app)
              .post('/api/v1/web')
              .set('X-Access-Token', token)
              .send({ phrase: 'the middle one' })
                .then(res => {
                  res.body.success.should.eql(true);
                  res.body.response.visual.text.should.include('middle');
                });
          }));
        routes.push(BbPromise.resolve()
          .then(() => {
            return chai.request(app)
              .post('/api/v1/web')
              .set('X-Access-Token', token)
              .send({ phrase: 'all of them' })
                .then(res => {
                  res.body.success.should.eql(true);
                  res.body.response.visual.text.should.include('all');
                });
          }));
        return BbPromise.all(routes);
      });
  });*/

  it('Should calculate user activity', () => {
    return chai.request(app)
      .post('/api/v1/web')
      .set('X-Access-Token', token)
      .send({ phrase: 'user activity' })
      .then(res => {
        res.body.success.should.eql(true);
        res.body.intents.should.eql(['userActivity']);
      });
  });

  it('Should route to last problem', () => {
    return chai.request(app)
      .post('/api/v1/web')
      .set('X-Access-Token', token)
      .send({ phrase: 'what was my most recent issue' })
      .then(res => {
        res.body.success.should.eql(true);
        res.body.intents.should.eql(['problem', 'problemDetails']);
      });
  });

  it('Should get timezones', () => chai.request(app)
    .get('/api/v1/system/users/timezones')
    .set('X-Access-Token', token)
    .then(res => {
      res.body.timezones.should.include("America/Detroit");
      res.body.timezones.should.include("Etc/UTC");
      res.body.timezones.should.include("Europe/Vienna");
      res.body.timezones.should.include("America/New_York");
    })
  );

  it('Should get all aliases', () => {
    AliasModel.collection.remove()
      .then(() => {
        return new AliasModel({
          name: "My Web App",
          category: "applications",
          entityId: "QWERTY",
          display: {
            audible: "My web app",
            visual: "My Web App",
          },
          aliases: ["appweb", "davisweb"],
        }).save()
      })
      .then(() =>
        chai.request(app)
          .get('/api/v1/system/aliases')
          .set('X-Access-Token', token)
          .then(res => {
            res.body.applications.length.should.eql(1);
            res.body.applications[0].name.should.eql("My Web App");
          }));
  });
});
