var assert = require('assert')
var utils = require('./test-utils')
var request = utils.request
var app = require('./app')()
var _ = require('underscore')
var txain = require('txain')

var shared = 'foo'
var secret = 'bar'

describe('Test admin object', function() {

  beforeEach(function(done) {
    txain(function(callback) {
      utils.migrate(app, callback)
    })
    .then(function(callback) {
      utils.deleteData(app, callback)
    })
    .end(done)
  })

  it('should show the edit form and save a new object', function(done) {
    var name = 'The name'

    txain(function(callback) {
      request(app)
        .get('/admin/object/item/_new')
        .end(function(err, res) {
          assert.ifError(err)
          assert.equal(res.statusCode, 200)
          callback()
        })
    })
    .then(function(callback) {
      request(app)
        .post('/admin/object/item/_new')
        .type('form')
        .send({
          'set-name': name,
        })
        .end(function(err, res) {
          assert.ifError(err)
          assert.equal(res.statusCode, 302)
          callback()
        })
    })
    .then(function(callback) {
      request(app)
        .api({
          path: '/api/data/item',
          method: 'get',
          shared: shared,
          secret: secret,
        })
        .end(function(err, res) {
          assert.ifError(err)
          assert.equal(res.statusCode, 200)
          var ids = res.body.ids
          var id = ids[0]
          var object = res.body.objects[id]
          assert.equal(object['name#t'], name)

          callback()
        })
    })
    .end(done)
  })

  it('should show the edit form and save an existing object', function(done) {
    var name = 'New name'

    txain(function(callback) {
      // insert object for testing
      request(app)
        .api({
          path: '/api/data/item',
          method: 'post',
          shared: shared,
          secret: secret,
          form: {
            'set-name': 'Some name',
          },
        })
        .end(function(err, res) {
          assert.ifError(err)
          assert.equal(res.statusCode, 201)
          assert.ok(res.body)
          assert.equal(res.body.status, 'Success')
          assert.ok(res.body.id)

          callback(null, res.body.id)
        })
    })
    .then(function(id, callback) {
      request(app)
        .get('/admin/object/item/'+id)
        .end(function(err, res) {
          assert.ifError(err)
          assert.equal(res.statusCode, 200)
          callback(null, id)
        })
    })
    .then(function(id, callback) {
      request(app)
        .post('/admin/object/item/'+id)
        .type('form')
        .send({
          'set-name': name,
        })
        .end(function(err, res) {
          assert.ifError(err)
          assert.equal(res.statusCode, 302)
          callback()
        })
    })
    .then(function(callback) {
      request(app)
        .api({
          path: '/api/data/item',
          method: 'get',
          shared: shared,
          secret: secret,
        })
        .end(function(err, res) {
          assert.ifError(err)
          assert.equal(res.statusCode, 200)
          var ids = res.body.ids
          var id = ids[0]
          var object = res.body.objects[id]
          assert.equal(object['name#t'], name)

          callback()
        })
    })
    .end(done)
  })

})
