var argmnts = require('./arguments')
var nunjucks = require('nunjucks')
var jade = require('jade')
var path = require('path')

module.exports = function(core, sandbox, req, res, private) {

  var result = private.result

  var response = sandbox.response = {}

  response.writableStream = function() {
    return res
  }

  response.status = function(value) {
    if (!value) return res.status()
    res.status(value)
  }

  response.contentType = function(value) {
    if (!value) return res.get('content-type')
    res.contentType(value)
  }

  response.set = function(header, value) {
    res.set(header, value)
  }

  response.get = function(header) {
    return res.get(header)
  }

  response.redirect = function(url) {
    res.redirect(url)
  }

  response.send = function(body) {
    res.send(body)
  }

  response.json = function(object) {
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

  response.render = function() {
    var args = argmnts(arguments, false)
    var view = args.next('view')
    var options = args.nextObject('options', true)

    try {
      var filters = sandbox.require('../libs/filters.js')
    } catch (err) {
      console.log('err', err.stack)
      // ignore. That file is not required
    }
    
    function renderNunjucks(callback) {
      var autoescape = args.nextBoolean('autoescaping', true)
      var views = path.join(core.fs.root, 'web', 'views')
      var env = new nunjucks.Environment(new nunjucks.FileSystemLoader(views), { autoescape: autoescape === true })
      env.getTemplate(view, function(err, tmpl) {
        if (err) return private.caught(err)

        if (filters) {
          for (var key in filters) {
            if (filters.hasOwnProperty(key)) {
              var filter = filters[key]
              env.addFilter(key, filter)
            }
          }
        }
        try {
          return callback(null, tmpl.render(options))
        } catch(err) {
          err.templateString = tmpl.tmplStr
          callback(err)
        }
      })
    }

    function renderJade(callback) {
      var views = path.join(core.fs.root, 'web', 'views')
      var fullpath = path.join(views, view)
      if (filters) {
        options = options || {}
        options.filters = filters
      }
      try {
        return callback(null, jade.renderFile(fullpath, options))
      } catch(err) {
        // TODO: templateString
        // err.templateString = tmpl.tmplStr
        callback(err)
      }
    }

    var engines = {
      '.html': renderNunjucks,
      '.jade': renderJade,
    }

    var extname = path.extname(view)
    var engine = engines[extname] || renderNunjucks
    engine(function(err, html) {
      if (err) {
        return private.caught(err)
      }
      res.contentType('text/html;charset=utf-8')
      res.send(html)
    })
  }

  response.sendFile = function(obj, attachment) {
    // TODO: var range = req.header('Range')
    var storage = core.config.fs.storage
    var version = obj.get('version') || 0
    var filepath = path.join(storage, obj.id(), String(version))

    var contentType = obj.get('mime') || 'application/octet-stream'
    res.contentType(contentType)
    if (attachment) {
      res.download(filepath, obj.get('filename'))
    } else {
      res.sendFile(filepath)
    }
  }
}
