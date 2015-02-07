var path = require('path')
var express = require('express')
var _ = require('underscore')
var domain = require('domain')
var fs = require('fs')
var txain = require('txain')

require('node-errors').defineErrorType('external')

function staticProject(options) {
  return function(req, res, next) {
    var core = req.core
    core.project = options
    next()
  }
}

exports.createServer = function(dir, extend) {
  var server = {}
  var managers = {}
  var directory = dir
  var options = null

  function configFilePath() {
    var config = path.join(dir, '')
    var sufix = process.env.NODE_ENV ? '-'+process.env.NODE_ENV : ''
    return path.join(directory, 'config'+sufix+'.json')
  }

  server.loadConfiguration = function() {
    var conf = fs.readFileSync(configFilePath(), 'utf8') // TODO: async?
    options = JSON.parse(conf) // TODO: parsing exception
    if (extend) {
      options = _.extend(options, extend)
    }

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
    
    options.saveConfiguration = function(callback) {
      fs.writeFile(configFilePath(), JSON.stringify(options, null, 2), 'utf8', callback)
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

exports.createExpressApp = function(options) {

  _.defaults(options, {
    directory: process.cwd(),
    adminPath: '/admin',
    apiPath: '/api',
  })

  var app = express()
  var server = exports.createServer(options.directory)
  app.disable('x-powered-by')
  app.use(require('body-parser').urlencoded({ extended: true }))
  app.use(require('multer')({ dest: './uploads/'}))
  app.use(require('cookie-parser')('secret')) // TODO
  app.use(options.adminPath, server.adminResources())
  app.use(options.apiPath, server.apiResources())
  app.use(server.webResources())
  return app
}
