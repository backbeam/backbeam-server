exports.run = function(backbeam, request, response, libs, logger) {
  var item = backbeam.empty('item')
  item.set('name', 'Item name')
  item.save(function(err) {
    if (err) throw new Error(err)
    backbeam.select('item').fetch(100, 0, response)
  })
}
