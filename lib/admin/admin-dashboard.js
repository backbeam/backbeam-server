var errors = require('node-errors')
var nook = errors.nook

module.exports.configure = function(app, middleware, utils) {
  
  app.get('/', function(req, res, next) {
    utils.render(req, res, 'index.jade', {})
  })

}
