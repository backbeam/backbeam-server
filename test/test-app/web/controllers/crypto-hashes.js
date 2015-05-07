exports.run = function(backbeam, request, response, libs, logger) {
  response.send(backbeam.util.crypto.getHashes().join(","))
}
