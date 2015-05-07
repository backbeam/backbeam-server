exports.run = function(backbeam, request, response, libs, logger) {
  response.json(backbeam.util.querystring.parse('foo=bar&baz=bax'))
}
