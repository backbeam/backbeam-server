response.status(201)
response.send('Foo bar')
response.send('Hello world')

var contentType = 'text/plain'
response.contentType(contentType)
if (contentType !== response.contentType()) throw new Error('Wrong contentType()')

var header = 'value'
response.set('X-Custom-Header', header)
var value = response.get('X-Custom-Header')
if (value !== header) throw new Error('Wrong response.get/set')
