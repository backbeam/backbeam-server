exports.distance = function(from, to, decimals) {
  decimals = decimals || 0
  var earthRadius = 6371000 // meters
  var lat1 = from.lat
  var lat2 = to.lat
  var lon1 = from.lon
  var lon2 = to.lon

  var dLat = (lat2 - lat1) * Math.PI / 180
  var dLon = (lon2 - lon1) * Math.PI / 180
  var lat1 = lat1 * Math.PI / 180
  var lat2 = lat2 * Math.PI / 180

  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2)
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  var d = earthRadius * c
  return Math.round(d * Math.pow(10, decimals)) / Math.pow(10, decimals)
}


if (module.id === require.main.id) {
  var zgz = {
    lat: 41.6488226,
    lon: -0.8890853,
  }
  var bcn = {
    lat: 41.3850639,
    lon: 2.1734035,
  }
  var mad = {
    lat: 40.4167754,
    lon: -3.7037902,
  }
  console.log('exports', exports.distance(mad, bcn)) // ~506000
}
