var txain = require('txain')
var utils = require('./utils')
var fs = require('fs')
var path = require('path')

exports.run = function(argv) {
  var cliOptions = [
    { short: 'm', key: 'method', type: 's', name: 'HTTP method', required: true, values: ['GET', 'POST', 'PUT', 'DELETE'] },
    { short: 'p', key: 'path', type: 's', name: 'Path', required: true },
    { short: 'f', key: 'filename', type: 's', name: 'File name', required: true },
    { short: 't', key: 'template', type: 's', name: 'File template', values: ['query', 'create', 'read', 'update', 'delete'] },
    { short: 'x', key: 'js-method', type: 's', name: 'Action', required: true },
  ]

  utils.cliOptions(argv, cliOptions, function(values) {

    var source = ''
    if (values.template) {
      source = fs.readFileSync(path.join(__dirname, 'templates', 'controller-'+values.template+'.js'), 'utf8')
      source = source.replace(/#action#/g, values['js-method'])
    }

    var options = {
      method: 'POST',
      form: {
        source: source,
        method: values.method,
        path: values.path,
        filename: values.filename,
      }
    }
    utils.request(values, '/web/controller', options, function(body) {
      if (values.open) {
        require('open-text-editor').open(body.controller, 0, function(err) {})
      }
    })
  })
}

if (module.id === require.main.id) {
  exports.run()
}
