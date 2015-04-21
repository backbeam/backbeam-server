var assert = require('assert')
var utils = require('./test-utils')
var _ = require('underscore')
var request = utils.request
var path = require('path')
var mkdirp = require('mkdirp')
var rimraf = require('rimraf')

describe('Test cli commands', function() {

  var testDir = path.join(__dirname, 'test-app-new')
  rimraf.sync(testDir)

  it('should create a new backbeam app', function(done) {
    this.timeout(4000)
    
    var cli = require('../cli/cli-create')
    cli.run(['node', 'cli-create', '--directory', testDir], function(err) {
      assert.ifError(err)

      var backbeam = require('../')
      var app = backbeam.createExpressApp({ directory: testDir })
      request(app)
        .get('/')
        .end(function(err, res) {
          assert.ifError(err)
          assert.equal(res.statusCode, 200, res.text)
          assert.equal(res.text, 'Hello world')
          done()
        })
    })
  })

})
