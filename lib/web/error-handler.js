var _ = require('underscore')
var sprintf = require('sprintf')

module.exports = function(err, req, res, next) {
  var private = req.private
  if (!private) return next(err)

  function debugDictionary(obj) {
    if (typeof obj === 'string') return obj
    var arr = []
    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        var str = obj[key]
        if (!_.isString(str)) {
          str = JSON.stringify(str) // e.g req.files, or mutivalued req.query.foo, req.body.foo
        }
        arr.push('    '+key+': '+str)
      }
    }
    return arr.join('\n')
  }
  var arr = [
    'URL: '+req.method+' '+req.url,
    'Route: '+private.path
  ]
  if (_.size(req.params) > 0) {
    arr.push('Params: \n'+debugDictionary(req.params))
  }
  if (_.size(req.query) > 0) {
    arr.push('Query: \n'+debugDictionary(req.query))
  }
  if (_.size(req.body) > 0) {
    arr.push('Body: \n'+debugDictionary(req.body))
  }
  // if (_.size(filesInfo) > 0) {
  //   arr.push('Files: \n'+debugDictionary(filesInfo))
  // }
  arr.push('Headers: \n'+debugDictionary(req.headers))
  // arr.push('Browser: \n'+debugDictionary(sandbox.browser))
  var message = err.message
  var context = arr.join('\n')

  var stack = (err.stack || '').split('\n')
  // core.logs.log({ message:message, tag:'error', stack:stack.join('\n'), context:context })
  if (true) { // core.projects.env === 'dev') {
    var body = '<!DOCTYPE html>'
    body += '<html lang="en"><html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
    body += '<head><style>h1, h2 { color: #444 } code { display:inline-block; margin:0; padding:1px; white-space: pre } code.error { background-color: #f77; color: white } h1,h2 { font-family: \'Helvetica Neue\', Helvetica, Arial, sans-serif } pre { Menlo, Monaco, \'Courier New\', monospace } .code { overflow: auto; border: 1px solid #ccc; background-color: #eee; padding: 20px; border-radius: 3px }</style></head><body>'
    body += '<h1>'+err.message+'</h1>'
    body += '<h2>Stack trace</h2><div class="code">'

    function escape(str) {
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;')
    }

    var locations = []
    for (var i=0; i<stack.length; i++) {
      var line = stack[i]
      body += '<code>'+escape(line)+'</code><br>'

      var filename = private.filename
      var n = line.indexOf(filename)
      if (n > 0) {
        var location = line.substring(n+filename.length+1)
        var x = location.indexOf(')')
        if (x > 0) { location = location.substring(0, x) }
        var arr = location.split(':')
        if (arr.length == 2) {
          var _lin = parseInt(arr[0], 10)
          var _chr = parseInt(arr[1], 10)
          locations.push([_lin, _chr])
        }
      }
    }

    body += '</div><h2>Source code</h2><div class="code">'

    function showSourceLines(code, locations) {
      var sourceLines = code.split('\n')
      var max = sourceLines.length.toString().length
      for (var i=0; i<sourceLines.length; i++) {
        var clazz = ''
        for (var j=0; j<locations.length; j++) {
          var location = locations[j]
          if (location[0] === i+1) {
            clazz = 'error'
            break
          }
        }
        body += sprintf('<code class="%s">%'+max+'d: %s</code><br>', clazz, i+1, escape(sourceLines[i]))
      }
    }

    showSourceLines(private.code, locations)

    body += '</div>'

    if (err.templateString) {
      body += '<h2>Template</h2><div class="code">'

      locations = []
      var match = err.message.match(/\[Line (\d+), Column (\d+)\]/)
      if (match) {
        locations.push([+match[1], +match[2]])
      }
      showSourceLines(err.templateString, locations)
      body += '</div>'
    }

    body += '<h2>Request information</h2><div class="code"><pre>\n'+escape(context)+'</pre></div>'

    body += '</body></html>'

    res.status(500)
    res.contentType('text/html')
    res.send(body)
  } else {
    // core.views.render500(ops.version, 'html', function(err, output) {
    //   exit({ status:500, contentType:'text/html;charset=utf-8', body: output || 'Internal error' })
    // })
  }
}
