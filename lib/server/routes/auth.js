'use strict';

const auth = {
  verifyToken: (req, res, next) => {
    const davis = req.app.get('davis');
    const accessToken = req.headers['x-access-token'];
    const routerToken = req.headers['x-router-token'];


    const users = davis.users;
    if (routerToken) {
      users.verifyRouterToken(routerToken)
        .then((decoded) => {
          req.decoded = decoded;
          return next();
        })
        .catch(err => res.status(403).send({ success: false, message: err.message }));
    } else {
      users.verifyAccessToken(accessToken)
        .then((decoded) => {
          req.decoded = decoded;
          return next();
        })
        .catch(err => res.status(403).send({ success: false, message: err.message }));
    }
  },
};

module.exports = auth;
