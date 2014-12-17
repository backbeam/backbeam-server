var crypto = require('crypto')
var security = require('../lib/util/security')
var assert = require('assert')
var path = require('path')
var errors = require('node-errors')
var nook = errors.nook
var request = require('request')
var _ = require('underscore')

function sign(options, shared, secret) {
  var shared = options.shared
  var secret = options.secret
  var data = options.form || options.qs || {}
  data.key = shared
  data.time = Date.now().toString()
  data.nonce = crypto
    .createHash('sha1')
    .update(data.time+':'+Math.random())
    .digest('hex')
  if (options.method === 'del') {
    data.method = 'DELETE'
  } else {
    data.method = (options.method || 'GET').toUpperCase()
  }
  data.path = options.path.substring('/api'.length)
  var signature = security.signData(data, shared, secret)
  data.signature = signature
  delete data.method
  delete data.path
  return data
}

exports.request = function(app) {
  var request = require('supertest')(app)

  request.api = function(options) {
    var data = sign(options)
    var form = options.form
    var modify = options.modify
    modify && modify(data)

    request = request[options.method](options.path)
    request = request.accept('application/json')
    if (options.form) {
      request = request.type('form')
      request = request.send(data)
    } else {
      request = request.query(data)
    }
    return request
  }

  return request
}

exports.deleteData = function(app, done) {
  var request = require('supertest')

  request(app)
    .post('/admin/delete-data')
    .end(function(err, res) {
      assert.ifError(err)
      assert.equal(res.status, 200)
      done()
    })
}

exports.migrate = function(app, done) {
  var request = require('supertest')

  request(app)
    .post('/admin/migrate')
    .end(function(err, res) {
      assert.ifError(err)
      assert.equal(res.status, 200)
      done()
    })
}

exports.remoteServicesConfig = function() {
  try {
    return require(path.join(process.env.HOME, 'backbeam-test-remote-services'))
  } catch (err) {
    return null
  }
}

exports.credentials = {}

exports.credentials.facebook = function(callback) {
  var config = exports.remoteServicesConfig()
  var facebook = config
              && config.authentication
              && config.authentication.facebook
  if (!facebook) return callback(null, null)

  var url = [
    'https://graph.facebook.com/',
    facebook.applicationId,
    '/accounts/test-users'
  ].join('')

  // get a fresh access_token
  var options = {
    url: url,
    qs: {
      access_token: facebook.appAccessToken,
    },
  }
  request(options, nook(callback,
    function(res, body) {
      var data = JSON.parse(body)
      var credentials = {
        access_token: data.data[0].access_token
      }
      return callback(null, credentials)
    }
  ))
}

exports.credentials.google = function(callback) {
  var config = exports.remoteServicesConfig()
  var google = config
            && config.authentication
            && config.authentication.googleplus
  if (!google) return callback(null, null)
  var GoogleTokenProvider = require('refresh-token').GoogleTokenProvider

  var tokenProvider = new GoogleTokenProvider({
    refresh_token: google.refreshToken,
    client_id: google.clientId,
    client_secret: google.clientSecret,
  })

  tokenProvider.getToken(nook(callback,
    function(access_token) {
      var credentials = {
        access_token: access_token,
      }
      return callback(null, credentials)
    }
  ))
}

exports.credentials.twitter = function(callback) {
  var config = exports.remoteServicesConfig()
  var twittr = config
            && config.authentication
            && config.authentication.twitter
  if (!twittr) return callback(null, null)

  var credentials = {
    oauth_token: twittr.oauthToken,
    oauth_token_secret: twittr.oauthSecret
  }
  return callback(null, credentials)

}
