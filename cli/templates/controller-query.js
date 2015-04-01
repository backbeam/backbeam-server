
exports.#action# = function(backbeam, req, res, libs, logger) {
  backbeam.select('entity').query('sort by created-at').fetch(100, 0, response)
}
