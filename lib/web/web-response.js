var argmnts = require('./arguments')
var nunjucks = require('nunjucks')
var path = require('path')

module.exports = function(core, sandbox, req, res, private) {

  var wrap = function() {
    return private.wrap.apply(this, arguments)
  }

  var result = private.result

  sandbox.response = {}

  sandbox.response.status = function(value) {
    if (!value) return result.status
    result.status = value
  }

  sandbox.response.contentType = function(value) {
    if (!value) return result.contentType
    result.contentType = value
  }

  sandbox.response.set = function(header, value) {
    header = header+'' || ''
    if (!header) return
    result.headers[header.toLowerCase()] = value
  }

  sandbox.response.get = function(header) {
    header = header+'' || ''
    if (!header) return null
    return result.headers[header.toLowerCase()]
  }

  sandbox.response.redirect = function(url) {
    result.redirect = url
  }

  sandbox.response.send = function(body) {
    private.result.body = ''+body
  }

  sandbox.response.json = function(object) {
    if (typeof object === 'string') {
      result.contentType = 'application/json;charset=utf-8'
      result.body = object
    } else {
      var env = core.project.env
      var body = env === 'pro' ? JSON.stringify(object) : JSON.stringify(object, null, 4)
      var callbackname = sandbox.request.query.callback
      if (callbackname) {
        result.contentType = 'application/javascript;charset=utf-8'
        result.body = callbackname+' && '+callbackname+'('+body+')'
      } else {
        result.contentType = 'application/json;charset=utf-8'
        result.body = body
      }
    }
  }

  sandbox.response.render = function() {
    var args       = argmnts(arguments, false)
    var view       = args.next('view')
    var options    = args.nextObject('options', true)
    var autoescape = args.nextBoolean('autoescaping', true)

    var webVersion = core.project.webVersion
    var views = path.join(core.fs.root, 'web', webVersion, 'views')

    var env = new nunjucks.Environment(new nunjucks.FileSystemLoader(views), { autoescape: autoescape === true })
    env.getTemplate(view, wrap(function(err, tmpl) {
      if (err) throw err

      try {
        var filters = sandbox.require('filters.js')
      } catch (err) {
        // ignore. That file is not required
      }
      
      if (filters) {
        for (var key in filters) {
          if (filters.hasOwnProperty(key)) {
            var filter = filters[key]
            env.addFilter(key, filter)
          }
        }
      }
      try {
        private.result.headers['Content-Type'] = 'text/html;charset=utf-8'
        private.result.body = tmpl.render(options)
      } catch(err) {
        err.templateString = tmpl.tmplStr
        throw err
      }
    }))
  }

  sandbox.response.sendFile = function() {
  }
}
