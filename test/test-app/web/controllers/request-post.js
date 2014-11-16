response.json({
  method: request.method,
  params: request.params,
  body: request.body,
  query: request.query,
  url: request.url,
  ip: request.ip,
  acceptedLanguages: request.acceptedLanguages,
  headers: request.headers,
  protocol: request.protocol,
  sdk: backbeam.sdk(),
})
