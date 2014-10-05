var fs = require('fs')
var path = require('path')
var vm = require('vm')
var async = require('async')
var nunjucks = require('nunjucks')
var useragent = require('useragent')

module.exports.configure = function(app) {

  app.all('*', function(req, res, next) {

    var core = req.core

    function notFound(req, res) {
      res.status(404)
      res.send('Not found')
    }

    function runController(req, res, controller, callback) {

      async.waterfall([

        function readSource(callback) {
          var webVersion = core.project.webVersion
          var _path = path.join('web', webVersion, 'controllers', controller.file)
          core.fs.readFileAsString(_path, callback)
        },

        function createSandbox(code, callback) {
          var webVersion = core.project.webVersion

          var sandbox = {
            backbeam: {}
          }

          var private = {
            params: controller.params,
            result: {
              status: 200,
              session: {},
              headers: {},
              sdk: null, // TODO
            },
            path: controller.path,
            filename: controller.file,
            code: code,
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

        function runCode(code, sandbox, private, callback) {
          private.wrap(function() {
            var context = vm.createContext(sandbox)
            vm.runInContext(code, context, controller.file)
          })()
        }

      ], callback)
      
    }

    async.waterfall([

      function readRoutes(callback) {
        var webVersion = core.project.webVersion
        var filepath = path.join('web', webVersion, 'controllers', 'routes.json')
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
          var webVersion = core.project.webVersion
          var base = path.join(core.fs.root, 'web', webVersion, 'assets')
          var _path = path.normalize(base + req.params[0])
          if (_path.indexOf(base+path.sep) === 0) { // prevents trying to access a file outside `assets`
            fs.exists(_path, function(exists) {
              if (exists) {
                res.sendFile(_path)
              } else {
                notFound(req, res)
              }
            })
          } else {
            notFound(req, res)
          }
          return callback()
        } else {
          return runController(req, res, controller, callback)
        }
      },

    ], function(err) {
      if (err && res.status() !== 404) {
        res.status(500)
        return res.send(err.stack) // TODO: custom internal error
      }
    })

  })

}
