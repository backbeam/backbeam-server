exports.run = function(backbeam, request, response, libs, logger) {
  response.render('index.html', {count: 1}, true)
}
