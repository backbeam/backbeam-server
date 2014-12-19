var errors = require('node-errors')
var nook = errors.nook
var txain = require('txain')
var _ = require('underscore')
var dateutils = require('./date-utils')

module.exports.configure = function(app, middleware, utils) {

  function showForm(req, res, next) {
    var core = req.core
    var entity = core.model.findEntity(req.params.entity)
    // TODO: if not entity
    var id = req.params.id
    if (id === '_new') {
      utils.render(req, res, 'object-edit.jade', {
        object: new core.model.BackbeamObject(req.params.entity),
        objects: {},
      })
    } else {
      var joins = []
      entity.fields.forEach(function(field) {
        if (field.type === 'reference') {
          joins.push('join '+field.id)
        }
      })
      var args = {
        entity: req.params.entity,
        id: req.params.id,
        joins: joins.join(' ')
      }
      core.db.readObjects(args, nook(next,
        function(objects) {
          var object = objects[id]
          utils.render(req, res, 'object-edit.jade', {
            object: object,
            objects: objects,
          })
        })
      )
    }
  }

  function saveObject(req, res, next) {
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
      } else if (entity.id === 'user' && field.id === 'password' && !value) {
        // prevent setting an empty password
        value = void 0
      } else if (field.type === 'reference' && field.relationship.indexOf('many-') === 0) {
        value = void 0
        commands['add-'+field.id] = req.body['add-'+field.id]
        commands['rem-'+field.id] = req.body['rem-'+field.id]
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
  }
  
  app.get('/object/:entity/:id', showForm)
  app.post('/object/:entity/:id', saveObject)

}
