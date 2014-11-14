var path = require('path')
var express = require('express')
var _ = require('underscore')
var domain = require('domain')

function identity(options) {
  return function(core) {
    return options
  }
}

function staticProject(options) {
  return function(req, res, next) {
    var core = req.core
    core.project = options
    next()
  }
}

var implementations = {
  'project': {
    'static': staticProject,
  },
  'db': {
    'redis': identity,
    'sql': require('./lib/core/core-db-sql'),
  },
  'model': {
    'static': require('./lib/core/core-model'),
  },
  'fs': {
    'local': require('./lib/core/core-fs-local'),
  },
}

exports.createServer = function(options) {
  var server = {}
  var managers = {}

  _.keys(implementations).forEach(function(str) {
    var opts = options[str]
    if (!opts) {
      // TODO
    }
    var manager = implementations[str][opts.manager]
    managers[str] = manager(opts)
  })

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
      _.keys(implementations).forEach(function(str) {
        if (str === 'project') return
        core[str] = managers[str](core)
        core.push = require('./lib/core/core-push')(options)(core)
        core.users = require('./lib/core/core-users')(options)(core)
        core.email = require('./lib/core/core-email')(options)(core)
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
