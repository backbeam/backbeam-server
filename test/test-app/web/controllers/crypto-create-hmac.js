exports.run = function(backbeam, request, response, libs, logger) {
  response.send(backbeam.util.crypto.createHmac("SHA1", "key").update("").digest("hex"))
}
