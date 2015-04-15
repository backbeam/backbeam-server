var apn = require('apn')
var txain = require('txain')
var path = require('path')
var fs = require('fs')
var _ = require('underscore')
var request = require('request')

module.exports = function(options) {

  return function(core) {

    var push = {}

    push.subscribe = function(gateway, token, channels, callback) {
      var deviceToken = gateway+':'+token
      txain(channels)
        .each(function(channel, callback) {
          var params = [deviceToken, channel, deviceToken, channel]
          core.db.query('DELETE FROM _devices WHERE token=? AND channel=?;'+
            'INSERT INTO _devices SET token=?, channel=?', params, callback)
        })
        .clean()
        .end(callback)
    }

    push.unsubscribe = function(gateway, token, channels, callback) {
      var deviceToken = gateway+':'+token
      txain(channels)
        .each(function(channel, callback) {
          var params = [deviceToken, channel]
          core.db.query('DELETE FROM _devices WHERE token=? AND channel=?', params, callback)
        })
        .clean()
        .end(callback)
    }

    push.subscribedChannels = function(gateway, token, callback) {
      var deviceToken = gateway+':'+token
      txain(function(callback) {
        var params = [deviceToken]
        core.db.query('SELECT channel FROM _devices WHERE token=?', params, callback)
      })
      .map(function(row, callback) {
        return callback(null, row.channel)
      })
      .end(callback)
    }

    push.unsubscribeAll = function(gateway, token, callback) {
      var deviceToken = gateway+':'+token
      push.deleteDevice(deviceToken, callback)
    }

    push.renameDevice = function(options) {
      var oldToken = options.oldToken
      var newToken = options.newToken
      txain(function(callback) {
        var params = [newToken, oldToken]
        core.db.query('UPDATE _devices SET token=? WHERE token=?', params, callback)
      })
      .end(function(err) {
        if (err) {
          core.logs.err(err, 'Error while renaming devices')
        }
      })
    }

    push.deleteDevice = function(token, callback) {
      txain(function(callback) {
        var params = [token]
        core.db.query('DELETE FROM _devices WHERE token=?', params, callback)
      })
      .clean()
      .end(callback)
    }

    push.send = function(channel, options, callback) {
      txain(function(callback) {
        var params = [channel]
        core.db.query('SELECT token FROM _devices WHERE channel=?', params, callback)
      })
      .map(function(row, callback) {
        return callback(null, row.token)
      })
      .then(function(devices, callback) {
        var devicesByService = {}

        for (var i = 0; i < devices.length; i++) {
          var device = parseDevice(devices[i])
          devicesByService[device.gateway] = devicesByService[device.gateway] || []
          devicesByService[device.gateway].push(device)
        }

        var gateways = _.keys(devicesByService)
        for (var k = 0; k < gateways.length; k++) {
          var gateway = gateways[k]
          var service = services[gateway]
          if (service) {
            services[gateway].sendNotification(message, devicesByService[gateway])
          } else {
            core.logs.info('Unknown gateway: `'+gateway+'`')
          }
        }
        return callback(null)
      })
      .end(callback)
    }

    return push
  }

  function APNService(production) {
    var certsDir = path.join(core.fs.root, 'push')
    var env = 'development' // TODO: use core.env

    var connectionOptions = {
      cert: path.join(certsDir, 'aps_'+env+'_cert.pem'),
      key : path.join(certsDir, 'aps_'+env+'_key.pem'),
      enhanced: true,
      cacheLength: 255,
      production: production,
    }
    var apnConnection = new apn.Connection(connectionOptions)
    apnConnection.on('error', function(err) {
      core.logs.error(err, 'Error while stablishing connection to the Apple Push Notifications service')
    })
    apnConnection.on('connected', function(openSockets) {
      core.logs.info(openSockets+' connection(s) to the Apple Push Notifications service : '+settings.server.env)
    })
    apnConnection.on('transmissionError', function(errorCode, notification, device) {
      if (errorCode === 8) {
        var token = device.token.toString('base64')
        core.logs.info('Invalid device token: '+token)
        push.unsubscribeAll('apn', token, function(err) {
          if (err) {
            core.logs.error('Error while destroying device '+token)
          }
        })
      } else {
        core.logs.error('Transmission error: '+errorCode)
      }
    })

    var feedbackOptions = {
      cert: path.join(certsDir, 'aps_'+env+'_cert.pem'),
      key : path.join(certsDir, 'aps_'+env+'_key.pem'),
      batchFeedback: true,
      interval: 300
    }

    var feedback = new apn.Feedback(feedbackOptions)
    feedback.on('feedback', function(devices) {
      devices.forEach(function(item) {
        core.logs.info('Feedback service returned item '+item)
        try {
          var token = item.device.token.toString('base64')
          push.unsubscribeAll('apn', token, function(err) {
            if (err) {
              core.logs.error('Error while destroying device '+token)
            }
          })
        } catch (err) {
          core.logs.error(err)
        }
      })
    })
    feedback.on('error', function(err) {
      core.logs.error(err)
    })

    this.sendNotification = function(message, devices) {
      var note = new apn.Notification();
      note.expiry = Math.floor(Date.now() / 1000) + 3600 // Expires 1 hour from now.
      note.badge = message.badge
      note.sound = message.sound
      note.alert = message.alert
      note.payload = _.clone(message.payload)

      devices.forEach(function(device) {
        apnConnection.pushNotification(note, new apn.Device(device.token))
      })
    }

  }

  function GCMService(production) {

    this.sendNotification = function(message, devices) {
      var tokens = devices.map(function(device) {
        return device.token
      })
      var options = {
        url: 'https://android.googleapis.com/gcm/send',
        body: JSON.stringify({
          registration_ids : tokens,
          data             : message.gcm_data || message.payload,
          time_to_live     : message.gcm_time_to_live,
          collapse_key     : message.gcm_collapse_key || message.alert,
          delay_while_idle : message.gcm_delay_while_idle,
        }),
        headers: {
          'Authorization': 'key='+settings.gcm.key,
          'Content-Type': 'application/json'
        },
      }

      request.post(options, function(err, res, response) {
        if (err) {
          return core.logs.error(err)
        }
        var data = null
        try {
          data = JSON.parse(response)
        } catch(err) {
          return core.logs.error(err, 'GCM returned an invalid response body. Expected JSON. '+response)
        }

        var results = data.results
        var renameDevices = []

        results.forEach(function(result, i) {
          var newToken = result['registration_id']
          var error = result['error']
          if (newToken) {
            var oldToken = tokens[i]
            if (oldToken) { // should always happen
              renameDevices.push({
                oldToken: oldToken,
                newToken: newToken,
              })
            }
          } else if (error) {
            if (error === 'InvalidRegistration') {
              var token = tokens[i]
              core.logs.info('Destroying device '+token)
              push.deleteDevice(token, function(err) {
                if (err) {
                  core.logs.error(err, 'Error while destroying device '+token)
                }
              })
            }
          }
        })

        txain(renameDevices)
        .each(function(tokens, callback) {
          core.logs.info('Renaming device from '+tokens.oldToken+' to '+tokens.newToken)
          push.renameDevice(tokens.oldToken, tokens.newToken, function(err) {
            if (err) core.logs.error(err)
            return callback() // continue always
          })
        }).end(function(err) {
          // done renaming devices
        })
      })
    }

  }

  var production = core.isProduction()

  var services = {
    'apn': new APNService(production),
    'gcm': new GCMService(production),
  }

}

function parseDevice(device) {
  var arr = device.split(':')
  return {
    gateway: arr[0],
    token: arr[1],
  }
}
