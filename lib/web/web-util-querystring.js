var querystring = require('querystring')

module.exports = function(core, sandbox, req, res, private) {

  var util = sandbox.backbeam.util = sandbox.backbeam.util || {}

  util.querystring = {}

  util.querystring.stringify = function() {
    return querystring.stringify.apply(this, arguments)
  }

  util.querystring.parse = function() {
    return querystring.parse.apply(this, arguments)
  }

}
