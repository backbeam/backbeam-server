var txain = require('txain')
var utils = require('./utils')

exports.run = function(argv, callback) {
  utils.cliOptions(argv, [], function(values) {
    var options = {
      method: 'POST',
    }
    utils.request(values, '/migrate', options, callback)
  })
}

if (module.id === require.main.id) {
  exports.run()
}
