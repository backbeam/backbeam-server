var path = require('path')
var express = require('express')
var _ = require('underscore')
var domain = require('domain')
var fs = require('fs')
var txain = require('txain')

function staticProject(options) {
  return function(req, res, next) {
    var core = req.core
    core.project = options
    next()
  }
}

exports.createServer = function(dir) {
  var server = {}
  var managers = {}
  var directory = dir
  var options = null

  server.loadConfiguration = function() {
    var config = path.join(dir, '')
    var conf = fs.readFileSync(path.join(directory, 'config.json'), 'utf8') // TODO: async?
    options = JSON.parse(conf) // TODO: parsing exception

    managers = {}
    managers.project = staticProject(options.project)
    managers.db = require('./lib/core/core-db-sql')(options.db)
    managers.model = require('./lib/core/core-model')(options.model)
    managers.fs = require('./lib/core/core-fs-local')({ root: dir })
    managers.push = require('./lib/core/core-push')(options.push)
    managers.users = require('./lib/core/core-users')(options.users)
    managers.email = require('./lib/core/core-email')(options.email)

    options.reloadConfiguration = function() {
      server.loadConfiguration()
    }
  }

  server.loadConfiguration()

  function domainWrapper() {
    return function(req, res, next) {
      var dmn = domain.create()
      dmn.add(req)
      dmn.add(res)
      res.on('close', function() {
        dmn.dispose()
      })
      dmn.on('error', function(err) {
        next(err)
      })
      dmn.run(next)
    }
  }

  function createRouter() {
    var app = express.Router()
    app.use(domainWrapper())
    app.use(function(req, res, next) {
      var core = {}
      req.core = core
      return next()
    })
    app.use(managers.project)
    app.use(function(req, res, next) {
      var core = req.core
      _.keys(managers).forEach(function(str) {
        if (str === 'project') return
        core[str] = managers[str](core)
      })
      core.config = options
      return next()
    })
    return app
  }

  server.apiResources = function() {
    var app = createRouter()
    require('./lib/api').configure(app)
    return app
  }

  server.webResources = function() {
    var app = createRouter()
    require('./lib/web').configure(app)
    return app
  }

  server.adminResources = function() {
    var app = createRouter()
    require('./lib/admin').configure(app)
    return app
  }

  return server
}
