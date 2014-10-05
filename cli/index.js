#!/usr/bin/env node
var colors = require('colors')
var util = require('util')

var command = process.argv.splice(2, 1)[0]
process.argv[1] = command

try {
  var app = require('./cli-'+command)
} catch(e) {
  console.log(util.format('Command not found `%s`', command).red)
  console.log('e', e.stack)
}
