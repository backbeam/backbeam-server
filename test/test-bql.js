var assert = require('assert')
var bql = require('../lib/core/bql')
var _ = require('underscore')

describe('Parse bql queries', function() {

  it('fails to parse an invalid query', function() {
    assert.throws(function() {
      var query = bql.parse('----')
    }, Error)
  })

  it('parses a query with one constraint', function() {
    var query = bql.parse('where foo=?')
    assert.ok(_.isEqual(query, {
      "where": {
        "field": "foo",
        "op": "="
      }
    }))
  })

  it('parses a query with like operator', function() {
    var query = bql.parse('where foo like ?')
    assert.ok(_.isEqual(query, {
      "where": {
        "field": "foo",
        "op": "like"
      }
    }))
  })

  it('parses a query with two constraints', function() {
    var query = bql.parse('where foo>=? and bar = ?')
    assert.ok(_.isEqual(query, {
      "where": {
        "bop": "and",
        "constraints": [
          {
            "field": "foo",
            "op": ">="
          },
          {
            "field": "bar",
            "op": "="
          }
        ]
      }
    }))
  })

  it('parses a query with three constraints', function() {
    var query = bql.parse('where foo>=? and bar = ? and baz < ?')
    assert.ok(_.isEqual(query, {
      "where": {
        "bop": "and",
        "constraints": [
          {
            "field": "foo",
            "op": ">="
          },
          {
            "field": "bar",
            "op": "="
          },
          {
            "field": "baz",
            "op": "<"
          }
        ]
      }
    }))
  })

  it('parses a query with four constraints', function() {
    var query = bql.parse('where foo>=? and bar = ? and baz < ? and bax like ?')
    assert.ok(_.isEqual(query, {
      "where": {
        "bop": "and",
        "constraints": [
          {
            "field": "foo",
            "op": ">="
          },
          {
            "field": "bar",
            "op": "="
          },
          {
            "field": "baz",
            "op": "<"
          },
          {
            "field": "bax",
            "op": "like"
          }
        ]
      }
    }))
  })

  it('parses a query with a grouped constraint', function() {
    var query = bql.parse('where (bar = ?)')
    assert.ok(_.isEqual(query, {
      "where": {
        "field": "bar",
        "op": "="
      }
    }))
  })

  it('parses a query with two grouped constraints', function() {
    var query = bql.parse('where (bar = ? and baz < ?)')
    assert.ok(_.isEqual(query, {
      "where": {
        "bop": "and",
        "constraints": [
          {
            "field": "bar",
            "op": "="
          },
          {
            "field": "baz",
            "op": "<"
          }
        ]
      }
    }))
  })

  it('parses a query with a constraint and two grouped constraints', function() {
    var query = bql.parse('where foo>=? and (bar = ? or baz < ?)')
    assert.ok(_.isEqual(query, {
      "where": {
        "bop": "and",
        "constraints": [
          {
            "field": "foo",
            "op": ">="
          },
          {
            "bop": "or",
            "constraints": [
              {
                "field": "bar",
                "op": "="
              },
              {
                "field": "baz",
                "op": "<"
              }
            ]
          }
        ]
      }
    }))
  })

  it('parses a query with a constraint and two grouped constraints with the same operator', function() {
    var query = bql.parse('where foo>=? and (bar = ? and baz < ?)')
    assert.ok(_.isEqual(query, {
      "where": {
        "bop": "and",
        "constraints": [
          {
            "field": "foo",
            "op": ">="
          },
          {
            "field": "bar",
            "op": "="
          },
          {
            "field": "baz",
            "op": "<"
          }
        ]
      }
    }))
  })

  it('parses a query with a constraint and three grouped constraints', function() {
    var query = bql.parse('where foo>=? and (bar = ? or baz < ? or bax like ?)')
    assert.ok(_.isEqual(query, {
      "where": {
        "bop": "and",
        "constraints": [
          {
            "field": "foo",
            "op": ">="
          },
          {
            "bop": "or",
            "constraints": [
              {
                "field": "bar",
                "op": "="
              },
              {
                "field": "baz",
                "op": "<"
              },
              {
                "field": "bax",
                "op": "like"
              }
            ]
          }
        ]
      }
    }))
  })

  it('parses a query with a constraint and three grouped constraints with the same operator', function() {
    var query = bql.parse('where foo>=? or (bar = ? or baz < ? or bax like ?)')
    assert.ok(_.isEqual(query, {
      "where": {
        "bop": "or",
        "constraints": [
          {
            "field": "foo",
            "op": ">="
          },
          {
            "field": "bar",
            "op": "="
          },
          {
            "field": "baz",
            "op": "<"
          },
          {
            "field": "bax",
            "op": "like"
          }
        ]
      }
    }))
  })

  it('parses a query with two grouped constraints and two constraints more', function() {
    var query = bql.parse('where (foo>=? and bar = ?) or baz < ? or bax like ?')
    assert.ok(_.isEqual(query, {
      "where": {
        "bop": "or",
        "constraints": [
          {
            "bop": "and",
            "constraints": [
              {
                "field": "foo",
                "op": ">="
              },
              {
                "field": "bar",
                "op": "="
              }
            ]
          },
          {
            "field": "baz",
            "op": "<"
          },
          {
            "field": "bax",
            "op": "like"
          }
        ]
      }
    }))
  })

  it('parses a query with two grouped constraints and two constraints more with the same operator', function() {
    var query = bql.parse('where (foo>=? or bar = ?) or baz < ? or bax like ?')
    assert.ok(_.isEqual(query, {
      "where": {
        "bop": "or",
        "constraints": [
          {
            "field": "foo",
            "op": ">="
          },
          {
            "field": "bar",
            "op": "="
          },
          {
            "field": "baz",
            "op": "<"
          },
          {
            "field": "bax",
            "op": "like"
          }
        ]
      }
    }))
  })

  it('parses a query with threww constraints', function() {
    var query = bql.parse('where (foo>=? and bar = ?) or baz < ? or bax like ? and bal is ?')
    assert.ok(_.isEqual(query, {
      "where": {
        "bop": "or",
        "constraints": [
          {
            "bop": "and",
            "constraints": [
              {
                "field": "foo",
                "op": ">="
              },
              {
                "field": "bar",
                "op": "="
              }
            ]
          },
          {
            "field": "baz",
            "op": "<"
          },
          {
            "bop": "and",
            "constraints": [
              {
                "field": "bax",
                "op": "like"
              },
              {
                "field": "bal",
                "op": "is"
              }
            ]
          }
        ]
      }
    }))
  })

  it('parses a query with two constraints using the "or" operator', function() {
    var query = bql.parse('where foo>=? or bar = ?')
    assert.ok(_.isEqual(query, {
      "where": {
        "bop": "or",
        "constraints": [
          {
            "field": "foo",
            "op": ">="
          },
          {
            "field": "bar",
            "op": "="
          }
        ]
      }
    }))
  })

  it('parses a query with sort by', function() {
    var query = bql.parse('sort by foo')
    assert.ok(_.isEqual(query, {
      "sort": {
        "field": "foo"
      }
    }))
  })

  it('parses a query with sort by asc/desc', function() {
    var query = bql.parse('sort by foo asc')
    assert.ok(_.isEqual(query, {
      "sort": {
        "field": "foo",
        "order": "asc"
      }
    }))
  })

  it('parses a query with one constraint and sort by', function() {
    var query = bql.parse('where foo=? sort by foo')
    assert.ok(_.isEqual(query, {
      "where": {
        "field": "foo",
        "op": "="
      },
      "sort": {
        "field": "foo"
      }
    }))
  })

  it('parses a query with one constraint and sort by asc/desc', function() {
    var query = bql.parse('where foo=? sort by foo desc')
    assert.ok(_.isEqual(query, {
      "where": {
        "field": "foo",
        "op": "="
      },
      "sort": {
        "field": "foo",
        "order": "desc"
      }
    }))
  })

  it('parses a query with two constraints and sort by', function() {
    var query = bql.parse('where foo=? and bar=? sort by foobar')
    assert.ok(_.isEqual(query, {
      "where": {
        "bop": "and",
        "constraints": [
          {
            "field": "foo",
            "op": "="
          },
          {
            "field": "bar",
            "op": "="
          }
        ]
      },
      "sort": {
        "field": "foobar"
      }
    }))
  })

  it('parses a query with two constraints and sort by asc/desc', function() {
    var query = bql.parse('where foo=? and bar=? sort by foobar desc')
    assert.ok(_.isEqual(query, {
      "where": {
        "bop": "and",
        "constraints": [
          {
            "field": "foo",
            "op": "="
          },
          {
            "field": "bar",
            "op": "="
          }
        ]
      },
      "sort": {
        "field": "foobar",
        "order": "desc"
      }
    }))
  })

  it('parses a query with one simlpe join', function() {
    var query = bql.parse('join foo') //  join last ? bar join baz
    assert.ok(_.isEqual(query, {
      "join": [
        {
          "field": "foo"
        }
      ]
    }))
  })

  it('parses a query with one join with operator', function() {
    var query = bql.parse('join first 30 foo') //  join last ? bar join baz
    assert.ok(_.isEqual(query, {
      "join": [
        {
          "field": "foo",
          "op": "first",
          "n": 30
        }
      ]
    }))
  })

  it('parses a query with two simple joins', function() {
    var query = bql.parse('join foo join bar') //  join last ? bar join baz
    assert.ok(_.isEqual(query, {
      "join": [
        {
          "field": "foo",
        },
        {
          "field": "bar"
        }
      ]
    }))
  })

  it('parses a query with where and one simple join', function() {
    var query = bql.parse('where foo like ? join foo') //  join last ? bar join baz
    assert.ok(_.isEqual(query, {
      "where": {
        "field": "foo",
        "op": "like"
      },
      "join": [
        {
          "field": "foo"
        }
      ]
    }))
  })

  it('parses a query with where and two simple joins', function() {
    var query = bql.parse('where foo like ? join foo join bar') //  join last ? bar join baz
    assert.ok(_.isEqual(query, {
      "where": {
        "field": "foo",
        "op": "like"
      },
      "join": [
        {
          "field": "foo"
        },
        {
          "field": "bar"
        }
      ]
    }))
  })

  it('parses a query with two joins', function() {
    var query = bql.parse('join first 4 foo join bar') //  join last ? bar join baz
    assert.ok(_.isEqual(query, {
      "join": [
        {
          "field": "foo",
          "op": "first",
          "n": 4
        },
        {
          "field": "bar"
        }
      ]
    }))
  })

  it('parses a query with two joins with operators', function() {
    var query = bql.parse('join first 5 foo join last 6 bar') //  join last ? bar join baz
    assert.ok(_.isEqual(query, {
      "join": [
        {
          "field": "foo",
          "op": "first",
          "n": 5
        },
        {
          "field": "bar",
          "op": "last",
          "n": 6
        }
      ]
    }))
  })

  it('parses a query with the `in` operator', function() {
    var query = bql.parse('where _id in ?.collection') //  join last ? bar join baz
    assert.ok(_.isEqual(query, {
      "where": {
        "field": "_id",
        "op": "in",
        "prop": "collection"
      }
    }))
  })

  it('parses a query with having', function() {
    var query = bql.parse('where _id in ?.collection join comments having score > ? and banned = ?') //  join last ? bar join baz
    assert.ok(_.isEqual(query, {
      "where": {
        "field": "_id",
        "op": "in",
        "prop": "collection"
      },
      "join": [
        {
          "field": "comments",
          "having": {
            "bop": "and",
            "constraints": [
              {
                "field": "score",
                "op": ">"
              },
              {
                "field": "banned",
                "op": "="
              }
            ]
          }
        }
      ]
    }))
  })

  it('parses a query with a simple "fetch"', function() {
    var query = bql.parse('join author fetch avatar')
    assert.ok(_.isEqual(query, {
      "join": [
        {
          "field": "author",
          "fetch": [
            "avatar"
          ]
        }
      ]
    }))
  })

  it('parses a query with a complex "fetch"', function() {
    var query = bql.parse('join author fetch avatar, favorite_place')
    assert.ok(_.isEqual(query, {
      "join": [
        {
          "field": "author",
          "fetch": [
            "avatar",
            "favorite_place"
          ]
        }
      ]
    }))
  })

  it('parses a query with a complex "fetch" and one join before and after', function() {
    var query = bql.parse('join last 100 users join author fetch avatar, favorite_place join foo')
    assert.ok(_.isEqual(query, {
      "join": [
        {
          "field": "users",
          "op": "last",
          "n": 100
        },
        {
          "field": "author",
          "fetch": [
            "avatar",
            "favorite_place"
          ]
        },
        {
          "field": "foo"
        }
      ]
    }))
  })
  
  it('parses a query with a complex combination of parenthesis and spaces', function() {
    var expected = {
      "where": {
        "bop": "and",
        "constraints": [
          {
            "field": "foo",
            "op": "is"
          },
          {
            "bop": "or",
            "constraints": [
              {
                "bop": "and",
                "constraints": [
                  {
                    "field": "firstName",
                    "op": ">"
                  },
                  {
                    "field": "firstName",
                    "op": "<"
                  }
                ]
              },
              {
                "bop": "and",
                "constraints": [
                  {
                    "field": "lastName",
                    "op": ">"
                  },
                  {
                    "field": "lastName",
                    "op": "<"
                  },
                  {
                    "field": "bar",
                    "op": "is"
                  }
                ]
              }
            ]
          }
        ]
      }
    }

    var query = bql.parse('where ( foo is ? and (firstName > ? and firstName < ?) or (lastName > ? and lastName < ?) and bar is ?)')
    assert.ok(_.isEqual(query, expected))

    var query = bql.parse('where ((( foo is ? and (((firstName > ? and firstName < ?))) or (((lastName > ? and lastName < ?))) and bar is ?)))')
    assert.ok(_.isEqual(query, expected))

    var query = bql.parse('  where  (  foo  is  ?  and  ( firstName  >  ?  and  firstName  <  ?  )  or  (  lastName  >  ?  and  lastName  <  ?  )  and  bar  is  ?  ) ')
    assert.ok(_.isEqual(query, expected))
  })

  it('parses a query with constraints over joins', function() {
    var query = bql.parse('where foo.bar=? join foo')
    assert.ok(_.isEqual(query, {
      "where": {
        "field": "foo",
        "op": "=",
        "subfield": "bar"
      },
      "join": [
        {
          "field": "foo"
        }
      ]
    }))
  })

})
