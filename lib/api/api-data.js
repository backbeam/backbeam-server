var utils = require('./api-utils')
var errors = require('node-errors')
var nook = errors.nook
var path = require('path')

function list(req, res, next) {
  var core = req.core

  var args = {
    entity: req.params.entity,
    query: req.query.q || null,
    params: utils.getParams(req),
    limit: +req.query.limit,
    offset: +req.query.offset,
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

function saveFile(req, res, next) {
  var core = req.core
  var id = req.params.id
  if (id === '_new') {
    id = null
  }

  var file = req.files && req.files.file
  if (!file) {
    return next(errors.request('MissingFile: You must upload a file'))
  }

  var data = {}
  data['set-filename'] = file.originalname
  data['set-mime'] = file.mimetype
  data['set-size'] = file.size
  data['set-title'] = req.body.title || data['set-filename']
  data['set-description'] = req.body.description

  var args = {
    data: data,
    id: id,
    filepath: file.path,
  }

  core.db.saveFile(args, nook(next,
    function(object) {
      var objects = {}
      objects[object._id] = object
      var response = {
        status: 'Success',
        id: object._id,
        objects: utils.denormalizeDictionary(objects)
      }
      res.status(id ? 200 : 201)
      res.jsonp(response)
    })
  )
}

function downloadFile(req, res, next) {
  var core = req.core
  var id = req.params.id
  var version = req.params.version

  var args = {
    entity: 'file',
    id: id,
  }
  core.db.readObjects(args, nook(next,
    function(objects) {
      var obj = objects[id]
      var storage = core.config.fs.storage
      var vrsion = obj.get('version') || 0
      var filepath = path.join(storage, id, String(vrsion))
      var cacheControl = +version === obj.get('version') ?
                        'public, max-age=31556926' :
                        'public, max-age=604800' // 1 year or 1 week

      var contentType = obj.get('mime') || 'application/octet-stream'
      var range = req.header('Range')
      if (!range) {
        res.contentType(contentType)
        res.header('Cache-Control', cacheControl)
        res.sendFile(filepath)
      } else {
        fs.stat(filepath, nook(next,
          function(stat) {
            if (!stat.isFile()) {
              return callback(errors.notFound('FileNotFound'))
            }
            var start = +range.slice(range.indexOf('bytes=')+6, range.indexOf('-'))
            var end = +range.slice(range.indexOf('-')+1, range.length)
            end = end || stat.size - 1
            if (start > end) {
              /* HTTP/1.1 416 Requested Range Not Satisfiable */
              res.writeHead(416, {})
              return res.end()
            }

            res.writeHead(206, {
              'Date': new Date().toUTCString(),
              'Content-Range':'bytes '+start+'-'+end+'/'+stat.size,
            })
            res.contentType(contentType)
            res.header('Cache-Control', cacheControl)
            var stream = fs.createReadStream(filepath, {
              flags: 'r',
              start: start,
              end: end,
            })
            stream.pipe(res)
          }
        ))
      }
    })
  )
}

function bounding(req, res, next) {
  var core = req.core
  var args = {
    entity: req.params.entity,
    query: req.query.q,
    field: req.params.field,
    limit: +req.query.limit,
    swlat: +req.query.swlat || 0,
    nelat: +req.query.nelat || 0,
    swlon: +req.query.swlon || 0,
    nelon: +req.query.nelon || 0,
    params: utils.getParams(req)
  }

  core.db.bounding(args, nook(next,
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

function near(req, res, next) {
  var core = req.core
  var args = {
    entity: req.params.entity,
    query: req.query.q,
    field: req.params.field,
    limit: +req.query.limit,
    lat: +req.query.lat || 0,
    lon: +req.query.lon || 0,
    params: utils.getParams(req)
  }

  core.db.near(args, nook(next,
    function(ids, objects, count, distances) {
      res.jsonp({
        status:'Success',
        objects: utils.denormalizeDictionary(objects),
        ids: ids,
        count: count,
        distances: distances,
      })
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
    near)

  app.get('/data/:entity/bounding/:field',
    middleware.requiresSignature(true),
    bounding)

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
    saveFile)

  app.put('/data/file/upload/:id',
    middleware.requiresSignature(true),
    saveFile)

  app.get('/data/file/download/:id',
    middleware.requiresSignature(false),
    downloadFile)

  app.get('/data/file/download/:id/:version',
    middleware.requiresSignature(false),
    downloadFile)

}
