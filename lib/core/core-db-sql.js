var mysql = require('mysql')
var Hashids = require('hashids')
var bql = require('./bql')
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

module.exports = function(options) {

  var connection
  var hashids = new Hashids('backbeam-shed-salt-id') // TODO: use options
  var manager = options.manager === 'postgres' ? require('./core-db-postgres') : require('./core-db-mysql')
  var quotechr = manager.quotechr
  var TYPES = manager.TYPES

  return function(core) {
    var db = {}

    function connect(callback) {
      // TODO: reconnect if configuration changes!
      var project = core.project.name
      if (!connection) {
        manager(options, function(err, conn) {
          if (err) return callback(err)
          connection = conn
          if (connection.on) {
            connection.on('error', function(err) {
              console.log('Database connection error:', err.message)
              connection = null
              callback && callback(err)
            })
          }

          conn.queryAll = function(sql, params, callback) {
            var queries = []
            for (var i = 0; i < sql.length; i++) {
              queries.push({
                sql: sql[i],
                params: params[i],
              })
            }
            txain(queries)
            .map(function(query, callback) {
              conn.query(query.sql, query.params, callback)
            })
            .end(callback)
          }

          callback(null, conn)
          callback = null
        })
        return
      }
      return callback(null, connection)
    }

    function quote(str) {
      return quotechr+str+quotechr
    }

    db.quote = quote

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
      sql += '\nFROM '+quote(entity.id)+' t'
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
          return manager.matchLike(columnName(fieldname, prefix), field, params, paramIndex)
        } else if (part.op === 'in' || part.op === 'not in') {
          if (fieldname === 'this' && part.prop) {
            var info = stripEntityPlusId(params[paramIndex])
            params[paramIndex] = info[1]
            var entty = core.model.findEntity(info[0])
            var field = _.findWhere(entty.fields, { id: part.prop })
            // TODO: if !entty
            // TODO: if !field
            return columnName('_id', prefix)+' IN('+
              'SELECT _id FROM '+quote(entity.id)+' WHERE '+quote(field.inverse)+'=?)'
          } else {
            params[paramIndex] = params[paramIndex].split('\n')
            return columnName(fieldname, prefix)+' '+part.op+' (?)'
          }
        } else {
          var op = part.op
          if (op === 'is' || op === 'is not') {
            var value = params[paramIndex]
            if (value !== null) {
              params[paramIndex] = stripEntityPlusId(value)[1] // TODO: test. If error?
              op = op === 'is' ? '=' : '<>'
            }
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
          var prefix = 'j'+(t++)+'_'+entty.id
          join.prefix = prefix
          if (field.relationship.indexOf('one-') === 0) {
            sql += '\nLEFT JOIN '+quote(field.entity)+' '+quote(prefix)+'\n  ON t.'+field.id+'='+prefix+'._id'
            prefix += '.'
            tables.push({
              entity: entty,
              prefix: prefix,
            })
            if (join.fetch) {
              join.fetch.forEach(function(fetch) {
                var fetchField = _.findWhere(entty.fields, { id: fetch })
                var fetchEntity = core.model.findEntity(fetchField.entity)
                // TODO: if (!fetchField)
                // TODO: if (!fetchEntity)
                var prfix = 'j'+(t++)+'_'+fetchEntity.id
                tables.push({
                  entity: fetchEntity,
                  prefix: prfix+'.',
                })
                sql += ' LEFT JOIN '+quote(fetchEntity.id)+' '+prfix+' ON '+prefix+'.'+fetch+'='+prfix+'._id'
              })
            }
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
          sql += '\nWHERE\n  '+arr.join(' AND ')
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
        sql += '\nORDER BY\n  '+sorts.join(', ')
      }

      var select = 'SELECT '
      select += tables.map(function(table) {
        return expandColumnNames(table.entity, table.prefix, table.field, table.subquery)
      }).join(', ')

      function createJoinQueries() {
        if (!query.join) return []
        var queries = []
        query.join.forEach(function(join) {
          var field = _.findWhere(entity.fields, { id: join.field })
          var entty = core.model.findEntity(field.entity)
          // TODO: if (!field)
          // TODO: if (!entity)

          if (field.relationship.indexOf('many-') === 0) {
            var field = _.findWhere(entity.fields, { id: join.field })
            var entty = core.model.findEntity(field.entity)

            var subquery = 'SELECT COUNT(*) FROM '+quote(entty.id)+' WHERE '+quote(field.inverse)+'=?'
            var sql = '(SELECT ? as '+quote('t._id')+','
            sql += expandColumnNames(entty, join.prefix+'.', field.id, subquery)
            var t = 1
            var tables = []
            if (join.fetch) {
              join.fetch.forEach(function(fetch) {
                var fetchField = _.findWhere(entty.fields, { id: fetch })
                var fetchEntity = core.model.findEntity(fetchField.entity)
                // TODO: if (!fetchField)
                // TODO: if (!fetchEntity)
                var prfix = 'jf'+(t++)+'_'+fetchEntity.id
                tables.push({
                  entity: fetchEntity,
                  prefix: prfix,
                  join: join,
                  fetch: fetch,
                })
                sql += ','+expandColumnNames(fetchEntity, prfix+'.', fetch)
              })
            }
            sql +=' FROM '+quote(entty.id)+' '+join.prefix
            var joinParams = [null, null, null]
            tables.forEach(function(table) {
              var fetchEntity = table.entity
              var prfix = table.prefix
              var join = table.join
              var fetch = table.fetch
              sql += '\nLEFT JOIN '+quote(fetchEntity.id)+' '+prfix+' ON '+join.prefix+'.'+fetch+'='+prfix+'._id'
            })
            sql += '\nWHERE\n  '+quote(field.inverse)+'=?'
            if (join.having) {
              var x = paramIndex+1
              sql += '\n AND '+processPart(entty, join.having, join.prefix+'.', true)
              var y = paramIndex+1
              joinParams = joinParams.concat(params.slice(x, y))
            }
            sql += '\nORDER BY '+join.prefix+'._created_at '+(join.op === 'first' ? 'ASC' : 'DESC')
            if (join.n) {
              sql += ' LIMIT '+join.n
            }
            sql += ')'
            queries.push({
              sql: sql,
              params: joinParams,
            })
          }
        })
        return queries
      }

      return {
        main: select+sql,
        joins: createJoinQueries(),
      }
    }

    function abstractList(args, preProcessQuery, postProcessQuery, callback) {
      var q = args.query || ''
      var params = args.params || []
      var query
      var queries

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
            query = bql.parse(q)
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
              queries = buildSQL(entity, query, params, where)
              var sql = queries.main
              sql = postProcessQuery ? postProcessQuery(sql) : sql
              if (args.limit) {
                sql += '\nLIMIT ? OFFSET ?'
                params.push(args.limit)
                params.push(args.offset || 0)
              }
              query.type = 'count'
              var count = buildSQL(entity, query, params2, where)
              conn.queryAll([sql, count], [params, params2], callback)
            }
          ))
        })
        .then(function(results, callback) {
          var conn = this.get('conn')
          var objectsResult = results[0]
          var countResult = results[1]
          var count = countResult[0]['COUNT(*)']
          var normalized = normalizeObjects(entity, objectsResult)

          runJoins(conn, entity, queries, normalized, count, callback)
        })
        .end(callback)
    }

    function runJoins(conn, entity, queries, normalized, count, callback) {
      if (normalized.ids.length === 0) {
        return callback(null, normalized.ids, normalized.objects, count)
      }
      txain(queries.joins)
      .each(function(join, callback) {
        txain(function(callback) {
          var sql = []
          var allParams = []
          var params = join.params
          normalized.ids.forEach(function(id) {
            sql.push('('+join.sql+')')
            for (var i = 0; i < params.length; i++) {
              allParams.push(params[i] === null ? id : params[i])
            }
          })
          conn.query(sql.join(' UNION '), allParams, callback)
        })
        .then(function(result, callback) {
          normalized = normalizeObjects(entity, result, normalized.objects, normalized.ids)
          callback()
        })
        .end(callback)
      })
      .end(function(err) {
        if (err) return callback(err)
        return callback(null, normalized.ids, normalized.objects, count)
      })
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
        callback(null, manager.polygonContainsLocation('t.'+field.id))
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
        sql = sql.substring(0, n)+'ORDER BY '+manager.distanceBetweenLocationAndCoordinates('t.'+field.id, lat, lon)
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
          var conn = this.get('conn')
          conn.query(conn.nextIdCommand(), [], callback)
        })
        .then(function(results, callback) {
          var insertId = +results[0].insertId
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
          this.get('conn').query('SELECT * FROM '+quote('user')+' WHERE __login_email_current=?', [email], callback)
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
        var columns = {}
        var params = []
        var sqlcommands = []
        var allparams = []
        fields.forEach(function(field) {
          // `set` operator
          var value = commands['set-'+field.id]
          if (typeof value !== 'undefined') {
            if (field.type === 'boolean') {
              value = value ? 1 : 0
            }
            if (field.type === 'location') {
              // TODO: parse value
              var info = parseCoordinates(value)
              if (info.lat && info.lon) {
                value = info.addr
                var point = util.format('POINT(%d %d)', info.lat, info.lon)
                columns[quote(field.id)] = manager.locationFromText('?')
                params.push(point)
              } else {
                columns[quote(field.id)] = 'NULL'
              }
              columns[quote('_addr_'+field.id)] = '?'
              params.push(value)
            } else {
              columns[quote(field.id)] = '?'
              params.push(value)
            }
          } else if (field.type === 'number') {
            // `incr` operator for numbers
            value = commands['incr-'+field.id]
            if (typeof value !== 'undefined') {
              var val = +value || 0 // avoid SQL injection
              if (insert) {
                columns[quote(field.id)] = '?'
              } else {
                columns[quote(field.id)] = 'CASE WHEN '+quote(field.id)+' IS NULL THEN '+val+' ELSE '+quote(field.id)+'+? END'
              }
              params.push(value)
            }
          }
          // `add` and `rem` operators for relationships
          if (field.type === 'reference') {
            var column1 = entity.id+'_'+field.id
            var column2 = field.entity+'_'+field.inverse

            if (field.relationship.indexOf('many-') === 0) {
              value = commands['add-'+field.id]
              value = _.isArray(value) ? value : [value]
              value.forEach(function(value) {
                if (typeof value !== 'undefined') {
                  if (field.relationship.indexOf('-one') > 0) {
                    sqlcommands.push('UPDATE '+quote(field.entity)+' SET '+quote(field.inverse)+'=? WHERE _id=?')
                    allparams.push([id, value])
                  }
                }
                value = commands['rem-'+field.id]
                if (typeof value !== 'undefined') {
                  if (field.relationship.indexOf('-one') > 0) {
                    sqlcommands.push('UPDATE '+quote(field.entity)+' SET '+quote(field.inverse)+'=? WHERE _id=?')
                    allparams.push([null, value])
                  }
                }
              })
            } else if (typeof value !== 'undefined') {
              // unsupported operation
            }
          }
          // `del` operator
          value = commands['del-'+field.id]
          if (typeof value !== 'undefined') {
            columns[quote(field.id)] = 'NULL'
            if (field.type === 'location') {
              columns[quote('_addr_'+field.id)] = 'NULL'
            }
          }
        })
        for (var xtra in extra) {
          if (extra.hasOwnProperty(xtra)) {
            columns[xtra] = '?'
            params.push(extra[xtra])
          }
        }
        if (insert) {
          var sql = 'INSERT INTO '+quote(entity.id)+' ('
          columns['_id'] = '?'
          params.push(id)
          columns['_created_at'] = '?'
          columns['_updated_at'] = '?'
          params.push(now)
          params.push(now)

          sql += _.keys(columns).join(', ')
          sql += ') VALUES ('
          sql += _.values(columns).join(',')
          sql += ')'

        } else {
          var sql = 'UPDATE '+quote(entity.id)+' SET '
          columns['_updated_at'] = '?'
          params.push(now)

          sql += _.keys(columns).map(function(column) {
            return column+'='+columns[column]
          }).join(',')
        }

        if (!insert) {
          sql += ' WHERE _id = ?'
          params.push(id)
        }
        conn.queryAll([sql].concat(sqlcommands), [params].concat(allparams), callback)
      })
      .then(function(res, callback) {
        var sql = 'SELECT '+expandColumnNames(entity, 't.')+' FROM '+quote(entity.id)+' t WHERE t._id = ?'
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
      var queries

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
          queries = buildSQL(entity, query, params)
          var sql = queries.main
          sql += ' WHERE t._id IN('+placeholders+')'
          params = params.concat(ids) // TODO: test read + join + having
          conn.query(sql, params, callback)
        })
        .then(function(result, callback) {
          if (result.length === 0 && args.id) {
            return callback(errors.notFound('ObjectNotFound: Object with id `%s` not found', args.id))
          }
          var conn = this.get('conn')
          var normalized = normalizeObjects(entity, result)
          runJoins(conn, entity, queries, normalized, 1, callback)
        })
        .then(function(ids, objects, count, callback) {
          callback(null, objects)
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
        var params = [[id]]
        var sql = ['DELETE FROM '+quote(entity.id)+' WHERE _id = ?']
        entity.fields.forEach(function(field) {
          if (field.type === 'reference') {
            if (field.relationship.indexOf('-one') > 0) {
              sql.push('UPDATE '+quote(field.entity)+' SET '+quote(field.inverse)+' = NULL WHERE '+quote(field.inverse)+' = ?')
              params.push([id])
            }
          }
        })
        conn.queryAll(sql, params, callback)
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

    function expandColumnNames(entity, prefix, field, subquery) {
      var fields = entity.fields
      function alias(column) {
        var col = prefix+quote(column)
        return col+' AS '+quote(prefix+column)
      }
      var columns = []
      fields.forEach(function(field) {
        if (field.type === 'reference' && field.relationship.indexOf('many-') === 0) return
        if (field.type === 'location') {
          columns.push(alias('_addr_'+field.id))
          var col = prefix+field.id
          var as = quote(col)
          columns.push(manager.locationAsText(col)+' AS '+as)
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
        columns.push('\''+field+'\' AS '+quote(prefix))
      }
      if (subquery) {
        columns.push('('+subquery+') AS '+quote(prefix+'_count'))
      }
      return '\n  '+columns.join(',\n  ')
    }

    function normalizeObjects(entity, rows, objects, ids) {
      var model = core.model

      objects = objects || {}
      ids = ids || []
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
                table = column.substring(column.indexOf('_')+1, column.indexOf('.'))
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
          conn.showTables(callback)
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
          conn.describeTable(table, callback)
        })
        .then(function(result, callback) {
          var columns = result.map(function(column) {
            var type = column.Type
            var length = column.length
            if (!length) {
              var n = type.indexOf('(')
              var m = type.indexOf(')')
              if (n > 0 && m > n) {
                length = +type.substring(n+1, m)
                type = type.substring(0, n)
              }
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
          conn.showIndexes(table, callback)
        })
        .then(function(result, callback) {
          var indexes = result.map(function(index) {
            return {
              'name': index.Key_name,
              'type': index.Index_type,
              'column': index.Column_name || index.Column_names[0], // TODO: multiple columns!
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

    db.queryAll = function(query, params, callback) {
      txain(connect)
        .then(function(conn, callback) {
          conn.queryAll(query, params, callback)
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
          type: TYPES['number'][0],
          length: TYPES['number'][1],
        }],
        indexes: [],
      })

      tables.push({
        name: '_devices',
        columns: [
          {
            name: '_id',
            type: TYPES['number'][0],
            length: TYPES['number'][1],
          },
          {
            name: 'token',
            type: TYPES['reference'][0],
            length: TYPES['reference'][1],
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
          type: TYPES['reference'][0],
          length: TYPES['reference'][1],
        })

        table.columns.push({
          name: '_created_at',
          type: TYPES['date'][0],
          length: TYPES['date'][1],
        })

        table.columns.push({
          name: '_updated_at',
          type: TYPES['date'][0],
          length: TYPES['date'][1],
        })

        fields.forEach(function(field) {
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
            type: TYPES['reference'][0],
            length: TYPES['reference'][1],
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
            var command = util.format('ALTER TABLE %s RENAME TO %s', quote(currentTable.name), quote(table.name))
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
          var command = conn.createTableCommand(table, id)
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
          command = conn.alterColumnCommand(table, currentColumn, column)
        } else {
          command = util.format('ALTER TABLE %s ADD COLUMN %s %s',
            quote(table.name), quote(column.name), column.type)
          if (column.length) {
            command += '('+column.length+')'
          }
        }

        commands.push(command)
        if (!run) return callback()
        conn.query(command, callback)
      }

      function compareIndex(conn, table, index, currentTable, commands, callback) {
        var currentIndex = findByName(currentTable.indexes, index.name, index.formerly)
        if (currentIndex && currentIndex.name === index.name) return callback() // TODO: type
        if (currentIndex) {
          var command = conn.alterIndex(table, currentIndex, index)
          commands.push(command)
          if (!run) return callback()
          return conn.query(command, callback)
        }

        var command = conn.createIndex(table, index)
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
          conn.query('DELETE FROM '+quote(table), callback)
        })
        .end(callback)
    }

    db.deleteData = function(callback) {
      var entities = core.model.entities
      var tables = entities.map(function(entity) {
        return entity.id
      })
      txain(tables)
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
