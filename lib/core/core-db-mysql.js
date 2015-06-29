var mysql = require('mysql')
var errors = require('node-errors')
var nook = errors.nook
var util = require('util')

module.exports = function(options, callback) {
  var connOptions = {
    host     : options.host || 'localhost',
    port     : options.port || 3306,
    database : options.database,
    user     : options.user,
    password : options.pass,
    multipleStatements: true,
    connLimit: options.connLimit || 10,
  }
  var conn = mysql.createPool(connOptions)
  conn.query('SELECT VERSION()', nook(callback,
    function(result) {
      conn.mysqlVersion = result[0]['VERSION()'].split('.')
      return callback(null, conn)
    }
  ))

  conn.showTables = function(callback) {
    conn.query('SHOW TABLES', callback)
  }

  conn.describeTable = function(table, callback) {
    conn.query('DESCRIBE `'+table+'`', callback)
  }

  conn.showIndexes = function(table, callback) {
    conn.query('SHOW INDEXES IN `'+table+'`', callback)
  }

  conn.createTableCommand = function(table, id) {
    return util.format('CREATE TABLE IF NOT EXISTS `%s` ( _id %s (%d) NOT NULL PRIMARY KEY %s ) ENGINE=MyISAM CHARSET=UTF8',
      table.name, id.type, id.length, id.type === 'int' ? 'AUTO_INCREMENT' : '')
  }

  conn.alterColumnCommand = function(table, currentColumn, column) {
    var sql = util.format('ALTER TABLE `%s` CHANGE COLUMN `%s` `%s` %s',
      table.name, currentColumn.name, column.name, column.type)
    if (column.length) {
      sql += '('+column.length+')'
    }
    return sql
  }

  conn.nextIdCommand = function() {
    return 'INSERT INTO _id_generator VALUES (); DELETE FROM _id_generator;'
  }

}

var manager = module.exports

manager.quotechr = '`'

manager.TYPES = {
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

manager.supportsFullText = true

manager.locationAsText = function(col) {
  return 'AsText('+col+')'
}

manager.locationFromText = function(val) {
  return 'GeomFromText('+val+')'
}

manager.polygonContainsLocation = function(col) {
  return 'MBRContains(GeomFromText(?), '+col+')'
}

manager.distanceBetweenLocationAndCoordinates = function(col, lat, lon) {
  return util.format('ST_Distance('+col+', POINT(%d, %d))', lat, lon)
}
