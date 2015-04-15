var fs = require('fs')
var path = require('path')
var vm = require('vm')

module.exports = function(core, req, res, private) {

  // var requireCache = {}

  // function _require(name) {
  //   var _name = name
  //   if (_name.indexOf('.js', _name.length - '.js'.length) === -1) _name += '.js'
  //   var fullpath = path.join(core.fs.root, 'web', 'libs', _name)
  //   var module = requireCache[fullpath]
  //   if (!module) {
  //     var sandbox = {}
  //     var exports = {}
  //     module = {
  //       exports: exports,
  //       loading: true,
  //     }
  //     sandbox.require = private.require
  //     sandbox.__dirname = path.dirname(fullpath)
  //     sandbox.__filename = path.basename(fullpath)
  //     sandbox.module = module
  //     sandbox.exports = module.exports
  //     requireCache[fullpath] = sandbox.module
  //     var code = fs.readFileSync(fullpath, 'utf8')
  //     vm.runInNewContext(code, sandbox, _name)
  //     module.loading = false
  //   }
  //   return module.exports
  // }

  private.require = function(id) {
    // if (core.isDevelopment() && id.charAt(0) === '.') {
    //   return _require(id)
    // }
    return require(id)
  }
  
}
