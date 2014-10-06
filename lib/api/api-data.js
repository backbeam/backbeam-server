var utils = require('./api-utils')
var errors = require('node-errors')
var nook = errors.nook

function list(req, res, next) {
  var core = req.core

  var args = {
    entity: req.params.entity,
    query: req.params.query || null,
    // TODO: query, joins and params
  }
  
  core.db.list(args, nook(next,
    function(ids, objects, count) {
      res.jsonp({
        status:'Success',
        objects: utils.denormalizeDictionary(objects),
        ids: ids,
        count: count,
      })
    })
  )
}

function read(req, res, next) {
  var core = req.core
  var id = req.params.id

  var args = {
    entity: req.params.entity,
    id: id,
    // TODO: joins and params
  }
  
  core.db.readObjects(args, nook(next,
    function(objects) {
      res.jsonp({
        status: 'Success',
        id: id,
        objects: utils.denormalizeDictionary(objects),
      })
    })
  )
}

function insert(req, res, next) {
  var core = req.core

  var args = {
    entity: req.params.entity,
    commands: req.body,
  }

  core.db.save(args, nook(next,
    function(object, authCode) {
      var objects = {}
      objects[object._id] = object
      var response = {
        status: 'Success',
        id: object._id,
        objects: utils.denormalizeDictionary(objects)
      }
      if (authCode) {
        response.auth = authCode
      }
      res.status(201)
      res.jsonp(response)
    })
  )
}

function update(req, res, next) {
  var core = req.core
  var id = req.params.id

  var args = {
    entity: req.params.entity,
    commands: req.body,
    id: id,
  }

  core.db.save(args, nook(next,
    function(object, authCode) {
      var objects = {}
      objects[object._id] = object
      var response = {
        status: 'Success',
        id: id,
        objects: utils.denormalizeDictionary(objects)
      }
      res.status(200)
      res.jsonp(response)
    })
  )
}

function remove(req, res, next) {
  var core = req.core
  var id = req.params.id

  var args = {
    entity: req.params.entity,
    id: id,
  }

  core.db.remove(args, nook(next,
    function(object) {
      var objects = {}
      objects[object._id] = object
      var response = {
        status: 'Success',
        id: id,
        objects: utils.denormalizeDictionary(object),
      }
      res.status(200)
      res.jsonp(response)
    })
  )
}

function todo(req, res, next) {
  res.end('TODO')
}

module.exports.configure = function(app, middleware) {

  // queries
  app.get('/data/:entity',
    middleware.requiresSignature(true),
    list)

  app.get('/data/:entity/near/:field',
    middleware.requiresSignature(true),
    todo)

  app.get('/data/:entity/bounding/:field',
    middleware.requiresSignature(true),
    todo)

  // create/insert
  app.post('/data/:entity',
    middleware.requiresSignature(true),
    insert)

  // read
  app.get('/data/:entity/:id',
    middleware.requiresSignature(true),
    read)

  // update
  app.put('/data/:entity/:id',
    middleware.requiresSignature(true),
    update)

  // delete
  app.delete('/data/:entity',
    middleware.requiresSignature(true),
    todo)

  app.delete('/data/:entity/:id',
    middleware.requiresSignature(true),
    remove)

  // files
  app.post('/data/file/upload',
    middleware.requiresSignature(true),
    todo)

  app.put('/data/file/upload/:id',
    middleware.requiresSignature(true),
    todo)

  app.get('/data/file/download/:id',
    middleware.requiresSignature(false),
    todo)

  app.get('/data/file/download/:id/:version',
    middleware.requiresSignature(false),
    todo)

}
