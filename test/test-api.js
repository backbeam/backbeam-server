var assert = require('assert')
var utils = require('./test-utils')
var async  = require('async')
var _ = require('underscore')
var request = utils.request
var app = require('./app')()

var shared = 'foo'
var secret = 'bar'

describe('Test general API behavior', function() {

  it('should return 404 for an URL not found', function(done) {
    request(app)
      .get('/api/hello-world.txt')
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.statusCode, 404, res.text)
        assert.equal(res.text, 'Not found')
        done()
      })
  })

  it('should return 400 for a missing time', function(done) {
    request(app)
      .api({
        path: '/api/test',
        method: 'get',
        shared: shared,
        secret: secret,
        modify: function(data) {
          delete data.time
        }
      })
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.statusCode, 400, res.text)
        assert.ok(res.body)
        assert.equal(res.body.status, 'MissingTime')
        done()
      })
  })

  it('should return 400 for a missing signature', function(done) {
    request(app)
      .api({
        path: '/api/test',
        method: 'get',
        shared: shared,
        secret: secret,
        modify: function(data) {
          delete data.signature
        }
      })
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.statusCode, 400, res.text)
        assert.ok(res.body)
        assert.equal(res.body.status, 'MissingSignature')
        done()
      })
  })

  it('should return 400 for a missing key', function(done) {
    request(app)
      .api({
        path: '/api/test',
        method: 'get',
        shared: shared,
        secret: secret,
        modify: function(data) {
          delete data.key
        }
      })
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.statusCode, 400, res.text)
        assert.ok(res.body)
        assert.equal(res.body.status, 'MissingApiKey')
        done()
      })
  })

  it('should return 400 for an invalid signature', function(done) {
    request(app)
      .api({
        path: '/api/test',
        method: 'get',
        shared: shared,
        secret: secret,
        modify: function(data) {
          data.signature += 'xxxx'
        }
      })
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.statusCode, 400, res.text)
        assert.ok(res.body)
        assert.equal(res.body.status, 'InvalidSignature')
        done()
      })
  })

  it('should return 400 for an invalid API key', function(done) {
    request(app)
      .api({
        path: '/api/test',
        method: 'get',
        shared: shared,
        secret: secret,
        modify: function(data) {
          data.key += 'xxxx'
        }
      })
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.statusCode, 400, res.text)
        assert.ok(res.body)
        assert.equal(res.body.status, 'InvalidApiKey')
        done()
      })
  })

  // TODO: repeated request

  it('should return 400 for a missing nonce', function(done) {
    request(app)
      .api({
        path: '/api/test',
        method: 'get',
        shared: shared,
        secret: secret,
        modify: function(data) {
          delete data.nonce
        }
      })
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.statusCode, 400, res.text)
        assert.ok(res.body)
        assert.equal(res.body.status, 'MissingNonce')
        done()
      })
  })

  it('should return 400 for an invalid nonce', function(done) {
    request(app)
      .api({
        path: '/api/test',
        method: 'get',
        shared: shared,
        secret: secret,
        modify: function(data) {
          data.nonce = data.nonce.substring(0, 5)
        }
      })
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.statusCode, 400, res.text)
        assert.ok(res.body)
        assert.equal(res.body.status, 'InvalidNonce')
        done()
      })
  })

  it('should return 200 when everything is ok', function(done) {
    request(app)
      .api({
        path: '/api/test',
        method: 'get',
        shared: shared,
        secret: secret,
      })
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.statusCode, 200, res.text)
        assert.ok(res.body)
        assert.equal(res.body.status, 'Success')
        done()
      })
  })

})
