var path = require('path')
var backbeam = require('../index')
var express = require('express')

module.exports = function() {
  var app = express()

  var server = backbeam.createServer({
    project: {
      manager: 'static',
      foo: 'bar',
      env: 'pro',
      webVersion: 'v1',
      name: 'example',
    },
    model: {
      manager: 'static',
      entities: {
        'item': {
          fields: {
            'name': {
              type: 'text',
              mandatory: true,
              fulltext: true,
            },
            'weight': {
              type: 'number',
            },
            'price': {
              type: 'number',
            },
            'units': {
              type: 'number',
            },
            'description': {
              type: 'textarea',
            },
          }
        }
      }
    },
    fs: {
      manager: 'local',
      root: __dirname,
    },
    db: {
      manager: 'sql',
      host: 'localhost',
      port: 3306,
      user: 'root',
      pass: '',
      database: 'shed',
    },
    api: {
      keys: {
        foo: 'bar'
      }
    },
    email: {
      transport: {
        service: 'stub',
      },
      from: 'user@example.com',
      inline: true,
    },
  })

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