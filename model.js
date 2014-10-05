var fs = require('fs')
var mysql = require('mysql')
var async = require('async')
var _ = require('underscore')

exports.migrate = function() {
  var core = require('./lib/core').init()
  var config = require('./lib/config').get()

  try {
    var connection = core.db.connection()
  } catch (err) {
    return console.error('Invalid connection configuration', err)
  }

  var statements = []
  statements.push('CREATE TABLE IF NOT EXISTS id_generator (id INTEGER NOT NULL PRIMARY KEY AUTO_INCREMENT);')

  function compareColumn(table, fieldId, field, column, cb) {

    var columnDescription = null
    var type = field.type
    if (type === 'text') {
      columnDescription = 'VARCHAR(255)'
    }
    // TODO: more field types

    if (field.mandatory === true) {
      columnDescription += ' NOT NULL'
    }

    if (!columnDescription) {
      return cb(new Error('Invalid field description for field `'+fieldId+'`'))
    }

    if (!column) {
      statements.push('ALTER TABLE '+table+' ADD COLUMN '+fieldId+' '+columnDescription+';')
    } else {
      statements.push('ALTER TABLE '+table+' ALTER COLUMN '+fieldId+' '+columnDescription+';')
    }
    cb()
  }

  function compareTable(entityId, columns, cb) {
    var entity = config.model.entities[entityId]
    var fields = entity.fields
    var fieldIds = _.keys(fields)
    async.eachSeries(fieldIds, function(fieldId, next) {
      var column = null
      for (var i = 0; i < columns.length; i++) {
        if (columns[i].Field === fieldId) {
          column = columns[i]
          break
        }
      }
      compareColumn(entityId, fieldId, fields[fieldId], column, next)
    }, cb)
  }

  function compareTables(cb) {
    connection.query('SHOW TABLES', function(err, rows, fields) {
      if (err) return cb(err)

      var tables = {}
      var key = 'Tables_in_'+config.db_database
      for (var i = 0; i < rows.length; i++) {
        var tableName = rows[i][key]
        tables[tableName] = true
      }

      var entityIds = _.keys(config.model.entities)
      async.eachSeries(entityIds, function(entityId, next) {
        if (!tables[entityId]) {
          statements.push('CREATE TABLE IF NOT EXISTS '+entityId+' (id VARCHAR(255) NOT NULL PRIMARY KEY);')
          compareTable(entityId, [], next)
        } else {
          connection.query('SHOW COLUMNS IN '+entityId, function(err, rows, fields) {
            if (err) { return next(err) }
            compareTable(entityId, rows, next)
          })
        }
      }, function(err) {
        if (err) { return cb(err) }
        cb(null)
      })
    })
  }

  compareTables(function(err) {
    connection.end()
    if (err) { return console.log('Error', err) }
    console.log(statements.join('\n'))
  })
}
