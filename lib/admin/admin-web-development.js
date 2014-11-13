var errors = require('node-errors')
var nook = errors.nook

module.exports.configure = function(app, server, middleware, utils) {
  
  app.get('/web', function(req, res, next) {
    utils.render(req, res, 'web.jade', {})
  })

}