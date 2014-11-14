var assert = require('assert')
var request = require('supertest')
var app = require('./app')()
var _ = require('underscore')

describe('Test web require', function() {

  beforeEach(function(done) {
    done()
  })

  it('#require()', function(done) {
    request(app)
      .get('/require')
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.text, 'hello world hello world')
        done()
      })
  })

  it('#require() error', function(done) {
    request(app)
      .get('/require/error')
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.statusCode, 500)
        done()
      })
  })

})
