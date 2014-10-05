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
  })({ project: { name: 'shed' } })

  it('#showTables()', function(done) {
    db.showTables(function(err, result) {
      assert.ifError(err)
      console.log('show tables', result)
      done()
    })
  })

  it('#describeTable()', function(done) {
    db.describeTable('user', function(err, result) {
      assert.ifError(err)
      console.log('describe table', result)
      done()
    })
  })

  it('#compareSchema()', function(done) {
    db.compareSchema(function(err, result) {
      assert.ifError(err)
      console.log(JSON.stringify(result, null, 4))
      done()
    })
  })

})
