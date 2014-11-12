var errors = require('node-errors')
var nook = errors.nook

module.exports.configure = function(app, server, middleware, utils) {
  
  app.get('/', function(req, res, next) {
    utils.render(res, 'index.jade', {})
  })

}
