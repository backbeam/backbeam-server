var fs = require('fs')
var path = require('path')
var mkdirp = require('mkdirp')
var async = require('async')

module.exports = function() {
  var _path = path.join(process.cwd(), 'config.json')
  if (!fs.existsSync(_path)) {
    var data = {}
    data.port = 9999
    data.db_host = 'localhost'
    data.db_port = 3306
    data.db_user = 'root'
    data.db_pass = ''
    data.db_database = 'your_database_name'

    data.model = {}

    data.default_web_version = 'v1'

    // TODO: generate random keys with crypto
    data.keys = { 'public': '_public_key_', 'shared': '_shared_key_' }
    data.cookie_secret = '_secret_'

    var datastr = JSON.stringify(data, null, 2)
    fs.writeFileSync(_path, datastr, 'utf8')
  }

  var dirs = [['push'], ['files'], ['web', 'v1', 'assets'], ['web', 'v1', 'views'], ['web', 'v1', 'controllers'], ['web', 'v1', 'libs']]
  async.eachSeries(dirs, function(dir, next) {
    var fulldir = path.join(process.cwd(), dir.join(path.sep))

    mkdirp(fulldir, function(err) {
      next(err)
    })
  }, function(err) {
    if (err) {
      console.error(err)
      return
    }
    var _path = path.join(process.cwd(), 'web', 'v1', 'controllers', 'routes.json')
    if (!fs.existsSync(_path)) {
      var data = {
        routes: [
          { method: 'GET', path: '/', file: 'controller-home.js' }
        ]
      }
      var datastr = JSON.stringify(data, null, 2)
      fs.writeFileSync(_path, datastr, 'utf8')
    }

    var _path = path.join(process.cwd(), 'web', 'v1', 'controllers', 'controller-home.js')
    if (!fs.existsSync(_path)) {
      fs.writeFileSync(_path, 'response.send("Hello world")', 'utf8')
    }
  })
}
