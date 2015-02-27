var assert = require('assert')
var request = require('supertest')
var app = require('./app')()
var _ = require('underscore')

describe('Test web request', function() {

  beforeEach(function(done) {
    done()
  })

  it('all request information', function(done) {
    request(app)
      .post('/request/post/xxx/yyy?query-key=query-value')
      .query({'query-key': 'query-value'})
      .set('X-Custom-Header', 'foobar')
      .set('X-Backbeam-SDK', 'mysdk')
      .type('form')
      .send({
        'post-key': 'post-value',
      })
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.body.protocol, 'http')
        assert.equal(res.body.method, 'POST')
        assert.equal(res.body.url, '/request/post/xxx/yyy?query-key=query-value')
        assert.ok(['::ffff:127.0.0.1', '127.0.0.1'].indexOf(res.body.ip) >= 0)
        assert.equal(res.body.headers['x-custom-header'], 'foobar')
        assert.ok(_.isEqual(res.body.params, { foo: 'xxx', bar: 'yyy' }))
        assert.ok(_.isEqual(res.body.body, { 'post-key': 'post-value' }))
        assert.ok(_.isEqual(res.body.query, { 'query-key': 'query-value' }))
        assert.ok(_.isEqual(res.body.sdk, 'mysdk'))
        done()
      })
  })

})
