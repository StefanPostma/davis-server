'use strict';

const _ = require('lodash');
const router = require('express').Router();

router.route('/')
  // get all the users
  .get((req, res) => {
    const davis = req.app.get('davis');
    const users = davis.users;

    if (req.decoded.admin === false) {
      return res.send({ success: false, message: 'You must be an admin in order view all users.' });
    }

    return users.getAllUsers()
      .then((allUsers) => {
        res.send({ success: true, users: allUsers });
      })
      .catch((err) => {
        res.send({ success: false, message: err.message });
      });
  });

router.route('/timezones')
  // Returns a list of valid timezones
  .get((req, res) => {
    const davis = req.app.get('davis');
    const users = davis.users;

    return res.send({ success: true, timezones: users.getValidTimezones() });
  });

router.route('/:user_email')
  // Creates a new user
  .post((req, res) => {
    const davis = req.app.get('davis');
    const email = (req.params.user_email || '').toLowerCase();
    const users = davis.users;

    if (req.decoded.admin === false) {
      return res.send({ success: false, message: 'You must be an admin in order to create users.' });
    }

    return users.createUser(_.assign(req.body, { email }))
      .then((token) => {
        res.json({ success: true, message: 'User created!', token });
      })
      .catch((err) => {
        res.json({ success: false, message: err.message });
      });
  })

  // Gets an individual user
  .get((req, res) => {
    const davis = req.app.get('davis');
    const email = (req.params.user_email || '').toLowerCase();
    const users = davis.users;

    if (req.decoded.admin === false && req.decoded.email !== email) {
      return res.send({ success: false, message: 'You must be an admin in order to see other users information.' });
    }

    return users.getUser(email)
      .then((user) => {
        res.send({ success: true, user });
      })
      .catch((err) => {
        res.send({ success: false, message: err.message });
      });
  })

  // Updates a user
  .put((req, res) => {
    const davis = req.app.get('davis');
    const email = req.params.user_email;
    const users = davis.users;

    // Checking if the user is an admin
    if (req.decoded.admin === false) {
      if (req.decoded.email !== email) {
        // A non admin can only update themselves
        return res.send({ success: false, message: 'You must be an admin in order to update other users.' });
      } else if (_.get(req, 'body.admin') === true || _.get(req, 'body.admin') === 'true') {
        // A non admin cant promote themselves to an admin
        return res.send({ success: false, message: "Nice try!  A non admin user can't promote themselves to an admin." });
      }
    }

    return users.updateUser(email, req.body)
      .then(() => {
        res.send({ success: true, message: 'User updated!' });
      })
      .catch((err) => {
        // err.errors.timezone.message;
        res.send({ success: false, message: err.message });
      });
  })

  // delete the user with this id
  .delete((req, res) => {
    const davis = req.app.get('davis');
    const email = req.params.user_email;
    const users = davis.users;

    if (req.decoded.admin === false && req.decoded.email !== email) {
      return res.send({ success: false, message: 'You must be an admin in order to remove other users.' });
    }

    return users.deleteUser(email)
      .then(() => {
        res.send({ success: true, message: `${email} was deleted.` });
      })
      .catch((err) => {
        res.send({ success: false, message: err.message });
      });
  });

module.exports = router;
