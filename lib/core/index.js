
module.exports.init = function() {
  var core = {}

  core.db = require('./core-db').init(core)
  core.push = require('./core-push').init(core)
  core.data = require('./core-data').init(core)
  core.query = require('./core-query').init(core)

  return core
}
