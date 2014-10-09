var assert = require('assert')
var utils = require('./test-utils')
var txain  = require('txain')
var _ = require('underscore')
var request = utils.request
var app = require('./app')()

var shared = 'foo'
var secret = 'bar'

describe('Test API for users administration', function() {

  before(function(done) {
    txain(function(callback) {
      utils.migrate(app, callback)
    })
    .then(function(callback) {
      utils.deleteData(app, callback)
    })
    .end(done)
  })

  it('should insert a user', function(done) {
    request(app)
      .api({
        path: '/api/data/user',
        method: 'post',
        shared: shared,
        secret: secret,
        form: {
          'set-name': 'Alberto',
          'set-email': 'alberto@example.com',
          'set-password': '1234567',
        },
      })
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.statusCode, 201)
        assert.ok(res.body)
        assert.equal(res.body.status, 'Success')
        assert.ok(res.body.id)
        done()
      })
  })

  it('should login a user', function(done) {
    request(app)
      .api({
        path: '/api/user/email/login',
        method: 'post',
        shared: shared,
        secret: secret,
        form: {
          'email': 'alberto@example.com',
          'password': '1234567',
        },
      })
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.statusCode, 200)
        assert.ok(res.body)
        assert.equal(res.body.status, 'Success')
        assert.ok(res.body.id)
        done()
      })
  })

})
