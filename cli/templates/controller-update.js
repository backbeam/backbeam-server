
exports.#action# = function(backbeam, req, res, libs, logger) {
  backbeam.read('entity', request.params.id, function(err, obj) {
    if (err) throw new Error(err)
    obj.set('field', request.body.field)
    obj.save(response)
  })
}
