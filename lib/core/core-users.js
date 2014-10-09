var txain = require('txain')
var errors = require('node-errors')
var security = require('../util/security')

module.exports = function(options) {

  return function(core) {

    var users = {}

    users.login = function(args, callback) {
      var email = args.email
      var password = args.password

      txain(function(callback) {
        var params = []
        core.db.list({
          entity: 'user',
          query: 'where email=?',
          params: [email],
        }, callback)
      })
      .then(function(ids, objects, callback) {
        var user = objects[ids[0]]
        this.set('ids', ids[0])
        this.set('objects', objects)
        errors
          .with(callback)
          .when(!user)
            .notFound('UserNotFound: No user found with that email address')
          .success(function() {
            security.verifyPassword(password, user.get('password'), callback)
          })
      })
      .then(function(valid, callback) {
        var ids = this.get('ids')
        var objects = this.get('objects')
        errors
          .with(callback)
          .when(!valid)
            .forbidden('InvalidCredentials: Wrong password')
          .success(function() {
            callback(null, ids, objects)
          })
      })
      .end(callback)
    }

    users.verifyCode = function(emailVerification, joins, params, callback) {

    }

    users.lostPassword = function(email, callback) {

    }

    users.setPassword = function(lostCode, password, callback) {

    }

    users.sessionCode = function(user, callback) {

    }

    users.userFromSessionCode = function(authCode, callback) {

    }

    users.socialSignup = function(provider, identifier, extra, joins, params, callback) {

    }

    users.facebookSignup = function(credentials, joins, params, callback) {
    
    }

    users.googlePlusSignup = function(credentials, joins, params, callback) {
      
    }

    users.twitterSignup = function(credentials, joins, params, callback) {
      
    }

    users.linkedInSignup = function(credentials, joins, params, callback) {
      
    }

    users.gitHubSignup = function(credentials, joins, params, callback) {
      
    }

    return users
  }

}
