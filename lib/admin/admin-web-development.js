var path = require('path')
var errors = require('node-errors')
var nook = errors.nook
var txain = require('txain')
var _ = require('underscore')
var fs = require('fs')
var humanize = require('humanize')
var mime = require('mime')

module.exports.configure = function(app, server, middleware, utils) {

  function xhronly(req, res, next) {
    if (!req.xhr) {
      return res.redirect(req.baseUrl+'/web')
    }
    next()
  }

  app.get('/web', function(req, res, next) {
    utils.render(req, res, 'web.jade', {})
  })

  app.get('/web/assets', xhronly, function(req, res, next) {
    var core = req.core
    var dir = path.join(core.fs.root, 'web', 'assets')
    if (req.query.path) {
      dir = path.join(dir, req.query.path)
    }
    // TODO: check path for security
    txain(fs.readdir, dir)
    .map(function(file, callback) {
      fs.stat(path.join(dir, file), nook(callback,
        function(stat) {
          callback(null, {
            name: file,
            isDirectory: stat.isDirectory(),
            size: stat.size,
            sizestr: humanize.filesize(stat.size),
            mime: stat.isFile() ? mime.lookup(file) : null,
            ctime: stat.ctime,
          })
        })
      )
    })
    .end(nook(next,
      function(files) {
        utils.render(req, res, 'web-assets.jade', {
          files: files,
        })
      })
    )
  })

  app.get('/web/playground', xhronly, function(req, res, next) {
    utils.render(req, res, 'web-playground.jade', {})
  })

  app.get('/web/overview', xhronly, function(req, res, next) {
    var core = req.core
    var options = {}
    txain(function(callback) {
      var filepath = path.join('web', 'controllers', 'routes.json')
      core.fs.readFileAsJSON(filepath, callback)
    })
    .then(function(routes, callback) {
      options.routes = routes
      var fullpath = path.join(core.fs.root, 'web', 'views')
      fs.readdir(fullpath, callback)
    })
    .then(function(views, callback) {
      options.views = views
      var fullpath = path.join(core.fs.root, 'web', 'libs')
      fs.readdir(fullpath, callback)
    })
    .then(function(libs, callback) {
      options.libs = libs
      callback()
    })
    .end(nook(next,
      function() {
        utils.render(req, res, 'web-overview.jade', options)
      })
    )
  })
  
  app.get('/web/controller/:filename', xhronly, function(req, res, next) {
    var core = req.core
    var options = {}
    txain(function(callback) {
      var filepath = path.join('web', 'controllers', 'routes.json')
      core.fs.readFileAsJSON(filepath, callback)
    })
    .then(function(routes, callback) {
      options.route = _.findWhere(routes, {
        file: req.params.filename
      })
      var filepath = path.join('web', 'controllers', req.params.filename)
      core.fs.readFileAsString(filepath, callback)
    })
    .end(nook(next,
      function(source) {
        options.source = source
        utils.render(req, res, 'web-controller.jade', options)
      })
    )
  })

  app.get('/web/view/:filename', xhronly, function(req, res, next) {
    var core = req.core
    var options = {}
    txain(function(callback) {
      var filepath = path.join('web', 'views', req.params.filename)
      core.fs.readFileAsString(filepath, callback)
    })
    .end(nook(next,
      function(source) {
        options.source = source
        utils.render(req, res, 'web-view.jade', options)
      })
    )
  })

  app.get('/web/lib/:filename', xhronly, function(req, res, next) {
    var core = req.core
    var options = {}
    txain(function(callback) {
      var filepath = path.join('web', 'libs', req.params.filename)
      core.fs.readFileAsString(filepath, callback)
    })
    .end(nook(next,
      function(source) {
        options.source = source
        utils.render(req, res, 'web-lib.jade', options)
      })
    )
  })

  app.get('/web/assets', xhronly, function(req, res, next) {
    var core = req.core
    var dir = req.query.dir
    var options = {}
    txain(function(callback) {
      var fullpath = path.join('web', 'assets', dir)
      fs.readdir(fullpath, callback)
    })
    .end(nook(next,
      function(files) {
        options.files = files
        utils.render(req, res, 'web-assets.jade', options)
      })
    )
  })

}
