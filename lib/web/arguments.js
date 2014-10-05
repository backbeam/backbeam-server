var _ = require('underscore')

module.exports = function(_arguments, callback) {
  var args = Array.prototype.slice.call(_arguments)
  var _callback = null
  if (callback) {
    _callback = args.pop()
    if (!_callback) {
      throw new Error('callback required')
    }
    if (callback !== true && callback !== _callback && typeof _callback !== 'function') {
      throw new Error('callback is not a function')
    }
  }

  var self = {
    next: function(name, optional) {
      if (args.length === 0 && !optional)
        throw new Error('Missing argument `'+name+'`')
      return args.shift()
    },
    nextNumber: function(name, optional) {
      var o = self.next(name, optional)
      if (typeof o !== 'number') {
        throw new Error('`'+name+'` is not a number')
      }
      return o
    },
    nextArray: function(name, optional) {
      var o = self.next(name, optional)
      if (!o || !_.isArray(o)) {
        throw new Error('`'+name+'` is not an array')
      }
      return o
    },
    nextFunction: function(name, optional) {
      var o = self.next(name, optional)
      if (!_.isFunction(o)) {
        throw new Error('`'+name+'` is not a function')
      }
      return o
    },
    nextObject: function(name, optional) {
      var o = self.next(name, optional)
      if (o && (!_.isObject(o) || _.isFunction(o) || _.isArray(o))) {
        throw new Error('`'+name+'` is not an object')
      }
      return o
    },
    nextString: function(name, optional) {
      var o = self.next(name, optional)
      if (typeof o !== 'string') {
        throw new Error('`'+name+'` is not a string')
      }
      return o
    },
    nextBoolean: function(name, optional) {
      var o = self.next(name, optional)
      if (typeof o !== 'undefined' && o !== true && o !== false) {
        throw new Error('`'+name+'` is not a boolean')
      }
      return o
    },
    rest: function() {
      if (args.length === 1 && _.isArray(args[0])) {
        args = args[0]
      }
      return args
    },
    callback: function() {
      return _callback
    }
  }
  return self
}
