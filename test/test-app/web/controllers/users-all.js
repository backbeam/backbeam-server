exports.run = function(backbeam, request, response, libs, logger) {
  var action = request.params.action

  if (!request.headers.serialization) {

    if (action === 'register') {
      var user = backbeam.empty('user')
      user.set('email', 'alberto@example.com')
      user.set('password', '1234567')
      user.save(function(err) {
        if (err) throw new Error(err)
        response.json({
          status: 'Success',
          id: backbeam.currentUser().id(),
        })
      })
    } else if (action === 'verify-code') {
      var code = request.body.code
      backbeam.verifyCode(code, function(err, user) {
        if (err) throw new Error(err)
        response.json({
          status: 'Success',
        })
      })
    } else if (action === 'login') {
      backbeam.login('alberto@example.com', '1234567', function(err, user) {
        if (err) throw new Error(err)
        response.json({
          status: 'Success',
        })
      })
    } else if (action === 'request-password-reset') {
      backbeam.requestPasswordReset('alberto@example.com', function(err, user) {
        if (err) throw new Error(err)
        response.json({
          status: 'Success',
        })
      })
    } else if (action === 'reset-password') {
      var code = request.body.code
      backbeam.resetPassword(code, '7654321', function(err, user) {
        if (err) throw new Error(err)
        response.json({
          status: 'Success',
        })
      })
    } else if (action === 'logout') {
      backbeam.logout()
      response.json({
        status: 'Success',
      })
    } else if (action === 'currentUser') {
      // TODO
    } else {
      response.json({
        status: 'InvalidURL'
      })
    }

  } else {

    if (action === 'register') {
      var user = backbeam.empty('user')
      user.set('email', 'alberto@example.com')
      user.set('password', '1234567')
      user.save(response)
    } else if (action === 'verify-code') {
      var code = request.body.code
      backbeam.verifyCode(code, response)
    } else if (action === 'login') {
      backbeam.login('alberto@example.com', '1234567', response)
    } else if (action === 'request-password-reset') {
      backbeam.requestPasswordReset('alberto@example.com', response)
    } else if (action === 'reset-password') {
      var code = request.body.code
      backbeam.resetPassword(code, '7654321', response)
    } else {
      response.json({
        status: 'InvalidURL'
      })
    }

  }
}
