'use strict';

const rp = require('request-promise');
const _ = require('lodash');


class Ymonitor {
  constructor(davis) {
    this.logger = davis.logger;
    this.config = davis.config;
    this.davis = davis;
  };


  _authenticate() {
    this.logger.debug("Requesting Ymonitor authentication token");
    const opts = {
      method: 'POST',
//             uri: this.baseUrl,
// TODO: replace with this.config.getYmonitorApiUrl();
        uri: 'https://api.ymonitor.nl/authenticate',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: {
            "username" :  this.config.getYmonitorUsername()  , "password" : this.config.getYmonitorPassword()
          },
          json: true,
        };
    return rp(opts)
      .then(resp => {
        var token = resp['token'];
        this.logger.debug("token received: " + token)
        return token;
      })
    .catch(function (err) {
      davis.logger.debug('API call failed.');
      davis.logger.debug(err.toString());
    })
  };

  getKetens() {
      return this._authenticate()
        .then((token) => {
          this.logger.debug("Requesting Ymonitor ketens");
          const opts = {
            method: 'GET',
              uri: 'https://api.ymonitor.nl/ketens',
              headers: {
                'authToken':  token
                 },
              json: true,
            }
            return rp(opts)
              .then(resp => {
                this.logger.debug("Got the following respond from Ymonitor: " + JSON.stringify(resp['keten']));
                return resp['keten'];
              });
        });
  }

}

module.exports=Ymonitor;
