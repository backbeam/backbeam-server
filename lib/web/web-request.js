var _ = require('underscore')

module.exports = function(core, req, res, private) {

  private.request = {
    params: private.params,
    body: req.body,
    method: req.method,
    query: req.query,
    url: req.url,
    path: req.path,
    ip: req.headers['x-forwarded-for'] || req.ip,
    acceptedLanguages: req.acceptedLanguages,
    headers: req.headers,
    protocol: req.protocol,
    xhr: req.xhr,
  }

  // files
  var files = req.files
  var filesInfo = {}
  var fileCounter = 0
  private.filesIds = {}

  if (files) {
    function addFile(file) {
      var id = (fileCounter++)+''
      private.filesIds[id] = file
      return {
        // file.originalname is what the multer module uses
        name: file.originalname,
        type: file.mimetype || file.type,
        size: file.size,
        id  : id,
        path: file.path,
        toJSON: function() {
          return {
            name: this.name,
            type: this.type,
            size: this.size,
          }
        }
      }
    }
    for (var key in files) {
      if (files.hasOwnProperty(key)) {
        var file = files[key]
        if (_.isArray(file)) {
          var arr = []
          for (var i = 0; i < file.length; i++) {
            arr.push(addFile(file[i]))
          }
          filesInfo[key] = arr
        } else {
          filesInfo[key] = addFile(file)
        }
      }
    }
  }

  private.request.files = filesInfo

}
