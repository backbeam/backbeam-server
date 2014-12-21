var assert = require('assert')
var utils = require('./test-utils')
var txain  = require('txain')
var _ = require('underscore')
var request = utils.request
var app = require('./app')()
var geo = require('../lib/util/geo')

var shared = 'foo'
var secret = 'bar'

var records = require('./geo-records')

describe('Test API for geo queries', function() {

  beforeEach(function(done) {
    txain(function(callback) {
      utils.migrate(app, callback)
    })
    .then(function(callback) {
      utils.deleteData(app, callback)
    })
    .then(function(callback) {
      callback(null, records)
    })
    .each(function(record, callback) {
      request(app)
        .api({
          path: '/api/data/item',
          method: 'post',
          shared: shared,
          secret: secret,
          form: {
            'set-name': record.name,
            'set-location': record.lat+','+record.lon+'|'+record.name+' addr',
          },
        })
        .end(function(err, res) {
          assert.ifError(err)
          assert.equal(res.statusCode, 201, res.text)
          assert.ok(res.body)
          assert.equal(res.body.status, 'Success')
          assert.ok(res.body.id)
          record.id = res.body.id
          callback()
        })
    })
    .end(done)
  })

  it('should query using bounding box', function(done) {
    var query = '', params = []
    var latmin = 36.833333, latmax = 42.908611, lonmin = -9.262778, lonmax = -2.4675

    // calculate result manually
    var expected = _.filter(records, function(obj) {
      return obj.lat > latmin
          && obj.lat < latmax
          && obj.lon > lonmin
          && obj.lon < lonmax
    }).reverse()
    assert.ok(expected.length > 0)

    // ignore 10 locations
    var limit = expected.length - 10
    expected.splice(limit)

    function requestBounding(expected, callback) {
      request(app)
        .api({
          path: '/api/data/item/bounding/location',
          method: 'get',
          shared: shared,
          secret: secret,
          qs: {
            q: 'sort by created_at desc',
            swlat: latmin,
            nelat: latmax,
            swlon: lonmin,
            nelon: lonmax,
            limit: expected.length,
          },
        })
        .end(function(err, res) {
          assert.ifError(err)
          assert.equal(res.statusCode, 200, res.text)
          assert.ok(res.body)
          assert.ok(res.body.ids)
          assert.ok(res.body.objects)
          var ids = res.body.ids
          for (var i = 0; i < ids.length; i++) {
            assert.equal(ids[i], expected[i].id)
          }
          callback()
        })
    }

    txain(function(callback) {
      requestBounding(expected, callback)
    })
    .then(function(callback) {
      // edge case
      return callback()
      request(app)
        .api({
          path: '/api/data/item/bounding/location',
          method: 'get',
          shared: shared,
          secret: secret,
          qs: {
            q: 'sort by created_at desc',
            swlat: -0.60,
            nelat: -0.50,
            swlon: 160,
            nelon: -179,
          },
        })
        .end(function(err, res) {
          assert.ifError(err)
          assert.equal(res.statusCode, 200, res.text)
          assert.ok(res.body)
          assert.ok(res.body.ids)
          assert.ok(res.body.objects)
          assert.equal(res.body.ids.length, 1)
          var id = res.body.ids[0]
          // console.log('found', _.findWhere(records, { id: id }))
          callback()
        })
    })
    // remove some locations
    .then(function(callback) {
      var toremove = _.union(toremove, expected.splice(0, 3))
      assert.ok(expected.length > 0)
      callback(null, toremove)
    })
    .each(function(record, callback) {
      request(app)
        .api({
          path: '/api/data/item/'+record.id,
          method: 'del',
          shared: shared,
          secret: secret,
        })
        .end(function(err, res) {
          assert.ifError(err)
          assert.equal(res.statusCode, 200, res.text)
          callback()
        })
    })
    .then(function(callback) {
      requestBounding(expected, callback)
    })
    // change some locations
    .then(function(callback) {
      var tochange = expected.splice(0, 2)
      assert.ok(tochange.length > 0)
      callback(null, tochange)
    })
    .each(function(record, callback) {
      request(app)
        .api({
          path: '/api/data/item/'+record.id,
          method: 'put',
          shared: shared,
          secret: secret,
          form: {
            'set-location': 'Address for '+record.name, // no lat/lon
          },
        })
        .end(function(err, res) {
          assert.ifError(err)
          assert.equal(res.statusCode, 200, res.text)
          callback()
        })
    })
    .then(function(callback) {
      requestBounding(expected, callback)
    })
    // delete some locations
    .then(function(callback) {
      var tochange = expected.splice(0, 2)
      assert.ok(tochange.length > 0)
      callback(null, tochange)
    })
    .each(function(record, callback) {
      request(app)
        .api({
          path: '/api/data/item/'+record.id,
          method: 'put',
          shared: shared,
          secret: secret,
          form: {
            'del-location': 1,
          },
        })
        .end(function(err, res) {
          assert.ifError(err)
          assert.equal(res.statusCode, 200, res.text)
          callback()
        })
    })
    .then(function(callback) {
      requestBounding(expected, callback)
    })
    .end(done)
  })

  it('should query using nearest', function(done) {
    // The MySQL verison of travis does not support ST_Distance
    if (process.env.TRAVIS) return done()

    var query = '', params = []
    var lat = 40.0495297, lon = -3.985908
    var point = {
      lat: lat,
      lon: lon,
    }

    // calculate result manually
    records.forEach(function(record) {
      record.distance = geo.distance(point, {
        lat: record.lat,
        lon: record.lon,
      })
    })
    var expected = _.sortBy(records, function(record) {
      return record.distance
    })
    assert.ok(expected.length > 0)

    // ignore 10 locations
    var limit = expected.length - 10
    expected.splice(limit)

    function requestNearest(expected, callback) {
      request(app)
        .api({
          path: '/api/data/item/near/location',
          method: 'get',
          shared: shared,
          secret: secret,
          qs: {
            q: 'sort by created_at desc',
            lat: lat,
            lon: lon,
            limit: expected.length,
          },
        })
        .end(function(err, res) {
          assert.ifError(err)
          assert.equal(res.statusCode, 200, res.text)
          assert.ok(res.body)
          assert.ok(res.body.ids)
          assert.ok(res.body.objects)
          var ids = res.body.ids
          // only the first half of the ids are tested because the db
          // does not do the same calculations
          for (var i = 0; i < ids.length / 2; i++) {
            assert.equal(ids[i], expected[i].id)
          }
          callback()
        })
    }

    txain([3, 10, 20, 30])
    .each(function(limit, callback) {
      requestNearest(expected.slice(0, limit), callback)
    })
    // remove some locations
    .then(function(callback) {
      var toremove = _.union(toremove, expected.splice(0, 3))
      assert.ok(expected.length > 0)
      callback(null, toremove)
    })
    .each(function(record, callback) {
      request(app)
        .api({
          path: '/api/data/item/'+record.id,
          method: 'del',
          shared: shared,
          secret: secret,
        })
        .end(function(err, res) {
          assert.ifError(err)
          assert.equal(res.statusCode, 200, res.text)
          callback()
        })
    })
    .then(function(callback) {
      requestNearest(expected, callback)
    })
    // change some locations
    .then(function(callback) {
      var tochange = expected.splice(0, 2)
      assert.ok(tochange.length > 0)
      callback(null, tochange)
    })
    .each(function(record, callback) {
      request(app)
        .api({
          path: '/api/data/item/'+record.id,
          method: 'put',
          shared: shared,
          secret: secret,
          form: {
            'set-location': 'Address for '+record.name, // no lat/lon
          },
        })
        .end(function(err, res) {
          assert.ifError(err)
          assert.equal(res.statusCode, 200, res.text)
          callback()
        })
    })
    .then(function(callback) {
      requestNearest(expected, callback)
    })
    // delete some locations
    .then(function(callback) {
      var tochange = expected.splice(0, 2)
      assert.ok(tochange.length > 0)
      callback(null, tochange)
    })
    .each(function(record, callback) {
      request(app)
        .api({
          path: '/api/data/item/'+record.id,
          method: 'put',
          shared: shared,
          secret: secret,
          form: {
            'del-location': 1,
          },
        })
        .end(function(err, res) {
          assert.ifError(err)
          assert.equal(res.statusCode, 200, res.text)
          callback()
        })
    })
    .then(function(callback) {
      requestNearest(expected, callback)
    })
    .end(done)
  })

})
