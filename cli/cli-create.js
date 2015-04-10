var fs = require('fs')
var path = require('path')
var mkdirp = require('mkdirp')
var txain = require('txain')
var colors = require('colors')
var program = require('commander')
var version = require('../package.json').version
var crypto = require('crypto')
var _ = require('underscore')

exports.run = function(argv) {
  program
    .version(version)
    .option('-d, --directory [<s>]', 'Directory where the project has to be created', process.cwd())
    .parse(argv || process.argv)

  console.log('Creating project at %s', program.directory)
  var projectName = path.basename(program.directory)

  txain(function(callback) {
    // configuration
    var configFile = path.join(program.directory, 'config.json')
    var exists = fs.existsSync(configFile)
    if (exists) return callback()
    var data = {
      project: {
        name: projectName,
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
      email: {
        transport: {
          service: 'stub',
        },
        from: 'user@example.com',
        inline: true,
      },
      authentication: {
        sessionKey: crypto.randomBytes(32).toString('hex'),
        email: {
          confirmation: 'optional',
        }
      }
    }
    data.api.keys[randomToken(16)] = randomToken(32)
    fs.writeFile(configFile, JSON.stringify(data, null, 2), 'utf8', callback)
  })
  .then(function(callback) {
    // test configuration
    var configFile = path.join(program.directory, 'config-test.json')
    var exists = fs.existsSync(configFile)
    if (exists) return callback()
    var data = {
      project: {
        name: projectName,
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
      email: {
        transport: {
          service: 'stub',
        },
        from: 'user@example.com',
        inline: true,
      },
      authentication: {
        sessionKey: crypto.randomBytes(32).toString('hex'),
        email: {
          confirmation: 'optional',
        }
      }
    }
    data.api.keys[randomToken(16)] = randomToken(32)
    fs.writeFile(configFile, JSON.stringify(data, null, 2), 'utf8', callback)
  })

  })
  .then(function(callback) {
    var modelFile = path.join(program.directory, 'model.json')
    var exists = fs.existsSync(modelFile)
    if (exists) return callback()
    var model = {
      entities: [
        {
          id: 'item',
          fields: [
            {
              id: 'name',
              type: 'text',
              mandatory: true,
            }
          ]
        }
      ]
    }
    fs.writeFile(modelFile, JSON.stringify(model, null, 2), 'utf8', callback)
  })
  .then(function(callback) {
    // directories
    var dirs = [
      'push',
      'files',
      'web/assets',
      'web/views',
      'web/controllers',
      'web/libs',
      'email_templates',
      'test',
    ]
    dirs = dirs.map(function(dir) {
      return path.join(program.directory, dir)
    })
    txain(dirs).each(mkdirp).end(callback)
  })
  .then(function(callback) {
    callback(null, _.keys(emailTemplates))
  })
  .each(function(type, callback) {
    var template = emailTemplates[type]
    var fullpath = path.join(program.directory, 'email_templates', type)
    txain(mkdirp, fullpath)
    .then(function(callback) {
      callback(null, _.keys(template))
    })
    .each(function(part, callback) {
      var source = template[part]
      fs.writeFile(path.join(fullpath, type+'.'+part), source, 'utf8', callback)
    })
    .end(callback)
  })
  .then(function(callback) {
    // routes
    var routesFile = path.join(program.directory, 'web/controllers/routes.json')
    var exists = fs.existsSync(routesFile)
    if (exists) return callback()
    var data = [
      {
        method: 'GET',
        path: '/',
        file: 'home.js',
        action: 'run',
      }
    ]
    fs.writeFile(routesFile, JSON.stringify(data, null, 2), 'utf8', callback)
  })
  .then(function(callback) {
    // home controller
    var controllerFile = path.join(program.directory, 'web/controllers/home.js')
    var exists = fs.existsSync(controllerFile)
    if (exists) return callback()
    var code = [
      'exports.run = function(backbeam, req, res, libs) {',
      '  res.send(\'Hello world\')'
      '}'
    ].join('\n')
    fs.writeFile(controllerFile, code, 'utf8', callback)
  })
  .then(function(callback) {
    var packageJson = path.join(program.directory, 'package.json')
    var exists = fs.existsSync(packageJson)
    if (exists) return callback()

    var data = {
      name: projectName,
      version: '1.0.0',
      description: 'Node.js app made with Backbeam',
      scripts: {
        start: 'backbeam start',
        test: 'NODE_ENV=test mocha --bail --reporter spec test/',
      },
      author: {
        name: process.env.USER || '',
      },
      license: 'ISC',
      dependencies: {
        'backbeam-server': '^'+version,
      },
      devDependencies: {
        'mocha': '^1.21.4',
      }
      keywords: ['backbeam'],
    }
    fs.writeFile(packageJson, JSON.stringify(data, null, 2), 'utf8', callback)
  })
  .then(function(callback) {
    var testUtils = path.join(program.directory, 'test', 'test-utils.js')
    var exists = fs.existsSync(testUtils)
    if (exists) return callback()

    var code = [
      'var txain = require(\'txain\')',
      'var assert = require(\'assert\')',
      '',
      'var request = require(\'supertest\')(require(\'../app\').app)',
      'exports.request = request',
      '',
      'exports.cleanDatabase = function(callback) {',
      '  txain(function(callback) {',
      '    request',
      '      .post(\'/admin/delete-data\')',
      '      .end(function(err, res) {',
      '        assert.ifError(err)',
      '        assert.equal(200, res.statusCode, res.text)',
      '        callback()',
      '      })',
      '  })',
      '  .then(function(callback) {',
      '    request',
      '      .post(\'/admin/migrate\')',
      '      .end(function(err, res) {',
      '        assert.ifError(err)',
      '        assert.equal(200, res.statusCode, res.text)',
      '        callback()',
      '      })',
      '  })',
      '  .end(function(err) {',
      '    assert.ifError(err)',
      '    callback()',
      '  })',
      '}',
    ].join('\n')
    fs.writeFile(testUtils, code, 'utf8', callback)
  })
  .end(function(err) {
    if (err) {
      return console.error(err.stack.red)
    }
    console.log('Done')
  })

  function randomToken(len) {
    return crypto.randomBytes(len).toString('hex')
  }

  var host = 'localhost'
  var emailTemplates = {
    registration: {
      subject: 'Welcome',
      txt: [
          'Hi there,',
          'We need to verify your email address.',
          'Just click here: http://'+host+'/common/verify/{{code}}',
        ].join('\n\n'),
      html: [
          'Hi there,<br><br>',
          'We need to verify your email address.<br><br>',
          'Just click <a href="http://'+host+'/common/verify/{{code}}">here</a>',
        ].join('\n\n'),
    },
    lostpassword: {
      subject: 'Reset your password',
      txt: [
          'Hi there,',
          'Did you forget your password? Ok, click here for instructions',
          'http://'+host+'/common/setpassword/{{code}}',
        ].join('\n\n'),
      html: [
          'Hi there,<br><br>',
          'Did you forget your password? Ok, click',
          '<a href="http://'+host+'/common/setpassword/{{code}}">here</a> for instructions',
        ].join('\n\n'),
    },
    confirm: {
      subject: 'Confirm your new email address',
      txt: [
          'Hi there,',
          'We need to verify your email address.',
          'Just click here: http://'+host+'/common/verify/{{code}}',
        ].join('\n\n'),
      html: [
          'Hi there,',
          '<br><br> We need to verify your email address.<br><br>',
          'Just click <a href="http://'+host+'/common/verify/{{code}}">here</a>',
      ].join('\n\n')
    }
  }
}

if (module.id === require.main.id) {
  exports.run()
}
