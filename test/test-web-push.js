var assert = require('assert')
var request = require('supertest')
var app = require('./app')()
var _ = require('underscore')
var txain = require('txain')
var utils = require('./test-utils')

describe('Test web methods for push notifications', function() {

  before(function(done) {
    txain(function(callback) {
      utils.migrate(app, callback)
    })
    .then(function(callback) {
      utils.deleteData(app, callback)
    })
    .end(done)
  })

  it('should subscribe the device to two channels', function(done) {
    request(app)
      .post('/push/subscribe')
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.status, 200)
        assert.ok(res.body)
        assert.equal(res.body.status, 'Success')
        done()
      })
  })

  it('checks that the device is subscribed', function(done) {
    request(app)
      .post('/push/subscribed-channels')
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.status, 200)
        assert.ok(res.body)
        assert.equal(res.body.status, 'Success')
        assert.ok(res.body.channels)
        assert.ok(_.isEqual(res.body.channels, ['foo', 'bar']))
        done()
      })
  })

  it('should unsubscribe from one channel', function(done) {
    request(app)
      .post('/push/unsubscribe')
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.status, 200)
        assert.ok(res.body)
        assert.equal(res.body.status, 'Success')
        done()
      })
  })

  it('should unsubscribe the device from all channel', function(done) {
    txain(function(callback) {
      request(app)
        .post('/push/unsubscribe-all')
        .end(function(err, res) {
          assert.ifError(err)
          assert.equal(res.status, 200)
          assert.ok(res.body)
          assert.equal(res.body.status, 'Success')
          callback()
        })
    })
    .then(function(callback) {
      request(app)
        .post('/push/subscribed-channels')
        .end(function(err, res) {
          assert.ifError(err)
          assert.equal(res.status, 200)
          assert.ok(res.body)
          assert.equal(res.body.status, 'Success')
          assert.ok(res.body.channels)
          assert.ok(_.isEqual(res.body.channels, []))
          callback()
        })
    })
    .end(done)
  })

})
