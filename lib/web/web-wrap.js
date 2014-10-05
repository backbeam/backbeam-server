var _ = require('underscore')
var sprintf = require('sprintf')

module.exports = function(core, sandbox, req, res, private) {

  var callbacks = 0

  /*
   * This function has two porpouses
   * - Handles exceptions gracefully. Prevents the process to terminate due to thrown exceptions.
   * - Increments and decrements the "callbacks" counter to know exactly when the script has finished executing
   */
  private.wrap = function(callback) {
    function decr(err) {
      callbacks--
      if (err) {
        return scriptError(err)
      }
      if (callbacks === 0) {
        exit()
      }
    }

    if (!private.result) {
      callback = function(){} // stops further code execution
    }
    callbacks++
    var wrapped = function() {
      var args = Array.prototype.slice.call(arguments)
      if (callback && typeof callback == 'function') {
        try {
          callback.apply(null, args)
        } catch(e) {
          return decr(e)
        }
      }
      decr()
    }
    var berror = new Error()
    wrapped.throwError = function(err) {
      berror.message = err.message
      berror.templateString = err.templateString
      throw berror
    }
    return wrapped
  }

  function exit(result) {
    result = result || private.result
    if (!result) return
    private.result = null

    if (result.status) {
      res.status(result.status)
    }
    res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0') // TODO: should be configurable
    if (result.contentType) {
      res.setHeader('Content-Type', result.contentType)
    }
    var sdk = false // TODO
    var cookieName = core.project.name
    if (result.session && !sdk) {
      res.cookie(cookieName, result.session, { signed: true })
    }
    if (result.authCode && !sdk) {
      res.cookie(authCookieName, result.authCode, { signed: true })
    } else if (result.authCode === null) {
      res.clearCookie(authCookieName)
    }

    if (result.headers) {
      res.set(result.headers)
    }

    if (result.redirect) {
      res.redirect(result.redirect)
    } else if (result.body) {
      if (typeof result.body !== 'string') {
        result.body = ''+result.body
      }
      res.end(result.body)
    } else if (result.file) {
      controllers.sendFile(req, res, result.file, result.fileVersion, result.fileOptions, function(err) {
        // TODO: if err
      })
    } else if (result.error) {
      res.end(result.error)
    } else {
      if (!result.status || result.status === 200) {
        res.status(204)
      }
      res.end()
    }

    if (result.realTimeEvents) {
      for (var i = 0; i < result.realTimeEvents.length; i++) {
        var event = result.realTimeEvents[i]
        realtime.send(event.room, event.data)
      }
    }
  }

  function scriptError(err) {
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
      'URL: '+sandbox.request.method+' '+sandbox.request.url,
      'Route: '+private.path
    ]
    if (_.size(sandbox.request.params) > 0) {
      arr.push('Params: \n'+debugDictionary(sandbox.request.params))
    }
    if (_.size(sandbox.request.query) > 0) {
      arr.push('Query: \n'+debugDictionary(sandbox.request.query))
    }
    if (_.size(sandbox.request.body) > 0) {
      arr.push('Body: \n'+debugDictionary(sandbox.request.body))
    }
    // if (_.size(filesInfo) > 0) {
    //   arr.push('Files: \n'+debugDictionary(filesInfo))
    // }
    arr.push('Headers: \n'+debugDictionary(sandbox.request.headers))
    arr.push('Browser: \n'+debugDictionary(sandbox.browser))
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

      exit({
        status: 500,
        contentType: 'text/html;charset=utf-8',
        body: body,
      })
    } else {
      // core.views.render500(ops.version, 'html', function(err, output) {
      //   exit({ status:500, contentType:'text/html;charset=utf-8', body: output || 'Internal error' })
      // })
    }
  }

}
