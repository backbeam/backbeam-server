exports.run = function(backbeam, request, response, libs, logger) {
  response.send(require('../libs/util').hello('world')+' '+require('../libs/util.js').hello('world'))
}
