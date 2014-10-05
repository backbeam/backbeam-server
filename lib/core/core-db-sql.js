var mysql = require('mysql')
var Hashids = require('hashids')
var bql = require('./bql')
var async = require('async')
var _ = require('underscore')
var txain = require('txain')
var errors = require('node-errors')
var nook = errors.nook
var util = require('util')

var TYPES = {
  'text'        : ['varchar', 255],
  'textarea'    : ['clob'],
  'richtextarea': ['clob'],
  'date'        : ['bigint', 20],
  'number'      : ['int', 11],
  'location'    : ['varchar', 255],
  'reference'   : ['int', 11],
  'select'      : ['varchar', 255],
  'day'         : ['varchar', 8],
  'json'        : ['clob'],
  'boolean'     : ['int', 1],
}

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
          id = hashids.encode(insertId)
          return callback(null, true)
        })
      }

      tx.then(function(insert, callback) {
        var now = Date.now()
        var conn = this.get('conn')
        var fields = core.model.entities[entity].fields
        var params = [id]
        var sql = (insert ? 'INSERT INTO ' : 'UPDATE ') + entity + ' SET _id = ?'
        for (var field in fields) {
          if (fields.hasOwnProperty(field)) {
            var value = commands['set-'+field]
            if (typeof value === 'undefiend') continue
            sql += ', '+field+' = ?'
            params.push(value)
          }
        }
        if (!insert) {
          sql += ', _updated_at = ?'
          params.push(now)
          sql += ' WHERE _id = ?'
          params.push(id)
        } else {
          sql += ', _created_at = ?'
          params.push(now)
          sql += ', _updated_at = ?'
          params.push(now)
        }
        conn.query(sql, params, callback)
      })
      .then(function(callback) {
        var sql = 'SELECT * FROM '+entity+' WHERE _id = ?'
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
          var sql = 'SELECT * FROM '+entity+' WHERE _id IN('+placeholders+')'
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
        object._id = obj._id

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
        objects[obj._id] = object
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

    db.describeDatabase = function(callback) {
      txain(db.showTables)
        .map(db.describeTable)
        .end(callback)
    }

    db.describeModel = function(callback) {
      var tables = []
      var entities = core.model.entities

      tables.push({
        name: 'id_generator',
        columns: [{
          name: '_id',
          type: 'int',
          length: 11,
        }]
      })

      _.keys(entities).forEach(function(entityKey) {
        var table = { name: entityKey, columns: [] }
        var fields = entities[entityKey].fields

        table.columns.push({
          name: '_id',
          type: 'varchar',
          length: 255,
        })

        table.columns.push({
          name: '_created_at',
          type: 'bigint',
          length: 20,
        })

        table.columns.push({
          name: '_updated_at',
          type: 'bigint',
          length: 20,
        })

        _.keys(fields).forEach(function(fieldKey) {
          var field = fields[fieldKey]
          var column = {
            name: fieldKey,
            type: TYPES[field.type][0],
            length: TYPES[field.type][1],
          }
          table.columns.push(column)
        })

        tables.push(table)
      })

      return callback(null, tables)
    }

    db.migrateSchema = function(callback) {
      txain(connect)
        .then(function(conn, callback) {
          this.set('conn', conn)
          db.describeModel(callback)
        })
        .then(function(tables, callback) {
          this.set('expected', tables)
          db.describeDatabase(callback)
        })
        .then(function(current, callback) {
          var expected = this.get('expected')
          var conn = this.get('conn')

          txain(expected)
            .each(compareTable, conn, current)
            .end(callback)
        })
        .end(callback)

      function compareTable(table, conn, current, callback) {
        var currentTable = _.findWhere(current, { name: table.name })

        txain(function(callback) {
          if (currentTable) return callback()

          currentTable = { columns: [] }
          var id
          table.columns = _.reject(table.columns, function(column) {
            if (column.name === '_id') {
              return id = column
            }
          })
          var command = util.format('CREATE TABLE IF NOT EXISTS %s ( _id %s (%d) NOT NULL PRIMARY KEY %s )',
            table.name, id.type, id.length, id.type === 'int' ? 'AUTO_INCREMENT' : '')
          conn.query(command, callback)
        })
        .then(function(callback) {
          callback(null, table.columns)
        })
        .each(function(column, callback) {
          compareColumn(conn, table, column, currentTable, callback)
        })
        .end(callback)
      }

      function compareColumn(conn, table, column, currentTable, callback) {
        var currentColumn = _.findWhere(currentTable.columns, { name: column.name })
        if (currentColumn
          && currentColumn.type === column.type
          && currentColumn.length === column.length) {
          return callback()
        }

        var command = util.format('ALTER TABLE %s %s COLUMN %s %s (%d)',
          table.name, currentColumn ? 'MODIFY' : 'ADD', column.name, column.type, column.length)
        console.log('command', command)
        conn.query(command, callback)
      }
    }

    return db
  }

}

