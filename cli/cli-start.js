var colors = require('colors')
var program = require('commander')
var version = require('../package.json').version
var express = require('express')
var backbeam = require('../')
var txain = require('txain')
var http = require('http')

exports.run = function(argv, callback) {
  program
    .version(version)
    .option('-d, --directory [<s>]', 'Directory where the project have to be created', process.cwd())
    .option('-p, --port [<d>]', 'Server port', 3000)
    .parse(argv)

  console.log('Starting project with base directory: %s', program.directory)

  txain(function(callback) {
    var app = backbeam.createExpressApp({
      directory: program.directory,
    })

    http.createServer(app).listen(program.port)

    console.log('Started server at port %d', program.port)

    callback()
  })
  .end(callback)
}

if (module.id === require.main.id) {
  exports.run()
}
