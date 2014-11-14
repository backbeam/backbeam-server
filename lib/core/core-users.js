var crypto = require('crypto')
var txain = require('txain')
var errors = require('node-errors')
var security = require('../util/security')

module.exports = function(options) {

  var key

  return function(core) {

    var users = {}

    function sessionKey() {
      if (!key) {
        key = new Buffer(core.config.authentication.sessionKey, 'hex')
      }
      return key
    }

    users.login = function(args, callback) {
      var email = args.email
      var password = args.password

      txain(function(callback) {
        var params = []
        core.db.list({
          entity: 'user',
          query: 'where __login_email_current=?',
          params: [email],
        }, callback)
      })
      .then(function(ids, objects, callback) {
        var user = objects[ids[0]]
        this.set('id', ids[0])
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
        errors
          .with(callback)
          .when(!valid)
            .forbidden('InvalidCredentials: Wrong password')
          .success(callback)
      })
      .then(function(valid, callback) {
        var id = this.get('id')
        var objects = this.get('objects')
        var user = objects[id]
        users.sessionCode(user, callback)
      })
      .then(function(authCode, callback) {
        var id = this.get('id')
        var objects = this.get('objects')
        callback(null, id, objects, authCode)
      })
      .end(callback)
    }

    users.verifyCode = function(args, callback) {
      var code = args.code
      var joins = args.joins
      var params = args.params

      txain(function(callback) {
        var params = [code]
        core.db.query('SELECT * FROM user where __login_email_verification=?', params, callback)
      })
      .then(function(rows, callback) {
        this.set('row', rows[0])
        errors
          .with(callback)
          .when(rows.length === 0)
            .request('InvalidCode: The given email verification code was not found in the database')
          .success(callback)
      })
      .then(function(callback) {
        var row = this.get('row')
        var email = row['__login_email_pending']
        var params = [null, null, email]
        var query = 'UPDATE user SET __login_email_verification=?, __login_email_pending=?, __login_email_current=?'
        core.db.query(query, params, callback)
      })
      .then(function(callback) {
        var row = this.get('row')
        var args = {
          id: row._id,
          entity: 'user',
          joins: joins,
          params: params,
        }
        core.db.readObjects(args, callback)
      })
      .end(callback)
    }

    users.lostPassword = function(args, callback) {
      var email = args.email
      
      txain(function(callback) {
        security.randomKey(callback)
      })
      .then(function(code, callback) {
        this.set('code', code)
        var params = [code, Date.now(), email]
        core.db.query('UPDATE user SET __login_password_lost_code=?, __login_password_lost_date=? WHERE __login_email_current=?',
          params, callback)
      })
      .then(function(info, callback) {
        errors
          .with(callback)
          .when(info.changedRows === 0)
            .request('InvalidCode: The given email verification code was not found in the database')
          .success(callback)
      })
      .then(function(callback) {
        var code = this.get('code')
        module.exports.lastLostPasswordCode = code
        callback()
      })
      .end(callback)
    }

    users.setPassword = function(args, callback) {
      var code = args.code
      var password = args.password

      txain(function(callback) {
        security.hashPassword(password, callback)
      })
      .then(function(hash, callback) {
        // TODO: check date
        var params = [hash, null, null, code]
        core.db.query('UPDATE user SET password=?, __login_password_lost_code=?, __login_password_lost_date=? WHERE __login_password_lost_code=?',
          params, callback)
      })
      .then(function(info, callback) {
        errors
          .with(callback)
          .when(info.changedRows === 0)
            .request('InvalidCode: The given email verification code was not found in the database')
          .success(callback)
      })
      .end(callback)
    }

    users.sessionCode = function(user, callback) {
      txain(function(callback) {
        crypto.randomBytes(16, callback)
      })
      .then(function(iv, callback) {
        this.set('iv', iv)
        var info = {
          key: sessionKey(),
          iv: iv,
        }
        var source = new Buffer(user._id+':'+Date.now())
        security.encryptBuffer(info, source, callback)
      })
      .then(function(output, callback) {
        callback(null, this.get('iv').toString('hex')+'|'+output.toString('hex'))
      })
      .end(callback)
    }

    users.userFromSessionCode = function(authCode, callback) {
      var tokens = authCode.split('|')
      txain(function(callback) {
        errors
          .with(callback)
          .when(tokens.length !== 2)
            .request('InvalidAuthcode: Invalid auth code')
          .success(callback)
      })
      .then(function(callback) {
        var info = {
          key: sessionKey(),
          iv: new Buffer(tokens[0], 'hex'),
        }
        var source = new Buffer(tokens[1], 'hex')
        security.decryptBuffer(info, source, callback)
      })
      .then(function(output, callback) {
        tokens = output.toString('utf8').split(':')
        errors
          .with(callback)
          .when(tokens.length !== 2)
            .request('InvalidAuthcode: Invalid auth code')
          .success(callback)
      })
      .then(function(callback) {
        callback(null, tokens[0])
      })
      .end(callback)
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
