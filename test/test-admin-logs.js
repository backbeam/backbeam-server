var assert = require('assert')
var request = require('supertest')
var app = require('./app')()
var _ = require('underscore')

describe('Test admin logs', function() {

  beforeEach(function(done) {
    done()
  })

  it('should serve the logs page', function(done) {
    request(app)
      .get('/admin/logs')
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.statusCode, 200, res.text)
        done()
      })
  })

})
