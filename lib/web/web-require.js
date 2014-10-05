var fs = require('fs')
var path = require('path')
var vm = require('vm')

module.exports = function(core, sandbox, req, res, private) {

  var requireCache = {}

  function _require(name) {
    var _name = name
    if (_name.indexOf('./') === 0) _name = _name.substring(2)
    if (_name.indexOf('.js', _name.length - '.js'.length) === -1) _name += '.js'
    var sandbox = requireCache[_name]
    if (!sandbox) {
      var exports = {}
      var module = { exports:exports, loading:true }
      var sandbox = { module:module, exports:exports, require:_require }
      requireCache[_name] = sandbox
      try {
        var webVersion = core.project.webVersion
        var fullpath = path.join(core.fs.root, 'web', webVersion, 'libs', _name)
        var code = fs.readFileSync(fullpath, 'utf8')
        vm.runInNewContext(code, sandbox, _name)
      } catch(err) {
        throw err
      }
      module.loading = false
    }
    return sandbox.module.exports
  }

  sandbox.require = _require
  
}
