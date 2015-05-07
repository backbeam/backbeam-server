var argmnts = require('./arguments')
var utils = require('../api/api-utils')
var errors = require('node-errors')
var nook = errors.nook
var _ = require('underscore')
var txain = require('txain')

module.exports = function(core, req, res, private) {

  var currentUser
  var then = private.then
  var backbeam = private.backbeam

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
    } else {
      var authCookieName = private.authCookieName
      if (authCode) {
        res.cookie(authCookieName, authCode, { signed: true })
      } else {
        // logout
        res.clearCookie(authCookieName)
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

  private.setCurrentUserId = function(userid) {
    currentUser = backbeam.empty('user', userid)
  }

  backbeam.setCurrentUser = function(user, callback) {
    txain(function(callback) {
      core.users.sessionCode({ id: user.id() }, callback)
    })
    .then(function(authCode, callback) {
      private.setCurrentUser(user, authCode)
      callback()
    })
    .end(callback)
  }

  backbeam.login = function() {
    var args      = argmnts(arguments, private.response)
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

  backbeam.requestPasswordReset = function() {
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

  backbeam.resetPassword = function() {
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

  backbeam.logout = function() {
    setCurrentUser(null, null)
  }

  backbeam.currentUser = function() {
    return currentUser
  }

  backbeam.verifyCode = function() {
    var args      = argmnts(arguments, private.response)
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

  backbeam.socialSignup = function() {
    var args        = argmnts(arguments, private.response)
    var provider    = args.nextString('provider')
    var credentials = args.nextObject('credentials')
    var joins       = args.next('joins', true)
    var params      = args.rest()
    var callback    = args.callback()

    var impl = core.users.social[provider]
    if (!impl) {
      return callback(errors.notFound('UnknownSocialSignupProvider: Unknown social signup provider `%s`', provider))
    }
    impl.signup(credentials, joins, params,
      then(callback,
        function(objects, userid, authCode, isNew) {
          res.jsonp({
            status: isNew ? 'Success' : 'UserAlreadyExists',
            objects: utils.denormalizeDictionary(objects),
            auth: authCode,
            id: userid,
          })
        },
        function(objects, userid, authCode, isNew) {
          var objs = private.objectsFromValues(objects, null)
          var user = objs[userid]
          setCurrentUser(user, authCode)
          callback(null, user, isNew)
        }
      )
    )
  }

  function socialSignupWithProvider(argmnts, provider) {
    var args = [provider]
    for (var i = 0; i < argmnts.length; i++) {
      args.push(argmnts[i])
    }
    backbeam.socialSignup.apply(backbeam, args)
  }

  var providers = {
    twitter    : 'twitterSignup',
    facebook   : 'facebookSignup',
    googleplus : 'googlePlusSignup',
    linkedin   : 'linkedInSignup',
    github     : 'gitHubSignup',
  }

  _.keys(providers).forEach(function(provider) {
    var method = providers[provider]
    backbeam[method] = function() {
      socialSignupWithProvider(arguments, provider)
    }
  })

}
