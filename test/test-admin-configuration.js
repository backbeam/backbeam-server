var assert = require('assert')
var request = require('supertest')
var app = require('./app')()
var _ = require('underscore')

describe('Test admin configuration', function() {

  beforeEach(function(done) {
    done()
  })

  it('should serve the general configuration page', function(done) {
    request(app)
      .get('/admin/configuration/general')
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.statusCode, 200, res.text)
        done()
      })
  })

  it('should serve the authentication page', function(done) {
    request(app)
      .get('/admin/configuration/authentication')
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.statusCode, 200, res.text)
        done()
      })
  })

  it('should serve the push page', function(done) {
    request(app)
      .get('/admin/configuration/push')
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.statusCode, 200, res.text)
        done()
      })
  })

  it('should serve the email page', function(done) {
    request(app)
      .get('/admin/configuration/email')
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.statusCode, 200, res.text)
        done()
      })
  })

})
