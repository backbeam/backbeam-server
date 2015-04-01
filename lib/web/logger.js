var util = require('util')
var moment = require('moment')
var colors = require('colors')
var _ = require('underscore')

module.exports = function(sandbox, private) {

  var logger = {}
  var types = {
    'log': '◉'.white,
    'warn': '◉'.yellow,
    'error': '◉'.red,
  }

  function addFunction(type) {
    var icon = types[type]
    logger[type] = function() {
      var args = Array.prototype.slice.call(arguments)
      var message = require('util').format.apply(null, args)
      var now = '['+moment().format('YYYY-MM-DD HH:mm:ss')+']'
      var info = sandbox.request.method+' '+sandbox.request.path
      var filename = private.filename
      console[type](icon, now.green, info.blue, filename.cyan, message)
    }
  }

  _.keys(types).forEach(function(type) {
    addFunction(type)
  })

  return logger

}
