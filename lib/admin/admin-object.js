var errors = require('node-errors')
var nook = errors.nook
var txain = require('txain')
var _ = require('underscore')

module.exports.configure = function(app, server, middleware, utils) {
  
  app.get('/object/:entity/:id', function(req, res, next) {
    var core = req.core
    var entity = core.model.entities[req.params.entity]
    // TODO: if not entity
    var id = req.params.id
    if (id === '_new') {
      utils.render(req, res, 'object-edit.jade', {
        object: new core.model.BackbeamObject(req.params.entity),
      })
    } else {
      var args = {
        entity: req.params.entity,
        id: req.params.id,
      }
      core.db.readObjects(args, nook(next,
        function(objects) {
          var object = objects[_.keys(objects)[0]]
          utils.render(req, res, 'object-edit.jade', {
            object: object,
          })
        })
      )
    }
  })

  app.post('/object/:entity/:id', function(req, res, next) {
    var core = req.core
    var args = {
      entity: req.params.entity,
      id: req.params.id,
      commands: req.body,
    }
    core.db.save(args, nook(next,
      function() {
        res.redirect(req.baseUrl+'/entity/'+req.params.entity)
      })
    )
  })

}
