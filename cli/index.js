#!/usr/bin/env node
var colors = require('colors')
var util = require('util')
var fs = require('fs')
var path = require('path')

var command = process.argv.splice(2, 1)[0]
process.argv[1] = command

var fullpath = path.join(__dirname, 'cli-'+command+'.js')
if (!fs.existsSync(fullpath)) {
  console.log(util.format('Command not found `%s`', command).red)
} else {
  require('./cli-'+command).run()
}
