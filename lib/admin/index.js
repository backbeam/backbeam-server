var errors = require('node-errors')
var nook = errors.nook
var path = require('path')
var jade = require('jade')
var serveStatic = require('serve-static')
var txain = require('txain')
var methodOverride = require('method-override')
var fs = require('fs')
var _ = require('underscore')
var _s = require('underscore.string')
var dateutils = require('./date-utils')

module.exports.configure = function(app, server) {
  
  var middleware = {}
  var utils = {}

  middleware.sanitizePagination = function(req, res, next) {
    req.query.offset = Math.max(+req.query.offset || 0, 0)
    req.query.limit = Math.max(Math.min(+req.query.limit || 100, 100), 0)
    next()
  }

  utils.render = function(req, res, filename, options) {
    var i = 0
    options.id = function() {
      return ++i
    }
    options.req = req
    options.core = req.core
    options._ = _
    options._s = _s
    options.dateutils = dateutils
    options.nolink = 'javascript:void(0)'
    options.querystring = require('querystring')
    var fullpath = path.join(__dirname, 'views', filename)
    var html = jade.renderFile(fullpath, options)
    res.contentType('text/html')
    res.send(html)
  }

  app.use(serveStatic(path.join(__dirname, 'public'), {
    maxAge: 24 * 60 * 60 * 1000,
  }))

  app.use(methodOverride('_method'))

  var files = fs.readdirSync(__dirname)
  files.forEach(function(file) {
    if (file.indexOf('admin-') === 0) {
      require('./'+file).configure(app, server, middleware, utils)
    }
  })

  app.use(function(err, req, res, next) {
    res.status(500) // TODO: depending on err
    utils.render(req, res, 'error.jade', {
      err: err,
    })
  })

}
