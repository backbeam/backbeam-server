var fs = require('fs')

exports.rename = function(source, target, callback) {
  fs.rename(source, target, function(err) {
    if (!err) return callback()
    if (err.code === 'EXDEV') {
      // copy the file
      var read = fs.createReadStream(source)
      read.on('error', done)
      var write = fs.createWriteStream(target)
      write.on('error', done)
      write.on('close', unlink)
      read.pipe(write)

      function unlink() {
        fs.unlink(source, done)
      }

      function done(err) {
        callback && callback(err)
        callback = null
      }
    } else {
      return callback(err)
    }
  })
}
