var request = require('request')

module.exports = function(core, sandbox, req, res, private) {

  var defaultRequest = request.defaults({
    headers: {
      // 'User-Agent'      : 'Backbeam/1.0 ('+ops.project+'; '+ops.env+'; '+ops.version+')',
      'Cache-Control'   : 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0',
      'Accept-Encoding' : 'gzip,deflate'
    },
    encoding: null
  })

  sandbox.backbeam.httpClient = function() {
    var client = {}
    var jar = request.jar()

    client.request = function(options, callback) {
      var ops = {}
      ops.method             = (options.method || 'GET').toUpperCase()
      ops.jar                = jar
      ops.url                = options.url
      ops.qs                 = options.qs
      ops.headers            = options.headers
      ops.body               = options.body
      ops.form               = options.form
      ops.followRedirect     = options.followRedirect
      ops.followAllRedirects = options.followAllRedirects
      ops.auth               = options.auth
      ops.encoding           = null
      // ops.auth{user, password, sendImmediately? = options.

      request(ops, function(err, resp, body) {

        // core.stats.flag(false, null, '_http_client_request')

        var response = null

        function finish(err) {
          callback(err, response)
        }

        if (resp || body) {
          response = {}
          response.body = body
          if (resp) {
            response.headers = resp.headers
            response.statusCode = resp.statusCode
            if (body) {
              function convertEncoding(buffer) {
                var encoding = options.encoding
                if (!encoding) {
                  var contentType = response.headers['content-type']
                  if (contentType) {
                    // try to guess the encoding
                    contentType = contentType.toLowerCase()
                    if (contentType.indexOf('utf-8') > 0) {
                      encoding = 'utf8'
                    } else if (contentType.indexOf('text/') === 0) {
                      encoding = 'ascii'
                    }
                  }
                }
                if (encoding) {
                  return buffer.toString(encoding)
                }
                return buffer
              }
              var encoding = response.headers['content-encoding']
              if (encoding) {
                encoding = encoding.toLowerCase()
                if (encoding === 'gzip' || encoding === 'deflate') {
                  return zlib.unzip(body, function(err, buffer) {
                    if (err) return finish(err)
                    response.body = convertEncoding(buffer)
                    return finish()
                  })
                }
              } else {
                response.body = convertEncoding(body)
              }
            }
          }
        }
        finish(err)
      })
    }

    function addConvenienceMethod(name, method) {
      client[name] = function(options, callback) {
        options.method = method || name
        client.request(options, callback)
      }
    }

    addConvenienceMethod('get')
    addConvenienceMethod('post')
    addConvenienceMethod('put')
    addConvenienceMethod('patch')
    addConvenienceMethod('head')
    addConvenienceMethod('del', 'DELETE')

    return client
  }
}
