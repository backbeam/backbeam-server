var assert = require('assert')
var request = require('supertest')
var _ = require('underscore')
var app = require('./app')()

describe('Test web response errors', function() {

  beforeEach(function(done) {
    done()
  })

  it('should return an error', function(done) {
    request(app)
      .get('/error/method')
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.status, 500, res.text)
        done()
      })
  })

  it('should return an error', function(done) {
    request(app)
      .get('/error/template')
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.status, 500, res.text)
        done()
      })
  })

  it('should serve not found', function(done) {
    request(app)
      .get('/unknown-route')
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.statusCode, 404)
        assert.equal(res.text, 'Not found')
        done()
      })
  })

  it('should serve an internal error', function(done) {
    request(app)
      .get('/route-without-code')
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.statusCode, 500)
        assert.ok(res.text.indexOf('ENOENT') >= 0)
        done()
      })
  })

  it('should prevent to serve an asset outside the assets dir', function(done) {
    request(app)
      .get('/../hello-world.txt')
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.statusCode, 404)
        assert.equal(res.text, 'Not found')
        done()
      })
  })

  it('should serve an error if template not found', function(done) {
    request(app)
      .get('/error/template-not-found')
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.statusCode, 500)
        done()
      })
  })

})
