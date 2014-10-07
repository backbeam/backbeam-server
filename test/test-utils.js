var crypto = require('crypto')
var security = require('../lib/util/security')
var assert = require('assert')

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
    request = request.set('Accept', 'application/json')
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
