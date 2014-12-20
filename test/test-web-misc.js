var assert = require('assert')
var request = require('supertest')
var app = require('./app')()

describe('Test web misc methods', function() {

  it('#sendMail()', function(done) {
    request(app)
      .get('/misc/mail')
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.status, 200, res.text)
        assert.ok(res.body)
        assert.equal(res.body.status, 'Success')
        done()
      })
  })

})
