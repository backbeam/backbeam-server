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
var openEditor = require('open-text-editor')
var multiline = require('multiline')

module.exports.configure = function(app, middleware, utils) {

  function xhronly(req, res, next) {
    if (!req.xhr) {
      return res.redirect(req.baseUrl+'/web')
    }
    next()
  }

  function index(req, res, next) {
    var core = req.core
    var options = {
      fullpath: function(dir, filename) {
        return path.join(core.fs.root, 'web', dir, filename)
      },
    }
    txain(function(callback) {
      var filepath = path.join('web', 'controllers', 'routes.json')
      core.fs.readFileAsJSON(filepath, callback)
    })
    .map(function(route, callback) {
      core.fs.exists(path.join('web', 'controllers', route.file), function(err, exists) {
        if (err) return callback(err)
        route.exists = exists
        callback(null, route)
      })
    })
    .then(function(routes, callback) {
      options.routes = _.sortBy(routes, 'path')
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
      listAssets(core, null, callback)
    })
    .then(function(files, callback) {
      options.files = files
      callback()
    })
    .end(nook(next,
      function() {
        utils.render(req, res, 'web.jade', options)
      })
    )
  }

  function listAssets(core, _path, callback) {
    var dir = path.join('web', 'assets')
    if (_path) {
      dir = path.join(dir, _path)
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
    .end(callback)
  }

  function assets(req, res, next) {
    var core = req.core
    listAssets(core, req.query.path, nook(next,
      function(files) {
        utils.render(req, res, 'web-assets.jade', {
          files: files,
          fullpath: function(dir, filename) {
            return path.join(core.fs.root, 'web', dir, filename)
          },
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

  function editController(req, res, next) {
    var core = req.core
    
    // new values
    var method = req.body.method
    var filename = req.body.filename
    var _path = req.body.path
    var action = req.body.action || 'run'

    // old values
    var oldfilename = req.body.oldfilename
    var oldpath = req.body.oldpath
    var oldmethod = req.body.oldmethod

    var routesFile = path.join('web', 'controllers', 'routes.json')
    var fullpath = path.join('web', 'controllers', filename)

    var code = multiline.stripIndent(function() {/*
      exports.#action# = function(backbeam, req, res, libs, logger) {
        res.send('Hello world')
      }
    */}).replace('#action#', action)

    txain(function(callback) {
      core.fs.readFileAsJSON(routesFile, callback)
    })
    .then(function(routes, callback) {
      var route = _.findWhere(routes, {
        file: oldfilename,
        path: oldpath,
        method: oldmethod,
      })
      if (!route) {
        route = {}
        routes.push(route)
      }
      route.file = filename
      route.method = method
      route.path = _path
      route.action = action
      core.fs.writeFileAsJSON(routesFile, routes, callback)
    })
    .then(function(callback) {
      if (!oldfilename || oldfilename === filename) return callback()
      core.fs.renameFile(path.join('web', 'controllers', oldfilename), fullpath, callback)
    })
    .then(function(callback) {
      if (oldfilename) return callback()
      core.fs.readFileAsString(fullpath, function(err, source) {
        if (source) {
          source += '\n\n'
        } else {
          source = ''
        }
        source += code
        core.fs.writeFileAsString(fullpath, source, callback)
      })
    })
    .then(function(callback) {
      core.fs.resolve(fullpath, callback)
    })
    .end(nook(next,
      function(controllerFile) {
        openEditor.open(controllerFile, 0, function(err) {})
        res.redirect(req.baseUrl+'/web#controllers')
      })
    )
  }

  function deleteController(req, res, next) {
    var core = req.core
    var filename = req.body.filename
    var _path = req.body.path
    var method = req.body.method
    var moreRoutes

    var routesFile = path.join('web', 'controllers', 'routes.json')
    var fullpath = path.join('web', 'controllers', filename)

    txain(function(callback) {
      core.fs.readFileAsJSON(routesFile, callback)
    })
    .then(function(routes, callback) {
      routes = _.reject(routes, function(route) {
        return route.file === filename && route.path === _path && route.method === method
      })
      moreRoutes = _.some(routes, function(route) {
        return route.file === filename
      })
      core.fs.writeFileAsJSON(routesFile, routes, callback)
    })
    .then(function(callback) {
      if (moreRoutes) return callback()
      core.fs.removeFile(fullpath, callback) // TODO: ignore ENOENT error
    })
    .end(nook(next,
      function() {
        res.redirect(req.baseUrl+'/web#controllers')
      })
    )
  }

  function editView(req, res, next) {
    var core = req.core
    var filename = req.body.filename
    var oldfilename = req.body.oldfilename
    var filepath = path.join('web', 'views', filename)

    txain(function(callback) {
      core.fs.exists(filepath, callback)
    })
    .then(function(exists, callback) {
      if (exists) return callback()
      core.fs.writeFileAsString(filepath, '', callback)
    })
    .then(function(callback) {
      if (!oldfilename || oldfilename === filename) return callback()
      core.fs.renameFile(path.join('web', 'views', oldfilename), filepath, callback)
    })
    .end(nook(next,
      function() {
        var fullpath = path.join(core.fs.root, 'web', 'views', filename)
        openEditor.open(fullpath, 0, function(err) {})
        res.redirect(req.baseUrl+'/web#views')
      })
    )
  }

  function deleteView(req, res, next) {
    var core = req.core
    var filename = req.body.filename

    txain(function(callback) {
      var filepath = path.join('web', 'views', filename)
      core.fs.removeFile(filepath, callback)
    })
    .end(nook(next,
      function() {
        res.redirect(req.baseUrl+'/web#views')
      })
    )
  }

  function editLib(req, res, next) {
    var core = req.core
    var filename = req.body.filename
    var oldfilename = req.body.oldfilename
    var filepath = path.join('web', 'libs', filename)

    txain(function(callback) {
      core.fs.exists(filepath, callback)
    })
    .then(function(exists, callback) {
      if (exists) return callback()
      core.fs.writeFileAsString(filepath, '', callback)
    })
    .then(function(callback) {
      if (!oldfilename || oldfilename === filename) return callback()
      core.fs.renameFile(path.join('web', 'libs', oldfilename), filepath, callback)
    })
    .end(nook(next,
      function() {
        var fullpath = path.join(core.fs.root, 'web', 'libs', filename)
        openEditor.open(fullpath, 0, function(err) {})
        res.redirect(req.baseUrl+'/web#libs')
      })
    )
  }

  function deleteLib(req, res, next) {
    var core = req.core
    var filename = req.body.filename
    txain(function(callback) {
      var filepath = path.join('web', 'libs', filename)
      core.fs.removeFile(filepath, callback)
    })
    .end(nook(next,
      function() {
        res.redirect(req.baseUrl+'/web#libs')
      })
    )
  }

  app.get('/web', index)

  // assets
  app.get('/web/assets', xhronly, assets)

  // playground
  app.post('/web/playground', playground)

  // controllers
  app.post('/web/controller', editController)
  app.post('/web/controller/delete', deleteController)

  // views
  app.post('/web/view', editView)
  app.post('/web/view/delete', deleteView)

  // libs
  app.post('/web/lib', editLib)
  app.post('/web/lib/delete', deleteLib)

}
