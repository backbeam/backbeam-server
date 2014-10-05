
module.exports.configure = function(app) {

  require('./api-data').configure(app)
  require('./api-push').configure(app)
  require('./api-query').configure(app)

}
