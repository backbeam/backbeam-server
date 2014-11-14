var assert = require('assert')
var request = require('supertest')
var app = require('./app')()
var _ = require('underscore')
var txain = require('txain')
var utils = require('./test-utils')

describe('Test web methods for users', function() {

  describe('Test using manual JSON responses', function() {
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

    it('should register a user', function(done) {
      request(app)
        .post('/users/register')
        .set('x-backbeam-sdk', 'test')
        .end(function(err, res) {
          assert.ifError(err)
          assert.equal(res.status, 200)
          assert.ok(res.body)
          assert.equal(res.body.status, 'Success')
          assert.ok(res.body.id)
          assert.ok(res.headers['x-backbeam-auth'])
          assert.ok(res.headers['x-backbeam-user'])
          done()
        })
    })

    it('should verify the confirmation code', function(done) {
      var code = require('../lib/core/core-db-sql').lastEmailVerificationCode
      request(app)
        .post('/users/verify-code')
        .set('x-backbeam-sdk', 'test')
        .type('form')
        .send({
          code: code,
        })
        .end(function(err, res) {
          assert.ifError(err)
          assert.equal(res.status, 200)
          assert.ok(res.body)
          assert.equal(res.body.status, 'Success')
          assert.ok(res.headers['x-backbeam-auth'])
          assert.ok(res.headers['x-backbeam-user'])
          done()
        })
    })

    it('should login the user', function(done) {
      request(app)
        .post('/users/login')
        .end(function(err, res) {
          assert.ifError(err)
          assert.equal(res.status, 200)
          assert.ok(res.body)
          assert.equal(res.body.status, 'Success')
          done()
        })
    })

    it('should request a password reset', function(done) {
      request(app)
        .post('/users/request-password-reset')
        .end(function(err, res) {
          assert.ifError(err)
          assert.equal(res.status, 200)
          assert.ok(res.body)
          assert.equal(res.body.status, 'Success')
          done()
        })
    })

    it('should reset a password', function(done) {
      var code = require('../lib/core/core-users').lastLostPasswordCode
      request(app)
        .post('/users/reset-password')
        .set('x-backbeam-sdk', 'test')
        .type('form')
        .send({
          code: code,
        })
        .end(function(err, res) {
          assert.ifError(err)
          assert.equal(res.status, 200)
          assert.ok(res.body)
          assert.equal(res.body.status, 'Success')
          assert.ok(res.headers['x-backbeam-auth'])
          assert.ok(res.headers['x-backbeam-user'])
          auth = res.headers['x-backbeam-auth']
          done()
        })
    })

    it('should log out the user', function(done) {
      request(app)
        .post('/users/logout')
        .set('x-backbeam-sdk', 'test')
        .set('x-backbeam-auth', auth)
        .end(function(err, res) {
          assert.ifError(err)
          assert.equal(res.status, 200)
          assert.ok(res.body)
          assert.equal(res.body.status, 'Success')
          assert.equal(res.headers['x-backbeam-auth'], '')
          assert.equal(res.headers['x-backbeam-user'], void 0)
          done()
        })
    })

  })

  describe('Test using direct response serialization', function() {
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

    it('should register a user', function(done) {
      request(app)
        .post('/users/register')
        .set('x-backbeam-sdk', 'test')
        .set('serialization', 'serialization')
        .end(function(err, res) {
          assert.ifError(err)
          assert.equal(res.status, 200)
          assert.ok(res.body)
          assert.equal(res.body.status, 'Success')
          assert.ok(res.headers['x-backbeam-auth'])
          assert.ok(res.headers['x-backbeam-user'])
          done()
        })
    })

    it('should verify the confirmation code', function(done) {
      var code = require('../lib/core/core-db-sql').lastEmailVerificationCode
      request(app)
        .post('/users/verify-code')
        .set('x-backbeam-sdk', 'test')
        .set('serialization', 'serialization')
        .type('form')
        .send({
          code: code,
        })
        .end(function(err, res) {
          assert.ifError(err)
          assert.equal(res.status, 200)
          assert.ok(res.body)
          assert.equal(res.body.status, 'Success')
          assert.ok(res.headers['x-backbeam-auth'])
          assert.ok(res.headers['x-backbeam-user'])
          done()
        })
    })

    it('should login the user', function(done) {
      request(app)
        .post('/users/login')
        .set('serialization', 'serialization')
        .end(function(err, res) {
          assert.ifError(err)
          assert.equal(res.status, 200)
          assert.ok(res.body)
          assert.equal(res.body.status, 'Success')
          done()
        })
    })

    it('should request a password reset', function(done) {
      request(app)
        .post('/users/request-password-reset')
        .set('serialization', 'serialization')
        .end(function(err, res) {
          assert.ifError(err)
          assert.equal(res.status, 200)
          assert.ok(res.body)
          assert.equal(res.body.status, 'Success')
          done()
        })
    })

    it('should reset a password', function(done) {
      var code = require('../lib/core/core-users').lastLostPasswordCode
      request(app)
        .post('/users/reset-password')
        .set('x-backbeam-sdk', 'test')
        .set('serialization', 'serialization')
        .type('form')
        .send({
          code: code,
        })
        .end(function(err, res) {
          assert.ifError(err)
          assert.equal(res.status, 200)
          assert.ok(res.body)
          assert.equal(res.body.status, 'Success')
          assert.ok(res.headers['x-backbeam-auth'])
          assert.ok(res.headers['x-backbeam-user'])
          auth = res.headers['x-backbeam-auth']
          done()
        })
    })

  })

})
