var assert = require('assert')
var utils = require('./test-utils')
var txain  = require('txain')
var _ = require('underscore')
var request = utils.request
var app = require('./app')()

var shared = 'foo'
var secret = 'bar'

describe('Test API for users', function() {

  var auth

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

  it('should prevent registering the same user', function(done) {
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
        assert.equal(res.statusCode, 400)
        assert.ok(res.body)
        assert.equal(res.body.status, 'UserAlreadyExists')
        done()
      })
  })

  it('should verify the email address of the user', function(done) {
    var code = require('../lib/core/core-db-sql').lastEmailVerificationCode
    request(app)
      .api({
        path: '/api/user/email/verify',
        method: 'post',
        shared: shared,
        secret: secret,
        form: {
          code: code,
        },
      })
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.statusCode, 200)
        assert.ok(res.body)

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
        assert.ok(res.body.auth)

        auth = res.body.auth
        done()
      })
  })

  it('should test the auth code', function(done) {
    request(app)
      .api({
        path: '/api/data/user',
        method: 'get',
        shared: shared,
        secret: secret,
        qs: {
          auth: auth,
        },
      })
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.statusCode, 200)
        assert.ok(res.body)
        assert.equal(res.body.status, 'Success')
        done()
      })
  })

  it('should request a password reset and reset the password', function(done) {
    txain(function(callback) {
      request(app)
        .api({
          path: '/api/user/email/lostpassword',
          method: 'post',
          shared: shared,
          secret: secret,
          form: {
            'email': 'alberto@example.com',
          },
        })
        .end(function(err, res) {
          assert.ifError(err)
          assert.equal(res.statusCode, 200)
          assert.ok(res.body)
          assert.equal(res.body.status, 'Success')

          callback()
        })
    })
    .then(function(callback) {
      var code = require('../lib/core/core-users').lastLostPasswordCode
      request(app)
        .api({
          path: '/api/user/email/setpassword',
          method: 'post',
          shared: shared,
          secret: secret,
          form: {
            'code': code,
            'password': '7654321',
          },
        })
        .end(function(err, res) {
          assert.ifError(err)
          assert.equal(res.statusCode, 200)
          assert.ok(res.body)
          assert.equal(res.body.status, 'Success')

          callback()
        })
    })
    .then(function(callback) {
      // log in with the new password
      request(app)
        .api({
          path: '/api/user/email/login',
          method: 'post',
          shared: shared,
          secret: secret,
          form: {
            'email': 'alberto@example.com',
            'password': '7654321',
          },
        })
        .end(function(err, res) {
          assert.ifError(err)
          assert.equal(res.statusCode, 200)
          assert.ok(res.body)
          assert.equal(res.body.status, 'Success')
          assert.ok(res.body.id)
          assert.ok(res.body.auth)
          done()
        })
    })
    .end(done)
  })

})
