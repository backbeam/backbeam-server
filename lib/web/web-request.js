module.exports = function(core, sandbox, req, res, private) {

  sandbox.request = {
    params: private.params,
    body: req.body,
    method: req.method,
    query: req.query,
    url: req.url,
    ip: req.headers['x-forwarded-for'] || req.ip,
    acceptedLanguages: req.acceptedLanguages,
    headers: req.headers,
    protocol: req.protocol,
  }

  // TODO: files

}
