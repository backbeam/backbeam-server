var errors = require('node-errors')
var nook = errors.nook

module.exports.configure = function(app, server, middleware, utils) {
  
  app.get('/entity/:entity', function(req, res, next) {
    var core = req.core
    var entity = core.model.entities[req.params.entity]
    // TODO: if not entity
    var args = {
      entity: req.params.entity,
    }
    core.db.list(args, nook(next,
      function(ids, objects, count) {
        utils.render(req, res, 'entity-list.jade', {
          ids: ids,
          objects: objects,
        })
      })
    )
  })

}
