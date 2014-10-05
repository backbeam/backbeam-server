var colors = require('colors')
var program = require('commander')
var version = require('../package.json').version
var request = require('request')
var txain = require('txain')

program
  .version(version)
  .option('-p, --port [<d>]', 'Server port', 3000)
  .parse(process.argv)

var options = {
  url: 'http://localhost:'+program.port+'/admin/migrate',
  method: 'POST',
}

txain(request, options)
  .then(function(res, body, callback) {
    console.log(body)
  })
  .end(function(err) {
    if (err) {
      console.log('Error', err.stack.red)
    }
  })
