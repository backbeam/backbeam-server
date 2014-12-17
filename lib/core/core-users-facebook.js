var errors = require('node-errors')
var nook = errors.nook
var request = require('request')

exports.shortname = 'fb'

exports.signup = function(config, credentials, callback) {
  var options = {
    url: 'https://graph.facebook.com/me',
    qs: {
      access_token: credentials.access_token,
    },
  }
  request.get(options, nook(callback,
    function(response, body) {
      try {
        var data = JSON.parse(body)
      } catch(e) {
        return callback(errors.external('FacebookError: Facebook responded with an unexpected format'))
      }
      if (data.error) {
        // example: {"error":{"message":"Invalid OAuth access token.","type":"OAuthException","code":190}}
        var message = data.error.message+' (type: '+data.error.type+', code: '+data.error.code+')'
        return callback(errors.external('FacebookError: Facebook said: `%s`', message))
      }
      if (!data.id) {
        return callback(errors.external('FacebookError: Facebook responded with an unexpected response'))
      }
      var args = {
        identifier: data.id,
        extra: {
          id: data.id,
          name: data.name,
          link: data.link,
        },
      }
      return callback(null, args)
    }
  ))
}

