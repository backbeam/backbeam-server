var assert = require('assert')
var utils = require('./test-utils')
var txain  = require('txain')
var _ = require('underscore')
var request = utils.request
var app = require('./app')()

var shared = 'foo'
var secret = 'bar'

describe('Test API for push notifications', function() {

  before(function(done) {
    txain(function(callback) {
      utils.migrate(app, callback)
    })
    .then(function(callback) {
      utils.deleteData(app, callback)
    })
    .end(done)
  })

  var token = 'fake-token'
  var gateway = 'apn'

  it('should subscribe the device to two channels', function(done) {
    request(app)
      .api({
        path: '/api/push/subscribe',
        method: 'post',
        shared: shared,
        secret: secret,
        form: {
          'token': token,
          'gateway': gateway,
          'channels': ['foo', 'bar']
        },
      })
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.statusCode, 200, res.text)
        assert.ok(res.body)
        assert.equal(res.body.status, 'Success')
        done()
      })
  })

  it('checks that the device is subscribed', function(done) {
    request(app)
      .api({
        path: '/api/push/subscribed-channels',
        method: 'get',
        shared: shared,
        secret: secret,
        qs: {
          'token': token,
          'gateway': gateway,
        },
      })
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.statusCode, 200, res.text)
        assert.ok(res.body)
        assert.equal(res.body.status, 'Success')
        assert.ok(res.body.channels)
        assert.ok(_.isEqual(res.body.channels, ['foo', 'bar']))
        done()
      })
  })

  it('should unsubscribe the device from one channel', function(done) {
    txain(function(callback) {
      // unsubscribe
      request(app)
        .api({
          path: '/api/push/unsubscribe',
          method: 'post',
          shared: shared,
          secret: secret,
          form: {
            'token': token,
            'gateway': gateway,
            'channels': ['foo']
          },
        })
        .end(function(err, res) {
          assert.ifError(err)
          assert.equal(res.statusCode, 200, res.text)
          assert.ok(res.body)
          assert.equal(res.body.status, 'Success')
          callback()
        })
    })
    .then(function(callback) {
      // get channels again
      request(app)
        .api({
          path: '/api/push/subscribed-channels',
          method: 'get',
          shared: shared,
          secret: secret,
          qs: {
            'token': token,
            'gateway': gateway,
          },
        })
        .end(function(err, res) {
          assert.ifError(err)
          assert.equal(res.statusCode, 200, res.text)
          assert.ok(res.body)
          assert.equal(res.body.status, 'Success')
          assert.ok(res.body.channels)
          assert.ok(_.isEqual(res.body.channels, ['bar']))
          callback()
        })
    })
    .end(done)
  })

  it('should unsubscribe the device from all channels', function(done) {
    txain(function(callback) {
      // unsubscribe
      request(app)
        .api({
          path: '/api/push/unsubscribe-all',
          method: 'post',
          shared: shared,
          secret: secret,
          form: {
            'token': token,
            'gateway': gateway,
          },
        })
        .end(function(err, res) {
          assert.ifError(err)
          assert.equal(res.statusCode, 200, res.text)
          assert.ok(res.body)
          assert.equal(res.body.status, 'Success')
          callback()
        })
    })
    .then(function(callback) {
      // get channels again
      request(app)
        .api({
          path: '/api/push/subscribed-channels',
          method: 'get',
          shared: shared,
          secret: secret,
          qs: {
            'token': token,
            'gateway': gateway,
          },
        })
        .end(function(err, res) {
          assert.ifError(err)
          assert.equal(res.statusCode, 200, res.text)
          assert.ok(res.body)
          assert.equal(res.body.status, 'Success')
          assert.ok(res.body.channels)
          assert.equal(res.body.channels.length, 0)
          callback()
        })
    })
    .end(done)
  })

})
