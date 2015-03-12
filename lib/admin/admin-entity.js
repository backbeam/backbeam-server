var errors = require('node-errors')
var nook = errors.nook
var _ = require('underscore')

var TYPES = [
  'text'        ,
  'textarea'    ,
  'richtextarea',
  'date'        ,
  'number'      ,
  'location'    ,
  'select'      ,
  'day'         ,
  'json'        ,
  'boolean'     ,
]

module.exports.configure = function(app, middleware, utils) {

  function saveConfiguration(core, callback) {
    core.config.saveConfiguration(nook(callback,
      function() {
        core.db.migrateSchema(true, callback)
      }
    ))
  }

  function saveAndRedirect(req, res, next) {
    var core = req.core
    saveConfiguration(core, nook(next,
      function(commands) {
        console.log('commands', commands)
        res.redirect(req.baseUrl+'/entity/'+req.params.entity+'/edit')
      })
    )
  }

  function show(req, res, next) {
    var core = req.core
    var entity = core.model.findEntity(req.params.entity)
    // TODO: if not entity
    utils.render(req, res, 'entity-model.jade', {
      entity: entity,
      fieldTypes: TYPES,
    })
  }

  function edit(req, res, next) {
    var core = req.core
    var id = req.body.identifier
    var oldid = req.body.oldIdentifier
    var type = req.body.type
    if (!oldid) {
      core.model.entities.push({
        id: id,
        fields: [],
      })
    } else {
      var entity = core.model.findEntity(oldid)
      // TODO: if not entity
      entity.id = id
      entity.formerly = [oldid].concat(entity.formerly || [])
      // update all relationships
      entity.fields.forEach(function(field) {
        if (field.type === 'reference') {
          var entty = core.model.findEntity(field.entity)
          var field = _.findWhere(entty.fields, { id: field.inverse })
          field.entity = id
        }
      })
    }
    req.params.entity = id
    next()
  }

  function remove(req, res, next) {
    var core = req.core
    var entity = core.model.findEntity(req.params.entity)
    // TODO: if not entity
    // remove all relationships
    entity.fields.forEach(function(field) {
      if (field.type === 'reference') {
        var entty = core.model.findEntity(field.entity)
        entty.fields = _.reject(entty.fields, function(fild) {
          return fild.id === field.inverse
        })
      }
    })
    core.model.entities = _.reject(core.model.entities, function(entity) {
      return entity.id === req.params.entity
    })
    saveConfiguration(core, nook(next,
      function() {
        res.redirect(req.baseUrl)
      }
    ))
  }

  function editField(req, res, next) {
    var core = req.core
    var entity = core.model.findEntity(req.params.entity)
    // TODO: if not entity
    var id = req.body.identifier
    var oldid = req.body.oldIdentifier
    var type = req.body.type
    if (!oldid) {
      entity.fields.push({
        id: id,
        type: type,
      })
    } else {
      var field = _.findWhere(entity.fields, { id: oldid })
      // TODO: if not field
      field.id = id
      field.type = type
      field.formerly = [oldid].concat(field.formerly || [])
    }
    next()
  }

  function removeField(req, res, next) {
    var id = req.params.field || req.body.field
    var core = req.core
    var entity = core.model.findEntity(req.params.entity)
    var field = _.findWhere(entity.fields, { id: id })
    // TODO: if not entity
    // TODO: if not field
    entity.fields = _.reject(entity.fields, function(field) {
      return field.id === req.body.field
    })
    if (field.type === 'reference') {
      var entty = core.model.findEntity(field.entity)
      entty.fields = _.reject(entty.fields, function(fild) {
        return fild.id === field.inverse
      })
    }
    next()
  }

  function editRelationship(req, res, next) {
    var core = req.core
    var entity = core.model.findEntity(req.params.entity)
    var entty = core.model.findEntity(req.body.entity)
    // TODO: if not entity
    // TODO: if not entty
    var id = req.body.identifier
    var oldid = req.body.oldIdentifier
    var inverse = req.body.inverse

    var type = req.body.type
    var inverseType = type
    if (type === 'one-to-many') {
      inverseType = 'many-to-one'
    } else if (type === 'many-to-one') {
      inverseType = 'one-to-many'
    }

    if (!oldid) {
      entity.fields.push({
        id: id,
        type: 'reference',
        entity: entty.id,
        inverse: inverse,
        relationship: type
      })
      entty.fields.push({
        id: inverse,
        type: 'reference',
        entity: entity.id,
        inverse: id,
        relationship: inverseType
      })
    } else {
      var field = _.findWhere(entity.fields, { id: oldid })
      var fild = _.findWhere(entty.fields, { id: field.inverse })
      // TODO: if not field
      field.relationship = type
      if (id !== oldid) {
        field.id = id
        field.formerly = [oldid].concat(field.formerly || [])
        fild.inverse = id
      }

      fild.relationship = inverseType
      if (inverse !== field.inverse) {
        fild.id = id
        fild.formerly = [oldid].concat(field.formerly || [])
        field.inverse = id
      }
    }
    next()
  }

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
      offset: req.query.offset,
      limit: req.query.limit,
    }
    core.db.list(args, nook(next,
      function(ids, objects, count) {
        var template = req.query.chooser ? 'object-chooser.jade' : 'entity-list.jade'
        utils.render(req, res, template, {
          ids: ids,
          objects: objects,
          count: count,
        })
      })
    )
  }

  app.get('/entity/:entity', middleware.sanitizePagination, listObjects)
  app.get('/entity/:entity/edit', show)
  app.post('/entity/edit', edit, saveAndRedirect)
  app.delete('/entity/:entity', remove)

  app.post('/entity/:entity/field', editField, saveAndRedirect)
  app.post('/entity/:entity/relationship', editRelationship, saveAndRedirect)
  app.delete('/entity/:entity/field', removeField, saveAndRedirect)

}
