var assert = require('assert')
var request = require('supertest')
var app = require('./app')()

describe('Test web response', function() {

  beforeEach(function(done) {
    done()
  })

  it('#send(), #status() and #set()', function(done) {
    request(app)
      .get('/response/send')
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.status, 201, res.text)
        assert.equal(res.text, 'Hello world')
        assert.equal(res.header['x-custom-header'], 'value')
        assert.equal(res.header['content-type'], 'text/plain; charset=utf-8')
        done()
      })
  })

  it('#redirect()', function(done) {
    request(app)
      .get('/response/redirect')
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.status, 302, res.text)
        assert.equal(res.header['location'], 'http://example.com')
        done()
      })
  })

  it('#json(string)', function(done) {
    request(app)
      .get('/response/json-string')
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.status, 200, res.text)
        assert.equal(res.header['content-type'], 'application/json; charset=utf-8')
        assert.ok(res.body)
        assert.equal(res.text, '{}')
        done()
      })
  })

  it('#json(object)', function(done) {
    request(app)
      .get('/response/json-object')
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.status, 200, res.text)
        assert.equal(res.header['content-type'], 'application/json; charset=utf-8')
        assert.ok(res.body)
        assert.equal(res.text, '{"foo":"bar"}')
        done()
      })
  })

  it('#render()', function(done) {
    request(app)
      .get('/response/render')
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.status, 200, res.text)
        assert.equal(res.header['content-type'], 'text/html; charset=utf-8')
        assert.equal(res.text, '<p>1 category</p>')
        done()
      })
  })

})
