exports.run = function(backbeam, request, response, libs, logger) {
  response.send(backbeam.util.crypto.createHash("SHA1").update("").digest("hex"))
}
