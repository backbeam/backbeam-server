var request = require('request')
var crypto = require('crypto')
var requiest = require('request').request
var querystring = require('querystring')
var _ = require('underscore')

function urlEncode(str) {
  // see: http://xkr.us/articles/javascript/encode-compare/
  return encodeURIComponent(str).replace(/!/g, '%21')
}

exports.createClient = function(consumerKey, consumerSecret) {
  var client = {
    nonce: function() {
      var time = Date.now()
      return crypto.createHash('sha1').update('#'+time+'#'+Math.random()+'#').digest('hex')
    },
    timestamp: function() {
      return ''+Math.floor(Date.now()/1000)
    },
    request: function(method, baseUrl, params, body, callbackUrl, callback) {
      var authorization = {
        oauth_consumer_key: consumerKey,
        oauth_nonce: this.nonce(),
        oauth_signature_method: 'HMAC-SHA1',
        oauth_timestamp: this.timestamp(),
        oauth_version: '1.0'
      }
      if (this.oauthToken) {
        authorization.oauth_token = this.oauthToken
      }
      if (callbackUrl) {
        authorization.oauth_callback = callbackUrl
      }

      var signatureParams = {}
      _.extend(signatureParams, authorization, params, body)

      var sortedKeys = _.keys(signatureParams).sort()
      var parameterString = ''
      for (var i = 0; i < sortedKeys.length; i++) {
        var key = sortedKeys[i]
        parameterString += '&'+urlEncode(key)+'='+urlEncode(signatureParams[key])
      }
      parameterString = parameterString.substring(1)

      var signatureBaseString = method.toUpperCase()+'&'+urlEncode(baseUrl)+'&'+urlEncode(parameterString)
      var signingKey = null
      if (this.oauthTokenSecret) {
        signingKey = urlEncode(consumerSecret)+'&'+urlEncode(this.oauthTokenSecret)
      } else {
        signingKey = urlEncode(consumerSecret)+'&'
      }

      var signature = crypto.createHmac('sha1', signingKey).update(signatureBaseString).digest('base64')
      authorization.oauth_signature = signature

      var authorizationString = ''
      for (var key in authorization) {
        authorizationString += ', '+urlEncode(key)+'="'+urlEncode(authorization[key])+'"'
      }
      authorizationString = 'OAuth '+authorizationString.substring(2)

      var url = baseUrl
      if (_.size(params) > 0) {
        url += '?'+querystring.stringify(params)
      }
      var options = {
        method: method,
        url: url,
        body: querystring.stringify(body),
        headers: {
          'Authorization': authorizationString,
        }
      }
      request(options, function (err, res, body) {
        callback(err, res, body)
      })
    }
  }
  return client
}