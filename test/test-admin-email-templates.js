var assert = require('assert')
var request = require('supertest')
var app = require('./app')()
var _ = require('underscore')

describe('Test admin email templates', function() {

  beforeEach(function(done) {
    done()
  })

  it('should serve the main page', function(done) {
    request(app)
      .get('/admin/email-templates')
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.statusCode, 200, res.text)
        done()
      })
  })

})
