var fs = require('fs')
var path = require('path')
var errors = require('node-errors')
var nook = errors.nook

module.exports = function(options) {
  var root = options.root

  return function(core) {
    var manager = {}

    manager.readFileAsJSON = function(filepath, callback) {
      fs.readFile(path.join(root, filepath), nook(callback,
        function(data) {
          try {
            var json = JSON.parse(data)
            return callback(null, json)
          } catch(e) {
            return callback(e)
          }
        })
      )
    }

    manager.readFileAsString = function(filepath, callback) {
      fs.readFile(path.join(root, filepath), 'utf8', callback)
    }

    manager.root = root

    return manager
  }

}
