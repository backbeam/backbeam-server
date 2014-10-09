var utils = require('./api-utils')
var errors = require('node-errors')
var nook = errors.nook

function userLogin(req, res, next) {
  var core = req.core

  var args = {
    email: req.body.email,
    password: req.body.password,
  }

  // TODO: validate args
  core.users.login(args, nook(next,
    function(id, objects, count) {
      res.jsonp({
        status:'Success',
        objects: utils.denormalizeDictionary(objects),
        id: id,
        count: 1,
      })
    })
  )
}

function userLostPassword(req, res, next) {
  res.end('TODO')
}

function verifyCode(req, res, next) {
  res.end('TODO')
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
