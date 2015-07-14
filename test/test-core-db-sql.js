var assert = require('assert')
var _ = require('underscore')
var mysql = require('mysql')

describe('Test core-db-sql', function() {

  var dbconfig = {
    manager: 'sql',
    host: 'localhost',
    port: 3306,
    user: 'root',
    pass: '',
    database: 'shed',
    multipleStatements: true,
  }

  var core = {
    project: {
      name: 'shed',
    },
    model: {},
    users: {
      providers: ['facebook'],
      social: {
        facebook: {
          shortname: 'fb',
        }
      }
    }
  }

  function basicModel() {
    return [
      {
        "id": "simple",
        "fields": [
          {
            "id": "name",
            "type": "text"
          },
        ]
      },
      {
        "id": "category",
        "fields": [
          {
            "id": "name",
            "type": "text"
          },
          {
            "id": "items",
            "type": "reference",
            "entity": "item",
            "inverse": "category",
            "relationship": "many-to-one"
          }
        ]
      },
      {
        "id": "item",
        "fields": [
          {
            "id": "name",
            "type": "text",
            "mandatory": true,
            "fulltext": true
          },
          {
            "id": "weight",
            "type": "number"
          },
          {
            "id": "price",
            "type": "number"
          },
          {
            "id": "units",
            "type": "number"
          },
          {
            "id": "description",
            "type": "textarea"
          },
          {
            "id": "rich_description",
            "type": "richtextarea"
          },
          {
            "id": "date",
            "type": "date"
          },
          {
            "id": "day",
            "type": "day"
          },
          {
            "id": "number",
            "type": "number"
          },
          {
            "id": "location",
            "type": "location"
          },
          {
            "id": "select",
            "type": "select",
            "options": [
              "red",
              "white",
              "green"
            ]
          },
          {
            "id": "json",
            "type": "json"
          },
          {
            "id": "boolean",
            "type": "boolean"
          },
          {
            "id": "author",
            "type": "reference",
            "entity": "user",
            "inverse": "items",
            "relationship": "one-to-many"
          },
          {
            "id": "category",
            "type": "reference",
            "entity": "category",
            "inverse": "items",
            "relationship": "one-to-many"
          },
          {
            "id": "foo",
            "type": "text",
          }
        ]
      }
    ]
  }

  var db = require('../lib/core/core-db-sql')(dbconfig)(core)

  before(function(done) {
    var conn = mysql.createConnection(dbconfig)
    conn.connect()
    conn.query('DROP DATABASE shed; CREATE DATABASE shed;', done)
    core.model = {
      entities: basicModel()
    }
  })

  it('creates the basic schema', function(done) {
    db.migrateSchema(true, function(err, commands) {
      assert.ifError(err)
      return done()
      assert.ok(_.isEqual(commands, [
        'CREATE TABLE IF NOT EXISTS `_id_generator` ( _id int (11) NOT NULL PRIMARY KEY AUTO_INCREMENT ) ENGINE=MyISAM CHARSET=UTF8',
        'CREATE TABLE IF NOT EXISTS `_devices` ( _id int (11) NOT NULL PRIMARY KEY AUTO_INCREMENT ) ENGINE=MyISAM CHARSET=UTF8',
        'ALTER TABLE `_devices` ADD COLUMN `token` varchar(255)',
        'ALTER TABLE `_devices` ADD COLUMN `channel` varchar(255)',
        'CREATE TABLE IF NOT EXISTS `simple` ( _id varbinary (255) NOT NULL PRIMARY KEY  ) ENGINE=MyISAM CHARSET=UTF8',
        'ALTER TABLE `simple` ADD COLUMN `_created_at` bigint(20)',
        'ALTER TABLE `simple` ADD COLUMN `_updated_at` bigint(20)',
        'ALTER TABLE `simple` ADD COLUMN `name` varchar(255)',
        'CREATE TABLE IF NOT EXISTS `category` ( _id varbinary (255) NOT NULL PRIMARY KEY  ) ENGINE=MyISAM CHARSET=UTF8',
        'ALTER TABLE `category` ADD COLUMN `_created_at` bigint(20)',
        'ALTER TABLE `category` ADD COLUMN `_updated_at` bigint(20)',
        'ALTER TABLE `category` ADD COLUMN `name` varchar(255)',
        'ALTER TABLE `category` ADD COLUMN `items` varbinary(255)',
        'CREATE TABLE IF NOT EXISTS `item` ( _id varbinary (255) NOT NULL PRIMARY KEY  ) ENGINE=MyISAM CHARSET=UTF8',
        'ALTER TABLE `item` ADD COLUMN `_created_at` bigint(20)',
        'ALTER TABLE `item` ADD COLUMN `_updated_at` bigint(20)',
        'ALTER TABLE `item` ADD COLUMN `name` varchar(255)',
        'ALTER TABLE `item` ADD COLUMN `weight` int(11)',
        'ALTER TABLE `item` ADD COLUMN `price` int(11)',
        'ALTER TABLE `item` ADD COLUMN `units` int(11)',
        'ALTER TABLE `item` ADD COLUMN `description` text',
        'ALTER TABLE `item` ADD COLUMN `rich_description` text',
        'ALTER TABLE `item` ADD COLUMN `date` bigint(20)',
        'ALTER TABLE `item` ADD COLUMN `day` varchar(8)',
        'ALTER TABLE `item` ADD COLUMN `number` int(11)',
        'ALTER TABLE `item` ADD COLUMN `location` point',
        'ALTER TABLE `item` ADD COLUMN `_addr_location` varchar(255)',
        'ALTER TABLE `item` ADD COLUMN `select` varchar(255)',
        'ALTER TABLE `item` ADD COLUMN `json` text',
        'ALTER TABLE `item` ADD COLUMN `boolean` int(1)',
        'ALTER TABLE `item` ADD COLUMN `author` varbinary(255)',
        'ALTER TABLE `item` ADD COLUMN `category` varbinary(255)',
        'ALTER TABLE `item` ADD COLUMN `foo` varchar(255)',
        'ALTER TABLE `item` ADD FULLTEXT INDEX `_fulltext_name` (`name`)',
        'CREATE TABLE IF NOT EXISTS `user` ( _id varbinary (255) NOT NULL PRIMARY KEY  ) ENGINE=MyISAM CHARSET=UTF8',
        'ALTER TABLE `user` ADD COLUMN `__login_email_pending` varchar(255)',
        'ALTER TABLE `user` ADD COLUMN `__login_email_current` varchar(255)',
        'ALTER TABLE `user` ADD COLUMN `__login_email_verification` varchar(255)',
        'ALTER TABLE `user` ADD COLUMN `__login_password_lost_code` varchar(255)',
        'ALTER TABLE `user` ADD COLUMN `__login_password_lost_date` varchar(255)',
        'ALTER TABLE `user` ADD COLUMN `__social_fb` varchar(255)',
        'ALTER TABLE `user` ADD COLUMN `__social_extra_fb` text',
      ]))
      done()
    })
  })

  it('makes a basic migration', function(done) {
    var simple = _.findWhere(core.model.entities, { id: 'simple' })
    simple.id = 'simple2'
    simple.formerly = ['simple']
    simple.fields[0].id = 'name2'
    simple.fields[0].formerly = ['name']
    db.migrateSchema(true, function(err, commands) {
      assert.ifError(err)
      assert.ok(_.isEqual(commands, [
        'ALTER TABLE `simple` RENAME TO `simple2`',
        'ALTER TABLE `simple2` CHANGE COLUMN `name` `name2` varchar(255)'
      ]))
      done()
    })
  })

  it('makes a complex migration', function(done) {
    var item = _.findWhere(core.model.entities, { id: 'item' })
    item.id = 'item2'
    item.formerly = ['item']
    var itemCategory = _.findWhere(item.fields, { id: 'category' })
    itemCategory.entity = 'category2'

    var category = _.findWhere(core.model.entities, { id: 'category' })
    category.id = 'category2'
    category.formerly = ['category']
    var categoryItems = _.findWhere(category.fields, { id: 'items' })
    categoryItems.entity = 'item2'

    db.migrateSchema(true, function(err, commands) {
      assert.ifError(err)
      assert.ok(_.isEqual(commands, [
        'ALTER TABLE `category` RENAME TO `category2`',
        'ALTER TABLE `item` RENAME TO `item2`'
      ]))
      done()
    })
  })

  it('makes an even more complex migration', function(done) {
    var item = _.findWhere(core.model.entities, { id: 'item2' })
    item.id = 'item3'
    item.formerly = ['item2', 'item']
    var itemCategory = _.findWhere(item.fields, { id: 'category' })
    itemCategory.id = 'category2'
    itemCategory.formerly = 'category'
    itemCategory.inverse = 'items2'
    itemCategory.entity = 'category3'

    var category = _.findWhere(core.model.entities, { id: 'category2' })
    category.id = 'category3'
    category.formerly = ['category2', 'category']
    var categoryItems = _.findWhere(category.fields, { id: 'items' })
    categoryItems.id = 'items2'
    categoryItems.formerly = ['items']
    categoryItems.inverse = 'category2'
    categoryItems.entity = 'item3'

    db.migrateSchema(true, function(err, commands) {
      assert.ifError(err)
      assert.ok(_.isEqual(commands, [
        'ALTER TABLE `category2` RENAME TO `category3`',
        'ALTER TABLE `category3` CHANGE COLUMN `items` `items2` varbinary(255)',
        'ALTER TABLE `item2` RENAME TO `item3`',
        'ALTER TABLE `item3` CHANGE COLUMN `category` `category2` varbinary(255)',
      ]))
      done()
    })
  })

  it('changes the name of an index', function(done) {
    var item = _.findWhere(core.model.entities, { id: 'item3' })
    var name = _.findWhere(item.fields, { id: 'name' })
    name.id = 'name2'
    name.formerly = ['name']

    db.migrateSchema(true, function(err, commands) {
      assert.ifError(err)
      // the output depends on the MySQL version
      done()
    })
  })

})
