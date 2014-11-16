var errors = require('node-errors')
var nook = errors.nook
var txain = require('txain')
var _ = require('underscore')
var dateutils = require('./date-utils')

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
    var id = req.params.id
    if (id === '_new') id = null

    var commands = []
    var entity = core.model.findEntity(req.params.entity)
    // TODO: if not entity

    entity.fields.forEach(function(field) {
      var value = req.body['set-'+field.id]
      if (field.type === 'date') {
        value = dateutils.parseDatetimeForm(req.body, field.id)
      } else if (field.type === 'day') {
        value = dateutils.parseDayForm(req.body, field.id)
      } else if (field.type === 'boolean') {
        value = value === 'on'
      } else if (field.type === 'json') {
        try {
          value = JSON.stringify(JSON.parse(value), null, 2)
        } catch (e) {
          value = null
        }
      } else if (field.type === 'number') {
        value = +value || 0
      }
      commands['set-'+field.id] = value
    })
    var args = {
      entity: req.params.entity,
      id: id,
      commands: commands,
    }
    core.db.save(args, nook(next,
      function() {
        res.redirect(req.baseUrl+'/entity/'+req.params.entity)
      })
    )
  })

}
