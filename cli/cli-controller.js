var txain = require('txain')
var utils = require('./utils')
var fs = require('fs')
var path = require('path')

var cliOptions = [
  { short: 'm', key: 'method', type: 's', name: 'HTTP method', required: true, values: ['GET', 'POST', 'PUT', 'DELETE'] },
  { short: 'p', key: 'path', type: 's', name: 'Path', required: true },
  { short: 'f', key: 'filename', type: 's', name: 'File name', required: true },
  { short: 'o', key: 'open', name: 'Open controller in text editor' },
  { short: 't', key: 'template', type: 's', name: 'File template', values: ['query', 'create', 'read', 'update', 'delete'] },
]

utils.cliOptions(cliOptions, function(values) {

  var source = ''
  if (values.template) {
    source = fs.readFileSync(path.join(__dirname, 'templates', 'controller-'+values.template+'.js'), 'utf8')
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
      require('open-text-editor').open(body.controller, 0)
    }
  })
})

