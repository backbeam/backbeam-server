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
var geo = require('../util/geo')

var fsutils = require('../util/fs-utils')
var fs = require('fs')
var path = require('path')
var rimraf = require('rimraf')
var mkdirp = require('mkdirp')
var gm = require('gm')

var TYPES = {
  'text'        : ['varchar', 255],
  'textarea'    : ['text'],
  'richtextarea': ['text'],
  'date'        : ['bigint', 20],
  'number'      : ['int', 11],
  'location'    : ['point'],
  'reference'   : ['varbinary', 255],
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
      // TODO: reconnect if configuration changes!
      var project = core.project.name
      var connection = connections[project]
      if (!connection) {
        var connectionOptions = {
          host     : options.host || 'localhost',
          port     : options.port || 3306,
          database : options.database,
          user     : options.user,
          password : options.pass,
          multipleStatements: true,
        }
        var connection = mysql.createConnection(connectionOptions)
        connection.connect() // throws an error when parameterers are wrong
        connection.query('SELECT VERSION()', nook(callback,
          function(result) {
            connections[project] = connection
            connection.mysqlVersion = result[0]['VERSION()'].split('.')
            return callback(null, connection)
          }
        ))
        return
      }
      return callback(null, connection)
    }

    function minMySQLVersion(connection, version) {
      var arr1 = connection.mysqlVersion
      var arr2 = version.split('.')
      if (+arr1[0] < +arr2[0]) return false
      if (+arr1[1] < +arr2[1]) return false
      if (+arr1[2] < +arr2[2]) return false
      return true
    }

    function findByName(arr, name, formerly) {
      var current = _.findWhere(arr, { name: name })
      if (!current) {
        formerly = formerly || []
        current = _.find(arr, function(item) {
          if (formerly.indexOf(item.name) > -1) {
            return item
          }
        })
      }
      return current
    }

    var predefiend = {
      'created_at': '_created_at',
      'updated_at': '_updated_at',
      'this': '_id',
    }

    function buildSQL(entity, query, params, where) {
      var prependParams = []
      var tables = []
      var sorts = []
      tables.push({
        entity: entity,
        prefix: 't.',
      })
      var sql = query.type === 'count' ? 'SELECT COUNT(*)' : ''
      sql += ' FROM `'+entity.id+'` t'
      var like = null
      var paramIndex = -1

      function columnName(field, prefix) {
        if (typeof prefix === 'undefined') prefix = 't.'
        return prefix+(predefiend[field] || field)
      }

      function stripEntityPlusId(value) {
        if (_.isArray(value)) return value
        value = value || ''
        var n = value.indexOf('/')
        if (n === -1) {
          return ['UnknownEntity', value]
        }
        return [value.substring(0, n), value.substring(n+1)]
      }

      function processPartOp(entity, part, prefix) {
        var fieldname = part.field
        
        if (part.subfield) {
          var join = _.findWhere(query.join, { field: part.field })
          // TOOD: if not join
          prefix = join.prefix+'.'
          join.count = true
          fieldname = part.subfield

          var field = _.findWhere(entity.fields, { id: part.field })
          entity = core.model.findEntity(field.entity)
        }

        if (part.op === 'like') {
          // like = part.field
          var field = _.findWhere(entity.fields, { id: fieldname })
          if (field.booleanMode) {
            return 'MATCH ('+columnName(fieldname, prefix)+') AGAINST (? IN BOOLEAN MODE)'
          } else {
            return 'MATCH ('+columnName(fieldname, prefix)+') AGAINST (?)'
          }
        } else if (part.op === 'in' || part.op === 'not in') {
          if (fieldname === 'this' && part.prop) {
            var info = stripEntityPlusId(params[paramIndex])
            params[paramIndex] = info[1]
            var entty = core.model.findEntity(info[0])
            var field = _.findWhere(entty.fields, { id: part.prop })
            // TODO: if !entty
            // TODO: if !field
            var relationship = tableForRelationship(entty, field)
            return columnName('_id', prefix)+' IN('+
              'SELECT '+entty.id+'_'+field.id+' FROM `'+relationship+'` WHERE '+entity.id+'_'+field.inverse+'=?)'
          } else {
            params[paramIndex] = params[paramIndex].split('\n')
            return columnName(fieldname, prefix)+' '+part.op+' (?)'
          }
        } else {
          var op = part.op
          if (op === 'is') {
            op = '='
            var value = params[paramIndex]
            params[paramIndex] = stripEntityPlusId(value)[1] // TODO: test. If error?
          }
          return columnName(fieldname, prefix)+' '+op+' ?'
        }
      }

      function processPart(entity, part, prefix, prepend) {
        if (part.op) {
          paramIndex++
          var result = processPartOp(entity, part, prefix)
          if (prepend) {
            prependParams.push(params[paramIndex])
          }
          return result
        } else {
          var parts = _.map(part.constraints, function(constraint) {
            return processPart(entity, constraint, prefix, prepend)
          })
          return '('+parts.join(' '+part.bop+' ')+')'
        }
      }

      if (query.join) {
        var t = 1
        query.join.forEach(function(join) {
          if (query.type === 'count' && !join.count) return

          var field = _.findWhere(entity.fields, { id: join.field })
          var entty = core.model.findEntity(field.entity)
          // TODO: if (!field)
          // TODO: if (!entity)
          var prefix = (t++)+'_'+entty.id
          join.prefix = prefix
          if (field.relationship.indexOf('one-') === 0) {
            sql += ' LEFT JOIN `'+field.entity+'` `'+prefix+'` ON t.'+field.id+'='+prefix+'._id'
            prefix += '.'
            tables.push({
              entity: entty,
              prefix: prefix,
            })
          } else {
            var relationship = tableForRelationship(entity, field)
            var innerFields = [field.entity+'_'+field.inverse, entity.id+'_'+field.id, '_created_at'].map(function(column) {
              return relationship+'.'+column+' AS `'+relationship+'.'+column+'`'
            }).join(', ')
            sql += ' LEFT JOIN (SELECT '+innerFields+' FROM `'+relationship+'`'
            var subquery = ''
            if (join.having) {
              subquery += ' LEFT JOIN `'+entty.id+'` ON '+entity.id+'_'+field.id+'='+entty.id+'._id'
              subquery += ' WHERE '+processPart(entty, join.having, entty.id+'.', true)
            }
            sql += subquery
            subquery = 'SELECT COUNT(*) FROM `'+relationship+'`'+subquery
            var order = join.op === 'last' ? 'DESC' : 'ASC'
            sql += ' ORDER BY `'+relationship+'._created_at` '+order
            if (join.n) {
              sql += ' LIMIT '+(+join.n)
            }
            sql += ') AS `'+relationship+'`'
            sql += ' ON t._id=`'+relationship+'.'+field.entity+'_'+field.inverse+'`'
            // sql += ' AND '+relationship+'.'+entity.id+'_'+field.id+' IN ('
            tables.push({
              entity: entty,
              prefix: prefix+'.',
              field: field.id,
              subquery: subquery,
            })
            sorts.push('`'+relationship+'._created_at` '+order)

            sql += ' LEFT JOIN `'+entty.id+'` `'+prefix+'` ON `'+relationship+'.'+entity.id+'_'+field.id+'`='+prefix+'._id'
          }
          if (join.fetch) {
            join.fetch.forEach(function(fetch) {
              var fetchField = _.findWhere(entty.fields, { id: fetch })
              var fetchEntity = core.model.findEntity(fetchField.entity)
              // TODO: if (!fetchField)
              // TODO: if (!fetchEntity)
              var prfix = (t++)+'_'+fetchEntity.id
              tables.push({
                entity: fetchEntity,
                prefix: prfix+'.',
              })
              sql += ' LEFT JOIN `'+fetchEntity.id+'` '+prfix+' ON '+prefix+'.'+fetch+'='+prfix+'._id'
            })
          }
        })
      }
      if (query.type !== 'read') {
        var arr = []
        if (query.where) {
          arr.push('('+processPart(entity, query.where)+')')
        }
        if (where) {
          arr.push('('+where+')')
        }
        if (arr.length > 0) {
          sql += ' WHERE '+arr.join(' AND ')
        }
      }
      Array.prototype.splice.apply(params, [0, 0].concat(prependParams)) // prepend elements inside params
      if (query.type === 'count') {
        return sql // no need to sort or expand tables for joins
      }

      if (!query.sort && !like) {
        query.sort = {
          field: 'created_at',
          order: 'asc',
        }
      }
      if (query.sort && query.type !== 'read') {
        sorts = [columnName(query.sort.field)+' '+(query.sort.order || 'ASC').toUpperCase()].concat(sorts)
        sql += ' ORDER BY '+sorts.join(', ')
      }

      var select = 'SELECT '
      select += tables.map(function(table) {
        return expandColumnNames(table.entity, table.prefix, table.field, table.subquery)
      }).join(', ')
      return select+sql
    }

    function abstractList(args, preProcessQuery, postProcessQuery, callback) {
      var q = args.query || ''
      var params = args.params || []

      var entity = core.model.findEntity(args.entity)

      txain(connect)
        .then(function(conn, callback) {
          this.set('conn', conn)
          errors
            .with(callback)
            .when(!entity)
              .notFound('EntityNotFound: Entity not found `%s`', args.entity)
              .success(callback)
        })
        .then(function(callback) {
          try {
            var query = bql.parse(q)
          } catch (err) {
            return callback(err)
          }
          return callback(null, query)
        })
        .then(function(query, callback) {
          var conn = this.get('conn')
          preProcessQuery(params, nook(callback,
            function(where) {
              var params2 = _.clone(params)
              var sql = buildSQL(entity, query, params, where)
              sql = postProcessQuery ? postProcessQuery(sql) : sql
              sql += ' LIMIT ? OFFSET ?'
              params.push(args.limit || 100)
              params.push(args.offset || 0)
              query.type = 'count'
              var count = buildSQL(entity, query, params2, where)
              var allParams = params.concat(params2)
              conn.query([sql, count].join('; '), allParams, callback)
            }
          ))
        })
        .then(function(results, callback) {
          var objectsResult = results[0]
          var countResult = results[1]
          var count = countResult[0]['COUNT(*)']
          var normalized = normalizeObjects(entity, objectsResult)
          return callback(null, normalized.ids, normalized.objects, count)
        })
        .end(callback)
    }

    db.list = function(args, callback) {
      abstractList(args, function(params, callback) {
        callback()
      }, null, callback)
    }

    db.bounding = function(args, callback) {
      var swlat = args.swlat
      var swlon = args.swlon
      var nelat = args.nelat
      var nelon = args.nelon

      if (swlon > nelon) {
        // TODO: edge case
      }

      abstractList(args, function(params, callback) {
        var entity = core.model.findEntity(args.entity)
        var field = _.findWhere(entity.fields, {
          id: args.field,
        })
        // TODO: if !field
        var polygon = util.format('Polygon((%d %d, %d %d, %d %d, %d %d, %d %d))',
          swlat, swlon,
          nelat, swlon,
          nelat, nelon,
          swlat, nelon,
          swlat, swlon
        )
        params.push(polygon)
        callback(null, 'MBRContains(GeomFromText(?), t.'+field.id+')')
      }, null, callback)
    }

    db.near = function(args, callback) {
      var lat = args.lat
      var lon = args.lon
      var field

      abstractList(args, function(params, callback) {
        var entity = core.model.findEntity(args.entity)
        field = _.findWhere(entity.fields, {
          id: args.field,
        })
        // TODO: if !field
        callback(null, 't.'+field.id+' IS NOT NULL')
      }, function(sql) {
        var n = sql.indexOf('ORDER BY')
        sql = sql.substring(0, n)+util.format('ORDER BY ST_Distance(t.'+field.id+', POINT(%d, %d))', lat, lon)
        return sql
      }, nook(callback,
        function(ids, objects, count) {
          var data = []
          var from = {
            lat: lat,
            lon: lon,
          }
          ids.forEach(function(id) {
            var obj = objects[id]
            var location = obj.get(field.id)
            data.push({
              id: id,
              distance: geo.distance(from, location),
            })
          })
          data = _.sortBy(data, function(d) { return d.distance })
          ids = data.map(function(d) { return d.id })
          var distances = data.map(function(d) { return d.distance })
          callback(null, ids, objects, count, distances)
        }
      ))
    }

    db.save = function(args, callback) {
      var commands = args.commands
      var id       = args.id
      var insert   = !id
      var extra    = args.extra || {}

      var entity = core.model.findEntity(args.entity)
      if (!entity) {
        return callback(errors.notFound('EntityNotFound: Entity not found `%s`', args.entity))
      }

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
          if (rows[0] && rows[0]._id.toString() === id) {
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
          // `set` operator
          var value = commands['set-'+field.id]
          if (typeof value !== 'undefined') {
            if (field.type === 'location') {
              // TODO: parse value
              var info = parseCoordinates(value)
              if (info.lat && info.lon) {
                value = info.addr
                var point = util.format('POINT(%d %d)', info.lat, info.lon)
                sql += ', `'+field.id+'` = GeomFromText(?)'
                params.push(point)
              } else {
                sql += ', `'+field.id+'` = NULL'
              }
              sql += ', `_addr_'+field.id+'` = ?'
              params.push(value)
            } else {
              sql += ', `'+field.id+'` = ?'
              params.push(value)
            }
          } else if (field.type === 'number') {
            // `incr` operator for numbers
            value = commands['incr-'+field.id]
            if (typeof value !== 'undefined') {
              var val = +value || 0 // avoid SQL injection
              sql += ', `'+field.id+'` = CASE WHEN `'+field.id+'` IS NULL THEN '+val+' ELSE `'+field.id+'`+? END'
              params.push(value)
            }
          }
          // `add` and `rem` operators for relationships
          if (field.type === 'reference') {
            var relationship = tableForRelationship(entity, field)
            var column1 = entity.id+'_'+field.id
            var column2 = field.entity+'_'+field.inverse

            if (field.relationship.indexOf('many-') === 0) {
              value = commands['add-'+field.id]
              value = _.isArray(value) ? value : [value]
              value.forEach(function(value) {
                if (typeof value !== 'undefined') {
                  sqlcommands.push('DELETE FROM `'+relationship+'` WHERE '+column1+'=? AND '+column2+'=?')
                  allparams.push([value, id])

                  sqlcommands.push('INSERT INTO `'+relationship+'` ('+column1+', '+column2+', _created_at, _updated_at) VALUES (?, ?, ?, ?)')
                  allparams.push([value, id, now, now])

                  if (field.relationship.indexOf('-one') > 0) {
                    sqlcommands.push('UPDATE `'+field.entity+'` SET `'+field.inverse+'`=? WHERE _id=?')
                    allparams.push([id, value])
                  }
                }
                value = commands['rem-'+field.id]
                if (typeof value !== 'undefined') {
                  sqlcommands.push('DELETE FROM `'+relationship+'` WHERE '+column1+'=? AND '+column2+'=?')
                  allparams.push([value, id])

                  if (field.relationship.indexOf('-one') > 0) {
                    sqlcommands.push('UPDATE `'+field.entity+'` SET `'+field.inverse+'`=? WHERE _id=?')
                    allparams.push([null, value])
                  }
                }
              })
            } else if (typeof value !== 'undefined') {
              sqlcommands.push('DELETE FROM `'+relationship+'` WHERE '+column1+'=? AND '+column2+'=?')
              allparams.push([value, id])

              sqlcommands.push('INSERT INTO `'+relationship+'` ('+column1+', '+column2+', _created_at, _updated_at) VALUES (?, ?, ?, ?)')
              allparams.push([value, id, now, now])
            }
          }
          // `del` operator
          value = commands['del-'+field.id]
          if (typeof value !== 'undefined') {
            sql += ', `'+field.id+'` = NULL'
            if (field.type === 'location') {
              sql += ', `_addr_'+field.id+'` = NULL'
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
      .then(function(res, callback) {
        var sql = 'SELECT '+expandColumnNames(entity, 't.')+' FROM `'+entity.id+'` t WHERE t._id = ?'
        this.get('conn').query(sql, [id], callback)
      })
      .then(function(result, callback) {
        this.set('object', normalizeObjects(entity, result).objects[id])
        callback()
      })

      if (entity.id === 'user') { // TODO: not always create authCode
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
      var entity = core.model.findEntity(args.entity)
      var q = args.joins || ''
      var params = args.params || []

      txain(connect)
        .then(function(conn, callback) {
          this.set('conn', conn)
          errors
            .with(callback)
            .when(!entity)
              .notFound('EntityNotFound: Entity not found `%s`', args.entity)
              .success(callback)
        })
        .then(function(callback) {
          var conn = this.get('conn')
          try {
            var query = bql.parse(q)
          } catch (err) {
            return callback(err)
          }
          callback(null, conn, query)
        })
        .then(function(conn, query, callback) {
          var placeholders = ids.map(function() { return '?' }).join(', ')
          query.type = 'read'
          var sql = buildSQL(entity, query, params)
          sql += ' WHERE t._id IN('+placeholders+')'
          params = params.concat(ids) // TODO: test read + join + having
          conn.query(sql, params, callback)
        })
        .then(function(result, callback) {
          if (result.length === 0 && args.id) {
            return callback(errors.notFound('ObjectNotFound: Object with id `%s` not found', args.id))
          }
          var result = normalizeObjects(entity, result)
          return callback(null, result.objects)
        })
        .end(callback)
    }

    db.remove = function(args, callback) {
      var id = args.id
      var entity = core.model.findEntity(args.entity)
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
        var params = [id]
        var sql = ['DELETE FROM `'+entity.id+'` WHERE _id = ?']
        entity.fields.forEach(function(field) {
          if (field.type === 'reference') {
            if (field.relationship.indexOf('-one') > 0) {
              sql.push('UPDATE `'+field.entity+'` SET `'+field.inverse+'` = NULL WHERE `'+field.inverse+'` = ?')
              params.push(id)
            }
            if (field.relationship.indexOf('many') >= 0) {
              var relationship = tableForRelationship(entity, field)
              sql.push('DELETE FROM `'+relationship+'` WHERE `'+field.entity+'_'+field.inverse+'` = ?')
              params.push(id)
            }
          }
        })
        conn.query(sql.join('; '), params, callback)
      })
      .then(function(callback) {
        if (entity.id !== 'file') return callback()
        var storage = core.config.fs.storage
        var dir = path.join(storage, id)
        rimraf(dir, callback)
      })
      .then(function(res, callback) {
        callback(null, this.get('object'))
      })
      .end(callback)
    }

    function tableForRelationship(entity, field) {
      var a = entity.id+'_'+field.id
      var b = field.entity+'_'+field.inverse
      return '_r_'+[a, b].sort().join('_')
    }

    function expandColumnNames(entity, prefix, field, subquery) {
      var fields = entity.fields
      function alias(column) {
        var col = prefix+column
        var alias = '`'+col+'`'
        return col+' AS '+alias
      }
      var columns = []
      fields.forEach(function(field) {
        if (field.type === 'reference' && field.relationship.indexOf('many-') === 0) return
        if (field.type === 'location') {
          columns.push(alias('_addr_'+field.id))
          var col = prefix+field.id
          var as = '`'+col+'`'
          columns.push('AsText('+col+') AS '+as)
        } else {
          columns.push(alias(field.id))
        }
      })
      if (entity.id === 'user') {
        core.users.providers.forEach(function(provider) {
          var shortname = core.users.social[provider].shortname
          columns.push(alias('__social_'+shortname))
          columns.push(alias('__social_extra_'+shortname))
        })
      }
      columns.push(alias('_id'))
      columns.push(alias('_updated_at'))
      columns.push(alias('_created_at'))
      if (field) {
        columns.push('\''+field+'\' AS `'+prefix+'`')
      }
      if (subquery) {
        columns.push('('+subquery+') AS `'+prefix+'_count`')
      }
      return columns.join(', ')
    }

    function normalizeObjects(entity, rows) {
      var model = core.model

      var objects = {}, ids = []
      rows.forEach(function(row) {
        _.keys(row).forEach(function(column) {
          if (_s.endsWith(column, '._id')) {
            var id = row[column]
            id = id && String(id)
            if (!id) return // the column can be present but have a NULL value
            if (!objects[id]) {
              var table = null
              if (column.charAt(0) === 't') {
                table = entity.id
                ids.push(id)
              } else {
                table = column.substring(2, column.indexOf('.'))
              }
              var prefix = column.substring(0, column.length-'_id'.length)
              var object = new core.model.BackbeamObject(table)
              object._id = id
              var field = row[prefix]
              if (field) {
                var parent = objects[row['t._id']]
                var join = parent.get(field)
                if (!join) {
                  join = {
                    objects: [],
                    count: row[prefix+'_count'],
                  }
                  parent.set(field, join, 'reference')
                }
                join.objects.push(id)
              }

              var entty = core.model.findEntity(table)
              entty.fields.forEach(function(field) {
                var type = field.type
                var value = row[prefix+field.id]
                if (typeof value !== 'undefined') {
                  if (type === 'location') {
                    // value = self.parseCoordinates(value)
                    var prfix = 'POINT('
                    if (value && value.indexOf(prfix) === 0) {
                      var values = value.substring(prfix.length, value.length-1).split(' ')
                      value = {
                        lat: +values[0],
                        lon: +values[1],
                        addr: row[prefix+'_addr_'+field.id],
                      }
                    }
                  } else if (type === 'boolean') {
                    value = !!value
                  } else if (type === 'json') {
                    try {
                      value = JSON.parse(value)
                    } catch (e) {
                      return
                    }
                  } else if (type === 'date') {
                    if (value) {
                      value = new Date(value)
                    }
                  } else if (type === 'reference') {
                    value = value && String(value)
                  }
                  object.set(field.id, value, type, field.entity)
                }
              })

              // extra
              object.extra = {}
              var extraPrefix = prefix+'__social_extra_'
              for (var key in row) {
                if (row[key] && key.indexOf(extraPrefix) === 0) {
                  var provider = key.substring(extraPrefix.length)
                  var data = row[key]
                  var uid = row[prefix+'__social_'+provider]
                  try {
                    data = JSON.parse(data)
                    _.keys(data).forEach(function(k) {
                      object.extra['login_'+provider+'_'+k] = data[k]
                    })
                  } catch (e) {
                    // ignore
                  }
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
          conn.query('DESCRIBE `'+table+'`', callback)
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
          conn.query('SHOW INDEXES IN `'+table+'`', callback)
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

    db.describeModel = function(current, callback) {
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
          formerly: entity.formerly,
        }
        var fields = entity.fields

        table.columns.push({
          name: '_id',
          type: 'varbinary',
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
            var entty = _.findWhere(entities, { id: field.entity })
            var inverseField = _.findWhere(entty.fields, { id: field.inverse })
            // TODO: if !entty
            // TODO: if !inverseField

            // calculate current table names
            var currentTableA = findByName(current, entity.id, entity.formerly)
            var currentTableB = findByName(current, entty.id, entty.formerly)

            var tableNameA = (currentTableA && currentTableA.name) || entity.id
            var tableNameB = (currentTableB && currentTableB.name) || entty.id

            var name = tableForRelationship(entity, field)
            var tble = _.findWhere(tables, { name: name })
            if (!tble) {

              function tableForRel(a, b) {
                return '_r_'+[a, b].sort().join('_')
              }

              var fields1 = [field.id].concat(field.formerly || [])
              var fields2 = [inverseField.id].concat(inverseField.formerly || [])
              formerly = _.flatten(fields1.map(function(fieldid1) {
                return fields2.map(function(fieldid2) {
                  var a = tableNameA+'_'+fieldid1
                  var b = tableNameB+'_'+fieldid2
                  return tableForRel(a, b)
                })
              }))

              tble = {
                name: name,
                columns: [],
                indexes: [],
                formerly: formerly,
              }
              tble.columns.push({
                name: entity.id+'_'+field.id,
                type: 'varbinary',
                length: 255,
                formerly: fields1.map(function(fieldid) {
                  return tableNameA+'_'+fieldid
                })
              })
              tble.columns.push({
                name: field.entity+'_'+field.inverse,
                type: 'varbinary',
                length: 255,
                formerly: fields2.map(function(fieldid) {
                  return tableNameB+'_'+fieldid
                })
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
            formerly: field.formerly,
          }
          table.columns.push(column)
          if (field.fulltext) {
            table.indexes.push({
              name: '_fulltext_'+field.id,
              type: 'FULLTEXT',
              column: field.id,
              formerly: (field.formerly || []).map(function(id) {
                return '_fulltext_'+id
              }),
            })
          }
          if (field.type === 'location') {
            table.columns.push({
              name: '_addr_'+field.id,
              type: 'varchar',
              length: 255,
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
            type: 'varbinary',
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

      core.users.providers.forEach(function(provider) {
        var shortname = core.users.social[provider].shortname
        user.columns.push({
          name: '__social_'+shortname,
          type: 'varchar',
          length: 255,
        })
        user.columns.push({
          name: '__social_extra_'+shortname,
          type: 'text',
        })
      })

      return callback(null, tables)
    }

    db.migrateSchema = function(run, callback) {
      var commands = []
      txain(connect)
        .then(function(conn, callback) {
          this.set('conn', conn)
          db.describeDatabase(callback)
        })
        .then(function(current, callback) {
          this.set('current', current)
          db.describeModel(current, callback)
        })
        .then(function(expected, callback) {
          var current = this.get('current')
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
        var currentTable = findByName(current, table.name, table.formerly)

        txain(function(callback) {
          if (currentTable) {
            if (currentTable.name === table.name) return callback()
            var command = util.format('ALTER TABLE `%s` RENAME TO `%s`', currentTable.name, table.name)
            commands.push(command)
            if (!run) return callback()
            return conn.query(command, callback)
          }

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
        var currentColumn = findByName(currentTable.columns, column.name, column.formerly)

        if (currentColumn
          && currentColumn.name === column.name
          && currentColumn.type === column.type
          && currentColumn.length === column.length) {
          return callback()
        }

        var command
        if (currentColumn) {
          command = util.format('ALTER TABLE `%s` CHANGE COLUMN `%s` `%s` %s',
            table.name, currentColumn.name, column.name, column.type)
        } else {
          command = util.format('ALTER TABLE `%s` ADD COLUMN `%s` %s',
            table.name, column.name, column.type)
        }

        if (column.length) {
          command += '('+column.length+')'
        }
        commands.push(command)
        if (!run) return callback()
        conn.query(command, callback)
      }

      function compareIndex(conn, table, index, currentTable, commands, callback) {
        var currentIndex = findByName(currentTable.indexes, index.name, index.formerly)
        if (currentIndex
          && currentIndex.name !== index.name
          && !minMySQLVersion(conn, '5.7.0')) {
          currentIndex = null
        }
        if (currentIndex) {
          if (currentIndex.name === index.name) return callback()
          var command = util.format('ALTER TABLE `%s` RENAME INDEX `%s` TO `%s`',
            table.name, currentIndex.name, index.name)
          commands.push(command)
          if (!run) return callback()
          return conn.query(command, callback)
        }

        var command = util.format('ALTER TABLE `%s` ADD %s INDEX `%s` (`%s`)',
          table.name, index.type, index.name, index.column)
        commands.push(command)
        if (!run) return callback()
        conn.query(command, callback)
      }
    }

    db.saveFile = function(args, callback) {
      var filepath = args.filepath
      var data = args.data
      var id = data.id

      var tx = txain(function(callback) {
        errors
          .with(callback)
          .when(!id && !filepath)
            .request('MissingParameters: You must specify either an id or upload a file')
          .success(callback)
      })
      .then(function(callback) {
        if (!id || filepath) {
          data['incr-version'] = '1'
        }
        callback()
      })

      if (filepath) {
        tx.then(function(callback) {
          fs.stat(filepath, callback)
        })
        .then(function(stat, callback) {
          data['set-size'] = stat.size
          if (data['set-mime'] && data['set-mime'].indexOf('image/') === 0) {
            gm(filepath).size(nook(callback,
              function(size) {
                data['set-width'] = size.width
                data['set-height'] = size.height
                callback()
              }
            ))
          } else {
            callback()
          }
        })
      }

      tx.then(function(callback) {
        var args = {
          entity: 'file',
          commands: data,
          id: id,
        }
        db.save(args, callback)
      })

      if (!filepath) {
        return tx.end(callback)
      }

      function emptyDir(dir, callback) {
        rimraf(dir, nook(callback,
          function() {
            mkdirp(dir, callback)
          }
        ))
      }

      var storage = core.config.fs.storage
      tx.then(function(obj, callback) {
        this.set('obj', obj)
        id = obj._id
        var dir = path.join(storage, id)
        emptyDir(dir, callback)
      })
      .then(function(callback) {
        var obj = this.get('obj')
        var version = obj.get('version') || 0
        var finalpath = path.join(storage, id, String(version))
        fsutils.rename(filepath, finalpath, callback)
      })
      .then(function(callback) {
        callback(null, this.get('obj'))
      })
      .end(callback)
    }

    db.deleteDataFromTable = function(table, callback) {
      txain(connect)
        .then(function(conn, callback) {
          conn.query('DELETE FROM `'+table+'`', callback)
        })
        .end(callback)
    }

    db.deleteData = function(callback) {
      txain(db.showTables)
        .each(db.deleteDataFromTable)
        .end(callback)
    }

    function parseCoordinates(value) {
      var obj = {}
      var tokens = value.split('|')
      if (tokens.length > 1) {
        var coor = tokens[0].split(',')
        if (coor.length === 2 || coor.length === 3) {
          var lat = +coor[0].trim()
          var lon = +coor[1].trim()
          if (lat && lat) {
            obj.lat  = lat
            obj.lon  = lon
            obj.alt  = +(coor[2] && coor[2].trim()) || 0
            obj.addr = tokens.slice(1, tokens.length).join('|')
            if (!obj.alt) {
              delete obj.alt
            }
          }
        }
      }
      if (!obj.addr) {
        obj.addr = value
      }
      return obj
    }

    return db
  }

}
