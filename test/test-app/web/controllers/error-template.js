exports.run = function(backbeam, request, response, libs, logger) {
  var opts = {
    foo: 'bar'
  }
  response.render('error.html', opts, true)
}
