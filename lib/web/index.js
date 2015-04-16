var fs = require('fs') // TODO: use core.fs
var path = require('path')
var nunjucks = require('nunjucks')
var useragent = require('useragent')
var errors = require('node-errors')
var nook = errors.nook
var txain = require('txain')

exports.findController = function(core, method, _path, callback) {
  txain(function(callback) {
    // TODO: cache for production
    var filepath = path.join('web', 'controllers', 'routes.json')
    core.fs.readFileAsJSON(filepath, callback)
  })
  .then(function(routes, callback) {
    var components = _path.split('/')
    for (var i = 0; i < routes.length; i++) {
      var route = routes[i]
      if (route.method !== method) continue

      var tokens = route.path.split('/')
      if (tokens.length !== components.length) continue
      var params = {}

      var matches = true
      for (var j = 0; j < tokens.length; j++) {
        var token = tokens[j]
        if (token.length > 0 && token.charAt(0) === ':') {
          params[token.substring(1)] = components[j]
        } else if (token !== components[j]) {
          matches = false
          break
        }
      }

      if (matches) {
        return callback(null, {
          params: params,
          file: route.file,
          fullpath: path.join(core.fs.root, 'web', 'controllers', route.file),
          action: route.action || 'run',
        })
      }
    }
    return callback(null, null)
  })
  .end(callback)
}

exports.configure = function(app) {

  var interactive = require('./interactive')(app)

  app.all('*', function(req, res, next) {
    var core = req.core

    function notFound() {
      res.status(404)
      res.send('Not found')
    }

    function runController(req, res, controller, callback) {
      var _path = path.join('web', 'controllers', controller.file)

      txain(function(callback) {
        // TODO: do not read for production
        core.fs.readFileAsString(_path, callback)
      })
      .then(function(code, callback) {
        var private = {
          backbeam: {
            env: core.env,
          },
          params: controller.params,
          result: {
            status: 200,
            session: {},
            headers: {},
          },
          path: controller.path,
          filename: controller.file,
          fullpath: path.join(core.fs.root, _path),
          code: code,
          sdk: req.get('x-backbeam-sdk') || null,
        }

        req.private = private

        private.then = function(callback, api, code) {
          return function() {
            var args = Array.prototype.slice.call(arguments)
            var err = args.shift()
            if (err) {
              if (callback === private.response) {
                return next(err)
              }
              return callback(err)
            }
            var success = callback === private.response ? api : code
            success.apply(null, args)
          }
        }

        private.caught = function(err) {
          next(err)
        }

        txain(fs.readdir, __dirname)
        .then(function(files, callback) {
          files.forEach(function(file) {
            if (file.indexOf('web-') === 0) {
              require('./'+file)(core, req, res, private)
            }
          })
          return callback(null, code, private)
        })
        .end(callback)

      })
      .then(function(code, private, callback) {
        var authCookieName = private.authCookieName = core.project.name+'_auth'
        var authCode = req.signedCookies[authCookieName]
                    || req.headers['x-backbeam-auth']

        if (!authCode) {
          return callback(null, code, private, callback)
        }

        core.users.userFromSessionCode(authCode,
          nook(callback, function(userid) {
            private.setCurrentUserId(userid)
            return callback(null, code, private, callback)
          })
        )
      })
      .then(function(code, private, callback) {
        var logger = require('./logger')(private)
        private.libs = {}
        private.libs.require = function(str) {
          // TODO: use vm for development
          var fullpath = path.join(core.fs.root, 'web', 'libs', str)
          delete require.cache[fullpath]
          return require(fullpath)
        }

        var fullpath = path.join(core.fs.root, _path)
        if (core.isDevelopment()) {
          delete require.cache[fullpath]
          interactive.track(req, res)
        }

        var controllerModule = require(fullpath)
        // TODO if no controllerModule[controller.action]
        controllerModule[controller.action](
          private.backbeam,
          private.request,
          private.response,
          private.libs,
          logger
        )
        callback()
      })
      .end(function(err) {
        if (err) return callback(err)
        return callback()
      })
    }

    txain(function(callback) {
      exports.findController(core, req.method, req.params[0], callback)
    })
    .then(function(controller, callback) {
      if (!controller) {
        var base = path.join(core.fs.root, 'web', 'assets')
        var _path = path.normalize(base + req.params[0])
        if (_path.indexOf(base+path.sep) === 0) { // prevents trying to access a file outside `assets`
          fs.exists(_path, function(exists) {
            // TODO: if exists and is a file
            if (exists) {
              res.sendFile(_path)
            } else {
              notFound()
            }
          })
        } else {
          notFound()
        }
        return callback()
      } else {
        return runController(req, res, controller, callback)
      }
    })
    .end(function(err) {
      if (err && res.status() !== 404) {
        return next(err)
      }
    })

  })

  app.use(require('./error-handler'))

}
