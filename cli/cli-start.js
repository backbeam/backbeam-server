var colors = require('colors')
var program = require('commander')
var version = require('../package.json').version
var express = require('express')
var backbeam = require('../')
var txain = require('txain')
var http = require('http')

program
  .version(version)
  .option('-d, --directory [<s>]', 'Directory where the project have to be created', process.cwd())
  .option('-p, --port [<d>]', 'Server port', 3000)
  .parse(process.argv)

console.log('Starting project with base directory: %s', program.directory)

txain(function(callback) {
  var app = backbeam.createExpressApp({
    directory: program.directory,
  })

  http.createServer(app).listen(program.port)

  console.log('Started server at port %d', program.port)

  callback()
})
.end(function(err) {
  if (err) {
    console.log('Error', err.stack.red)
  }
})
