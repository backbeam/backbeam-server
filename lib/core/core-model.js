var _ = require('underscore')

module.exports = function(model) {

  // default data model
  defaultEntity('user', [
    {
      id: 'email',
      type: 'text',
    },
    {
      id: 'password',
      type: 'text',
    },
  ])

  defaultEntity('file', [
    {
      id: 'version',
      type: 'number',
    },
    {
      id: 'filename',
      type: 'text',
    },
    {
      id: 'description',
      type: 'textarea',
    },
    {
      id: 'mime',
      type: 'text',
    },
    {
      id: 'width',
      type: 'number',
    },
    {
      id: 'height',
      type: 'number',
    },
    {
      id: 'length',
      type: 'number',
    },
    {
      id: 'size',
      type: 'number',
    },
  ])

  function defaultEntity(id, fields) {
    var entity = _.findWhere(model.entities, { id: id })
    if (!entity) {
      entity = {
        id: id,
        fields: fields,
      }
      return model.entities.push(entity)
    }

    fields.forEach(function(field) {
      var fild = _.findWhere(entity.fields, { id: field.id })
      if (!fild) {
        return entity.fields.push(field)
      }
      fild.type = field.type
    })
  }

  return function(core) {

    function BackbeamObject(type) {
      this.type = type
      this.types = {}
      this.values = {}
    }

    BackbeamObject.prototype.set = function(key, value, type) {
      this.types[key]  = type
      this.values[key] = value
    }

    BackbeamObject.prototype.get = function(key) {
      return this.values[key]
    }

    BackbeamObject.prototype.typeOf = function(key) {
      return this.types[key]
    }

    BackbeamObject.prototype.fields = function() {
      return _.keys(this.types)
    }

    BackbeamObject.prototype.description = function() {
      var entity = model.findEntity(this.type)
      var fields = entity.fields
      for (var i = 0; i < fields.length; i++) {
        var value = this.values[fields[i].id]
        if (value) return value
      }
      return this._id
    }

    model.BackbeamObject = BackbeamObject

    model.findEntity = function(id) {
      return _.findWhere(model.entities, { id: id })
    }

    return model

  }

}
