var crypto = require('crypto')
var hashes = ['md5', 'sha1', 'sha256', 'sha384', 'sha512']

module.exports = function(core, sandbox, req, res, private) {

  var util = sandbox.backbeam.util = sandbox.backbeam.util || {}

  util.crypto = {}

  util.crypto.getHashes = function() {
    return hashes
  }

  util.crypto.createHash = function(algorithm) {
    if (typeof algorithm !== 'string') {
      throw new Error('Must give hashtype string as argument')
    }
    algorithm = algorithm.toLowerCase()
    if (hashes.indexOf(algorithm) < 0) {
      throw new Error('Digest method not supported')
    }
    var hash = crypto.createHash(algorithm)
    var obj = {}
    obj.update = function(data) {
      hash.update(data)
      return obj
    }
    obj.digest = function(encoding) {
      return hash.digest(encoding)
    }
    return obj
  }

  util.crypto.createHmac = function(algorithm, key) {
    if (typeof algorithm !== 'string') {
      throw new Error('Must give hashtype string as argument')
    }
    algorithm = algorithm.toLowerCase()
    if (hashes.indexOf(algorithm) < 0) {
      throw new Error('Unknown message digest '+algorithm)
    }
    var hmac = crypto.createHmac(algorithm, key)
    var obj = {}
    obj.update = function(data) {
      hmac.update(data)
      return obj
    }
    obj.digest = function(encoding) {
      return hmac.digest(encoding)
    }
    return obj
  }

}
