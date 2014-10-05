var mysql = require('mysql')
var Hashids = require('hashids')
var bql = require('./bql')
var async = require('async')
var _ = require('underscore')
var txain = require('txain')

module.exports = function(options) {

  var connections = {}
  var hashids = new Hashids('backbeam-shed-salt-id') // TODO: use options

  return function(core) {

    var db = {}

    function connect(callback) {
      var project = core.project.name
      var connection = connections[project]
      if (!connection) {
        var connectionOptions = {
          host     : options.host || 'localhost',
          port     : options.port || 3306,
          database : options.database,
          user     : options.user,
          password : options.pass,
          multipleStatements: true
        }
        var connection = mysql.createConnection(connectionOptions)
        connection.connect() // throws an error when parameterers are wrong
      }
      return callback(null, connection)
    }

    db.list = function(args, callback) {
      var entity = args.entity
      var q      = args.query
      var params = args.params

      txain(connect)
        .then(function(conn, callback) {
          try {
            var query = bql.parse(q)
          } catch (err) {
            return callback(err)
          }
          return callback(null, conn, query)
        })
        .then(function(conn, query, callback) {
          var sql = 'SELECT * FROM '+entity // TODO: transform BQL into SQL
          conn.query(sql, params, callback)
        })
        .then(function(result, callback) {
          var objects = normalizeObjects(entity, result)
          return callback(null, _.keys(objects), objects, objects.length) // TODO: total count
        })
        .end(callback)
    }

    db.save = function(args, callback) {
      var entity   = args.entity
      var commands = args.commands
      var id       = args.id

      var tx = txain(connect)
      .then(function(conn, callback) {
        this.set('conn', conn)
        callback()
      })

      if (!id) {
        tx.then(function(callback) {
          this.get('conn').query('INSERT INTO id_generator VALUES (); DELETE FROM id_generator;', [], callback)
        })
        .then(function(results, callback) {
          var insertId = results[0].insertId
          id = hashids.encrypt(insertId)
          return callback(null, true)
        })
      }

      tx.then(function(insert, callback) {
        var conn = this.get('conn')
        var fields = core.model.entities[entity].fields
        var params = [id]
        var sql = (insert ? 'INSERT INTO ' : 'UPDATE ') + entity + ' SET id = ?'
        for (var field in fields) {
          if (fields.hasOwnProperty(field)) {
            var value = commands['set-'+field]
            if (typeof value === 'undefiend') continue
            sql += ', '+field+' = ?'
            params.push(value)
          }
        }
        if (!insert) {
          sql += ' WHERE id = ?'
          params.push(id)
        }
        conn.query(sql, params, callback)
      })
      .then(function(callback) {
        var sql = 'SELECT * FROM '+entity+' WHERE id=?'
        this.get('conn').query(sql, [id], callback)
      })
      .then(function(result, callback) {
        return callback(null, normalizeObjects(entity, result)[id])
      })
      .end(callback)
    }

    db.readObjects = function(args, callback) {
      var ids = args.ids || [args.identifier]
      var entity = args.entity

      txain(connect)
        .then(function(conn, callback) {
          var placeholders = ids.map(function() { return '?' }).join(', ')
          var sql = 'SELECT * FROM '+entity+' WHERE id IN('+placeholders+')'
          conn.query(sql, ids, callback)
        })
        .then(function(result, callback) {
          return callback(null, normalizeObjects(entity, result))
        })
        .end(callback)
    }

    db.remove = function(args, callback) {
      var identifier = args.identifier
      var entity = args.entity

      txain(connect)
        .then(function(conn, callback) {
          var sql = 'DELETE FROM '+entity+' WHERE id=?'
          conn.query(sql, [identifier], callback)
        })
        .clean()
        .end(callback)
    }

    function normalizeObjects(entityid, objs) {
      var model = core.model
      var entity = model.entities[entityid]
      if (!entity) return null

      var objects = {}
      objs.forEach(function(obj) {
        var object = new core.model.BackbeamObject(entityid)
        object._id = obj.id

        for(var fieldid in entity.fields) {
          var field    = entity.fields[fieldid]
          var type     = field.type
          var value    = obj[fieldid]
          if (value) {
            if (type === 'location') {
              // value = self.parseCoordinates(value)
            }
            object.set(fieldid, value, type)
          }
        }
        // extra
        object.extra = {}
        for (var key in obj) {
          if (key.indexOf('_x_') === 0) {
            object.extra[key.substring('_x_'.length)] = obj[key]
          }
        }
        object._created_at = new Date(parseInt(obj._created_at, 10))
        object._updated_at = new Date(parseInt(obj._updated_at, 10))
        objects[obj.id] = object
      })
      return objects
    }

    db.showTables = function(callback) {
      txain(connect)
        .then(function(conn, callback) {
          conn.query('SHOW TABLES', callback)
        })
        .then(function(result, callback) {
          var tables = result.map(function(table) {
            return table[_.keys(table)[0]]
          })
          return callback(null, tables)
        })
        .end(callback)
    }

    db.describeTable = function(table, callback) {
      txain(connect)
        .then(function(conn, callback) {
          conn.query('DESCRIBE '+table, callback)
        })
        .then(function(result, callback) {
          var columns = result.map(function(column) {
            var type = column.Type
            var length = undefined
            var n = type.indexOf('(')
            var m = type.indexOf(')')
            if (n > 0 && m > n) {
              length = +type.substring(n+1, m)
              type = type.substring(0, n)
            }

            return {
              'name': column.Field,
              'type': type,
              'default': column.Default,
              'key': column.Key,
              'table': table,
              'length': length,
            }
          })
          return callback(null, {
            name: table,
            columns: columns,
          })
        })
        .end(callback)
    }

    db.compareSchema = function(callback) {
      txain(connect)
        .then(db.showTables)
        .map(db.describeTable)
        .end(callback)
    }

    return db
  }

}

