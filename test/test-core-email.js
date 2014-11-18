var assert = require('assert')
var utils = require('./test-utils')
var txain  = require('txain')
var path = require('path')
var _ = require('underscore')

describe('Test email support', function() {

  var options = {
    email: {
      transport: {
        service: 'stub',
      },
      from: 'user@example.com',
      inline: true,
    }
  }

  var email = require('../lib/core/core-email')(options.email)({
    project: {
      name: 'shed'
    },
    fs: {
      manager: 'local',
      root: path.join(__dirname, 'test-app'),
    },
  })

  it('#sendMail()', function(done) {
    email.sendMail('confirm', {}, function(err, result) {
      assert.ifError(err)
      done()
    })
  })

})
