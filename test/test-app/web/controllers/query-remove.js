var item = backbeam.empty('item')
item.set('name', 'Item name')
item.save(function(err) {
  if (err) throw new Error(err)
  item.remove(function(err) {
    response.json({ id: item.id() })
  })
})