var path = require('path')
var errors = require('node-errors')
var nook = errors.nook
var txain = require('txain')
var _ = require('underscore')
var humanize = require('humanize')
var mime = require('mime')
var request = require('request')
var http = require('http')
var _ = require('underscore')

module.exports.configure = function(app, middleware, utils) {

  function xhronly(req, res, next) {
    if (!req.xhr) {
      return res.redirect(req.baseUrl+'/web')
    }
    next()
  }

  function index(req, res, next) {
    utils.render(req, res, 'web.jade', {})
  }

  function overview(req, res, next) {
    var core = req.core
    var options = {}
    txain(function(callback) {
      var filepath = path.join('web', 'controllers', 'routes.json')
      core.fs.readFileAsJSON(filepath, callback)
    })
    .then(function(routes, callback) {
      options.routes = routes
      var fullpath = path.join('web', 'views')
      core.fs.readdir(fullpath, callback)
    })
    .then(function(views, callback) {
      options.views = views
      var fullpath = path.join('web', 'libs')
      core.fs.readdir(fullpath, callback)
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
  }

  function assets(req, res, next) {
    var core = req.core
    var dir = path.join('web', 'assets')
    if (req.query.path) {
      dir = path.join(dir, req.query.path)
    }
    txain(core.fs.readdir, dir)
    .map(function(file, callback) {
      core.fs.stat(path.join(dir, file), nook(callback,
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
  }

  function showPlayground(req, res, next) {
    utils.render(req, res, 'web-playground.jade', {})
  }

  function playground(req, res, next) {
    var version = req.params.version
    var path = req.body.path || '/'
    var method = req.body.method || 'GET'
    var base = req.body.base

    var core = req.core

    function entries(prefix) {
      var obj = {}
      var keys = req.body[prefix+'-key']
      if (!keys) return obj
      if (typeof keys === 'string') keys = [keys]
      var values = req.body[prefix+'-value']
      if (typeof values === 'string') values = [values]
      for (var i = 0; i < keys.length && i < values.length; i++) {
        var key = keys[i]
        var val = obj[key]
        if (typeof val === 'undefined') {
          obj[key] = values[i]
        } else if (_.isArray(val)) {
          val.push(values[i])
        } else {
          var arr = [val]
          obj[key] = arr
          arr.push(values[i])
        }
      }
      return obj
    }

    var headers = entries('header')
    var qs = entries('query')
    var form = entries('form')

    // TODO: user-id
    // var user = req.body['playground-user-id']
    // if (user) {
    //   core.users.sessionCode({ _id: user}, null, function(err, output) {
    //     if (err) ...
    //     headers['x-backbeam-auth'] = output
    //     doRequest()
    //   })
    // } else {
    //   doRequest()
    // }

    doRequest()

    function doRequest() {
      var url = require('url').resolve(base, path)
      var options = {
        url: url,
        method: method,
        headers: headers,
        form: _.size(form) > 0 ? form : void 0, // prevent application/x-www-form-urlencoded header if no form params set
        qs: qs,
      }

      var modes = {
        'application/json': 'javascript',
        'text/javascript': 'javascript',
        'text/css': 'css',
        'text/html': 'html',
        'application/xml': 'xml',
        'text/xml': 'xml',
      }

      function findMode(contentType) {
        if (!contentType) return 'text'
        _.keys(modes).forEach(function(key) {
          // TODO: there could be whitespaces between the mime type and the semicolon?
          if (contentType === key || contentType.indexOf(key+';') === 0) {
            return modes[key]
          }
        })
        return 'text'
      }

      request(options, function(err, response, body) {
        if (err) {
          return res.json({
            headers: {},
            status: 'Request error ('+err+')',
            body: '',
            mode: '',
            time: new Date().toISOString(),
          })
        }
        res.json({
          headers: response.headers,
          status: response.statusCode+' '+http.STATUS_CODES[response.statusCode],
          body: body,
          mode: findMode(response.headers['content-type']),
          time: new Date().toISOString(),
        })
      })
    }
  }

  function showController(req, res, next) {
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
  }

  function editController(req, res, next) {
    var core = req.core
    var source = req.body.source
    var method = req.body.method
    var filename = req.body.filename
    var _path = req.body.path
    var oldfilename = req.body.oldfilename
    var action = req.body.action || 'run'

    var routesFile = path.join('web', 'controllers', 'routes.json')
    var fullpath = path.join('web', 'controllers', filename)

    txain(function(callback) {
      core.fs.readFileAsJSON(routesFile, callback)
    })
    .then(function(routes, callback) {
      var route = _.findWhere(routes, {
        file: filename,
      })
      if (!route) {
        route = {
          file: filename,
        }
        routes.push(route)
      }
      route.method = method
      route.path = _path
      route.action = action
      core.fs.writeFileAsJSON(routesFile, routes, callback)
    })
    .then(function(callback) {
      core.fs.writeFileAsString(fullpath, source, callback)
    })
    .then(function(callback) {
      if (!oldfilename || oldfilename === filename) return callback()
      oldfilename = path.join('web', 'controllers', oldfilename)
      core.fs.removeFile(oldfilename, callback)
    })
    .then(function(callback) {
      core.fs.resolve(fullpath, callback)
    })
    .end(nook(next,
      function(controllerFile) {
        res.json({
          controller: controllerFile
        })
      })
    )
  }

  function deleteController(req, res, next) {
    var core = req.core
    var filename = req.params.filename

    var routesFile = path.join('web', 'controllers', 'routes.json')
    var fullpath = path.join('web', 'controllers', filename)

    txain(function(callback) {
      core.fs.readFileAsJSON(routesFile, callback)
    })
    .then(function(routes, callback) {
      routes = _.reject(routes, function(route) {
        return route.file === filename
      })
      core.fs.writeFileAsJSON(routesFile, routes, callback)
    })
    .then(function(callback) {
      core.fs.removeFile(fullpath, callback)
    })
    .end(nook(next,
      function() {
        res.json({})
      })
    )
  }

  function showView(req, res, next) {
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
  }

  function editView(req, res, next) {
    var core = req.core
    var filename = req.body.filename
    var source = req.body.source
    var oldfilename = req.body.oldfilename

    txain(function(callback) {
      var filepath = path.join('web', 'views', filename)
      core.fs.writeFileAsString(filepath, source, callback)
    })
    .then(function(callback) {
      if (!oldfilename || oldfilename === filename) return callback()
      oldfilename = path.join('web', 'views', oldfilename)
      core.fs.removeFile(oldfilename, callback)
    })
    .end(nook(next,
      function() {
        res.json({})
      })
    )
  }

  function deleteView(req, res, next) {
    var core = req.core
    var filename = req.params.filename

    txain(function(callback) {
      var filepath = path.join('web', 'views', filename)
      core.fs.removeFile(filepath, callback)
    })
    .end(nook(next,
      function() {
        res.json({})
      })
    )
  }

  function showLib(req, res, next) {
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
  }

  function editLib(req, res, next) {
    var core = req.core
    var filename = req.body.filename
    var source = req.body.source
    var oldfilename = req.body.oldfilename

    txain(function(callback) {
      var filepath = path.join('web', 'libs', filename)
      core.fs.writeFileAsString(filepath, source, callback)
    })
    .then(function(callback) {
      if (!oldfilename || oldfilename === filename) return callback()
      oldfilename = path.join('web', 'libs', oldfilename)
      core.fs.removeFile(oldfilename, callback)
    })
    .end(nook(next,
      function() {
        res.json({})
      })
    )
  }

  function deleteLib(req, res, next) {
    var core = req.core
    var filename = req.params.filename
    txain(function(callback) {
      var filepath = path.join('web', 'libs', filename)
      core.fs.removeFile(filepath, callback)
    })
    .end(nook(next,
      function() {
        res.json({})
      })
    )
  }

  app.get('/web', index)
  app.get('/web/overview', xhronly, overview)

  // assets
  app.get('/web/assets', xhronly, assets)

  // playground
  app.get('/web/playground', xhronly, showPlayground)
  app.post('/web/playground', playground)

  // controllers
  app.get('/web/controller/:filename', xhronly, showController)
  app.post('/web/controller', xhronly, editController)
  app.delete('/web/controller/:filename', xhronly, deleteController)

  // views
  app.get('/web/view/:filename', xhronly, showView)
  app.post('/web/view', xhronly, editView)
  app.delete('/web/view/:filename', xhronly, deleteView)

  // libs
  app.get('/web/lib/:filename', xhronly, showLib)
  app.post('/web/lib', xhronly, editLib)
  app.delete('/web/lib/:filename', xhronly, deleteLib)

}
