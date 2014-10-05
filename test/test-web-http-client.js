var assert = require('assert')
var request = require('supertest')
var app = require('./app')()
var _ = require('underscore')
var http = require('http')

describe('Test web http client', function() {

  before(function() {
    this.server = http.createServer(function (req, res) {
      res.writeHead(200, {'Content-Type': 'text/plain'})
      res.end('hello world')
    })
    this.server.listen(1337, '127.0.0.1')
  })

  after(function(done) {
    this.server.close(done)
  })

  it('makes a GET request with the http client', function(done) {
    request(app)
      .get('/http-client')
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.text, 'hello world')
        done()
      })
  })

  it('makes a POST request with the http client', function(done) {
    request(app)
      .get('/http-client')
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.text, 'hello world')
        done()
      })
  })

})