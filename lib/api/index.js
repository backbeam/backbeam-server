var security = require('../util/security')
var errors = require('node-errors')
var expire_time = 60*1000 // one minute

function checkSignature(core, data, checkNonce, callback) {
  var shared = data.key
  var signature = data.signature
  var time = +data.time
  var nonce = data.nonce
  var secret = core.config.api.keys[shared]

  errors.with(callback)
    .when(!shared)
      .request('MissingApiKey: The shared API key was not found')
    .when(checkNonce && !nonce)
      .request('MissingNonce: The nonce parameter was not found')
    .when(checkNonce && (!nonce || nonce.length < 30 || nonce.length > 42))
      .request('InvalidNonce: The nonce parameter must be between 30 and 42 characters long')
    .when(!signature)
      .request('MissingSignature: The signature parameter was not found')
    .when(!time)
      .request('MissingTime: The time parameter was not found')
    .when(Math.abs(Date.now() - time) > expire_time)
      .request('ExpiredTime: The time parameter is not synched up')
    .when(!secret)
      .request('InvalidApiKey: The API key is invalid')
    .success(function() {

      var signature = data.signature
      delete data.signature
      var expected = security.signData(data, shared, secret)

      errors.with(callback)
        .when(!security.constantTimeStringCompare(signature, expected))
          .request('InvalidSignature: The signature parameter is invalid')
        .success(callback)
    })
}

module.exports.configure = function(app) {

  var middleware = {}

  app.use(function(req, res, next) {
    var core = req.core
    var auth = req.query.auth || req.body.auth
    if (!auth) return next()
    if (auth) {
      core.users.userFromSessionCode(auth, function(err, userid) {
        errors
          .with(next)
          .on(err)
            .internal('InvalidAuthCode: The auth code is invalid')
          .success(next)
      })
    }
  })

  middleware.requiresSignature = function(checkNonce) {
    return function(req, res, next) {
      var core   = req.core
      var method = req.method
      var data   = method === 'GET' || method === 'DELETE' ? req.query : req.body

      data.method = method
      data.path   = req.path

      checkSignature(core, data, checkNonce, next)
    }
  }

  if (process.env.NODE_ENV === 'test') {
    app.get('/test', middleware.requiresSignature(true), function(req, res) {
      res.json({ status: 'Success' })
    })
  }

  require('./api-data').configure(app, middleware)
  require('./api-push').configure(app, middleware)
  require('./api-query').configure(app, middleware)
  require('./api-users').configure(app, middleware)

  app.use(function(err, res, res, next) {
    var code = 500 // default

    if (errors.isCustomError(err)) {
      if (err.isNotFound()) {
        code = 404
      } else if (err.isForbidden()) {
        code = 403
      } else if (err.isRequest()) {
        code = 400
      }
    } else {
      console.log('Internal error', err.stack)
    }

    var status = 'InternalError'
    var n = err.message && err.message.indexOf(':')
    if (n > 0) {
      status = err.message.substring(0, n)
      err.message = err.message.substring(n+1).trim()
    }

    res.status(code)
    res.json({
      status: status,
      message: err.message || 'Unknown error',
    })
  })

}
