var assert = require('assert')
var utils = require('./test-utils')
var txain  = require('txain')
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

  var email = require('../lib/core/core-email')(options)({
    project: {
      name: 'shed'
    },
    fs: {
      manager: 'local',
      root: __dirname,
    },
  })

  it('#sendEmail()', function(done) {
    email.sendEmail('confirm', {}, function(err, result) {
      assert.ifError(err)
      done()
    })
  })

})
