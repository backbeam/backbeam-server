var argmnts = require('./arguments')
var utils = require('../api/api-utils')
var errors = require('node-errors')
var nook = errors.nook

module.exports = function(core, sandbox, req, res, private) {

  var currentUser
  var then = private.then

  function setCurrentUser(user, authCode) {
    currentUser = user
    if (private.sdk) {
      if (authCode) {
        res.set('x-backbeam-auth', authCode)
        res.set('x-backbeam-user', user.id())
      } else {
        // logout
        res.set('x-backbeam-auth', '')
      }
    }
  }

  function setCurrentUserFromValues(id, references, authCode, callback) {
    var objects = private.objectsFromValues(references)
    var user = objects[id]
    setCurrentUser(user, authCode)
    callback(user, objects)
  }

  private.setCurrentUser = setCurrentUser

  sandbox.backbeam.login = function() {
    var args      = argmnts(arguments, sandbox.response)
    var email     = args.next('email')
    var password  = args.next('password')
    var joins     = args.next('joins', true)
    var params    = args.rest()
    var callback  = args.callback()

    var args = {
      email: email,
      password: password,
      joins: joins,
      params: params,
    }

    core.users.login(args, then(callback,
      function(id, references, authCode) {
        setCurrentUserFromValues(id, references, authCode, function(user, objects) {
          res.jsonp({
            status: 'Success',
            objects: utils.denormalizeDictionary(references),
            id: id,
            count: 1,
            auth: authCode,
          })
        })
      },
      function(id, references, authCode) {
        setCurrentUserFromValues(id, references, authCode, function(user, objects) {
          callback(null, user)
        })
      }
    ))
  }

  sandbox.backbeam.requestPasswordReset = function() {
    var args      = argmnts(arguments, true)
    var email     = args.next('email')
    var callback  = args.callback()

    var args = {
      email: email,
    }
    core.users.lostPassword(args, then(callback,
      function() {
        res.jsonp({
          status: 'Success',
        })
      },
      callback
    ))
  }

  sandbox.backbeam.resetPassword = function() {
    var args      = argmnts(arguments, true)
    var code      = args.next('code')
    var password  = args.next('password')
    var callback  = args.callback()

    var args = {
      code: code,
      password: password,
    }
    core.users.setPassword(args, then(callback,
      function(id, references, authCode) {
        setCurrentUserFromValues(id, references, authCode, function(user, objects) {
          res.jsonp({
            status: 'Success',
            objects: utils.denormalizeDictionary(references),
            id: id,
            count: 1,
            auth: authCode,
          })
        })
      },
      function(id, references, authCode) {
        setCurrentUserFromValues(id, references, authCode, function(user, objects) {
          callback(null, user)
        })
      }
    ))
  }

  sandbox.backbeam.logout = function() {
    setCurrentUser(null, null)
  }

  sandbox.backbeam.currentUser = function() {
    return currentUser
  }

  sandbox.backbeam.verifyCode = function() {
    var args      = argmnts(arguments, sandbox.response)
    var code      = args.next('code')
    var joins     = args.next('joins', true)
    var params    = args.rest()
    var callback  = args.callback()

    var args = {
      code: code,
      joins: joins,
      params: params,
    }
    
    core.users.verifyCode(args, then(callback,
      function(id, references, authCode) {
        setCurrentUserFromValues(id, references, authCode, function(user, objects) {
          res.jsonp({
            status: 'Success',
            objects: utils.denormalizeDictionary(references),
            id: id,
            count: 1,
            auth: authCode,
          })
        })
      },
      function(id, references, authCode) {
        setCurrentUserFromValues(id, references, authCode, function(user, objects) {
          callback(null, user)
        })
      }
    ))
  }

  /*
  sandbox.backbeam.socialSignup = function() {
    var args        = argmnts(arguments, sandbox.response)
    var provider    = args.nextString('provider')
    var credentials = args.nextObject('credentials')
    var joins       = args.next('joins', true)
    var params      = args.rest()
    var callback    = args.callback()

    var _callback = function(err, references, ids, userid, authCode, isNew) {
      if (handleError(err, callback, _callback)) return
      var usr = references && userid && references[userid]
      // To prevent status2Error() return an error
      // We don't change status2Error() because 'UserAlreadyExists' is not ok for register()
      if (!usr) {
        if (callback === sandbox.response) {
          return sendObjects(err)
        } else {
          return callback(err)
        }
      }

      var objects = objectsFromValues(references, null)
      var user = objects[userid]
      setCurrentUser(user, authCode)
      if (callback === sandbox.response) {
        sendObjects(err, references, ids, 1)
      } else {
        callback(err, user, isNew)
      }
    }
    if (provider === 'twitter') {
      core.users.twitterSignup(credentials, joins, params, _callback)
    } else if (provider === 'facebook') {
      core.users.facebookSignup(credentials, joins, params, _callback)
    } else if (provider === 'googleplus') {
      core.users.googlePlusSignup(credentials, joins, params, _callback)
    } else if (provider === 'linkedin') {
      core.users.linkedInSignup(credentials, joins, params, _callback)
    } else if (provider === 'github') {
      core.users.gitHubSignup(credentials, joins, params, _callback)
    } else {
      throw new Error('Unsupported provider: `'+provider+'`')
    }
  }
  */

}
