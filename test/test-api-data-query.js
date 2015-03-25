var assert = require('assert')
var utils = require('./test-utils')
var async  = require('async')
var _ = require('underscore')
var request = utils.request
var app = require('./app')()
var txain = require('txain')

var shared = 'foo'
var secret = 'bar'

describe('Test API for data manipulation', function() {

  var records = [
    {
      name: 'First',
      weight: 1,
      price: 100,
      units: 1000,
    },
    {
      name: 'Second buffalo, rabbit, database. And this also contains database.',
      weight: 2,
      price: 400,
      units: 2000,
    },
    {
      name: 'Third',
      weight: 3,
      price: 300,
      units: 5000,
    },
    {
      name: 'Fourth rabbit, database',
      weight: 4,
      price: 200,
      units: 4000,
    },
    {
      name: 'Fifth',
      weight: 5,
      price: 500,
      units: 6000,
    },
    {
      name: 'Sixth buffalo database. With more database and database',
      weight: 6,
      price: 600,
      units: 3000,
    },
    {
      name: 'Seventh',
      weight: 0,
      price: 1000,
      units: 7000,
    },
  ]

  function assertRecords(ids, objects, expected) {
    assert.equal(ids.length, expected.length)
    expected.forEach(function(n, i) {
      var id = ids[i]
      var dict = objects[id]
      var obj = records[n]
      assert.equal(dict['name#t'], obj.name)
      assert.equal(dict['price#n'], obj.price)
      assert.equal(dict['weight#n'], obj.weight)
      assert.equal(dict['units#n'], obj.units)
    })
  }

  function query(qs, callback) {
    request(app)
      .api({
        path: '/api/data/item',
        method: 'get',
        shared: shared,
        secret: secret,
        qs: qs,
      })
      .end(function(err, res) {
        assert.ifError(err)
        assert.equal(res.statusCode, 200, res.text)
        assert.ok(res.body)
        assert.ok(res.body.ids)
        assert.ok(res.body.objects)
        callback(res.body.ids, res.body.objects)
      })
  }

  before(function(done) {
    txain(utils.migrate, app)
      .then(function(callback) {
        utils.deleteData(app, callback)
      })
      .then(function(callback) {
        return callback(null, _.clone(records))
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
              'set-weight': record.weight,
              'set-price': record.price,
              'set-units': record.units,
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

  it('should sort using one field', function(done) {
    var options = {
      q: 'sort by weight',
    }
    query(options, function(ids, objects) {
      assertRecords(ids, objects, [6, 0, 1, 2, 3, 4, 5])
      done()
    })
  })

  it('should sort using other field', function(done) {
    var options = {
      q: 'sort by units',
    }
    query(options, function(ids, objects) {
      assertRecords(ids, objects, [0, 1, 5, 3, 2, 4, 6])
      done()
    })
  })

  it('should be able to query and sort using one field', function(done) {
    var options = {
      q: 'where weight>=? and weight<=? sort by weight',
      params: [3, 5],
    }
    query(options, function(ids, objects) {
      assertRecords(ids, objects, [2, 3, 4])
      done()
    })
  })

  it('should be able to query using two constraints', function(done) {
    var options = {
      q: 'where weight>=? and weight<=? and price>=? and price<=? sort by weight',
      params: [3, 6, 200, 300],
    }
    query(options, function(ids, objects) {
      assertRecords(ids, objects, [2, 3])
      done()
    })
  })

  it('should be able to query using three constraints', function(done) {
    var options = {
      q: 'where weight>=? and weight<=? and price>=? and price<=? and units>=? sort by weight',
      params: [3, 6, 200, 300, 5000],
    }
    query(options, function(ids, objects) {
      assertRecords(ids, objects, [2])
      done()
    })
  })

  it('should be able to sort using a predefined field', function(done) {
    var options = {
      q: 'sort by created_at',
    }
    query(options, function(ids, objects) {
      assertRecords(ids, objects, [0, 1, 2, 3, 4, 5, 6])
      done()
    })
  })

  it('sorts using descending order', function(done) {
    var options = {
      q: 'sort by weight desc',
    }
    query(options, function(ids, objects) {
      assertRecords(ids, objects, [5, 4, 3, 2, 1, 0, 6])
      done()
    })
  })

  it('sorts using descending order with other field', function(done) {
    var options = {
      q: 'sort by units desc',
    }
    query(options, function(ids, objects) {
      assertRecords(ids, objects, [6, 4, 2, 3, 5, 1, 0])
      done()
    })
  })

  it('sorts using descending order with a predefined field', function(done) {
    var options = {
      q: 'sort by created_at desc',
    }
    query(options, function(ids, objects) {
      assertRecords(ids, objects, [6, 5, 4, 3, 2, 1, 0])
      done()
    })
  })

  it('queries and sorts using the same field, with one >= constraint', function(done) {
    var options = {
      q: 'where weight>=? sort by weight',
      params: [3],
    }
    query(options, function(ids, objects) {
      assertRecords(ids, objects, [2, 3, 4, 5])
      done()
    })
  })

  it('queries and sorts using the same field, with one <= constraint', function(done) {
    var options = {
      q: 'where weight<=? sort by weight',
      params: [3],
    }
    query(options, function(ids, objects) {
      assertRecords(ids, objects, [6, 0, 1, 2])
      done()
    })
  })

  it('queries and sorts using the same field, with one < constraint', function(done) {
    var options = {
      q: 'where weight<? sort by weight',
      params: [3],
    }
    query(options, function(ids, objects) {
      assertRecords(ids, objects, [6, 0, 1])
      done()
    })
  })

  it('queries and sorts using the same field, with one > constraint', function(done) {
    var options = {
      q: 'where weight>? sort by weight',
      params: [3],
    }
    query(options, function(ids, objects) {
      assertRecords(ids, objects, [3, 4, 5])
      done()
    })
  })

  it('sorts using a text field', function(done) {
    var options = {
      q: 'sort by name',
    }
    query(options, function(ids, objects) {
      assertRecords(ids, objects, [4, 0, 3, 1, 6, 5, 2])
      done()
    })
  })

  it('sorts using a text field with descending order', function(done) {
    var options = {
      q: 'sort by name desc',
    }
    query(options, function(ids, objects) {
      assertRecords(ids, objects, [2, 5, 6, 1, 3, 0, 4])
      done()
    })
  })

  it('queries using "or"', function(done) {
    var options = {
      q: 'where price=? or price=?',
      params: [100, 300],
    }
    query(options, function(ids, objects) {
      assertRecords(ids, objects, [0, 2])
      done()
    })
  })

  it('queries using nested queries', function(done) {
    var options = {
      q: 'where (price<? or price>?) and (weight<? or weight>?)',
      params: [300, 500, 3, 5],
    }
    query(options, function(ids, objects) {
      assertRecords(ids, objects, [0, 5, 6])
      done()
    })
  })

  it('queries using exact string match', function(done) {
    var options = {
      q: 'where name = ?',
      params: records[3].name,
    }
    query(options, function(ids, objects) {
      assertRecords(ids, objects, [3])
      done()
    })
  })

  it('queries inside a fulltext field using one word', function(done) {
    var options = {
      q: 'where name like ? sort by name desc',
      params: ['rabbit'],
    }
    query(options, function(ids, objects) {
      assertRecords(ids, objects, [1, 3])
      done()
    })
  })

  it('queries inside a fulltext field using two words', function(done) {
    var options = {
      q: 'where name like ? sort by name desc',
      params: ['buffalo rabbit'],
    }
    query(options, function(ids, objects) {
      assertRecords(ids, objects, [5, 1, 3])
      done()
    })
  })

  it('queries one word and sorts by relevance', function(done) {
    var options = {
      q: 'where weight>=? and name like ?',
      params: [1, 'database'],
    }
    query(options, function(ids, objects) {
      // assertRecords(ids, objects, [5, 1, 3])
      done()
    })
  })

  it('queries by _id using `in`', function(done) {
    var options = {
      q: 'where this in ?',
      params: [records[0].id],
    }
    query(options, function(ids, objects) {
      assertRecords(ids, objects, [0])
      done()
    })
  })

  it('queries by _id using `not in`', function(done) {
    var options = {
      q: 'where this not in ?',
      params: [[records[0].id, records[1].id, records[2].id, records[3].id, records[4].id].join('\n')],
    }
    query(options, function(ids, objects) {
      assertRecords(ids, objects, [5, 6])
      done()
    })
  })

})
