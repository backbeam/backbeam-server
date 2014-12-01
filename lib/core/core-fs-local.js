var fs = require('fs')
var path = require('path')
var errors = require('node-errors')
var nook = errors.nook
var txain = require('txain')

module.exports = function(options) {
  var root = options.root

  return function(core) {
    var manager = {}

    manager.resolve = function() {
      var args = Array.prototype.slice.call(arguments)
      var callback = args.pop()
      args = [core.fs.root].concat(args)
      var filepath = path.join.apply(null, args)
      if (filepath.indexOf(core.fs.root) !== 0) {
        return callback(errors.request('Forbidden file path %s', filepath))
      }
      callback(null, filepath)
    }

    manager.readFileAsJSON = function(filepath, callback) {
      txain(manager.resolve, filepath)
      .then(function(fullpath, callback) {
        fs.readFile(fullpath, 'utf8', callback)
      })
      .end(nook(callback,
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
      txain(manager.resolve, filepath)
      .then(function(fullpath, callback) {
        fs.readFile(fullpath, 'utf8', callback)
      })
      .end(callback)
    }

    manager.writeFileAsJSON = function(filepath, data, callback) {
      txain(manager.resolve, filepath)
      .then(function(fullpath, callback) {
        fs.writeFile(fullpath, JSON.stringify(data), 'utf8', callback)
      })
      .end(callback)
    }

    manager.writeFileAsString = function(filepath, string, callback) {
      txain(manager.resolve, filepath)
      .then(function(fullpath, callback) {
        fs.writeFile(fullpath, string, 'utf8', callback)
      })
      .end(callback)
    }

    manager.readdir = function(filepath, callback) {
      txain(manager.resolve, filepath)
      .then(function(fullpath, callback) {
        fs.readdir(fullpath, callback)
      })
      .end(callback)
    }

    manager.stat = function(filepath, callback) {
      txain(manager.resolve, filepath)
      .then(function(fullpath, callback) {
        fs.stat(fullpath, callback)
      })
      .end(callback)
    }

    manager.removeFile = function(filepath, callback) {
      txain(manager.resolve, filepath)
      .then(function(fullpath, callback) {
        fs.unlink(fullpath, callback)
      })
      .end(callback)
    }

    manager.root = root

    return manager
  }

}
