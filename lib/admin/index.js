var errors = require('node-errors')
var nook = errors.nook
var path = require('path')
var jade = require('jade')
var serveStatic = require('serve-static')

module.exports.configure = function(app, server) {
  
  var middleware = {}
  var utils = {}

  utils.render = function(res, filename, options) {
    var fullpath = path.join(__dirname, 'views', filename)
    var html = jade.renderFile(fullpath, options)
    res.contentType('text/html')
    res.send(html)
  }

  console.log('dirname', path.join(__dirname, 'public'))
  app.use(serveStatic(path.join(__dirname, 'public'), {
    maxAge: 24 * 60 * 60 * 1000,
  }))

  require('./admin-dashboard').configure(app, server, middleware, utils)

  require('./admin-db').configure(app, server, middleware, utils)

}
