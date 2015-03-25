backbeam.read('entity', request.params.id, function(err, obj) {
  if (err) throw new Error(err)
  obj.remove(response)
})
