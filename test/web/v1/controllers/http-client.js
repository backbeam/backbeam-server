var client = backbeam.httpClient()
var options = {
  url: 'http://localhost:1337'
}
client.post(options, function(err, res) {
  response.send(res.body)
})