var errors = require('node-errors')
var nook = errors.nook

module.exports.configure = function(app, server, middleware, utils) {
  
  app.get('/configuration/general', function(req, res, next) {
    utils.render(req, res, 'configuration-general.jade', {})
  })

  app.get('/configuration/authentication', function(req, res, next) {
    utils.render(req, res, 'configuration-authentication.jade', {})
  })

  app.get('/configuration/push', function(req, res, next) {
    utils.render(req, res, 'configuration-push.jade', {})
  })

  app.get('/configuration/email', function(req, res, next) {
    utils.render(req, res, 'configuration-email.jade', {})
  })

}
