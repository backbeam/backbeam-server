var crypto = require('crypto')
var bcrypt = require('bcrypt')
var _ = require('underscore')
var querystring = require('querystring')

exports.hashPassword = function(pass, callback) {
  var hash = crypto.createHmac('sha1', localsalt)
    .update(pass)
    .digest('hex')
  bcrypt.genSalt(times, function(err, salt) {
    if (err) { return callback(err, null) }
    bcrypt.hash(hash, salt, callback)
  })
}

exports.verifyPassword = function(pass, stored, callback) {
  var hash = crypto
    .createHmac('sha1', localsalt)
    .update(pass)
    .digest('hex')
  bcrypt.compare(hash, stored, callback)
}

exports.hmacSha1 = function(secret, message) {
  return crypto
    .createHmac('sha1', new Buffer(secret, 'utf8'))
    .update(new Buffer(message, 'utf8'))
    .digest('base64')
}

exports.signData = function(data, shared, secret) {
  var tokens = []
  var keys = _.keys(data).sort()
  for (var j = 0; j < keys.length; j++) {
    var key = keys[j]
    if (!key || key === '_' || key === 'callback' || key === '_method') continue
    var value = data[key]
    if (_.isArray(value)) {
      value = value.slice()
      value.sort()
      for (var i = 0; i < value.length; i++) {
        tokens.push(key+'='+value[i])
      }
    } else if (_.isString(value) || _.isNumber(value)) {
      tokens.push(key+'='+value)
    }
  }
  return exports.hmacSha1(secret, tokens.join('&'))
}

// http://jsperf.com/constant-time-string-comparison
exports.constantTimeStringCompare = function(a, b) {
  with({});

  var aLength = a.length,
      bLength = b.length,
      match = aLength === bLength ? 1 : 0,
      i = aLength;

  while ( i-- ) {
    var aChar = a.charCodeAt(i % aLength),
        bChar = b.charCodeAt(i % bLength),
        equ   = aChar === bChar,
        asInt = equ ? 1 : 0;
    match = match & equ;
  }
  
  return match === 1;
}
