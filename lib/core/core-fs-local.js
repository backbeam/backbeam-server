var fs = require('fs')
var path = require('path')

module.exports = function(options) {
  var root = options.root

  return function(core) {
    var manager = {}

    manager.readConfig = function(callback) {
      process.nextTick(function() {
        return callback(null, require(path.join(root, 'config.js')))
      })
    }

    manager.readFileAsJSON = function(filepath, callback) {
      fs.readFile(path.join(root, filepath), function(err, data) {
        if (err) return callback(err)
        try {
          var json = JSON.parse(data)
          return callback(null, json)
        } catch(e) {
          return callback(e)
        }
      })
    }

    manager.readFileAsString = function(filepath, callback) {
      fs.readFile(path.join(root, filepath), 'utf8', callback)
    }

    manager.root = root

    return manager
  }

}
