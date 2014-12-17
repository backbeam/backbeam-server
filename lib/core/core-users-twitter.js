var errors = require('node-errors')
var nook = errors.nook
var oauth = require('../util/oauth')

exports.shortname = 'tw'

exports.signup = function(config, credentials, callback) {
  var url = 'https://api.twitter.com/1.1/account/verify_credentials.json'
  var client = oauth.createClient(config.consumerKey, config.consumerSecret)
  client.oauthToken = credentials.oauth_token
  client.oauthTokenSecret = credentials.oauth_token_secret
  client.request('GET', url, {}, {}, null, nook(callback,
    function(res, body) {
      try {
        var data = JSON.parse(body)
      } catch(e) {
        return callback(errors.external('TwitterError: Twitter responded with an unexpected format'))
      }
      if (data.error) {
        var message = _.isString(data.error) ?
          'Twitter said: '+data.error :
          'Twitter responded with an unknown error'
        return callback(errors.external('TwitterError: `%s`', message))
      }
      if (data.errors) {
        if (_.isArray(data.errors)) {
          var message = data.errors.map(function(error) {
            var msg = error.message
            var code = error.code
            if (msg && code) return msg + ' (code: '+code+')'
            return msg
          }).join('. ')
          return callback(errors.external('TwitterError: Twitter said `%s`', message))
        } else {
          return callback(errors.external('TwitterError: Twitter responded with an unknown error'))
        }
      }
      if (!data.id_str) {
        return callback(errors.external('TwitterError: Twitter responded with an unexpected response'))
      }
      // more friends_count, url, lang, location, time_zone, followers_count, friends_count
      var identifier = data.id_str
      var args = {
        identifier: identifier,
        extra: {
          id          : identifier,
          screen_name : data.screen_name,
          name        : data.name,
          image       : data.profile_image_url,
        },
      }
      return callback(null, args)
    }
  ))
}
