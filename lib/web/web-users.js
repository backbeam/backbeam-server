var argmnts = require('./arguments')

module.exports = function(core, sandbox, req, res, private) {

  sandbox.backbeam.login = function() {
    var args      = argmnts(arguments, sandbox.response)
    var email     = args.next('email')
    var password  = args.next('password')
    var joins     = args.next('joins', true)
    var params    = args.rest()
    var callback  = args.callback()

    core.users.login({ email:email, password:password }, joins, params, function(err, id, references, authCode) {
      if (err) {
        if (callback === sandbox.response) {
          // TODO
        } else {
          return callback(err)
        }
      }
      var objects = objectsFromValues(references, null)
      var user = objects[id]
      if (user) {
        setCurrentUser(user, authCode)
      }
      if (callback === sandbox.response) {
        if (user) {
          sendObjects(err, references, [id], _.size(references))
        } else {
          sendObjects(err)
        }
      } else {
        callback(null, user)
      }
    })
  }

  sandbox.backbeam.requestPasswordReset = function() {
    var args      = argmnts(arguments, true)
    var email     = args.next('email')
    var callback  = args.callback()

    core.users.lostPassword(email, function(err) {
      if (err) return callback(err)
      callback()
    })
  }

  sandbox.backbeam.resetPassword = function() {
    var args      = argmnts(arguments, true)
    var code      = args.next('code')
    var password  = args.next('password')
    var callback  = args.callback()

    core.users.setPassword(code, password, function(err, _user, authCode) {
      if (err) return callback(err)
      var user = null
      if (_user) {
        var id = _user._id
        var references = {}; references[id] = _user
        var objects = objectsFromValues(references, null)
        user = objects[id]
        if (user) {
          setCurrentUser(user, authCode)
        }
      }
      callback(null, user)
    })
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
    var _callback = args.callback()
    
    core.users.verifyCode(code, joins, params, function(err, user, references, authCode) {
      if (handleError(err, callback, _callback)) return
      if (user) {
        var objects = objectsFromValues(references, null)
        user = objects[user._id]
        setCurrentUser(user, authCode)
      }
      if (_callback === sandbox.response) {
        if (user) {
          sendObjects(err, references, [user.id()], 1)
        } else {
          sendObjects(err)
        }
      } else {
        wrap(_callback)(status2Error(err), user)
      }
    })
  }

  sandbox.backbeam.socialSignup = function() {
    var args        = argmnts(arguments, sandbox.response)
    var provider    = args.nextString('provider')
    var credentials = args.nextObject('credentials')
    var joins       = args.next('joins', true)
    var params      = args.rest()
    var _callback   = args.callback()

    var callback = wrap(function(err, references, ids, userid, authCode, isNew) {
      if (handleError(err, callback, _callback)) return
      var usr = references && userid && references[userid]
      // To prevent status2Error() return an error
      // We don't change status2Error() because 'UserAlreadyExists' is not ok for register()
      if (!usr) {
        if (_callback === sandbox.response) {
          return sendObjects(err)
        } else {
          return wrap(_callback)(status2Error(err))
        }
      }

      var objects = objectsFromValues(references, null)
      var user = objects[userid]
      setCurrentUser(user, authCode)
      if (_callback === sandbox.response) {
        sendObjects(err, references, ids, 1)
      } else {
        wrap(_callback)(status2Error(err), user, isNew)
      }
    })
    if (provider === 'twitter') {
      core.users.twitterSignup(credentials, joins, params, callback)
    } else if (provider === 'facebook') {
      core.users.facebookSignup(credentials, joins, params, callback)
    } else if (provider === 'googleplus') {
      core.users.googlePlusSignup(credentials, joins, params, callback)
    } else if (provider === 'linkedin') {
      core.users.linkedInSignup(credentials, joins, params, callback)
    } else if (provider === 'github') {
      core.users.gitHubSignup(credentials, joins, params, callback)
    } else {
      throw new Error('Unsupported provider: `'+provider+'`')
    }
  }

}
