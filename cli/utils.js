var colors = require('colors')
var program = require('commander')
var version = require('../package.json').version
var request = require('request')
var txain = require('txain')
var readline = require('readline')
var util = require('util')

exports.cliOptions = function(options, callback) {
  var interactive = false
  var rl

  var p = program
    .version(version)
    .option('-H, --host [<d>]', 'Hostname', 'localhost')
    .option('-P, --port [<d>]', 'Server port', 3000)
    .option('-U, --user [<d>]', 'User name')
    .option('-i, --interactive', 'Interactive')

  var values = {}

  options.forEach(function(option) {
    if (option.type) {
      var format = option.required ? '-%s --%s <%s>' : '-%s --%s [<%s>]'
      var argument = util.format(format, option.short, option.key, option.type)
    } else {
      var argument = util.format('-%s --%s', option.short, option.key)
    }
    p = p.option(argument, option.name, option.def)
  })
  p.parse(process.argv)

  txain(options)
  .each(function(option, callback) {
    if (program[option.key]) {
      values[option.key] = program[option.key]
      return callback()
    }
    if (!option.type) return callback()
    if (!option.required && !program.interactive) return callback()

    var question = option.name+': '
    if (option.values) {
      question += '\n'+option.values.map(function(value) {
        return '* '+value
      }).join('\n')+'\n'
    }

    if (!interactive) {
      rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      })
      interactive = true
    }

    rl.question(question, function(answer) {
      values[option.key] = answer
      callback()
    })
  })
  .then(function(callback) {
    if (rl) rl.close()
    callback()
  })
  .end(function(err) {
    if (err) return console.log('Error', err.stack.red)
    callback(values)
  })
}

exports.request = function(prgram, path, options, callback) {
  options.url = 'http://'+program.host+':'+program.port+'/admin'+path
  options.headers = options.headers || {}
  options.headers['accept'] = 'application/json'
  options.headers['X-Requested-With'] = 'XMLHttpRequest'
  request(options, function(err, res, body) {
    if (err) {
      return console.log('Error', err.stack.red)
    }
    if (res.statusCode >= 300) {
      return console.log('Status code', res.statusCode, body)
    }
    var contentType = res.headers['content-type']
    if (contentType && contentType.indexOf('application/json') >= 0) {
      body = JSON.parse(body)
    }
    callback && callback(body)
  })
}
