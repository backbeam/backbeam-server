var path = require('path')
var backbeam = require('../index')
var express = require('express')

module.exports = function(extend) {
  var app = express()

  var server = backbeam.createServer(path.join(__dirname, 'test-app'), extend)

  app.use(require('body-parser').urlencoded({ extended: true }))

  app.use(require('cookie-parser')('secret'))

  app.use('/admin', server.adminResources())

  app.use('/api', server.apiResources())

  app.use(server.webResources())

  return app
}

if (module.id === require.main.id) {
  require('http').createServer(module.exports()).listen(1337)
}