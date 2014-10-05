var assert = require('assert')
var request = require('supertest')
var app = require('./app')()
var _ = require('underscore')

describe('Test web querystring', function() {

  beforeEach(function(done) {
    done()
  })

  it('#querystring.stringify()', function(done) {
    request(app)
      .get('/querystring/stringify')
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.text, 'foo=bar&baz=bax')
        done()
      })
  })

  it('#querystring.parse()', function(done) {
    request(app)
      .get('/querystring/parse')
      .end(function(err, res) {
        assert.ifError(err)
        assert.ok(_.isEqual(res.body, { foo:'bar', baz:'bax' }))
        done()
      })
  })

})