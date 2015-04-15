exports.run = function(backbeam, request, response, libs, logger) {
  var item = backbeam.empty('item')
  item.set('name', 'Item name')
  item.save(function(err) {
    if (err) throw new Error(err)
    response.status(201)
    response.json({
      id: item.id()
    })
  })
}
