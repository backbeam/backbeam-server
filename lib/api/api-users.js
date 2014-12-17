var utils = require('./api-utils')
var errors = require('node-errors')
var nook = errors.nook

function userLogin(req, res, next) {
  var core = req.core

  var args = {
    email: req.body.email,
    password: req.body.password,
    // TODO: joins
  }

  // TODO: validate args
  core.users.login(args, nook(next,
    function(id, objects, authCode) {
      res.jsonp({
        status:'Success',
        objects: utils.denormalizeDictionary(objects),
        id: id,
        count: 1,
        auth: authCode,
      })
    })
  )
}

function userLostPassword(req, res, next) {
  var core = req.core
  var args = {
    email: req.body.email,
    // TODO: joins
  }

  core.users.lostPassword(args, nook(next,
    function() {
      res.jsonp({
        status: 'Success',
      })
    })
  )
}

function userSetPassword(req, res, next) {
  var core = req.core
  var args = {
    code: req.body.code,
    password: req.body.password,
    // TODO: joins
  }

  core.users.setPassword(args, nook(next,
    function(id, references, authCode) {
      res.jsonp({
        status: 'Success',
        objects: utils.denormalizeDictionary(references),
        id: id,
        count: 1,
        auth: authCode,
      })
    })
  )
}

function verifyCode(req, res, next) {
  var core = req.core
  var args = {
    code: req.body.code,
    // TODO: joins
  }

  core.users.verifyCode(args, nook(next,
    function(user, objects, authCode) {
      res.jsonp({
        status: 'Success',
        objects: utils.denormalizeDictionary(objects),
        id: user.id,
        count: 1,
        auth: authCode,
      })
    })
  )
}

function socialSignup(req, res, next) {
  var core = req.core
  var joins = req.body.joins
  var params = utils.getParams(req)
  var provider = req.params.provider

  var impl = core.users.social[provider]
  if (!impl) {
    return next(errors.notFound('UnknownSocialSignupProvider: Unknown social signup provider `%s`', provider))
  }

  impl.signup(req.body, joins, params, nook(next,
    function(objects, userid, authCode, isNew) {
      res.jsonp({
        status: isNew ? 'Success' : 'UserAlreadyExists',
        objects: utils.denormalizeDictionary(objects),
        auth: authCode,
        id: userid,
      })
    }
  ))
}

module.exports.configure = function(app, middleware) {

  app.post('/user/email/login',
    middleware.requiresSignature(true),
    userLogin)
  
  app.post('/user/email/lostpassword',
    middleware.requiresSignature(true),
    userLostPassword)
  
  app.post('/user/email/setpassword',
    middleware.requiresSignature(true),
    userSetPassword)
  
  app.post('/user/email/verify',
    middleware.requiresSignature(true),
    verifyCode)

  app.post('/user/:provider/signup',
    middleware.requiresSignature(true),
    socialSignup)
  
}
