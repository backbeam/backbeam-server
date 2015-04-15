exports.run = function(backbeam, request, response, libs, logger) {
  var item = backbeam.empty('item')
  item.ssave(response)
}
