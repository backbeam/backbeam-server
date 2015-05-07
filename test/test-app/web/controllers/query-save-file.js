exports.run = function(backbeam, request, response, libs, logger) {
  var picture = request.files.picture
  var file = backbeam.empty('file')

  file.saveFile(picture, function(err, obj) {
    if (err) throw new Error(err)
    response.json({ id: obj.id() })
  })
}
