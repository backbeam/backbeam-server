var obj = backbeam.empty('entity')
obj.set('field', request.body.field)
obj.save(response)
