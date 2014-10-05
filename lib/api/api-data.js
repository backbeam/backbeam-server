function todo(req, res, next) {
  res.end('TODO')
}

module.exports.configure = function(app, server) {

  app.get('/data/:entity', todo)
  app.get('/data/:entity/near/:field', todo)
  app.get('/data/:entity/bounding/:field', todo)
  app.get('/data/:entity/:id', todo)
  app.post('/data/:entity', todo)
  app.put('/data/:entity/:id', todo)
  app.delete('/data/:entity', todo)
  app.delete('/data/:entity/:id', todo)
  app.post('/data/file/upload', todo)
  app.put('/data/file/upload/:id', todo)
  app.get('/data/file/download/:id', todo) // limited signature
  app.get('/data/file/download/:id/:version', todo) // limited signature

}
