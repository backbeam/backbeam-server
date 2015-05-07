var argmnts = require('./arguments')

module.exports = function(core, req, res, private) {

  var backbeam = private.backbeam

  backbeam.subscribeDeviceToChannels = function() {
    var args      = argmnts(arguments, true)
    var gateway   = args.nextString('gateway')
    var device    = args.nextString('device')
    var channels  = args.rest()
    var callback  = args.callback()

    core.push.subscribe(gateway, device, channels, callback)
  }

  backbeam.unsubscribeDeviceFromChannels = function() {
    var args      = argmnts(arguments, true)
    var gateway   = args.nextString('gateway')
    var device    = args.nextString('device')
    var channels  = args.rest()
    var callback  = args.callback()

    core.push.unsubscribe(gateway, device, channels, callback)
  }

  backbeam.unsubscribeDeviceFromAllChannels = function() {
    var args      = argmnts(arguments, true)
    var gateway   = args.nextString('gateway')
    var device    = args.nextString('device')
    var callback  = args.callback()

    core.push.unsubscribeAll(gateway, device, callback)
  }

  backbeam.subscribedChannels = function() {
    var args      = argmnts(arguments, true)
    var gateway   = args.nextString('gateway')
    var device    = args.nextString('device')
    // TODO: limit, offset
    var callback  = args.callback()

    core.push.subscribedChannels(gateway, device, callback)
  }

  backbeam.sendPushNotification = function() {
    var args      = argmnts(arguments, true)
    var channel   = args.nextString('channel')
    var options   = args.nextObject('options')
    var callback  = args.callback()

    options.apn_payload = common.paramsWithPrefix('apn_payload_', options)
    options.gcm_data    = common.paramsWithPrefix('gcm_data_'   , options)

    core.push.send(channel, options, callback)
  }

}
