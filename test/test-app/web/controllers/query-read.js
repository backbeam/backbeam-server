exports.run = function(backbeam, request, response, libs, logger) {
  var item = backbeam.empty('item')
  item.set('name', 'Item name')
  item.save(function(err) {
    if (err) throw new Error(err)
    backbeam.read('item', item.id(), response)
  })
}
