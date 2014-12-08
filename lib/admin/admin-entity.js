var errors = require('node-errors')
var nook = errors.nook

module.exports.configure = function(app, server, middleware, utils) {
  
  function listObjects(req, res, next) {
    var core = req.core
    var entity = core.model.findEntity(req.params.entity)
    // TODO: if not entity
    var joins = []
    entity.fields.forEach(function(field) {
      if (field.type === 'reference') {
        joins.push('join '+field.id)
      }
    })
    var query = joins.join(' ')
    var params = []
    var where = req.query.where
    if (where) {
      query = 'where '+where+' is ? '+query
      params = [req.query.value]
    }
    var args = {
      entity: req.params.entity,
      query: query,
      params: params,
    }
    core.db.list(args, nook(next,
      function(ids, objects, count) {
        var template = req.query.chooser ? 'object-chooser.jade' : 'entity-list.jade'
        utils.render(req, res, template, {
          ids: ids,
          objects: objects,
        })
      })
    )
  }

  app.get('/entity/:entity', listObjects)

}
