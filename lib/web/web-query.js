var argmnts = require('./arguments')
var utils = require('../api/api-utils')

module.exports = function(core, sandbox, req, res, private) {
  
  var handleError = function() { return false }
  var wrap = function() {
    return private.wrap.apply(this, arguments)
  }

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
    var _id    = args.next('id')
    var joins  = args.next('joins', true)
    var params = args.rest()
    var _callback = args.callback()

    var obj = createEmptyObject(entity, _id)
    if (_callback === sandbox.response) {
      obj.refresh(joins, params, sandbox.response)
    } else {
      var callback = pr.wrap(function(err) {
        wrap(_callback)(err, obj)
      })
      obj.refresh(joins, params, callback)
    }
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


  function createQuery(entity) {
    var _query = null
    var params = null
    var q = {}

    q.policy = function(value) {
      // ignored
      return this
    }

    q.query = function(q) {
      if (!q) return _query
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
      var _callback = args.callback()

      if (_callback === sandbox.response) {
        var callback = wrap(function(err, removed) {
          if (err) throw err
          sandbox.response.json({ status:'Success', count:removed })
        })
        core.data.removeQuery(entity, _query, params, limit, offset, false, callback)
      } else {
        var callback = wrap(function(err, removed) {
          if (handleError(err, callback, _callback)) return
          wrap(_callback)(err, removed)
        })
        core.data.removeQuery(entity, _query, params, limit, offset, false, callback)
      }
      return this
    }

    q.removeAll = function() {
      var args      = argmnts(arguments, sandbox.response)
      var _callback = args.callback()

      q.remove(0, 0, _callback)
      return this
    }

    q.fetch = function() {
      var args      = argmnts(arguments, sandbox.response)
      var limit     = args.nextNumber('limit')
      var offset    = args.nextNumber('offset')
      var _callback = args.callback()

      if (_callback === sandbox.response) {
        var callback = wrap(function(err, ids, objects, count) {
          if (err) throw err
          sandbox.response.json({
            status:'Success',
            objects: utils.denormalizeDictionary(objects),
            ids: ids,
            count: count,
          })
        })
        core.db.list({
          'entity': entity,
          'query': _query || '',
          'params': params,
          'limit': limit,
          'offset': offset,
        }, callback)
      } else {
        var callback = wrap(function(err, ids, references, count) {
          if (handleError(err, callback, _callback)) return

          if (err) { return wrap(_callback)(err) }

          var objects = objectsFromValues(references, null)
          var objs = []
          for (var i = 0; i < ids.length; i++) {
            objs.push(objects[ids[i]])
          }
          wrap(_callback)(err, objs, count, false)
        })
        core.db.list({
          entity: entity,
          query: _query,
          params: params,
          limit: limit,
          offset: offset,
        }, callback)
      }
      return this
    }

    q.near = function() {
      var args      = argmnts(arguments, sandbox.response)
      var field     = args.nextString('field')
      var lat       = args.nextNumber('lat')
      var lon       = args.nextNumber('lon')
      var limit     = args.nextNumber('limit')
      var _callback = args.callback()

      if (_callback === sandbox.response) {
        var callback = wrap(function (err, ids, objects, count, distances) {
          if (err) throw err
          sandbox.response.json({
            status:'Success',
            objects:utils.denormalizeDictionary(objects),
            ids:ids,
            count:count,
            distances:distances
          })
        })
        core.data.near(entity, _query, params, field, lat, lon, limit, null, callback)
      } else {
        var callback = wrap(function (err, ids, references, count, distances) {
          if (handleError(err, callback, _callback)) return

          if (err) { return wrap(_callback)(err) }

          var objects = objectsFromValues(references, null)
          var objs = []
          for (var i = 0; i < ids.length; i++) {
            objs.push(objects[ids[i]])
          }
          wrap(_callback)(err, objs, count, distances)
        })
        core.data.near(entity, _query, params, field, lat, lon, limit, null, callback)
      }
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
      var _callback = args.callback()

      // example for callezeta: 41.64747495090953, -0.8826994550781819, 41.661968233782424, -0.8689665449219319

      if (_callback === sandbox.response) {
        var callback = wrap(function (err, ids, objects, count) {
          if (err) throw err
          sandbox.response.json({
            status:'Success',
            objects:utils.denormalizeDictionary(objects),
            ids:ids,
            count:count
          })
        })
        core.data.bounding(entity, _query, params, field, swlat, nelat, swlon, nelon, limit, null, callback)
      } else {
        var callback = wrap(function (err, ids, references, count) {
          if (handleError(err, callback, _callback)) return

          if (err) { return wrap(_callback)(err) }

          var objects = objectsFromValues(references, null)
          var objs = []
          for (var i = 0; i < ids.length; i++) {
            objs.push(objects[ids[i]])
          }
          wrap(_callback)(err, objs, count)
        })
        core.data.bounding(entity, _query, params, field, swlat, nelat, swlon, nelon, limit, null, callback)
      }
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
      var _callback = args.callback()

      if (identifier) { commands._id = identifier }
      var callback = wrap(function(err, object, email_verification, code) {
        if (handleError(err, callback, _callback)) return
        commands = {}
        // sandbox.backbeam.verif = email_verification
        if (object) obj._fill(object, null)
        if (code && backbeamSettings['auto-signin-user-after-creation'] !== false) {
          // entity should be 'user' and status should be 'Success'
          setCurrentUser(obj, code)
        }
        if (_callback === sandbox.response) {
          if (object) {
            var objects = {}; objects[object._id] = object
            sendObjects(err, objects, [object._id], 1)
          } else {
            sendObjects(err)
          }
        } else {
          wrap(_callback)(err)
        }
      })
      core.db.save({
        entity: entity,
        commands: commands,
      }, callback)
    }

    obj.saveFile = function() {
      var args      = argmnts(arguments, sandbox.response)
      var _file     = args.nextObject('file')
      var _callback = args.callback()

      var file = filesIds[_file.id]

      // TODO: if (!file)
      // TODO: if (entity !== 'entity')

      if (identifier) { commands._id = identifier }
      var callback = wrap(function(err, object) {
        if (handleError(err, callback, _callback)) return
        commands = {}
        if (object) obj._fill(object, null)
        if (_callback === sandbox.response) {
          if (object) {
            var objects = {}; objects[object._id] = object
            sendObjects(err, objects, [object._id], 1)
          } else {
            sendObjects(err)
          }
        } else {
          wrap(_callback)(err)
        }
      })
      var mime = file.mimetype || file.type
      if (mime) {
        commands['set-mime'] = mime
      }
      if (file.name) {
        commands['set-filename'] = file.originalname || file.name
      }
      core.data.insertFile(file.path, commands, callback)
    }

    obj.refresh = function() {
      var args   = argmnts(arguments, sandbox.response)
      var joins  = args.next('joins', true)
      var params = args.rest()
      var _callback = args.callback()
      for (var i = 0; i < params.length; i++) {
        params[i] = stringFromObject(params[i], true) // TODO: if returns null?
      }

      var callback = wrap(function(err, objects, ids) {
        if (handleError(err, callback, _callback)) return
        if (_callback === sandbox.response) {
          sendObjects(err, objects, ids, ids && ids.length)
        } else {
          var refs = {}; refs[identifier] = obj
          objectsFromValues(objects, refs)
          wrap(_callback)(err, obj)
        }
      })
      core.db.readObjects({
        'entity': entity,
        'id': identifier,
        'joins': joins,
        'params': params,
      }, callback)
    }

    obj.remove = function() {
      var args = argmnts(arguments, sandbox.response)
      var _callback = args.callback()

      var callback = wrap(function(err, object) {
        if (handleError(err, callback, _callback)) return
        if (_callback === sandbox.response) {
          var objects = {}; objects[object._id] = object
          sendObjects(err, objects, [object._id], 1)
        } else {
          // if (object) obj._fill(object)
          wrap(_callback)(err)
        }
      })
      core.db.remove({
        'entity': entity,
        'identifier': identifier,
      }, callback)
    }

    obj._fill = function(object, references) {
      if (object._id) identifier = object._id
      createdAt = object._created_at
      updatedAt = object._updated_at
      if (object.type) entity = object.type

      commands = {}
      var _fields = object.fields() // TODO: error?
      extra = object.extra || {}
      for (var i=0; i<_fields.length; i++) {
        var field = _fields[i]
        var type  = object.typeOf(field)
        var value = object.get(field)
        if (type === 'reference') {
          if (references && _.isString(value)) {
            value = references[value]
            // TODO: if not references[value] create empty object with _id
          } else if (value.id && value.type) {
            value = references[value.id] || createEmptyObject(value.type, value.id)
          } else if (value.result && value.count) {
            var res = value.result
            var arr = []
            for (var j=0; j<res.length; j++) {
              var oid = res[j]
              if (references && references[oid]) {
                arr.push(references[oid])
              }
            }
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
      }
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
