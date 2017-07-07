'use strict';

const express = require('express'); // eslint-disable-line import/newline-after-import
const app = express();
const server = require('http').createServer(app);
const cors = require('cors');
const io = require('socket.io')(server);
const bodyParser = require('body-parser');
const favicon = require('serve-favicon');
const path = require('path');
const BbPromise = require('bluebird');
const routes = require('./routes');
const verifier = require('alexa-verifier');
const compression = require('compression');
const morgan = require('morgan');

class Server {
  constructor(davis) {
    this.davis = davis;
    this.io = io;
    this.server = server;
    this.app = app;
    this.express = express;

    this.activeSocketConnections = [];

    // Attaching the davis object to Express
    app.set('davis', davis);

    // Setup Morgan Logging
    app.use(morgan('tiny', { stream: { write: message => this.davis.logger.info(message.trim()) } }));

    // Alexa validation must be done before the middleware JSON parser
    app.use((req, res, next) => {
      // if production and windows => fail 401
      if (process.env.NODE_ENV === 'production' && process.platform === 'win32') {
        davis.logger.error('Cannot validate alexa requests on win32');
        req.status(401).json({ status: 'failure', reason: 'Cannot validate Alexa requests on Windows.' });
        return;
      }

      // only validate requests with signaturecertchainurl header
      if (!req.headers.signaturecertchainurl) {
        next();
        return;
      }

      // do not verify alexa requests in development
      if (process.env.NODE_ENV !== 'production') {
        davis.logger.debug('Alexa verification skipped outside production');
        req.alexaVerified = true;
        next();
        return;
      }

      req._body = true;
      req.rawBody = '';
      req.on('data', (data) => {
        req.rawBody += data;
        return req.rawBody;
      });
      req.on('end', () => {
        try {
          req.body = JSON.parse(req.rawBody);
        } catch (error) {
          davis.logger.error(error);
          req.body = {};
        }
        const certUrl = req.headers.signaturecertchainurl;
        const signature = req.headers.signature;
        const requestBody = req.rawBody;
        verifier(certUrl, signature, requestBody, (er) => {
          if (er) {
            davis.logger.error('error validating the alexa cert:', er);
            res.status(401).json({ status: 'failure', reason: er });
          } else {
            req.alexaVerified = true;
            next();
          }
        });
      });
    });

    // Configuring the middleware JSON parser
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: false }));

    // Configuring CORS
    app.use(cors());

    // Compress responses
    app.use(compression());

    // Defining static content and routes
    app.use(favicon(path.join(__dirname, '../../web/favicon.ico')));

    app.use('/', routes);
    app.use(express.static(path.join(__dirname, '../../web/dist/assets/icon')));
    app.use(express.static(path.join(__dirname, '../../web/dist')));

    app.use((req, res, next) => {
      if (!req.url.includes('/oauth') && !req.url.includes('/slack/receive')) {
        return res.sendFile(path.resolve(path.join(__dirname, '../../web/dist/index.html')));
      }
      return next();
    });
  }

  manageSocketConnections() {
    this.io.sockets.on('connection', (socket) => {
      this.davis.logger.debug('Detected a new socket connection.');
      this.activeSocketConnections.push({ socket, email: null, token: null });

      socket.on('registerSocket', (data) => {
        this.davis.logger.debug(`registerSocket with socket id: ${data.id}`);
        this.activeSocketConnections.forEach((connection, index) => {
          // Find matching socket
          if (connection.socket.id.replace('/#', '') === data.id) {
            // Verify user has valid JWT
            this.davis.users.isChromeTokenValid(data.token)
              .then((valid) => {
                if (valid) {
                  this.activeSocketConnections[index].email = data.email;
                  this.activeSocketConnections[index].token = data.token;
                  this.activeSocketConnections[index].isWeb = Boolean(data.isWeb);
                } else {
                  socket.emit('unauthorized');
                  socket.disconnect();
                }
              })
              .catch((err) => {
                this.davis.logger.warn('Chrome Extension token invalid', err);
                socket.emit('unauthorized');
                socket.disconnect();
              });
          }
        });
      });

      socket.on('disconnect', () => {
        this.davis.logger.debug('A socket connection was lost.');
        this.activeSocketConnections.forEach((connection, index) => {
          if (connection.socket.id === socket.id) {
            this.activeSocketConnections.splice(index, 1);
          }
        });
      });
    });
  }

  isSocketConnected(user) {
    let result = false;
    this.activeSocketConnections.forEach((connection) => {
      if (connection.email === user.email && !connection.isWeb) {
        result = true;
      }
    });
    return result;
  }

  getChromeToken(user) {
    let token;
    this.activeSocketConnections.forEach((connection) => {
      if (connection.email === user.email && connection.isWeb === user.isWeb) {
        token = connection.token;
      }
    });
    return token;
  }

  pushLinkToUser(user, link, newtab) {
    user.isWeb = false;
    const token = this.getChromeToken(user);
    if (token) {
      if (newtab) {
        this.io.sockets.emit(`${token}tab`, link);
      } else {
        this.io.sockets.emit(token, link);
      }
    } else {
      this.davis.logger.warn(`Unable to find connected socket for user: ${user.email}`);
    }
  }

  pushMessageToUser(email, message) {
    const user = { email, isWeb: true };
    const token = this.getChromeToken(user);
    if (email && token) {
      message.attachments[0].author_name = '@you';
      this.io.sockets.emit(token, message);
    } else if (!email) {
      this.io.emit('message', message);
    } else {
      this.davis.logger.warn(`Unable to find connected socket for user: ${user.email}`);
    }
  }

  start() {
    return new BbPromise.resolve().then(() => {
      // Setting up the socket.io connection
      this.manageSocketConnections();

      const port = this.davis.config.getDavisPort();

      // Starting the server
      this.server.listen(port, () => {
        this.davis.logger.info(`Davis server is now listening on port ${port}.`);
      });
    });
  }

}

module.exports = Server;
