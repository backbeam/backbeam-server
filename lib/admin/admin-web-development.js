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
  })

  app.get('/web/playground', xhronly, function(req, res, next) {
    utils.render(req, res, 'web-playground.jade', {})
  })

  app.post('/web/playground', function(req, res, next) {
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
  })
  
  // show a web controller
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

  // edit a web controller
  app.post('/web/controller/:filename', xhronly, function(req, res, next) {
    var core = req.core
    var source = req.body.source
    var method = req.body.method
    var _path = req.body.path

    var routesFile = path.join('web', 'controllers', 'routes.json')
    var fullpath = path.join('web', 'controllers', req.params.filename)

    txain(function(callback) {
      core.fs.readFileAsJSON(routesFile, callback)
    })
    .then(function(routes, callback) {
      var route = _.findWhere(routes, {
        file: req.params.filename,
      })
      route.method = method
      route.path = _path
      core.fs.writeFileAsJSON(routesFile, routes, callback)
    })
    .then(function(callback) {
      core.fs.writeFileAsString(fullpath, source, callback)
    })
    .end(nook(next,
      function() {
        res.json({})
      })
    )
  })

  // show a template
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

  // edit a template
  app.post('/web/view/:filename', xhronly, function(req, res, next) {
    var core = req.core
    var source = req.body.source
    txain(function(callback) {
      var filepath = path.join('web', 'views', req.params.filename)
      core.fs.writeFileAsString(filepath, source, callback)
    })
    .end(nook(next,
      function() {
        res.json({})
      })
    )
  })

  // show a lib
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

  // edit a lib
  app.post('/web/lib/:filename', xhronly, function(req, res, next) {
    var core = req.core
    var source = req.body.source
    txain(function(callback) {
      var filepath = path.join('web', 'libs', req.params.filename)
      core.fs.writeFileAsString(filepath, source, callback)
    })
    .end(nook(next,
      function() {
        res.json({})
      })
    )
  })

  app.get('/web/assets', xhronly, function(req, res, next) {
    var core = req.core
    var dir = req.query.dir
    var options = {}
    txain(function(callback) {
      var fullpath = path.join('web', 'assets', dir)
      core.fs.readdir(fullpath, callback)
    })
    .end(nook(next,
      function(files) {
        options.files = files
        utils.render(req, res, 'web-assets.jade', options)
      })
    )
  })

}
