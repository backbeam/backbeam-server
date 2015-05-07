(function() {

  var mspi = window.mspi = {}
  var pushedSomething = false
  var initialUrl = location.href

  /*
  window.onpopstate = function(event) {
    if (!pushedSomething && location.href == initialUrl) return
    smoothNavigation(document.location.pathname, false)
  }

  $.ajax({
    url: href,
    error: function() {
      window.location.href = href
    },
    success: function(data) {
      html = data
      done()
    },
  })


  if (push) {
    window.history.pushState({}, '', href)
    pushedSomething = true
  }

  var href = $(this).attr('href')
  if (!href
    || href.charAt(0) === '#'
    || href.indexOf('javascript:') === 0
    || $(this).attr('target') === '_blank'
    || e.ctrlKey
    || e.metaKey) return
  */

  mspi.showErrorMessage = function(title, message, callback) {
    if (typeof swal !== 'undefined') {
      swal(title, message, 'error', callback)
    } else {
      alert(title+': '+message)
      callback()
    }
  }

  mspi.confirm = function(title, text, okText, cancelText, callback) {
    if (typeof swal !== 'undefined') {
      swal({
        title: title,
        text: text,
        type: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ff0039',
        confirmButtonText: okText,
        cancelButtonText: cancelText,
        closeOnConfirm: true,
        closeOnCancel: true,
      }, function(isConfirm) {
        if (isConfirm) {
          callback()
        }
      })
    } else {
      if (confirm(title+': '+message)) return callback()
    }
  }

  $(document).ajaxError(function(event, request, settings) {
    mspi.showErrorMessage('Whoops!', 'Error requesting page '+settings.url, function(){})
  })

  function sendForm(form, callback) {
    requestConfirmation(form, function() {
      form.trigger('mspi.form-will-submit', {
        form: form,
      })
      var data = new FormData(form.get(0))
      var request = new XMLHttpRequest()
      request.open(form.attr('method'), form.attr('action'))
      request.send(data)
      request.onload = function(e) {
        if (request.status !== 200) {
          var message = 'Server returned '+request.status+' for URL '+form.attr('action')
          try {
            var data = JSON.parse(request.responseText)
            message = data.message
          } catch (e) {
            // ignore
          }
          mspi.showErrorMessage('Whoops!', message, function(){})
        } else {
          form.trigger('mspi.form-did-submit', {
            request: request,
          })
          callback && callback()
        }
      }
    })
  }

  mspi.sendForm = sendForm

  function requestConfirmation(elem, callback) {
    var title = elem.attr('data-mspi-confirm-title')
    var text = elem.attr('data-mspi-confirm-text')
    var okText = elem.attr('data-mspi-confirm-ok') || 'Yes'
    var cancelText = elem.attr('data-mspi-confirm-cancel') || 'No'

    if (!title || !text) return callback()

    mspi.confirm(title, text, okText, cancelText, callback)
  }

  $(document).on('click', 'a.mspi-confirm', function(e) {
    e.preventDefault()
    var elemn = $(this)
    requestConfirmation(elemn, function() {
      var url = elemn.attr('href')
      window.location.href = url
    })
  })

  $(document).on('submit', 'form.mspi-confirm', function(e) {
    var form = $(this)
    var node = form.get(0)
    if (typeof node.mspiConfirmed !== 'undefined') return

    e.preventDefault()
    requestConfirmation(form, function() {
      node.mspiConfirmed = true
      form.submit()
    })
  })

  $(document).on('input change', 'form.mspi-autosave', function() {
    sendForm($(this))
  })

  $(document).on('submit', 'form.mspi-search', function(e) {
    e.preventDefault()
    var form = $(this)
    var element = $(form.attr('data-mspi-target'))
    var url = form.attr('action') + '?' + form.serialize()
    element.html('<div class="mspi-spinner"></div>')
    element.load(url, function() {
      form.trigger('mspi.form-search-loaded', {
        form: form,
        element: element,
      })
    })
  })

  $(document).on('submit', 'form.mspi-autorefresh', function(e) {
    e.preventDefault()
    var form = $(this)
    var element = $(form.attr('data-mspi-target'))
    sendForm(form, function() {
      var url = element.attr('data-mspi-source')
      element.load(url, function() {
        form.trigger('mspi.form-did-autorefresh', {
          form: form,
          element: element,
        })
      })
    })
  })

  $(document).on('click', '.mspi-form-reset', function(e) {
    var form = $($(this).attr('data-mspi-form'))
    form.trigger('mspi.form-will-reset', {
      form: form,
    })
    form.each(function() {
      $(this)[0].reset()
    })
    form.find('input[type=hidden]').each(function() {
      var node = $(this).get(0)
      if (typeof node.mspiInitialValue !== 'undefined') {
        $(this).val(node.mspiInitialValue)
      }
    })
    form.trigger('mspi.form-did-reset', {
      form: form,
    })
  })

  $(document).on('click', '.mspi-form-fill', function(e) {
    var form = $($(this).attr('data-mspi-form'))
    form.trigger('mspi.form-will-fill', {
      form: form,
    })
    var prefix = 'data-mspi-field-'
    form.find('input[type=hidden]').each(function() {
      var node = $(this).get(0)
      if (typeof node.mspiInitialValue === 'undefined') {
        node.mspiInitialValue = $(this).val()
      }
    })
    $.each(this.attributes, function() {
      if (this.name.indexOf(prefix) === 0) {
        var name = this.name.substring(prefix.length)
        form.find('[name='+name+']').val(this.value)
      }
    })
    form.trigger('mspi.form-did-fill', {
      form: form,
    })
  })

})()
