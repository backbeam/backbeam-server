var txain = require('txain')
var utils = require('./utils')

utils.cliOptions([], function(values) {
  var options = {
    method: 'POST',
  }
  utils.request(values, '/migrate', options)
})
