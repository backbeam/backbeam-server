var async = require('async')
var argmnts = require('./arguments')

module.exports = function(core, sandbox, req, res, private) {

  sandbox.backbeam.sdk = function() {
    return private.sdk
  }

  sandbox.backbeam.sendMail = function() {
    var args       = argmnts(arguments, false)
    var type       = args.next('type')
    var options    = args.nextObject('options') || {}
    var recipients = args.rest()

    async.eachSeries(recipients, wrap(function(recipient, next) {
      if (recipient && _.isFunction(recipient.entity)) {
        options.user = recipient
      } else {
        options.to = recipient
      }
      core.email.sendMail(type, options, function(err) {
        // TODO: err ?
        next()
      })
    }), function(){}) // TODO add emailCallback, and wait for it
  }

  sandbox.backbeam.stat = function() {
    var args   = argmnts(arguments, false)
    var metric = args.next('metric', false)+''
    var user   = args.next('user', true) || currentUser

    try {
      core.stats.customFlag(false, user, metric, new Date())
    } catch(e) {
      core.logs.error(e)
    }
  }

  sandbox.console = console

}
