function todo(req, res) {
  res.end('TODO')
}

module.exports.configure = function(app, middleware) {

  app.get('/push/subscribed-channels', todo)
  app.get('/push/unsubscribe-all', todo)
  app.post('/push/subscribe', todo)
  app.post('/push/unsubscribe', todo)
  app.post('/push/send', todo)

}
