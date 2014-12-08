var _ = require('underscore')

module.exports = function(options) {

  // default data model
  var user = _.findWhere(options.entities, { id: 'user' })
  if (!user) {
    user = {
      id: 'user',
      fields: [],
    }
    options.entities.push(user)
  }

  user.fields = [
    {
      id: 'email',
      type: 'text',
    },
    {
      id: 'password',
      type: 'text',
    }
  ].concat(user.fields)

  return function(core) {

    var model = _.extend({}, options)

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
