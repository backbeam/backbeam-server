var txain = require('txain')

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
      txain(function(callback) {
        var params = [deviceToken]
        core.db.query('DELETE FROM _devices WHERE token=?', params, callback)
      })
      .clean()
      .end(callback)
    }

    push.send = function(channel, options, callback) {

    }

    return push
  }

}
