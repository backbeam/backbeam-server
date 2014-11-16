var path = require('path')
var backbeam = require('../index')
var express = require('express')

module.exports = function() {
  var app = express()

  var server = backbeam.createServer({
    project: {
      manager: 'static',
      env: 'pro',
      name: 'example',
    },
    model: {
      manager: 'static',
      entities: {
        'item': {
          fields: [
            {
              id: 'name',
              type: 'text',
              mandatory: true,
              fulltext: true,
            },
            {
              id: 'weight',
              type: 'number',
            },
            {
              id: 'price',
              type: 'number',
            },
            {
              id: 'units',
              type: 'number',
            },
            {
              id: 'description',
              type: 'textarea',
            },
            {
              id: 'rich_description',
              type: 'richtextarea'
            },
            {
              id: 'date',
              type: 'date'
            },
            {
              id: 'day',
              type: 'day'
            },
            {
              id: 'number',
              type: 'number'
            },
            {
              id: 'location',
              type: 'location'
            },
            {
              id: 'select',
              type: 'select',
              'options': [
                'red', 'white', 'green', 
              ]
            },
            {
              id: 'json',
              type: 'json'
            },
            {
              id: 'boolean',
              type: 'boolean'
            }
          ]
        }
      }
    },
    fs: {
      manager: 'local',
      root: path.join(__dirname, 'test-app'),
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
    authentication: {
      sessionKey: '82b121dcbf86f1c1313fa9270ba9c77372a86e19ac849402615745f3c6bd9178',
      email: {
        confirmation: 'optional',
      }
    }
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