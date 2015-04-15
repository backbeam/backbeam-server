exports.run = function(backbeam, request, response, libs, logger) {
  var action = request.params.action

  if (action === 'mail') {
    var options = {

    }
    backbeam.sendMail('custom', options, 'user@example.com')
    response.json({
      status: 'Success',
    })
  } else {
    response.json({
      status: 'InvalidURL',
    })
  }
}
