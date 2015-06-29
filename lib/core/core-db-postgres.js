var pg = require('pg')
var errors = require('node-errors')
var nook = errors.nook
var _ = require('underscore')
var multiline = require('multiline')
var util = require('util')

// CREATE EXTENSION Postgis; CREATE EXTENSION postgis_topology;

module.exports = function(options, callback) {
  var options = {
    host     : options.host || 'localhost',
    port     : options.port || 5432,
    database : options.database,
    user     : options.user,
    password : options.pass,
    ssl      : options.ssl || false,
  }
  pg.connect(options, function(err, client, done) {
    if (err) return callback(err)
    done()

    var conn = {}
    conn.query = function(sql, params, callback) {
      if (arguments.length === 2) {
        callback = params
      } else {
        var count = (sql.match(/\?/g) || []).length
        params = params.slice(0, count)
      }
      // console.log('count', count, sql, params.length)
      sql = convertPlaceholders(sql)
      pg.connect(options, function(err, client, done) {
        if (err) return callback(err)
        client.query(sql, params, function(err, result) {
          done()
          if (err) return console.log('failed sql', sql, params) || callback(err)
          callback(null, result.rows)
        })
      })
    }

    conn.showTables = function(callback) {
      conn.query('select tablename as table from pg_tables where schemaname not in (?, ?, ?)', ['temp', 'pg_catalog', 'information_schema'], callback)
    }

    conn.describeTable = function(table, callback) {
      var query = multiline(function() {/*
        select
          table_name,
          table_schema,
          column_name as "Field",
          data_type as "Type",
          udt_name,
          character_maximum_length as length,
          is_nullable
        from
          INFORMATION_SCHEMA.COLUMNS
        where table_name=?;
      */})
      conn.query(query, [table], nook(callback, function(rows) {
        rows.forEach(function(row) {
          if (row.Type === 'integer') {
            row.Type = 'int'
            row.length = 11
          } else if (row.Type === 'character varying') {
            row.Type = 'varchar'
            row.length = 255
          }
        })
        callback(null, rows)
      }))
    }

    conn.showIndexes = function(table, callback) {
      var query = multiline(function() {/*
        SELECT i.relname as Key_name,
               i.relowner as indowner,
               idx.indrelid::regclass as table,
               am.amname as Index_type,
               idx.indkey,
               ARRAY(
               SELECT pg_get_indexdef(idx.indexrelid, k + 1, true)
               FROM generate_subscripts(idx.indkey, 1) as k
               ORDER BY k
               ) as "Column_names",
               idx.indexprs IS NOT NULL as indexprs,
               idx.indpred IS NOT NULL as indpred,
               ns.nspname
        FROM   pg_index as idx
        JOIN   pg_class as i
        ON     i.oid = idx.indexrelid
        JOIN   pg_am as am
        ON     i.relam = am.oid
        JOIN   pg_namespace as ns
        ON     ns.oid = i.relnamespace
        AND    ns.nspname NOT IN ('pg_catalog', 'pg_toast')
        WHERE  idx.indrelid = ?::regclass;
      */})
      conn.query(query, [table], callback)
    }

    conn.createTableCommand = function(table, id) {
      if (table.name === '_id_generator') {
        return multiline(function() {/*
          DO
          $$
          BEGIN
            create sequence _id_generator;
          EXCEPTION WHEN duplicate_table THEN
                  -- do nothing, it's already there
          END
          $$ LANGUAGE plpgsql;
        */})
      }
      if (id.type === 'integer') {
        return util.format('CREATE TABLE IF NOT EXISTS "%s" ( _id %s NOT NULL PRIMARY KEY DEFAULT nextval(\'_id_generator\'::regclass) )',
          table.name, id.type)
      }
      return util.format('CREATE TABLE IF NOT EXISTS "%s" ( _id %s NOT NULL PRIMARY KEY )',
        table.name, id.type)
    }

    conn.alterColumnCommand = function(table, currentColumn, column) {
      var command = util.format('ALTER TABLE "%s" ALTER "%s" SET DATA TYPE %s',
        table.name, currentColumn.name, column.type)

      if (column.length) {
        command += '('+column.length+')'
      }

      if (currentColumn.name !== column.name) {
        command += util.format('; ALTER TABLE "%s" RENAME COLUMN "%s" TO "%s"', table.name, currentColumn.name, column.name)
      }
      return command
    }

    conn.nextIdCommand = function() {
      return 'SELECT nextval(\'_id_generator\') as "insertId";'
    }

    callback(null, conn)
  })

}

var manager = module.exports

manager.quotechr = '"'

manager.TYPES = {
  'text'        : ['varchar', 255],
  'textarea'    : ['text'],
  'richtextarea': ['text'],
  'date'        : ['bigint'],
  'number'      : ['integer'],
  'location'    : ['geography'],
  'reference'   : ['character varying'],
  'select'      : ['varchar', 255],
  'day'         : ['varchar', 8],
  'json'        : ['text'],
  'boolean'     : ['smallint'],
}

manager.supportsFullText = false

manager.locationAsText = function(col) {
  return col+'::text'
}

manager.locationFromText = function(val) {
  return 'ST_GeomFromText('+val+')' // ST_PointFromText
}

manager.polygonContainsLocation = function(col) {
  return 'ST_Contains(ST_SetSRID(ST_GeomFromText(?), 4326), ST_SetSRID('+col+'::geometry, 4326))'
}

manager.distanceBetweenLocationAndCoordinates = function(col, lat, lon) {
  return util.format('ST_Distance('+col+', ST_GeomFromText(\'POINT(%d %d)\'))', lat, lon)
}

function convertResult(result) {
  return result.rows
}

function convertPlaceholders(str) {
  var i = 0
  return str.replace(/\?/g, function() {
    return '$'+(++i)
  })
}
