var errors = require('node-errors')
var nook = errors.nook

module.exports.configure = function(app, server, middleware, utils) {
  
  app.get('/entity/:entity', function(req, res, next) {
    utils.render(res, 'entity-list.jade', {})
  })

}
