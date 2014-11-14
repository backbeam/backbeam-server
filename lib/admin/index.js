var errors = require('node-errors')
var nook = errors.nook
var path = require('path')
var jade = require('jade')
var serveStatic = require('serve-static')
var txain = require('txain')
var fs = require('fs')
var _ = require('underscore')
var _s = require('underscore.string')

module.exports.configure = function(app, server) {
  
  var middleware = {}
  var utils = {}

  utils.render = function(req, res, filename, options) {
    options.req = req
    options.core = req.core
    options._ = _
    options._s = _s
    var fullpath = path.join(__dirname, 'views', filename)
    var html = jade.renderFile(fullpath, options)
    res.contentType('text/html')
    res.send(html)
  }

  app.use(serveStatic(path.join(__dirname, 'public'), {
    maxAge: 24 * 60 * 60 * 1000,
  }))

  var files = fs.readdirSync(__dirname)
  files.forEach(function(file) {
    if (file.indexOf('admin-') === 0) {
      require('./'+file).configure(app, server, middleware, utils)
    }
  })

  app.use(function(err, req, res, next) {
    utils.render(req, res, 'error.jade', {
      err: err,
    })
  })

}
