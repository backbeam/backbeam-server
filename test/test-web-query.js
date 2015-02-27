var assert = require('assert')
var _ = require('underscore')
var app = require('./app')()
var utils = require('./test-utils')
var request = utils.request
var txain = require('txain')

var shared = 'foo'
var secret = 'bar'

describe('Test web queries', function() {

  before(function(done) {
    utils.migrate(app, done)
  })

  it('#empty() and #save()', function(done) {
    request(app)
      .post('/query/empty-save')
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.status, 201, res.text)
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
        assert.equal(res.status, 200, res.text)
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
        assert.equal(res.status, 200, res.text)
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
        assert.equal(res.status, 200, res.text)
        assert.ok(res.body)
        assert.ok(res.body.id)
        done()
      })
  })

  it('#saveFile()', function(done) {
    utils.writeTestFile(function(filename, filepath) {
      var id = null
      txain(function(callback) {
        request(app)
          .post('/query/save-file')
          .attach('picture', filepath)
          .end(function(err, res) {
            assert.ifError(err)
            assert.equal(res.status, 200, res.text)
            assert.ok(res.body)
            assert.ok(res.body.id)
            id = res.body.id
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
            assert.equal(res.statusCode, 200, res.text)

            assert.equal(res.headers['content-type'], 'image/jpeg')
            assert.equal(res.headers['cache-control'], 'public, max-age=604800')

            // TODO: test content
            callback()
          })
      })
      .end(function(err) {
        assert.ifError(err)
        done()
      })
    })
  })

})
