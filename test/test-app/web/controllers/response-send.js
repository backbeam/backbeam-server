response.status(201)

var contentType = 'text/plain; charset=utf-8'
response.contentType(contentType)
if (contentType !== response.contentType()) throw new Error('Wrong contentType()')

var header = 'value'
response.set('X-Custom-Header', header)
var value = response.get('X-Custom-Header')
if (value !== header) throw new Error('Wrong response.get/set')

response.send('Hello world')
