var fs = require('fs') // TODO: use core.fs
var path = require('path')
var vm = require('vm')
var async = require('async')
var nunjucks = require('nunjucks')
var useragent = require('useragent')
var errors = require('node-errors')
var nook = errors.nook

module.exports.configure = function(app) {

  app.all('*', function(req, res, next) {

    var core = req.core

    function notFound() {
      res.status(404)
      res.send('Not found')
    }

    function runController(req, res, controller, callback) {
      var _path = path.join('web', 'controllers', controller.file)

      async.waterfall([

        function readSource(callback) {
          core.fs.readFileAsString(_path, callback)
        },

        function createSandbox(code, callback) {
          var sandbox = {
            backbeam: {}
          }

          var private = {
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
                if (callback === sandbox.response) {
                  return next(err)
                }
                return callback(err)
              }
              var success = callback === sandbox.response ? api : code
              success.apply(null, args)
            }
          }

          private.caught = function(err) {
            next(err)
          }

          async.waterfall([

            async.apply(fs.readdir, __dirname),

            function requireModules(files, callback) {
              files.forEach(function(file) {
                if (file.indexOf('web-') === 0) {
                  require('./'+file)(core, sandbox, req, res, private)
                }
              })
              return callback(null, code, sandbox, private)
            },

          ], callback)

        },

        function readUser(code, sandbox, private, callback) {
          var authCookieName = private.authCookieName = core.project.name+'_auth'
          var authCode = req.signedCookies[authCookieName]
                      || req.headers['x-backbeam-auth']

          if (!authCode) {
            return callback(null, code, sandbox, private, callback)
          }

          core.users.userFromSessionCode(authCode,
            nook(callback, function(userid) {
              private.setCurrentUserId(userid)
              return callback(null, code, sandbox, private, callback)
            })
          )
        },

        function runCode(code, sandbox, private, callback) {
          var context = vm.createContext(sandbox)
          vm.runInContext(code, context, controller.file)
        }

      ], callback)
      
    }

    async.waterfall([

      function readRoutes(callback) {
        var filepath = path.join('web', 'controllers', 'routes.json')
        core.fs.readFileAsJSON(filepath, callback)
      },

      function findController(routes, callback) {
        var components = req.params[0].split('/')
        for (var i = 0; i < routes.length; i++) {
          var route = routes[i]
          if (route.method !== req.method) continue

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
              file: route.file
            })
          }
        }
        return callback(null, null)
      },

      function processController(controller, callback) {
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
      },

    ], function(err) {
      if (err && res.status() !== 404) {
        return next(err)
      }
    })

  })

  app.use(require('./error-handler'))

}
