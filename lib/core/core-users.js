var crypto = require('crypto')
var txain = require('txain')
var errors = require('node-errors')
var nook = errors.nook
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
      .then(function(objects, callback) {
        this.set('objects', objects)
        var user = objects[this.get('row')._id]
        users.sessionCode(user, callback)
      })
      .then(function(authCode, callback) {
        var objects = this.get('objects')
        var id = this.get('row')._id
        callback(null, id, objects, authCode)
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
        var params = [code]
        core.db.query('SELECT _id FROM user WHERE __login_password_lost_code=?',
          params, callback)
      })
      .then(function(rows, callback) {
        var tx = this
        errors
          .with(callback)
          .when(rows.length === 0)
            .request('InvalidCode: The given email verification code was not found in the database')
          .success(function() {
            tx.set('id', rows[0]._id)
            security.hashPassword(password, callback)
          })
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
      .then(function(callback) {
        var args = {
          entity: 'user',
          id: this.get('id'),
          // TODO: joins
        }
        core.db.readObjects(args, callback)
      })
      .then(function(objects, callback) {
        this.set('objects', objects)
        var user = objects[this.get('id')]
        users.sessionCode(user, callback)
      })
      .then(function(authCode, callback) {
        var objects = this.get('objects')
        var id = this.get('id')
        callback(null, id, objects, authCode)
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
        var id = user._id || user.id
        var source = new Buffer(id+':'+Date.now())
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

    users.socialSignup = function(args, callback) {
      var provider = args.provider
      var identifier = args.identifier
      var extra = args.extra
      var joins = args.joins
      var params = args.params
      var columnName = '__social_'+provider
      var extraColumnName = '__social_extra_'+provider
      var userid, isNew

      txain(function(callback) {
        var params = [identifier]
        core.db.query('SELECT _id FROM user WHERE `'+columnName+'`=?',
          params, callback)
      })
      .then(function(rows, callback) {
        userid = rows[0] && rows[0]['_id']

        errors
          .with(callback)
          .when(core.userid && userid && core.userid !== userid)
            .request('UserAlreadyExists: A user with that account already exists')
            // A user is logged in and is trying to log with an account already taken by other user
          .success(function() {
            isNew = !(core.userid || userid)
            var xtra = {}
            xtra[columnName] = identifier
            xtra[extraColumnName] = JSON.stringify(extra, null, 2)
            var args = {
              entity: 'user',
              id: userid || core.userid || void(0),
              commands: {},
              extra: xtra,
            }
            core.db.save(args, callback)
          })
      })
      .then(function(user, authCode, callback) {
        this.set('authCode', authCode)
        this.set('id', user._id)
        var args = {
          entity: 'user',
          id: user._id,
          joins: joins,
          params: params,
        }
        core.db.readObjects(args, callback)
      })
      .then(function(objects, callback) {
        callback(null, objects,
          this.get('id'),
          this.get('authCode'),
          isNew)
      })
      .end(callback)
    }

    users.social = {}
    users.providers = ['facebook', 'googleplus', 'twitter', 'linkedin', 'github']
    users.providers.forEach(function(provider) {
      var impl = require('./core-users-'+provider)
      var proxy = {}
      users.social[provider] = proxy
      proxy.shortname = impl.shortname
      proxy.signup = function(credentials, joins, params, callback) {
        var conf = core.config.authentication[provider]
        impl.signup(conf, credentials, nook(callback,
          function(args) {
            args.joins = joins
            args.params = params
            args.provider = impl.shortname
            core.users.socialSignup(args, callback)
          }
        ))
      }
    })

    return users
  }

}
