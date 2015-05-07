var querystring = require('querystring')

module.exports = function(core, req, res, private) {

  var backbeam = private.backbeam
  var util = backbeam.util = backbeam.util || {}

  util.querystring = {}

  util.querystring.stringify = function() {
    return querystring.stringify.apply(this, arguments)
  }

  util.querystring.parse = function() {
    return querystring.parse.apply(this, arguments)
  }

}
