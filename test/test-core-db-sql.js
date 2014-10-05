var assert = require('assert')
var _ = require('underscore')

describe('Test core-db-sql', function() {

  var db = require('../lib/core/core-db-sql')({
    manager: 'sql',
    host: 'localhost',
    port: 3306,
    user: 'root',
    pass: '',
    database: 'shed',
  })({
    project: {
      name: 'shed'
    },
    model: {
      entities: {
        'item': {
          fields: {
            'name': {
              type: 'text',
              mandatory: true
            }
          }
        }
      }
    }
  })

  it('#showTables()', function(done) {
    db.showTables(function(err, result) {
      assert.ifError(err)
      done()
    })
  })

})
