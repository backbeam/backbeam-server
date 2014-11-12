var errors = require('node-errors')
var nook = errors.nook

module.exports.configure = function(app, server, middleware, utils) {
  
  app.get('/stats', function(req, res, next) {
    utils.render(req, res, 'stats.jade', {})
  })

}
