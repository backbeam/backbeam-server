var assert = require('assert')
var utils = require('./test-utils')
var txain  = require('txain')
var request = require('supertest')
var app = require('./app')()
var _ = require('underscore')

describe('Test admin entity', function() {

  before(function(done) {
    txain(function(callback) {
      utils.migrate(app, callback)
    })
    .then(function(callback) {
      utils.deleteData(app, callback)
    })
    .end(done)
  })

  it('should serve the page for an entity', function(done) {
    request(app)
      .get('/admin/entity/user')
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.statusCode, 200, res.text)
        done()
      })
  })

})
