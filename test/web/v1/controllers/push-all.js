var action = request.params.action
var gateway = 'apn'
var device = 'fake-token'

if (action === 'subscribe') {
  backbeam.subscribeDeviceToChannels(gateway, device, 'foo', 'bar', function(err) {
    if (err) throw new Error(err)
    response.json({
      status: 'Success'
    })
  })
} else if (action === 'subscribed-channels') {
  backbeam.subscribedChannels(gateway, device, function(err, channels) {
    if (err) throw new Error(err)
    response.json({
      status: 'Success', channels:
      channels
    })
  })
} else if (action === 'unsubscribe') {
  backbeam.unsubscribeDeviceFromChannels(gateway, device, 'foo', function(err) {
    if (err) throw new Error(err)
    response.json({
      status: 'Success'
    })
  })
} else if (action === 'unsubscribe-all') {
  backbeam.unsubscribeDeviceFromAllChannels(gateway, device, function(err) {
    if (err) throw new Error(err)
    response.json({
      status: 'Success'
    })
  })
} else {
  response.json({
    status: 'InvalidURL'
  })
}
