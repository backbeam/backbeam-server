var argmnts = require('./arguments')
var nunjucks = require('nunjucks')
var path = require('path')

module.exports = function(core, sandbox, req, res, private) {

  var result = private.result

  sandbox.response = {}

  sandbox.response.status = function(value) {
    if (!value) return res.status()
    res.status(value)
  }

  sandbox.response.contentType = function(value) {
    if (!value) return res.get('content-type')
    res.contentType(value)
  }

  sandbox.response.set = function(header, value) {
    res.set(header, value)
  }

  sandbox.response.get = function(header) {
    return res.get(header)
  }

  sandbox.response.redirect = function(url) {
    res.redirect(url)
  }

  sandbox.response.send = function(body) {
    res.send(body)
  }

  sandbox.response.json = function(object) {
    if (typeof object === 'string') {
      res.contentType('application/json;charset=utf-8')
      res.send(object)
    } else {
      var env = core.project.env
      var body = env === 'pro' ? JSON.stringify(object) : JSON.stringify(object, null, 4)
      var callbackname = sandbox.request.query.callback
      if (callbackname) {
        res.contentType('application/javascript;charset=utf-8')
        res.send(callbackname+' && '+callbackname+'('+body+')')
      } else {
        res.contentType('application/json;charset=utf-8')
        res.send(body)
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
    env.getTemplate(view, function(err, tmpl) {
      if (err) return private.caught(err)

      try {
        var filters = sandbox.require('../libs/filters.js')
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
        res.contentType('text/html;charset=utf-8')
        res.send(tmpl.render(options))
      } catch(err) {
        err.templateString = tmpl.tmplStr
        return private.caught(err)
      }
    })
  }

  sandbox.response.sendFile = function() {
  }
}
