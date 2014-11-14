var assert = require('assert')
var request = require('supertest')
var app = require('./app')()
var _ = require('underscore')

describe('Test admin entity', function() {

  it('should serve the page for an entity', function(done) {
    request(app)
      .get('/admin/entity/user')
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.statusCode, 200)
        done()
      })
  })

})
