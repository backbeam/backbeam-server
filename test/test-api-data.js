var assert = require('assert')
var utils = require('./test-utils')
var txain  = require('txain')
var _ = require('underscore')
var request = utils.request
var app = require('./app')()

var shared = 'foo'
var secret = 'bar'

describe('Test API for data manipulation', function() {

  var name1 = 'Item name', name2 = 'Other item name'
  var id1, id2

  before(function(done) {
    txain(function(callback) {
      utils.migrate(app, callback)
    })
    .then(function(callback) {
      utils.deleteData(app, callback)
    })
    .end(done)
  })

  it('should insert an object', function(done) {
    request(app)
      .api({
        path: '/api/data/item',
        method: 'post',
        shared: shared,
        secret: secret,
        form: {
          'set-name': name1,
          'set-units': 100,
        },
      })
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.statusCode, 201)
        assert.ok(res.body)
        assert.equal(res.body.status, 'Success')
        assert.ok(res.body.id)
        id1 = res.body.id
        assert.ok(res.body.objects)
        assert.ok(res.body.objects[id1])

        var object = res.body.objects[id1]
        assert.equal(object['name#t'], name1)
        assert.ok(object.created_at)
        assert.ok(object.updated_at)
        assert.equal(object['type'], 'item')
        done()
      })
  })

  it('should insert another object', function(done) {
    request(app)
      .api({
        path: '/api/data/item',
        method: 'post',
        shared: shared,
        secret: secret,
        form: {
          'set-name': name2,
        },
      })
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.statusCode, 201)
        assert.ok(res.body)
        assert.equal(res.body.status, 'Success')
        assert.ok(res.body.id)
        id2 = res.body.id
        assert.ok(res.body.objects)
        assert.ok(res.body.objects[id2])

        var object = res.body.objects[id2]
        assert.equal(object['name#t'], name2)
        assert.ok(object.created_at)
        assert.ok(object.updated_at)
        assert.equal(object['type'], 'item')
        done()
      })
  })

  it('should read an object', function(done) {
    request(app)
      .api({
        path: '/api/data/item/'+id1,
        method: 'get',
        shared: shared,
        secret: secret,
      })
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.statusCode, 200)
        assert.ok(res.body)
        assert.equal(res.body.status, 'Success')
        assert.ok(res.body.id)
        assert.ok(res.body.objects)
        assert.ok(res.body.objects[id1])
        
        var object = res.body.objects[id1]
        assert.equal(object['name#t'], name1)
        assert.ok(object.created_at)
        assert.ok(object.updated_at)
        assert.equal(object['type'], 'item')
        done()
      })
  })

  it('should update an object', function(done) {
    name1 = 'Other name'

    request(app)
      .api({
        path: '/api/data/item/'+id1,
        method: 'put',
        shared: shared,
        secret: secret,
        form: {
          'set-name': name1,
          'incr-units': 1,
        },
      })
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.statusCode, 200)
        assert.ok(res.body)
        assert.equal(res.body.status, 'Success')
        assert.ok(res.body.id)
        assert.ok(res.body.objects)
        assert.ok(res.body.objects[id1])
        
        var object = res.body.objects[id1]
        assert.equal(object['name#t'], name1)
        assert.equal(object['units#n'], 101)
        assert.ok(object.created_at)
        assert.ok(object.updated_at)
        assert.equal(object['type'], 'item')
        done()
      })
  })

  it('should perform a query', function(done) {
    request(app)
      .api({
        path: '/api/data/item/',
        method: 'get',
        shared: shared,
        secret: secret,
      })
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.statusCode, 200)
        assert.ok(res.body)
        assert.equal(res.body.status, 'Success')
        assert.ok(res.body.ids)
        assert.equal(res.body.ids.length, 2)
        assert.ok(res.body.ids.indexOf(id1) >= 0)
        assert.ok(res.body.objects)
        assert.ok(res.body.objects[id1])
        
        var object = res.body.objects[id1]
        assert.equal(object['name#t'], name1)
        assert.ok(object.created_at)
        assert.ok(object.updated_at)
        assert.equal(object['type'], 'item')
        done()
      })
  })

  it('should perform a query with limit', function(done) {
    request(app)
      .api({
        path: '/api/data/item/',
        method: 'get',
        shared: shared,
        secret: secret,
        qs: {
          limit: 1,
        }
      })
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.statusCode, 200)
        assert.ok(res.body)
        assert.equal(res.body.status, 'Success')
        assert.ok(res.body.ids)
        assert.equal(res.body.ids.length, 1)
        assert.equal(res.body.ids[0], id1)
        assert.ok(res.body.objects)
        assert.ok(res.body.objects[id1])
        
        var object = res.body.objects[id1]
        assert.equal(object['name#t'], name1)
        assert.ok(object.created_at)
        assert.ok(object.updated_at)
        assert.equal(object['type'], 'item')

        done()
      })
  })

  it('should perform a query with limit and offset', function(done) {
    request(app)
      .api({
        path: '/api/data/item/',
        method: 'get',
        shared: shared,
        secret: secret,
        qs: {
          limit: 1,
          offset: 1,
        }
      })
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.statusCode, 200)
        assert.ok(res.body)
        assert.equal(res.body.status, 'Success')
        assert.ok(res.body.ids)
        assert.equal(res.body.ids.length, 1)
        assert.equal(res.body.ids[0], id2)
        assert.ok(res.body.objects)
        assert.ok(res.body.objects[id2])
        
        var object = res.body.objects[id2]
        assert.equal(object['name#t'], name2)
        assert.ok(object.created_at)
        assert.ok(object.updated_at)
        assert.equal(object['type'], 'item')

        done()
      })
  })

  it('should test an empty query', function(done) {
    request(app)
      .api({
        path: '/api/data/item/',
        method: 'get',
        shared: shared,
        secret: secret,
        qs: {
          limit: 1,
          offset: 2,
        }
      })
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.statusCode, 200)
        assert.ok(res.body)
        assert.equal(res.body.status, 'Success')
        assert.ok(res.body.ids)
        assert.equal(res.body.ids.length, 0)

        done()
      })
  })

  it('should remove an object', function(done) {
    request(app)
      .api({
        path: '/api/data/item/'+id1,
        method: 'del',
        shared: shared,
        secret: secret,
      })
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.statusCode, 200)
        assert.ok(res.body)
        assert.equal(res.body.status, 'Success')
        assert.ok(res.body.id)
        assert.equal(res.body.id, id1)
        var object = res.body.objects[id1]
        assert.equal(object['name#t'], name1)
        assert.ok(object.created_at)
        assert.ok(object.updated_at)
        assert.equal(object['type'], 'item')
        done()
      })
  })

  it('insert a file and read it', function(done) {
    utils.writeTestFile(function(filename, filepath) {
      var id
      var data = {
        'set-name': 'Cute image',
        'set-filename': filename,
        'set-description': 'This is the description of the cute image',
        'set-mime': 'image/jpeg'
      }
      txain(function(callback) {
        request(app)
          .api({
            path: '/api/data/file/upload',
            method: 'post',
            shared: shared,
            secret: secret,
            form: {
              'set-name': name1,
              'set-units': 100,
            },
            multipart: true,
          })
          .attach('file', filepath)
          .end(function(err, res) {
            assert.ifError(err)
            assert.equal(res.statusCode, 201)
            assert.ok(res.body)
            assert.equal(res.body.status, 'Success')
            assert.ok(res.body.id)
            id = res.body.id
            assert.ok(res.body.objects)
            var obj = res.body.objects[id]
            assert.ok(obj)
            assert.equal(obj['version#n'], 1)
            assert.equal(obj['filename#t'], 'photo5.jpg_copy.jpg')
            assert.equal(obj['mime#t'], 'image/jpeg')
            assert.equal(obj['size#n'], 9471)
            assert.equal(obj['width#n'], 200)
            assert.equal(obj['height#n'], 127)
            callback()
          })
      })
      .then(function(callback) {
        request(app)
          .api({
            path: '/api/data/file/download/'+id, // no version especified
            method: 'get',
            shared: shared,
            secret: secret,
          })
          .end(function(err, res) {
            assert.ifError(err)
            assert.equal(res.statusCode, 200)

            assert.equal(res.headers['content-type'], 'image/jpeg')
            assert.equal(res.headers['cache-control'], 'public, max-age=604800')

            // TODO: test content
            callback()
          })
      })
      .then(function(callback) {
        request(app)
          .api({
            path: '/api/data/file/download/'+id+'/1', // version especified
            method: 'get',
            shared: shared,
            secret: secret,
          })
          .end(function(err, res) {
            assert.ifError(err)
            assert.equal(res.statusCode, 200)

            assert.equal(res.headers['content-type'], 'image/jpeg')
            assert.equal(res.headers['cache-control'], 'public, max-age=31556926')

            // TODO: test content
            callback()
          })
      })
      .then(function(callback) {
        // TODO {width:100, height:100}
        callback()
      })
      .end(done)
    })
  })

})
