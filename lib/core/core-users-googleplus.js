var errors = require('node-errors')
var nook = errors.nook
var request = require('request')

exports.shortname = 'gp'

exports.signup = function(config, credentials, callback) {
  var options = {
    url: 'https://www.googleapis.com/plus/v1/people/me',
    qs: {
      access_token: credentials.access_token,
    }
  }

  // see https://developers.google.com/+/api/
  request.get(options, nook(callback,
    function(response, body) {
      try {
        var data = JSON.parse(body)
      } catch(e) {
        return callback(errors.external('GooglePlusError: Google Plus responded with an unexpected format'))
      }
      if (data.error) {
        // Example error response
        // {
        //   "error": {
        //     "errors": [
        //       {
        //         "domain": "usageLimits",
        //         "reason": "accessNotConfigured",
        //         "message": "Access Not Configured"
        //       }
        //     ],
        //     "code": 403,
        //     "message": "Access Not Configured"
        //   }
        // }
        var message = data.error.message
        var code = data.error.code
        if (message && code) {
          message += ' (code: '+code+')'
        }
        if (message) {
          return callback(errors.external('GooglePlusError: Google said `%s`', message))
        } else {
          return callback(errors.external('GooglePlusError: Google Plus responded with an unknown error'))
        }
      }
      if (!data.id) {
        return callback(errors.external('GooglePlusError: Google Plus responded with an unexpected response'))
      }
      var args = {
        identifier: data.id,
        extra: {
          id: data.id,
          name: data.displayName,
          image: data.image && data.image.url,
        },
      }
      return callback(null, args)
    }
  ))
}
