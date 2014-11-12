var errors = require('node-errors')
var nook = errors.nook

module.exports.configure = function(app, server, middleware, utils) {
  
  app.get('/push', function(req, res, next) {
    utils.render(res, 'push.jade', {})
  })

}
