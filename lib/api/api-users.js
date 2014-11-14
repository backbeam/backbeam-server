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

function twitterSignup(req, res, next) {
  res.end('TODO')
}

function facebookSignup(req, res, next) {
  res.end('TODO')
}

function googlePlusSignup(req, res, next) {
  res.end('TODO')
}

function linkedInSignup(req, res, next) {
  res.end('TODO')
}

function gitHubSignup(req, res, next) {
  res.end('TODO')
}

module.exports.configure = function(app, middleware) {

  app.post('/user/email/login',
    middleware.requiresSignature(false),
    userLogin)
  
  app.post('/user/email/lostpassword',
    middleware.requiresSignature(false),
    userLostPassword)
  
  app.post('/user/email/setpassword',
    middleware.requiresSignature(false),
    userSetPassword)
  
  app.post('/user/email/verify',
    middleware.requiresSignature(false),
    verifyCode)
  
  app.post('/user/twitter/signup',
    middleware.requiresSignature(false),
    twitterSignup)
  
  app.post('/user/facebook/signup',
    middleware.requiresSignature(false),
    facebookSignup)
  
  app.post('/user/googleplus/signup',
    middleware.requiresSignature(false),
    googlePlusSignup)
  
  app.post('/user/linkedin/signup',
    middleware.requiresSignature(false),
    linkedInSignup)
  
  app.post('/user/github/signup',
    middleware.requiresSignature(false),
    gitHubSignup)

}
