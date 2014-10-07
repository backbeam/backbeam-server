var utils = require('./api-utils')
var errors = require('node-errors')
var nook = errors.nook
var _ = require('underscore')

function array(val) {
  if (_.isString(val)) return [val]
  return val
}

function subscribe(req, res, next) {
  var core = req.core
  var token = req.body.token
  var gateway = req.body.gateway
  var channels = array(req.body.channels)

  errors.with(next)
    .when(!token || !gateway || !channels)
      .request('InvalidParameters: Missing `token`, `gateway` or `channels` parameters')
    .success(function() {
      core.push.subscribe(gateway, token, channels, nook(next,
        function() {
          res.jsonp({
            status: 'Success'
          })
        })
      )
    })
}

function unsubscribe(req, res, next) {
  var core = req.core
  var token = req.body.token
  var gateway = req.body.gateway
  var channels = array(req.body.channels)

  errors.with(next)
    .when(!token || !gateway || !channels)
      .request('InvalidParameters: Missing `token`, `gateway` or `channels` parameters')
    .success(function() {
      core.push.unsubscribe(gateway, token, channels, nook(next,
        function() {
          res.jsonp({
            status: 'Success'
          })
        })
      )
    })
}

function subscribedChannels(req, res, next) {
  var core = req.core
  var token = req.query.token
  var gateway = req.query.gateway

  errors.with(next)
    .when(!token || !gateway)
      .request('InvalidParameters: Missing `token` or `gateway` parameter')
    .success(function() {
      core.push.subscribedChannels(gateway, token, nook(next,
        function(channels) {
          res.jsonp({
            status: 'Success',
            channels: channels,
          })
        })
      )
    })
}

function unsubscribeAll(req, res, next) {
  var core = req.core
  var token = req.body.token
  var gateway = req.body.gateway

  errors.with(next)
    .when(!token || !gateway)
      .request('InvalidParameters: Missing `token` or `gateway` parameter')
    .success(function() {
      core.push.unsubscribeAll(gateway, token, nook(next,
        function() {
          res.jsonp({
            status: 'Success'
          })
        })
      )
    })
}

function send(req, res, next) {
  var core = req.core
}

module.exports.configure = function(app, middleware) {

  app.post('/push/subscribe',
    middleware.requiresSignature(true),
    subscribe)

  app.post('/push/unsubscribe',
    middleware.requiresSignature(true),
    unsubscribe)

  app.get('/push/subscribed-channels',
    middleware.requiresSignature(true),
    subscribedChannels)

  app.post('/push/unsubscribe-all',
    middleware.requiresSignature(true),
    unsubscribeAll)

  app.post('/push/send',
    middleware.requiresSignature(true),
    send)

}
