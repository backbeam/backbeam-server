var assert = require('assert')
var utils = require('./test-utils')
var txain  = require('txain')
var _ = require('underscore')
var request = utils.request
var app = require('./app')()

var shared = 'foo'
var secret = 'bar'

describe('Test API for data manipulation', function() {

  var name1 = 'Item1 name'
  var name2 = 'Item2 name'
  var email = 'user@example.com'
  var item1id, item2id, userid

  describe('Test using set commands', function() {

    before(function(done) {
      txain(function(callback) {
        utils.migrate(app, callback)
      })
      .then(function(callback) {
        utils.deleteData(app, callback)
      })
      .end(done)
    })

    it('should insert a user', function(done) {
      request(app)
        .api({
          path: '/api/data/user',
          method: 'post',
          shared: shared,
          secret: secret,
          form: {
            'set-email': email,
          },
        })
        .end(function(err, res) {
          assert.ifError(err)
          assert.equal(res.statusCode, 201)
          assert.ok(res.body)
          assert.equal(res.body.status, 'Success')
          assert.ok(res.body.id)
          userid = res.body.id

          done()
        })
    })

    it('should insert an item', function(done) {
      request(app)
        .api({
          path: '/api/data/item',
          method: 'post',
          shared: shared,
          secret: secret,
          form: {
            'set-name': name1,
            'set-author': userid,
          },
        })
        .end(function(err, res) {
          assert.ifError(err)
          assert.equal(res.statusCode, 201)
          assert.ok(res.body)
          assert.equal(res.body.status, 'Success')
          assert.ok(res.body.id)
          item1id = res.body.id

          done()
        })
    })

    it('should perform a query with join', function(done) {
      request(app)
        .api({
          path: '/api/data/item/',
          method: 'get',
          shared: shared,
          secret: secret,
          qs: {
            q: 'join author',
          },
        })
        .end(function(err, res) {
          assert.ifError(err)
          assert.equal(res.statusCode, 200)
          assert.ok(res.body)
          assert.equal(res.body.status, 'Success')
          assert.ok(res.body.ids)
          assert.equal(res.body.ids.length, 1)
          assert.equal(res.body.ids[0], item1id)
          assert.ok(res.body.objects)
          assert.ok(res.body.objects[item1id])
          assert.ok(res.body.objects[item1id]['author#r'], userid)
          assert.ok(res.body.objects[userid]['email#t'], email)
          
          done()
        })
    })

    it('should insert another item', function(done) {
      request(app)
        .api({
          path: '/api/data/item',
          method: 'post',
          shared: shared,
          secret: secret,
          form: {
            'set-name': name2,
            'set-author': userid,
          },
        })
        .end(function(err, res) {
          assert.ifError(err)
          assert.equal(res.statusCode, 201)
          assert.ok(res.body)
          assert.equal(res.body.status, 'Success')
          assert.ok(res.body.id)
          item2id = res.body.id

          done()
        })
    })

    it('should perform a query with join to many', function(done) {
      request(app)
        .api({
          path: '/api/data/user/',
          method: 'get',
          shared: shared,
          secret: secret,
          qs: {
            q: 'join last 2 items',
          },
        })
        .end(function(err, res) {
          assert.ifError(err)
          assert.equal(res.statusCode, 200)
          assert.ok(res.body)
          assert.equal(res.body.status, 'Success')
          assert.ok(res.body.ids)
          assert.equal(res.body.ids.length, 1)
          assert.equal(res.body.ids[0], userid)
          assert.ok(res.body.objects)
          // assert.ok(res.body.objects[item1id])
          // assert.ok(res.body.objects[item1id]['author#r'], userid)
          // assert.ok(res.body.objects[userid]['email#t'], email)

          done()
        })
    })

  })

  describe('Test using add and rem commands', function() {

    before(function(done) {
      txain(function(callback) {
        utils.migrate(app, callback)
      })
      .then(function(callback) {
        utils.deleteData(app, callback)
      })
      .end(done)
    })

    it('should insert an item', function(done) {
      request(app)
        .api({
          path: '/api/data/item',
          method: 'post',
          shared: shared,
          secret: secret,
          form: {
            'set-name': name1,
          },
        })
        .end(function(err, res) {
          assert.ifError(err)
          assert.equal(res.statusCode, 201)
          assert.ok(res.body)
          assert.equal(res.body.status, 'Success')
          assert.ok(res.body.id)
          item1id = res.body.id

          done()
        })
    })

    it('should insert a user', function(done) {
      request(app)
        .api({
          path: '/api/data/user',
          method: 'post',
          shared: shared,
          secret: secret,
          form: {
            'set-email': email,
            'add-items': item1id,
          },
        })
        .end(function(err, res) {
          assert.ifError(err)
          assert.equal(res.statusCode, 201)
          assert.ok(res.body)
          assert.equal(res.body.status, 'Success')
          assert.ok(res.body.id)
          userid = res.body.id

          done()
        })
    })

    it('should perform a query with join', function(done) {
      request(app)
        .api({
          path: '/api/data/item/',
          method: 'get',
          shared: shared,
          secret: secret,
          qs: {
            q: 'join author',
          },
        })
        .end(function(err, res) {
          assert.ifError(err)
          assert.equal(res.statusCode, 200)
          assert.ok(res.body)
          assert.equal(res.body.status, 'Success')
          assert.ok(res.body.ids)
          assert.equal(res.body.ids.length, 1)
          assert.equal(res.body.ids[0], item1id)
          assert.ok(res.body.objects)
          assert.ok(res.body.objects[item1id])
          assert.ok(res.body.objects[item1id]['author#r'], userid)
          assert.ok(res.body.objects[userid]['email#t'], email)
          
          done()
        })
    })

    it('should insert another item', function(done) {
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
          item2id = res.body.id

          done()
        })
    })

    it('should update the user', function(done) {
      request(app)
        .api({
          path: '/api/data/user/'+userid,
          method: 'put',
          shared: shared,
          secret: secret,
          form: {
            'add-items': item2id,
          },
        })
        .end(function(err, res) {
          assert.ifError(err)
          assert.equal(res.statusCode, 200)
          assert.ok(res.body)
          assert.equal(res.body.status, 'Success')
          assert.ok(res.body.id)
          item2id = res.body.id

          done()
        })
    })

    it('should perform a query with join to many', function(done) {
      request(app)
        .api({
          path: '/api/data/user/',
          method: 'get',
          shared: shared,
          secret: secret,
          qs: {
            q: 'join last 2 items',
          },
        })
        .end(function(err, res) {
          assert.ifError(err)
          assert.equal(res.statusCode, 200)
          assert.ok(res.body)
          assert.equal(res.body.status, 'Success')
          assert.ok(res.body.ids)
          assert.equal(res.body.ids.length, 1)
          assert.equal(res.body.ids[0], userid)
          assert.ok(res.body.objects)
          // assert.ok(res.body.objects[item1id])
          // assert.ok(res.body.objects[item1id]['author#r'], userid)
          // assert.ok(res.body.objects[userid]['email#t'], email)

          done()
        })
    })

  })

})