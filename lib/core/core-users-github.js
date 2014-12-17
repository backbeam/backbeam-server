var errors = require('node-errors')
var nook = errors.nook
var request = require('request')

exports.signup = function(config, credentials, callback) {
  var options = {
    url: 'https://api.github.com/user',
    qs: {
      access_token: credentials.access_token,
    },
    headers: {
      'User-Agent': 'Backbeam',
    }
  }
  request.get(options, nook(callback,
    function(response, body) {
      try {
        var data = JSON.parse(body)
      } catch (e) {
        return callback(errors.external('GitHubError: GitHub responded with an unexpected format'))
      }
      var message = data.message
      var identifier = data.id
      errors
        .with(callback)
        .when(message)
          .external('GitHubError: GitHub says: `%s`', message)
        .when(!identifier)
          .external('GitHubError: GitHub responded with an unexpected response')
        .success(function() {
          var args = {
            provider: 'gh',
            identifier: identifier,
            extra: {
              id: identifier,
              name: data.name,
              login: data.login,
            },
          }
          return callback(null, args)
        })
    }
  ))
}

