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

  user.fields.push({
    id: 'email',
    type: 'text',
  })

  user.fields.push({
    id: 'password',
    type: 'text',
  })

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

    model.BackbeamObject = BackbeamObject

    model.findEntity = function(id) {
      return _.findWhere(model.entities, { id: id })
    }

    return model

  }

}
