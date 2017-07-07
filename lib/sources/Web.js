'use strict';

const _ = require('lodash');

const WEB_REQUEST_SOURCE = 'web';

class Web {
  constructor(davis) {
    this.logger = davis.logger;
    this.pluginManager = davis.pluginManager;
    this.users = davis.users;
    this.event = davis.event;
    this.Exchange = davis.classes.Exchange;
    this.davis = davis;
    // Problem Notification Event Listener
    this.event.on(this.davis.notifications.getProblemNamespace(), exchange =>
      this.problemNotifications(exchange));
  }

  askDavis(req) {
    let dUser;

    return this.users.getUser(req.decoded.email)
      .then((user) => {
        dUser = user;
        const timezone = _.get(req, 'body.timezone', user.timezone);
        const exchange = new this.Exchange(this.davis, user);
        if (user.timezone !== timezone) {
          this.davis.logger.info(`The user has ${user.timezone} set as their timezone but the browser is reported ${timezone}.`);
        }
        exchange.setTimezone(timezone);
        return exchange.start(this._getRawRequest(req), this._getSourceType(req), `${WEB_REQUEST_SOURCE}:${user.email}`);
      })
      .then((exchange) => {
        const callbackId = _.get(req, 'body.callback_id');
        // button === { value, name }
        const button = _.get(req, 'body.button');
        const clicker = `${dUser.name.first} ${dUser.name.last}`.trim();

        if (button) {
          if (!button.name || button.value === undefined) throw new this.davis.classes.Error('Button must have value and name');
          exchange.button = true;
          const buttonDetails = this.extractButtonDetails(button.value);
          buttonDetails.name = button.name;
          buttonDetails.callback_id = callbackId;

          buttonDetails.intent = buttonDetails.intent || callbackId;

          const context = {
            button: buttonDetails,
            clicker,
          };

          exchange.addExchangeContext(context);

          return this.pluginManager.run(exchange, buttonDetails.intent);
        }

        return this.pluginManager.run(exchange);
      })
      .then(exchange => this._formatResponse(exchange))
      .catch(err => this._formatErrorResponse(err));
  }

  // Attempt to parse input as JSON, fall back on
  // old style string handling if JSON does not work
  extractButtonDetails(inp) {
    this.logger.debug(`Extracting details from ${inp}`);
    let data;
    try {
      data = JSON.parse(inp);
    } catch (e) {
      data = inp;
    }
    if (_.isObject(data)) {
      return data;
    }

    if (_.isString(data)) {
      const arr = data.split(':');
      return (arr.length === 1) ?
        { value: arr[0] } :
        { intent: arr[0], value: arr[1] };
    }

    return { value: data };
  }
  
  problemNotifications(exchange) {
    const webScopes = _.filter(exchange.getNotificationScopes(), scope => _.startsWith(scope, 'web'));
    this.logger.info(`Attempting to send out web notifications on ${webScopes.length} eligible scope(s).`);
    _.forEach(webScopes, (scope) => {
      const detailedScope = scope.split(':');
      const user = (detailedScope.length > 1) ? detailedScope[1] : null;
      // send message
      const message = exchange.getVisualResponse();
      if (exchange.filtered) {
        message.attachments[0].author_name = '@everyone';
      }
      this.davis.server.pushMessageToUser(user, message);
    });
  }

  _getRawRequest(req) {
    return _.get(req, 'body.phrase', ' ');
  }

  _getSourceType(req) {
    return _.get(req, 'body.sourceType', WEB_REQUEST_SOURCE);
  }

  _formatResponse(exchange) {
    const response = _.assign({}, _.get(exchange, 'model.response'));
    const intents = exchange.intents;
    response.audible.ssml = `<ssml>${response.audible.ssml}</ssml>`;
    return {
      success: true,
      response,
      intents,
    };
  }

  _formatErrorResponse(err) {
    let message;
    if (err.name === 'DavisError') {
      message = err.message;
    } else {
      message = 'Unfortunately an unhandled error has occurred.';
      this.davis.utils.logError(err);
    }
    return {
      success: false,
      response: message,
    };
  }
}

module.exports = Web;
