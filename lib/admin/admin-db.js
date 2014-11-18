var errors = require('node-errors')
var nook = errors.nook

module.exports.configure = function(app, server, middleware, utils) {
  
  app.post('/migrate', function(req, res, next) {
    var core = req.core
    core.db.migrateSchema(true, nook(next,
      function(commands) {
        res.end(commands.join('\n'))
      })
    )
  })

  app.post('/delete-data', function(req, res, next) {
    var core = req.core
    core.db.deleteData(nook(next,
      function(commands) {
        res.end()
      })
    )
  })

}
