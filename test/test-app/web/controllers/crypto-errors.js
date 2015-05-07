exports.run = function(backbeam, request, response, libs, logger) {
  var messages = []

  try {
    backbeam.util.crypto.createHash().update("").digest("hex")
  } catch(e) {
    messages.push(e.message)
  }

  try {
    backbeam.util.crypto.createHash("").update("").digest("hex")
  } catch(e) {
    messages.push(e.message)
  }

  try {
    backbeam.util.crypto.createHmac().update("").digest("hex")
  } catch(e) {
    messages.push(e.message)
  }

  try {
    backbeam.util.crypto.createHmac("foo").update("").digest("hex")
  } catch(e) {
    messages.push(e.message)
  }

  response.json(messages)
}
