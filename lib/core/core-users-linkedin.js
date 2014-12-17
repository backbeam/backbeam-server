var errors = require('node-errors')
var nook = errors.nook
var request = require('request')
var xamel = require('xamel')

exports.shortname = 'ln'

exports.signup = function(credentials, joins, params, callback) {
  var url = 'https://api.linkedin.com/v1/people/~:(id,first-name,last-name,headline)'
  var options = {
    url: url,
    qs: {
      oauth2_access_token: credentials.access_token,
    }
  }

  request.get(options, nook(callback,
    function(response, body) {
      xamel.parse(body, function(err, xml) {
        errors
          .with(callback)
          .on(err)
            .external('LinkedInError: LinkedIn responded with an unexpected format')
          .success(function() {

            var error = xml.$('error/message/text()')
            var identifier = xml.$('person/id/text()')
            errors
              .with(callback)
              .when(error)
                .external('LinkedInError: LinkedIn says: `%s`', error)
              .when(!identifier)
                .external('LinkedInError: LinkedIn responded with an unexpected response')
              .success(function() {
                var args = {
                  identifier: identifier,
                  extra: {
                    id: identifier,
                    first_name: xml.$('person/first-name/text()'),
                    last_name: xml.$('person/last-name/text()'),
                    headline: xml.$('person/headline/text()'),
                  },
                }
                return callback(null, args)
              })
          })
      })
    }
  ))
}
