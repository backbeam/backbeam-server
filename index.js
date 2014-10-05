var path = require('path')
var express = require('express')
var _ = require('underscore')

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

  function createRouter() {
    var app = express.Router()
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
      })
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
