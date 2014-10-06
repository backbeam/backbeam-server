var fs = require('fs')
var path = require('path')
var mkdirp = require('mkdirp')
var txain = require('txain')
var colors = require('colors')
var program = require('commander')
var version = require('../package.json').version
var crypto = require('crypto')

program
  .version(version)
  .option('-d, --directory [<s>]', 'Directory where the project have to be created', process.cwd())
  .parse(process.argv)

console.log('Creating project at %s', program.directory)

txain(function(callback) {
  // configuration
  var configFile = path.join(program.directory, 'config.json')
  var exists = fs.existsSync(configFile)
  if (exists) return callback()
  var projectName = path.basename(program.directory)
  var data = {
    project: {
      manager: 'static',
      webVersion: 'v1',
      name: projectName,
    },
    model: {
      manager: 'static',
      entities: {
        'item': {
          fields: {
            'name': {
              type: 'text',
              mandatory: true,
            }
          }
        }
      }
    },
    db: {
      manager: 'sql',
      host: 'localhost',
      port: 3306,
      user: 'root',
      pass: '',
      database: projectName,
    },
    api: {
      keys: {}
    },
  }
  data.api.keys[randomToken(16)] = randomToken(32)
  fs.writeFile(configFile, JSON.stringify(data, null, 2), 'utf8', callback)
})
.then(function(callback) {
  // directories
  var dirs = [
    'push',
    'files',
    'web/v1/assets',
    'web/v1/views',
    'web/v1/controllers',
    'web/v1/libs',
  ]
  txain(dirs).each(mkdirp).end(callback)
})
.then(function(callback) {
  // routes
  var routesFile = path.join(program.directory, 'web/v1/controllers/routes.json')
  var exists = fs.existsSync(routesFile)
  if (exists) return callback()
  var data = [
    {
      method: 'GET',
      path: '/',
      file: 'home.js'
    }
  ]
  fs.writeFile(routesFile, JSON.stringify(data, null, 2), 'utf8', callback)
})
.then(function(callback) {
  // home controller
  var controllerFile = path.join(program.directory, 'web/v1/controllers/home.js')
  var exists = fs.existsSync(controllerFile)
  if (exists) return callback()
  var code = 'response.send("Hello world")'
  fs.writeFile(controllerFile, code, 'utf8', callback)
})
.end(function(err) {
  if (err) {
    return console.err(err.stack.red)
  }
  console.log('Done')
})

function randomToken(len) {
  return crypto.randomBytes(len).toString('hex')
}
