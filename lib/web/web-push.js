var argmnts = require('./arguments')

module.exports = function(core, sandbox, req, res, private) {

  var wrap = function() {
    return private.wrap.apply(this, arguments)
  }

  sandbox.backbeam.subscribeDeviceToChannels = function() {
    var args      = argmnts(arguments, true)
    var gateway   = args.nextString('gateway')
    var device    = args.nextString('device')
    var channels  = args.rest()
    var _callback = args.callback()

    var callback = wrap(function(err) {
      wrap(_callback)(err)
    })
    core.push.subscribe(gateway, device, channels, callback)
  }

  sandbox.backbeam.unsubscribeDeviceFromChannels = function() {
    var args      = argmnts(arguments, true)
    var gateway   = args.nextString('gateway')
    var device    = args.nextString('device')
    var channels  = args.rest()
    var _callback = args.callback()

    var callback = wrap(function(err) {
      wrap(_callback)(err)
    })
    core.push.unsubscribe(gateway, device, channels, callback)
  }

  sandbox.backbeam.unsubscribeDeviceFromAllChannels = function() {
    var args      = argmnts(arguments, true)
    var gateway   = args.nextString('gateway')
    var device    = args.nextString('device')
    var _callback = args.callback()

    var callback = wrap(function(err) {
      wrap(_callback)(err)
    })
    core.push.unsubscribeAll(gateway, device, callback)
  }

  sandbox.backbeam.subscribedChannels = function() {
    var args      = argmnts(arguments, true)
    var gateway   = args.nextString('gateway')
    var device    = args.nextString('device')
    // TODO: limit, offset
    var _callback = args.callback()

    var callback = wrap(function(err, channels) {
      wrap(_callback)(err, channels)
    })
    core.push.subscribedChannels(gateway, device, callback)
  }

  sandbox.backbeam.sendPushNotification = function() {
    var args      = argmnts(arguments, true)
    var channel   = args.nextString('channel')
    var options   = args.nextObject('options')
    var _callback = args.callback()

    options.apn_payload = common.paramsWithPrefix('apn_payload_', options)
    options.gcm_data    = common.paramsWithPrefix('gcm_data_'   , options)

    var callback = wrap(function(err) {
      wrap(_callback)(err)
    })
    core.push.send(channel, options, callback)
  }

}
