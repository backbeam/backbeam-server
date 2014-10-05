module.exports.configure = function(app, server) {
  
  app.post('/migrate', function(req, res, next) {
    var core = req.core
    core.db.migrateSchema(function(err, commands) {
      if (err) return next(err)
      res.end(commands.join('\n'))
    })
  })

}
