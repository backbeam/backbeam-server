var txain = require('txain')
var utils = require('./utils')
var fs = require('fs')
var path = require('path')
var readline = require('readline')

exports.run = function(argv) {
  var cliOptions = [
    { short: 'f', key: 'filename', type: 's', name: 'File name', required: true },
  ]

  utils.cliOptions(argv, cliOptions, function(values) {

    var options = {
      method: 'POST',
    }
    utils.request(values, '/recording-start', options, function(body) {
      
      var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      })
      console.log('Browse your web application and all the requests will be recorded')
      rl.question('Press any key to finish ', function(answer) {

        var options = {
          method: 'POST',
          form: {
            filename: values.filename,
          }
        }
        utils.request(values, '/recording-finish', options, function(body) {
          rl.close()
        })
      })

    })
  })
}

if (module.id === require.main.id) {
  exports.run()
}
