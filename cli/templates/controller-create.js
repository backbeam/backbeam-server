
exports.#action# = function(backbeam, req, res, libs, logger) {
  var obj = backbeam.empty('entity')
  obj.set('field', request.body.field)
  obj.save(response)
}
