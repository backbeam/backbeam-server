exports.run = function(backbeam, request, response, libs, logger) {
  response.send(backbeam.util.querystring.stringify({ foo:'bar', baz:'bax' }))
}
