var path = require('path')
var express = require('express')
var _ = require('underscore')
var domain = require('domain')
var fs = require('fs')
var txain = require('txain')

require('node-errors').defineErrorType('external')

exports.createServer = function(dir, extend) {
  var server = {}
  var core = {}
  var directory = dir
  var options = null

  function configFilePath() {
    var config = path.join(dir, '')
    var sufix = process.env.NODE_ENV ? '-'+process.env.NODE_ENV : ''
    return path.join(directory, 'config'+sufix+'.json')
  }

  function modelFilePath() {
    return path.join(dir, 'model.json')
  }

  server.loadConfiguration = function() {
    var conf = fs.readFileSync(configFilePath(), 'utf8') // TODO: async?
    var model = fs.readFileSync(modelFilePath(), 'utf8') // TODO: async?
    options = JSON.parse(conf) // TODO: parsing exception
    options.model = JSON.parse(model)
    if (extend) {
      options = _.extend(options, extend)
    }
    if (options.fs && options.fs.storage) {
      options.fs.storage = path.resolve(dir, options.fs.storage)
    }

    core = {}
    core.project = options.project
    core.db = require('./lib/core/core-db-sql')(options.db)(core)
    core.model = require('./lib/core/core-model')(options.model)(core)
    core.fs = require('./lib/core/core-fs-local')({ root: dir })(core)
    core.push = require('./lib/core/core-push')(options.push)(core)
    core.users = require('./lib/core/core-users')(options.users)(core)
    core.email = require('./lib/core/core-email')(options.email)(core)
    core.config = options
    core.env = process.env.NODE_ENV || ''

    core.isDevelopment = function() {
      return core.env.indexOf('dev') === 0
    }

    core.isProduction = function() {
      return core.env.indexOf('prod') === 0
    }

    core.isTest = function() {
      return core.env.indexOf('test') === 0
    }

    options.reloadConfiguration = function() {
      server.loadConfiguration()
    }
    
    options.saveConfiguration = function(callback) {
      var noModel = _.omit(options, 'model')
      txain(function(callback) {
        fs.writeFile(configFilePath(), JSON.stringify(noModel, null, 2), 'utf8', callback)
      })
      .then(function(callback) {
        fs.writeFile(modelFilePath(), JSON.stringify(options.model, null, 2), 'utf8', callback)
      })
      .end(callback)
    }
  }

  server.loadConfiguration()

  function domainWrapper() {
    return function(req, res, next) {
      var dmn = domain.create()
      dmn.add(req)
      dmn.add(res)
      dmn.on('error', next)
      dmn.run(next)
    }
  }

  function createRouter() {
    var app = express.Router()
    if (!core.isTest()) {
      // testing with supertest hangs the proces here
      // so we avoid using domains when running tests
      app.use(domainWrapper())
    }
    app.use(function(req, res, next) {
      req.core = core
      res.on('finish', function() {
        delete req.core
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

exports.createExpressApp = function(options) {
  var app = express()
  exports.configureExpressApp(app, options)
  return app
}

exports.configureExpressApp = function(app, options) {
  _.defaults(options, {
    directory: process.cwd(),
    adminPath: '/admin',
    apiPath: '/api',
  })

  var server = exports.createServer(options.directory)
  app.disable('x-powered-by')
  app.use(require('body-parser').urlencoded({ extended: true }))
  app.use(require('multer')({ dest: './uploads/'}))
  app.use(require('cookie-parser')('secret')) // TODO
  app.use(options.adminPath, server.adminResources())
  app.use(options.apiPath, server.apiResources())
  app.use(server.webResources())
}
