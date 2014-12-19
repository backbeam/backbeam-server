var errors = require('node-errors')
var nook = errors.nook

module.exports.configure = function(app, middleware, utils) {
  
  app.get('/email-templates', function(req, res, next) {
    utils.render(req, res, 'email-templates.jade', {})
  })

}
