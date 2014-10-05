var TYPES = {
  'text'        : 't',
  'textarea'    : 'ta',
  'richtextarea': 'rt',
  'date'        : 'd',
  'number'      : 'n',
  'location'    : 'l',
  'reference'   : 'r',
  'select'      : 's',
  'day'         : 'c', // c => 'calendar'
  'json'        : 'j',
  'boolean'     : 'b',
}

function abbr(type) {
  return TYPES[type]
}

exports.abbr = abbr

exports.denormalizeObject = function(object) {
  var obj = {}
  var fields = object.fields()
  for (var i = 0; i < fields.length; i++) {
    var field = fields[i]
    var type  = object.typeOf(field)
    var value = object.get(field)
    if (type === 'date' || type === 'number') value = +value || 0
    if (type === 'boolean') value = value === '1'
    if (type === 'json') {
      try {
        value = JSON.parse(value)
      } catch (e) {
        // TODO: log
        value = null
      }
    }
    obj[field+'#'+abbr(type)] = value
  }
  if (object.type === 'user') {
    delete obj['password#t']
    copyKeysWithPrefix(object, obj, 'login_')
  }
  obj.created_at = object._created_at.getTime()
  obj.updated_at = object._updated_at.getTime()
  obj.type = object.type
  return obj
}

function copyKeysWithPrefix(object, obj, prefix) {
  for (var key in object.extra) {
    if (key.indexOf(prefix) === 0) {
      obj[key] = object.extra[key]
    }
  }
}

exports.denormalizeDictionary = function(objects) {
  if (!objects) return {}
  var objs = {}
  for (var key in objects) {
    var obj = objects[key]
    objs[key] = exports.denormalizeObject(obj)
  }
  return objs
}
