var _ = require('underscore')

module.exports = function(options) {

  // default data model
  var user = options.entities.user
  if (!user) {
    user = { fields: [] }
    options.entities.user = user
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

    return model

  }

}
