var useragent = require('useragent')

module.exports = function(core, req, res, private) {
  var browser = useragent.lookup(req.get('user-agent'))
  // do not use browser directly because its toJSON() method is silly
  private.browser = {
    family: browser.family,
    major: browser.major,
    minor: browser.minor,
    patch: browser.patch,
    os: browser.os
  }
}
