var argmnts = require('./arguments')
var utils = require('../api/api-utils')
var errors = require('node-errors')
var nook = errors.nook
var _ = require('underscore')

module.exports = function(core, sandbox, req, res, private) {
  
  var then = private.then

  var backbeamSettings = {}

  sandbox.backbeam.select = function() {
    var args   = argmnts(arguments, false)
    var entity = args.next('entity')

    return createQuery(entity)
  }

  sandbox.backbeam.empty = function() {
    var args   = argmnts(arguments, false)
    var entity = args.next('entity')
    var _id    = args.next('id', true)

    return createEmptyObject(entity, _id)
  }

  sandbox.backbeam.read = function() {
    var args   = argmnts(arguments, sandbox.response)
    var entity = args.next('entity')
    var id     = args.next('id')
    var joins  = args.next('joins', true)
    var params = args.rest()
    var callback = args.callback()

    var obj = createEmptyObject(entity, id)
    obj.refresh(joins, params, callback) // TODO
  }

  function stringFromObject(obj, addEntity) {
    if (obj === null || typeof obj === 'undefined') return null

    if (typeof obj === 'string') {
      return obj
    }
    if (typeof obj === 'number') {
      return ''+obj
    }
    if (typeof obj === 'boolean') {
      return obj ? '1' : '0'
    }
    if (obj && obj.id && typeof obj.id === 'function' && obj.entity && typeof obj.entity === 'function') {
      if (addEntity) {
        return obj.entity()+'/'+obj.id()
      } else {
        return obj.id()
      }
    }
    if (obj && obj.constructor && obj.constructor.name == 'Date') {
      return ''+obj.getTime()
    }
    if (obj && obj.constructor && obj.constructor.name == 'Array') {
      return obj // for "_is in ?.field" queries
    }
    if (obj.constructor.name === 'Array' || obj.constructor.name === 'Object') {
      return JSON.stringify(obj)
    }
    if (obj && typeof obj.toString === 'function') {
      return obj.toString()
    }
    // TODO: location
    return null
  }

  function sendObjects(err, objects, ids, count) {
    if (err) throw err
    sandbox.response.json({
      status: 'Success',
      ids: ids,
      objects: utils.denormalizeDictionary(objects),
      count: count
    })
  }

  private.sendObjects = sendObjects

  function createQuery(entity) {
    var _query = null
    var params = null
    var q = {}

    q.policy = function(value) {
      // ignored
      return this
    }

    q.query = function(q) {
      if (!q) return this
      var args = argmnts(arguments, false)
      _query   = args.next('query')
      params   = args.rest()

      for (var i = 0; i < params.length; i++) {
        params[i] = stringFromObject(params[i], true) // TODO: if returns null?
      }
      return this
    }

    q.remove = function() {
      var args      = argmnts(arguments, sandbox.response)
      var limit     = args.nextNumber('limit')
      var offset    = args.nextNumber('offset')
      var callback  = args.callback()

      core.data.removeQuery(entity, _query, params, limit, offset, false,
        then(callback,
          function(removed) {
            sandbox.response.json({
              status: 'Success',
              count: removed,
            })
          },
          function(removed) {
            callback(null, removed)
          }
        )
      )
      return this
    }

    q.removeAll = function() {
      var args     = argmnts(arguments, sandbox.response)
      var callback = args.callback()

      q.remove(0, 0, callback)
      return this
    }

    q.fetch = function() {
      var args      = argmnts(arguments, sandbox.response)
      var limit     = args.nextNumber('limit')
      var offset    = args.nextNumber('offset')
      var callback  = args.callback()

      var opts = {
        entity: entity,
        query: _query,
        params: params,
        limit: limit,
        offset: offset,
      }

      core.db.list(opts, 
        then(callback,
          function(ids, objects, count) {
            sandbox.response.json({
              status:'Success',
              objects: utils.denormalizeDictionary(objects),
              ids: ids,
              count: count,
            })
          },
          function(ids, references, count) {
            var objects = objectsFromValues(references, null)
            var objs = []
            for (var i = 0; i < ids.length; i++) {
              objs.push(objects[ids[i]])
            }
            callback(null, objs, count, false)
          }
        )
      )

      return this
    }

    q.near = function() {
      var args      = argmnts(arguments, sandbox.response)
      var field     = args.nextString('field')
      var lat       = args.nextNumber('lat')
      var lon       = args.nextNumber('lon')
      var limit     = args.nextNumber('limit')
      var callback  = args.callback()

      core.data.near(entity, _query, params, field, lat, lon, limit, null,
        then(callback,
          function(ids, objects, count, distances) {
            sandbox.response.json({
              status:'Success',
              objects:utils.denormalizeDictionary(objects),
              ids:ids,
              count:count,
              distances:distances
            })
          },
          function(ids, objects, count, distances) {
            var objects = objectsFromValues(references, null)
            var objs = []
            for (var i = 0; i < ids.length; i++) {
              objs.push(objects[ids[i]])
            }
            callback(err, objs, count, distances)
          }
        )
      )
      return this
    }

    q.bounding = function() {
      var args      = argmnts(arguments, sandbox.response)
      var field     = args.nextString('field')
      var swlat     = args.nextNumber('swlat')
      var swlon     = args.nextNumber('swlon')
      var nelat     = args.nextNumber('nelat')
      var nelon     = args.nextNumber('nelon')
      var limit     = args.nextNumber('limit')
      var callback  = args.callback()

      // example for callezeta: 41.64747495090953, -0.8826994550781819, 41.661968233782424, -0.8689665449219319

      core.data.bounding(entity, _query, params, field, swlat, nelat, swlon, nelon, limit, null,
        then(callback,
          function(ids, objects, count) {
            sandbox.response.json({
              status:'Success',
              objects:utils.denormalizeDictionary(objects),
              ids:ids,
              count:count
            })
          },
          function(ids, references, count) {
            var objects = objectsFromValues(references, null)
            var objs = []
            for (var i = 0; i < ids.length; i++) {
              objs.push(objects[ids[i]])
            }
            callback(err, objs, count)
          }
        )
      )
      return this
    }
    return q
  }

  function createEmptyObject(entity, _id) {
    var commands   = {}
    var values     = {}
    var entity     = entity
    var createdAt  = null
    var updatedAt  = null
    var identifier = _id || null
    var extra      = {}

    var obj = {
      entity: function() {
        return entity
      },
      createdAt: function() {
        return createdAt
      },
      updatedAt: function() {
        return updatedAt
      },
      id: function() {
        return identifier
      },
      set: function(field, value) {
        var val = stringFromObject(value)
        if (val === null) { return false }
        values[field] = value
        commands['set-'+field] = val
        return true
      },
      add: function(field, obj) {
        var val = obj.id()
        if (!val) { return false }
        var key = 'add-'+field, arr = commands[key]
        if (!arr) {
          arr = []; commands[key] = arr
        }
        arr.push(val)
        return true
      },
      rem: function(field, obj) {
        var val = obj.id()
        if (!val) { return false }
        var key = 'rem-'+field, arr = commands[key]
        if (!arr) {
          arr = []; commands[key] = arr
        }
        arr.push(val)
        return true
      },
      get: function(field) {
        return values[field]
      },
      incr: function(field, value) {
        var val = parseFloat(value) || 1
        values[field] += val // TODO: if not set previously
        commands['incr-'+field] = val
      },
      del: function(field) {
        delete values[field]
        commands['del-'+field] = '1'
      },
      fields: function() {
        return _.keys(values)
      }
    }

    obj.save = function() {
      var args      = argmnts(arguments, sandbox.response)
      var callback  = args.callback()

      var args = {
        entity: entity,
        commands: commands,
      }
      if (identifier) {
        args.id = identifier
      }
      core.db.save(args, function(err, object, authCode) {
        if (err) return callback(err)
        commands = {}
        if (object) obj._fill(object, null)
        if (authCode && backbeamSettings['auto-signin-user-after-creation'] !== false) {
          private.setCurrentUser(obj, authCode)
        }
        if (callback === sandbox.response) {
          if (object) {
            var objects = {}; objects[object._id] = object
            sendObjects(err, objects, [object._id], 1)
          } else {
            sendObjects(err)
          }
        } else {
          callback(err)
        }
      })
    }

    obj.saveFile = function() {
      var args      = argmnts(arguments, sandbox.response)
      var _file     = args.nextObject('file')
      var callback  = args.callback()

      var file = private.filesIds[_file.id]

      // TODO: if (!file)
      // TODO: if (entity !== 'file')

      var mime = file.mimetype || file.type
      if (mime) {
        commands['set-mime'] = mime
      }
      if (file.name) {
        commands['set-filename'] = file.originalname || file.name
      }
      var args = {
        data: commands,
        id: identifier,
        filepath: file.path,
      }

      core.db.saveFile(args,
        then(callback,
          function(object) {
            commands = {}
            if (object) {
              obj._fill(object, null)
              var objects = {}; objects[object._id] = object
              return sendObjects(err, objects, [object._id], 1)
            }
            sendObjects()
          },
          function(object) {
            if (object) {
              obj._fill(object, null)
            }
            callback(null, obj)
          }
        )
      )
    }

    obj.refresh = function() {
      var args   = argmnts(arguments, sandbox.response)
      var joins  = args.next('joins', true)
      var params = args.rest()
      var callback = args.callback()

      params = params.map(function(param) {
        return stringFromObject(param, true) // TODO: if returns null?
      })

      var opts = {
        'entity': entity,
        'id': identifier,
        'joins': joins,
        'params': params,
      }
      core.db.readObjects(opts,
        then(callback,
          function(objects, ids) {
            sendObjects(null, objects, ids, ids && ids.length)
          },
          function(objects, ids) {
            var refs = {}; refs[identifier] = obj
            objectsFromValues(objects, refs)
            callback(null, obj)
          }
        )
      )
    }

    obj.remove = function() {
      var args = argmnts(arguments, sandbox.response)
      var callback = args.callback()

      var opts = {
        'entity': entity,
        'id': identifier,
      }

      core.db.remove(opts,
        then(callback,
          function(object) {
            var objects = {}; objects[object._id] = object
            sendObjects(err, objects, [object._id], 1)
          },
          function(objects) {
            var refs = {}; refs[identifier] = obj
            objectsFromValues(objects, refs)
            callback(null, obj)
          }
        )
      )
    }

    obj._fill = function(object, references) {
      if (object._id) identifier = object._id
      createdAt = object._created_at
      updatedAt = object._updated_at
      if (object.type) entity = object.type

      commands = {}
      var _fields = object.fields() // TODO: error?
      extra = object.extra || {}
      _fields.forEach(function(field) {
        var type  = object.typeOf(field)
        var value = object.get(field)
        if (typeof value === 'undefined' || value === null) return
        if (type === 'reference') {
          if (references && _.isString(value)) {
            value = references[value] || sandbox.backbeam.empty(object.entity(field), value)
          } else if (value.id && value.type) {
            value = references[value.id] || createEmptyObject(value.type, value.id)
          } else if (value.objects && value.count) {
            var res = value.objects
            var arr = []
            for (var j=0; j<res.length; j++) {
              var oid = res[j]
              if (references && references[oid]) {
                arr.push(references[oid])
              }
            }
            delete value.objects
            value.result = arr
          }
        } else if (type === 'date') {
          value = new Date(+value || 0)
        } else if (type === 'number') {
          value = +value || 0
        } else if (type === 'boolean') {
          value = value === '1'
        } else if (type === 'location') {
          value = new sandbox.backbeam.Location(value.addr, value.lat, value.lon)
        } else if (type === 'json') {
          try {
            value = JSON.parse(value)
          } catch(e) { }
        } else if (type === 'day') {
          var comps = value.split('-')
          value = new sandbox.backbeam.Day(+comps[0], +comps[1], +comps[2])
        }
        values[field] = value
      })
    }

    obj.getLoginData = function(provider, key) {
      key = 'login_'+provider+'_'+key
      return extra[key]
    }

    obj.getTwitterData = function(key) {
      return obj.getLoginData('tw', key)
    }

    obj.getFacebookData = function(key) {
      return obj.getLoginData('fb', key)
    }

    obj.getGooglePlusData = function(key) {
      return obj.getLoginData('gp', key)
    }

    obj.getLinkedInData = function(key) {
      return obj.getLoginData('ln', key)
    }

    obj.getGitHubData = function(key) {
      return obj.getLoginData('gh', key)
    }

    return obj
  }

  var objectsFromValues = function(values, objects) {
    objects = objects || {}
    for (var id in values) {
      var obj = objects[id]
      if (obj) continue
      objects[id] = createEmptyObject(values[id].type, id)
    }
    for (var id in values) {
      var obj = objects[id]
      var dict = values[id]
      obj._fill(dict, objects)
    }
    return objects
  }

  private.objectsFromValues = objectsFromValues

  sandbox.backbeam.collection = function() {
    var arr = []

    function addWithPrefix(values, prefix) {
      for (var i = 0; i < values.length; i++) {
        var value = values[i]
        if (value) {
          if (_.isArray(value)) {
            for (var i = 0; i < value.length; i++) {
              arr.push(prefix+value[i])
            }
          } else {
            arr.push(prefix+value)
          }
        }
      }
    }

    function Collection() {}

    var obj = new Collection()
    obj.add = function() {
      for (var i = 0; i < arguments.length; i++) {
        var value = arguments[i]
        if (value) {
          if (typeof value.id === 'function') {
            arr.push(value.id())
          } else if (_.isArray(value)) {
            for (var i = 0; i < value.length; i++) {
              obj.add(value[i])
            }
          } else {
            arr.push(value)
          }
        }
      }
      return this
    }
    obj.addTwitter = function() {
      addWithPrefix(arguments, 'tw:')
      return this
    }
    obj.addFacebook = function() {
      addWithPrefix(arguments, 'fb:')
      return this
    }
    obj.addGooglePlus = function() {
      addWithPrefix(arguments, 'gp:')
      return this
    }
    obj.addLinkedIn = function() {
      addWithPrefix(arguments, 'ln:')
    }
    obj.addGitHub = function() {
      addWithPrefix(arguments, 'gh:')
    }
    obj.addEmail = function() {
      addWithPrefix(arguments, 'email:')
      return this
    }
    obj.toString = function() {
      return arr.join('\n')
    }

    if (arguments.length === 1) {
      obj.add(arguments[0])
    } else {
      obj.add(Array.prototype.slice.call(arguments))
    }
    return obj
  }

}
