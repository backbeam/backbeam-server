var mysql = require('mysql')
var Hashids = require('hashids')
var bql = require('./bql')
var async = require('async')
var _ = require('underscore')
var _s = require('underscore.string')
var txain = require('txain')
var errors = require('node-errors')
var nook = errors.nook
var util = require('util')
var security = require('../util/security')

var TYPES = {
  'text'        : ['varchar', 255],
  'textarea'    : ['text'],
  'richtextarea': ['text'],
  'date'        : ['bigint', 20],
  'number'      : ['int', 11],
  'location'    : ['varchar', 255],
  'reference'   : ['varchar', 255],
  'select'      : ['varchar', 255],
  'day'         : ['varchar', 8],
  'json'        : ['text'],
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
        connections[project] = connection
      }
      return callback(null, connection)
    }

    var predefiend = {
      'created_at': '_created_at',
      'updated_at': '_updated_at',
      'this': '_id',
    }

    function buildSQL(entity, query, params) {
      var tables = []
      tables.push({
        entity: entity,
        prefix: 't.',
      })
      var sql = ' FROM `'+entity.id+'` t'
      var like = null
      var paramIndex = -1

      function columnName(field) {
        return 't.'+(predefiend[field] || field)
      }

      function processPart(part) {
        if (part.op) {
          paramIndex++
          if (part.op === 'like') {
            like = part.field
            return 'MATCH ('+columnName(part.field)+') AGAINST (?)'
          } else if (part.op === 'in' || part.op === 'not in') {
            // TODO: ?.property
            var arr = params[paramIndex].split('\n')
            params[paramIndex] = arr
            return columnName(part.field)+' '+part.op+' (?)'
          } else {
            return columnName(part.field)+' '+part.op+' ?'
          }
        } else {
          var parts = _.map(part.constraints, function(constraint) {
            return processPart(constraint)
          })
          return '('+parts.join(' '+part.bop+' ')+')'
        }
      }

      if (query.where) {
        sql += ' WHERE '+processPart(query.where)
      }
      if (query.join) {
        var t = 1
        query.join.forEach(function(join) {
          var field = _.findWhere(entity.fields, { id: join.field })
          var entty = core.model.findEntity(field.entity)
          // TODO: if (!field)
          // TODO: if (!entity)
          if (field.relationship.indexOf('one-') === 0) {
            var prefix = (t++)+'_'+entty.id
            sql += ' LEFT JOIN `'+field.entity+'` '+prefix+' ON t.'+field.id+'='+prefix+'._id'
            prefix += '.'
            tables.push({
              entity: entty,
              prefix: prefix,
            })
          } else {
            var relationship = tableForRelationship(entity, field)
            sql += ' LEFT JOIN '+relationship+' ON t._id='+relationship+'.'+field.entity+'_'+field.inverse
            var prefix = (t++)+'_'+entty.id
            tables.push({
              entity: entty,
              prefix: prefix+'.',
            })
            // TOOD: count
            // TODO: and subquery to limit and `having` and order
            // AND relationship+'.'+field.entity+'_'+field.inverse IN (SELECT relationship+'.'+field.entity+'_'+field.inverse
            // from relationship table where having + sort + limit
            // )
            sql += ' LEFT JOIN `'+entty.id+'` '+prefix+' ON '+relationship+'.'+entity.id+'_'+field.id+'='+prefix+'._id'
          }
        })
      }
      if (!query.sort && !like) {
        query.sort = {
          field: 'created_at',
          order: 'asc',
        }
      }
      if (query.sort) {
        sql += ' ORDER BY '+columnName(query.sort.field)+' '+(query.sort.order || 'ASC').toUpperCase()
      }
      var select = 'SELECT '
      select += tables.map(function(table) {
        return expandColumnNames(table.entity, table.prefix)
      }).join(', ')
      return select+sql
    }

    db.list = function(args, callback) {
      var entityid = args.entity
      var q        = args.query || ''
      var params   = args.params

      var entity = core.model.findEntity(entityid)
      if (!entity) {
        // TODO:
      }

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
          var sql = buildSQL(entity, query, params)
          conn.query(sql, params, callback)
        })
        .then(function(result, callback) {
          var normalized = normalizeObjects(entityid, result)
          return callback(null, normalized.ids, normalized.objects, normalized.ids.length) // TODO: total count
        })
        .end(callback)
    }

    db.save = function(args, callback) {
      var entityid = args.entity
      var commands = args.commands
      var id       = args.id
      var insert   = !id
      var extra    = {}

      var entity = core.model.findEntity(entityid)
      // TODO: if not found

      var tx = txain(connect)
      .then(function(conn, callback) {
        this.set('conn', conn)
        callback()
      })

      if (!id) {
        tx.then(function(callback) {
          this.get('conn').query('INSERT INTO _id_generator VALUES (); DELETE FROM _id_generator;', [], callback)
        })
        .then(function(results, callback) {
          var insertId = results[0].insertId
          id = hashids.encode(insertId)
          return callback(null)
        })
      }

      if (entity.id === 'user' && commands['set-password']) {
        tx.then(function(callback) {
          security.hashPassword(commands['set-password'], callback)
        })
        .then(function(hash, callback) {
          commands['set-password'] = hash
          callback()
        })
      }

      if (entity.id === 'user' && commands['set-email']) {
        tx.then(function(callback) {
          var email = commands['set-email']
          this.get('conn').query('SELECT * FROM user WHERE __login_email_current=?', [email], callback)
        })
        .then(function(rows, callback) {
          if (rows[0] && rows[0]._id === id) {
            delete commands['set-email']
            return callback()
          }
          var confirmation = core.config.authentication.email.confirmation
          if (confirmation !== 'mandatory') {
            extra['__login_email_current'] = commands['set-email']
          }
          if (confirmation === 'optional') {
            extra['__login_email_pending'] = commands['set-email']
          }

          errors.with(callback)
            .when(rows.length > 0)
              .request('UserAlreadyExists: A user with that email address already exists')
            .success(callback)
        })
        .then(function(callback) {
          if (extra['__login_email_pending']) {
            txain(function(callback) {
              security.randomKey(callback)
            })
            .then(function(code, callback) {
              extra['__login_email_verification'] = code
              module.exports.lastEmailVerificationCode = code
              // TODO: send mail
              callback()
            })
            .end(callback)
          } else {
            return callback()
          }
        })
      }

      tx.then(function(callback) {
        var now = Date.now()
        var conn = this.get('conn')
        var fields = entity.fields
        var params = [id]
        var sql = (insert ? 'INSERT INTO `' : 'UPDATE `') + entity.id + '` SET _id = ?'
        var sqlcommands = []
        var allparams = []
        fields.forEach(function(field) {
          var value = commands['set-'+field.id]
          if (typeof value !== 'undefined') {
            sql += ', `'+field.id+'` = ?'
            params.push(value)
          }
          if (field.type === 'reference') {
            var relationship = tableForRelationship(entity, field)
            var column1 = entity.id+'_'+field.id
            var column2 = field.entity+'_'+field.inverse
            if (field.relationship.indexOf('many-') === 0) {

              value = commands['add-'+field.id]
              if (typeof value !== 'undefined') {
                sqlcommands.push('DELETE FROM '+relationship+' WHERE '+column1+'=? AND '+column2+'=?')
                allparams.push([value, id])

                sqlcommands.push('INSERT INTO '+relationship+' ('+column1+', '+column2+') VALUES (?, ?)')
                allparams.push([value, id])

                if (field.relationship.indexOf('-one') > 0) {
                  sqlcommands.push('UPDATE `'+field.entity+'` SET `'+field.inverse+'`=? WHERE _id=?')
                  allparams.push([id, value])
                }
              }
              value = commands['rem-'+field.id]
              if (typeof value !== 'undefined') {
                sqlcommands.push('DELETE FROM '+relationship+' WHERE '+column1+'=? AND '+column2+'=?')
                allparams.push([value, id])

                if (field.relationship.indexOf('-one') > 0) {
                  sqlcommands.push('UPDATE `'+field.entity+'` SET `'+field.inverse+'`=? WHERE _id=?')
                  allparams.push([null, value])
                }
              }
            } else if (typeof value !== 'undefined') {
              sqlcommands.push('DELETE FROM '+relationship+' WHERE '+column1+'=? AND '+column2+'=?')
              allparams.push([value, id])

              sqlcommands.push('INSERT INTO '+relationship+' ('+column1+', '+column2+') VALUES (?, ?)')
              allparams.push([value, id])
            }
          }
        })
        for (var xtra in extra) {
          if (extra.hasOwnProperty(xtra)) {
            sql += ', '+xtra+' = ?'
            params.push(extra[xtra])
          }
        }
        if (!insert) {
          sql += ', _updated_at = ?'
          sql += ' WHERE _id = ?'
          params.push(now)
          params.push(id)
        } else {
          sql += ', _created_at = ?'
          sql += ', _updated_at = ?'
          params.push(now)
          params.push(now)
        }
        sqlcommands = [sql].concat(sqlcommands)
        allparams = [params].concat(allparams)
        conn.query(sqlcommands.join('; '), _.flatten(allparams), callback)
      })
      .then(function(callback) {
        var sql = 'SELECT '+expandColumnNames(entity, 't.')+' FROM `'+entity.id+'` t WHERE t._id = ?'
        this.get('conn').query(sql, [id], callback)
      })
      .then(function(result, callback) {
        this.set('object', normalizeObjects(entity.id, result).objects[id])
        callback()
      })

      if (entity.id === 'user' && insert) {
        tx.then(function(callback) {
          core.users.sessionCode(this.get('object'), callback)
        })
        .then(function(authCode, callback) {
          this.set('authCode', authCode)
          callback()
        })
      }

      tx.then(function() {
        callback(null,
          this.get('object'),
          this.get('authCode'))
      })
      .end(callback)
    }

    db.readObjects = function(args, callback) {
      var ids = args.ids || [args.id]
      var entityid = args.entity
      var entity = core.model.findEntity(entityid)
      // TODO: if not found

      txain(connect)
        .then(function(conn, callback) {
          var placeholders = ids.map(function() { return '?' }).join(', ')
          var sql = 'SELECT '+expandColumnNames(entity, 't.')+' FROM `'+entity.id+'` t WHERE t._id IN('+placeholders+')'
          conn.query(sql, ids, callback)
        })
        .then(function(result, callback) {
          if (result.length === 0 && args.id) {
            return callback(errors.notFound('ObjectNotFound: Object with id `%s` not found', args.id))
          }
          return callback(null, normalizeObjects(entity.id, result).objects)
        })
        .end(callback)
    }

    db.remove = function(args, callback) {
      var identifier = args.identifier
      var entityid = args.entity
      var entity = core.model.findEntity(entityid)
      // TODO: if not found

      txain(function(callback) {
        db.readObjects(args, callback)
      })
      .then(function(object, callback) {
        this.set('object', object)
        callback()
      })
      .then(connect)
      .then(function(conn, callback) {
        var sql = 'DELETE FROM `'+entity.id+'` WHERE _id = ?'
        conn.query(sql, [identifier], callback)
      })
      .then(function(callback) {
        callback(null, this.get('object'))
      })
      .end(callback)
    }

    function tableForRelationship(entity, field) {
      var a = entity.id+'_'+field.id
      var b = field.entity+'_'+field.inverse
      return '_r_'+[a, b].sort().join('_')
    }

    function expandColumnNames(entity, prefix) {
      var fields = entity.fields
      function alias(column) {
        var col = prefix+column
        var alias = '`'+col+'`'
        return col+' as '+alias
      }
      var columns = []
      fields.forEach(function(field) {
        if (field.type === 'reference' && field.relationship.indexOf('many-') === 0) return
        columns.push(alias(field.id))
      })
      columns.push(alias('_id'))
      columns.push(alias('_updated_at'))
      columns.push(alias('_created_at'))
      return columns.join(', ')
    }

    function normalizeObjects(entityid, rows) {
      var model = core.model
      var entity = core.model.findEntity(entityid)
      if (!entity) return null

      var objects = {}, ids = []
      rows.forEach(function(row) {
        _.keys(row).forEach(function(column) {
          if (_s.endsWith(column, '._id')) {
            var id = row[column]
            if (!id) return // the column can be present but have a NULL value
            if (!objects[id]) {
              var table = null
              if (column.charAt(0) === 't') {
                table = entityid
                ids.push(id)
              } else {
                table = column.substring(2, column.indexOf('.'))
              }
              var prefix = column.substring(0, column.length-'_id'.length)
              var object = new core.model.BackbeamObject(table)
              object._id = id

              var entty = core.model.findEntity(table)
              entty.fields.forEach(function(field) {
                var type = field.type
                var value = row[prefix+field.id]
                if (typeof value !== 'undefined') {
                  if (type === 'location') {
                    // value = self.parseCoordinates(value)
                  } else if (type === 'boolean') {
                    value = !!value
                  } else if (type === 'json') {
                    try {
                      value = JSON.parse(value)
                    } catch (e) {
                      return
                    }
                  } else if (type === 'date') {
                    value = new Date(value)
                  }
                  object.set(field.id, value, type)
                }
              })

              // extra
              object.extra = {}
              for (var key in row) {
                if (key.indexOf(prefix+'_x_') === 0) {
                  object.extra[key.substring(prefix+'_x_'.length)] = row[key]
                }
              }
              object._created_at = new Date(parseInt(row[prefix+'_created_at'], 10))
              object._updated_at = new Date(parseInt(row[prefix+'_updated_at'], 10))
              objects[object._id] = object
            }
          }
        })
      })

      return {
        ids: ids,
        objects: objects,
      }
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
          this.set('conn', conn)
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
          this.set('columns', columns)
          callback(null, this.get('conn'))
        })
        .then(function(conn, callback) {
          conn.query('SHOW INDEXES IN '+table, callback)
        })
        .then(function(result, callback) {
          var indexes = result.map(function(index) {
            return {
              'name': index.Key_name,
              'type': index.Index_type,
              'column': index.Column_name,
            }
          })

          callback(null, {
            name: table,
            columns: this.get('columns'),
            indexes: indexes,
          })
        })
        .end(callback)
    }

    db.describeDatabase = function(callback) {
      txain(db.showTables)
        .map(db.describeTable)
        .end(callback)
    }

    db.query = function(query, params, callback) {
      txain(connect)
        .then(function(conn, callback) {
          conn.query(query, params, callback)
        })
        .end(callback)
    }

    db.describeModel = function(callback) {
      var tables = []
      var entities = core.model.entities

      tables.push({
        name: '_id_generator',
        columns: [{
          name: '_id',
          type: 'int',
          length: 11,
        }],
        indexes: [],
      })

      tables.push({
        name: '_devices',
        columns: [
          {
            name: '_id',
            type: 'int',
            length: 11,
          },
          {
            name: 'token',
            type: 'varchar',
            length: 255,
          },
          {
            name: 'channel',
            type: 'varchar',
            length: 255,
          },
        ],
        indexes: [],
      })

      entities.forEach(function(entity) {
        var table = {
          name: entity.id,
          columns: [],
          indexes: [],
        }
        var fields = entity.fields

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

        fields.forEach(function(field) {
          if (field.type === 'reference' && field.relationship.indexOf('many-') === 0) {
            var name = tableForRelationship(entity, field)
            var tble = _.findWhere(tables, { name: name })
            if (!tble) {
              tble = {
                name: name,
                columns: [],
                indexes: [],
              }
              tble.columns.push({
                name: entity.id+'_'+field.id,
                type: 'varchar',
                length: 255,
              })
              tble.columns.push({
                name: field.entity+'_'+field.inverse,
                type: 'varchar',
                length: 255,
              })
              tble.columns.push({
                name: '_id',
                type: 'int',
                length: 11,
              })
              tble.columns.push({
                name: '_created_at',
                type: 'bigint',
                length: 20,
              })
              tble.columns.push({
                name: '_updated_at',
                type: 'bigint',
                length: 20,
              })
              tables.push(tble)
            }
            return
          }
          var column = {
            name: field.id,
            type: TYPES[field.type][0],
            length: TYPES[field.type][1],
          }
          table.columns.push(column)
          if (field.fulltext) {
            table.indexes.push({
              name: '_fulltext_'+table.name,
              type: 'FULLTEXT',
              column: field.id,
            })
          }
        })

        tables.push(table)
      })

      var user = _.findWhere(tables, { name: 'user' })
      if (!user) {
        user = {
          name: 'user',
          columns: [{
            name: '_id',
            type: 'varchar',
            length: 255,
          }],
          indexes: [],
        }
        tables.push(user)
      }

      user.columns.push({
        name: '__login_email_pending',
        type: 'varchar',
        length: 255,
      })

      user.columns.push({
        name: '__login_email_current',
        type: 'varchar',
        length: 255,
      })

      user.columns.push({
        name: '__login_email_verification',
        type: 'varchar',
        length: 255,
      })

      user.columns.push({
        name: '__login_password_lost_code',
        type: 'varchar',
        length: 255,
      })

      user.columns.push({
        name: '__login_password_lost_date',
        type: 'varchar',
        length: 255,
      })

      return callback(null, tables)
    }

    db.migrateSchema = function(run, callback) {
      var commands = []
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
            .each(compareTable, conn, current, commands)
            .end(callback)
        })
        .then(function(callback) {
          callback(null, commands)
        })
        .end(callback)

      function compareTable(table, conn, current, commands, callback) {
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
          var command = util.format('CREATE TABLE IF NOT EXISTS `%s` ( _id %s (%d) NOT NULL PRIMARY KEY %s ) ENGINE=MyISAM CHARSET=UTF8',
            table.name, id.type, id.length, id.type === 'int' ? 'AUTO_INCREMENT' : '')
          commands.push(command)
          if (!run) return callback()
          conn.query(command, callback)
        })
        .then(function(callback) {
          callback(null, table.columns)
        })
        .each(function(column, callback) {
          compareColumn(conn, table, column, currentTable, commands, callback)
        })
        .then(function(callback) {
          callback(null, table.indexes)
        })
        .each(function(index, callback) {
          compareIndex(conn, table, index, currentTable, commands, callback)
        })
        .end(callback)
      }

      function compareColumn(conn, table, column, currentTable, commands, callback) {
        var currentColumn = _.findWhere(currentTable.columns, { name: column.name })
        if (currentColumn
          && currentColumn.type === column.type
          && currentColumn.length === column.length) {
          return callback()
        }

        var command = util.format('ALTER TABLE `%s` %s COLUMN `%s` %s',
          table.name, currentColumn ? 'MODIFY' : 'ADD', column.name, column.type)
        if (column.length) {
          command += '('+column.length+')'
        }
        commands.push(command)
        if (!run) return callback()
        conn.query(command, callback)
      }

      function compareIndex(conn, table, index, currentTable, commands, callback) {
        var currentIndex = _.findWhere(currentTable.indexes, { column: index.column, type: index.type })
        if (currentIndex) {
          return callback()
        }

        // alter table item add fulltext index _fulltext_name (name);
        var command = util.format('ALTER TABLE `%s` ADD %s INDEX `%s` (`%s`)',
          table.name, index.type, index.name, index.column)
        commands.push(command)
        if (!run) return callback()
        conn.query(command, callback)
      }
    }

    db.deleteDataFromTable = function(table, callback) {
      txain(connect)
        .then(function(conn, callback) {
          conn.query('DELETE FROM '+table, callback)
        })
        .end(callback)
    }

    db.deleteData = function(callback) {
      txain(db.showTables)
        .each(db.deleteDataFromTable)
        .end(callback)
    }

    return db
  }

}
