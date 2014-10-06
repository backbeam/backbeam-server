var assert = require('assert')
var request = require('supertest')
var _ = require('underscore')
var app = require('./app')()
var utils = require('./test-utils')

describe('Test web queries', function() {

  before(function(done) {
    utils.migrate(app, done)
  })

  it('#empty() and #save()', function(done) {
    request(app)
      .post('/query/empty-save')
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.status, 201)
        assert.ok(res.body)
        assert.ok(res.body.id)
        done()
      })
  })

  it('#fetch()', function(done) {
    request(app)
      .get('/query/fetch')
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.status, 200)
        assert.ok(res.body)
        assert.ok(res.body.ids)
        assert.ok(res.body.objects)
        assert.equal(res.body.status, 'Success')
        done()
      })
  })

  it('#read()', function(done) {
    request(app)
      .get('/query/read')
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.status, 200)
        assert.ok(res.body)
        assert.ok(res.body.objects)
        assert.equal(_.size(res.body.objects), 1)
        assert.equal(res.body.status, 'Success')
        done()
      })
  })

  it('#remove()', function(done) {
    request(app)
      .post('/query/remove')
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.status, 200)
        assert.ok(res.body)
        assert.ok(res.body.id)
        done()
      })
  })

})
