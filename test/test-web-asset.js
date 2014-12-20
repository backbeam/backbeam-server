var assert = require('assert')
var request = require('supertest')
var app = require('./app')()
var _ = require('underscore')

describe('Test asset', function() {

  beforeEach(function(done) {
    done()
  })

  it('should serve an asset', function(done) {
    request(app)
      .get('/hello-world.txt')
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.statusCode, 200, res.text)
        assert.equal(res.text, 'hello world')
        done()
      })
  })

})