var assert = require('assert')
var request = require('supertest')
var app = require('./app')()
var _ = require('underscore')

describe('Test admin push', function() {

  beforeEach(function(done) {
    done()
  })

  it('should serve the push page', function(done) {
    request(app)
      .get('/admin/push')
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.statusCode, 200)
        done()
      })
  })

})
