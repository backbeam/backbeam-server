var path = require('path')
var backbeam = require('../index')
var express = require('express')
var rimraf = require('rimraf')

var storage = path.join(__dirname, 'storage')
rimraf.sync(storage)

module.exports = function(extend) {
  var app = express()

  extend = extend || {}
  extend.fs = {
    storage: storage,
  }

  var server = backbeam.createServer(path.join(__dirname, 'test-app'), extend)

  app.use(require('body-parser').urlencoded({ extended: true }))

  app.use(require('multer')({ dest: './uploads/'}))

  app.use(require('cookie-parser')('secret'))

  app.use('/admin', server.adminResources())

  app.use('/api', server.apiResources())

  app.use(server.webResources())

  return app
}

if (module.id === require.main.id) {
  require('http').createServer(module.exports()).listen(1337)
}