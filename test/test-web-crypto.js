var assert = require('assert')
var request = require('supertest')
var app = require('./app')()
var _ = require('underscore')

describe('Test web crypto', function() {

  beforeEach(function(done) {
    done()
  })

  it('returns a list of available hash algoritms', function(done) {
    request(app)
      .get('/crypto/hashes')
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.text, 'md5,sha1,sha256,sha384,sha512')
        done()
      })
  })

  it('returns a hash using SHA1', function(done) {
    request(app)
      .get('/crypto/create-hash')
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.text, 'da39a3ee5e6b4b0d3255bfef95601890afd80709')
        done()
      })
  })

  it('returns a hash using HMAC/SHA1', function(done) {
    request(app)
      .get('/crypto/create-hmac')
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.text, 'f42bb0eeb018ebbd4597ae7213711ec60760843f')
        done()
      })
  })

  it('tests errors', function(done) {
    request(app)
      .get('/crypto/errors')
      .end(function(err, res) {
        assert.ifError(err)
        assert.ok(res.body)
        assert.ok(_.isEqual(res.body, [
          'Must give hashtype string as argument',
          'Digest method not supported',
          'Must give hashtype string as argument',
          'Unknown message digest foo',
        ]))
        done()
      })
  })

})