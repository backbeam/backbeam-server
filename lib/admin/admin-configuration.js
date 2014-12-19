var errors = require('node-errors')
var nook = errors.nook

module.exports.configure = function(app, middleware, utils) {
  
  // view and reload configuration

  app.get('/configuration/view', function(req, res, next) {
    utils.render(req, res, 'configuration-view.jade', {})
  })

  app.post('/configuration/reload', function(req, res, next) {
    var core = req.core
    core.config.reloadConfiguration()
    res.redirect(req.baseUrl+'/configuration/view')
  })

  // view changes and update database schema

  app.get('/configuration/migrate', function(req, res, next) {
    var core = req.core
    if (req.query.refresh === 'yes') {
      core.config.reloadConfiguration()
      return res.redirect(req.baseUrl+'/configuration/migrate')
    }
    core.db.migrateSchema(false, nook(next,
      function(commands) {
        utils.render(req, res, 'configuration-migrate.jade', {
          commands: commands,
        })
      })
    )
  })

  app.post('/configuration/migrate', function(req, res, next) {
    var core = req.core
    core.db.migrateSchema(true, nook(next,
      function(commands) {
        res.redirect(req.baseUrl+'/configuration/migrate')
      })
    )
  })

  // --

  app.get('/configuration/general', function(req, res, next) {
    utils.render(req, res, 'configuration-general.jade', {})
  })

  app.get('/configuration/authentication', function(req, res, next) {
    utils.render(req, res, 'configuration-authentication.jade', {})
  })

  app.get('/configuration/push', function(req, res, next) {
    utils.render(req, res, 'configuration-push.jade', {})
  })

  app.get('/configuration/email', function(req, res, next) {
    utils.render(req, res, 'configuration-email.jade', {})
  })

}
