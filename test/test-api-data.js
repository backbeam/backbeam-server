var assert = require('assert')
var utils = require('./test-utils')
var txain  = require('txain')
var _ = require('underscore')
var request = utils.request
var app = require('./app')()

var shared = 'foo'
var secret = 'bar'

describe('Test API for data manipulation', function() {

  var name = 'Item name'
  var id

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
          'set-name': name,
        },
      })
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.statusCode, 201)
        assert.ok(res.body)
        assert.equal(res.body.status, 'Success')
        assert.ok(res.body.id)
        id = res.body.id
        assert.ok(res.body.objects)
        assert.ok(res.body.objects[id])

        var object = res.body.objects[id]
        assert.equal(object['name#t'], name)
        assert.ok(object.created_at)
        assert.ok(object.updated_at)
        assert.equal(object['type'], 'item')
        done()
      })
  })

  it('should read an object', function(done) {
    request(app)
      .api({
        path: '/api/data/item/'+id,
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
        assert.ok(res.body.objects[id])
        
        var object = res.body.objects[id]
        assert.equal(object['name#t'], name)
        assert.ok(object.created_at)
        assert.ok(object.updated_at)
        assert.equal(object['type'], 'item')
        done()
      })
  })

  it('should update an object', function(done) {
    name = 'Other name'

    request(app)
      .api({
        path: '/api/data/item/'+id,
        method: 'put',
        shared: shared,
        secret: secret,
        form: {
          'set-name': name,
        },
      })
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.statusCode, 200)
        assert.ok(res.body)
        assert.equal(res.body.status, 'Success')
        assert.ok(res.body.id)
        assert.ok(res.body.objects)
        assert.ok(res.body.objects[id])
        
        var object = res.body.objects[id]
        assert.equal(object['name#t'], name)
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
        assert.ok(res.body.ids.indexOf(id) >= 0)
        assert.ok(res.body.objects)
        assert.ok(res.body.objects[id])
        
        var object = res.body.objects[id]
        assert.equal(object['name#t'], name)
        assert.ok(object.created_at)
        assert.ok(object.updated_at)
        assert.equal(object['type'], 'item')
        done()
      })
  })

  it('should remove an object', function(done) {
    request(app)
      .api({
        path: '/api/data/item/'+id,
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
        assert.equal(res.body.id, id)
        var object = res.body.objects[id]
        assert.equal(object['name#t'], name)
        assert.ok(object.created_at)
        assert.ok(object.updated_at)
        assert.equal(object['type'], 'item')
        done()
      })
  })

})
