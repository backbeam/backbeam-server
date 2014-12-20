var assert = require('assert')
var utils = require('./test-utils')
var remoteServices = utils.remoteServicesConfig()
var txain  = require('txain')
var _ = require('underscore')
var request = utils.request
var app = require('./app')(remoteServices)

var shared = 'foo'
var secret = 'bar'

describe('Test API for social signups', function() {

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

  it('should sign up using facebook', function(done) {
    utils.credentials.facebook(function(err, credentials) {
      assert.ifError(err)
      if (!credentials) return done()

      txain(['Success', 'UserAlreadyExists'])
      .each(function(status, callback) {
        request(app)
          .api({
            path: '/api/user/facebook/signup',
            method: 'post',
            shared: shared,
            secret: secret,
            form: _.clone(credentials),
          })
          .end(function(err, res) {
            assert.ifError(err)
            assert.equal(res.statusCode, 200, res.text)
            assert.ok(res.body)
            assert.equal(res.body.status, status)
            assert.ok(res.body.id)
            callback()
          })
      })
      .then(function(callback) {
        // should fail with invalid credentials
        request(app)
          .api({
            path: '/api/user/facebook/signup',
            method: 'post',
            shared: shared,
            secret: secret,
            form: {
              access_token: 'xxxx',
            },
          })
          .end(function(err, res) {
            assert.ifError(err)
            assert.equal(res.statusCode, 500, res.text)
            assert.ok(res.body)
            assert.equal(res.body.status, 'FacebookError')
            callback()
          })
      })
      .end(done)
    })
  })

  it('should signup using google plus', function(done) {
    utils.credentials.google(function(err, credentials) {
      assert.ifError(err)
      if (!credentials) return done()

      txain(['Success', 'UserAlreadyExists'])
      .each(function(status, callback) {
        request(app)
          .api({
            path: '/api/user/googleplus/signup',
            method: 'post',
            shared: shared,
            secret: secret,
            form: _.clone(credentials),
          })
          .end(function(err, res) {
            assert.ifError(err)
            assert.equal(res.statusCode, 200, res.text)
            assert.ok(res.body)
            assert.equal(res.body.status, status)
            assert.ok(res.body.id)
            callback()
          })
      })
      .then(function(callback) {
        // should fail with invalid credentials
        request(app)
          .api({
            path: '/api/user/googleplus/signup',
            method: 'post',
            shared: shared,
            secret: secret,
            form: {
              access_token: 'xxxx',
            },
          })
          .end(function(err, res) {
            assert.ifError(err)
            assert.equal(res.statusCode, 500, res.text)
            assert.ok(res.body)
            assert.equal(res.body.status, 'GooglePlusError')
            callback()
          })
      })
      .end(done)
    })
  })

  it('should signup using twitter', function(done) {
    utils.credentials.twitter(function(err, credentials) {
      assert.ifError(err)
      if (!credentials) return done()

      txain(['Success', 'UserAlreadyExists'])
      .each(function(status, callback) {
        request(app)
          .api({
            path: '/api/user/twitter/signup',
            method: 'post',
            shared: shared,
            secret: secret,
            form: _.clone(credentials),
          })
          .end(function(err, res) {
            assert.ifError(err)
            assert.equal(res.statusCode, 200, res.text)
            assert.ok(res.body)
            assert.equal(res.body.status, status)
            assert.ok(res.body.id)
            callback()
          })
      })
      .then(function(callback) {
        // should fail with invalid credentials
        request(app)
          .api({
            path: '/api/user/twitter/signup',
            method: 'post',
            shared: shared,
            secret: secret,
            form: {
              oauth_token: 'xxxx',
              oauth_token_secret: 'xxxx',
            },
          })
          .end(function(err, res) {
            assert.ifError(err)
            assert.equal(res.statusCode, 500, res.text)
            assert.ok(res.body)
            assert.equal(res.body.status, 'TwitterError')
            callback()
          })
      })
      .end(done)
    })
  })

})
