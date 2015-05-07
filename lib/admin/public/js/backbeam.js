(function() {

  var backbeam = window.backbeam = {}

  $(document).ajaxError(function(event, request, settings) {
    swal('Ooops!', 'Error requesting page '+settings.url, 'error')
  })

  $(window).resize(function() {
    resizeFullHeightComponents($(document))
  })

  $(document).on('click', '.opens-editor', function(e) {
    e.preventDefault()
    var file = $(this).attr('data-file')
    $.ajax({
      url: '/_debug/open?file='+encodeURIComponent(file),
    })
  })

  $(document).on('click', '.internal', function(e) {
    e.preventDefault()
    var url = $(this).attr('data-href')
    $(this).closest('.internal-base').load(url)
  })

  function resizeFullHeightComponents(root) {
    var height = $(window).height()
    $('.full-height', root).each(function() {
      var el = $(this)
      var editor = el.data('CodeMirrorInstance')
      if (editor) {
        el = el.next()
      }
      var finalHeight = height - el.offset().top - 20
      finalHeight = Math.max(finalHeight, 300)
      if (editor) {
        editor.setSize(null, finalHeight)
      } else {
        el.css('height', finalHeight+'px')
      }
    })
  }

  function configureComponents(root) {
    $('.date-picker', root).datepicker({
      todayHighlight: true,
      autoclose: true,
      format: 'yyyy-mm-dd',
      todayBtn: 'linked',
    })
    $('.summernote', root).summernote({
      height: 150,
    })
    $('.code-editor', root).each(function() {
      var mode = $(this).attr('data-mode')
      var options = {
        lineNumbers: true,
        mode: mode
      }
      if (mode === 'json') {
        options.mode = 'javascript'
        options.json = true
      }
      var editor = CodeMirror.fromTextArea($(this).get(0), options)
      $(this).data('CodeMirrorInstance', editor)
    })
    $('.choose-location', root).on('click', function(e) {
      e.preventDefault()
      var btn = $(this)
      var formGroup = btn.closest('.form-group')
      var input = formGroup.find('input[type=text]')
      var hidden = formGroup.find('input[type=hidden]')

      backbeam.chooseLocation(input.val(), function(data) {
        input.val(data.addr)
        hidden.val(data.lat+','+data.lon+'|'+data.addr)
      })
    })
    resizeFullHeightComponents(root)
  }

  $(document).ready(function() {
    configureComponents($(document))
  })

  processQueue = function() {
    while (queue.length > 0) {
      queue.shift()()
    }
  }

  backbeam.objectChooser = function() {
    var chooser = $('#object-chooser')
    var modalBody = chooser.find('.modal-body')
    var back = chooser.find('.btn-back')
    var callback = null

    chooser.on('click', '.object-choose', function(e) {
      e.preventDefault()

      var btn = $(this)
      callback(btn.attr('data-id'), btn.attr('data-description'))
      closeModal()
    })

    function closeModal() {
      chooser.modal('hide')
      modalBody.empty()
    }

    chooser.on('click', '.close', closeModal)

    function load(url) {
      modalBody.load(url, function(response, status, xhr) {
        processQueue()
      })
    }
    chooser.on('click', 'ul.pagination a', function(e) {
      e.preventDefault()
      load($(this).attr('href'))
    })

    function show(entity, options, title, cb) {
      callback = cb
      chooser.find('h4.modal-title').text(title)
      
      var url = backbeam.baseUrl+'/entity/'+entity+'?chooser=yes'
      if (options) {
        url += '&'+options
      }
      load(url)
      chooser.modal('show')
    }

    return {
      show:show,
    }
  }()

  var markers = []
  var locations

  backbeam.chooseLocation = function(address, callback) {
    var locationChooser = $('#location-chooser')
    var options = locationChooser.find('ul').empty()
    var form = locationChooser.find('form')
    var input = locationChooser.find('input[type=text]')

    input.val(address)

    function locationChosenWithData(location) {
      var addr = location.formatted_address
      var lat = location.geometry.location.lat
      var lon = location.geometry.location.lng
      var data = {
        addr: addr,
        lat: lat,
        lon: lon,
      }
      callback(data)
      locationChooser.modal('hide')
      return false
    }

    backbeam.locationChosenWithIndex = function(i) {
      return locationChosenWithData(locations[i])
    }

    function appendLocation(location) {
      var li = $('<li></li>')
      var link = $('<a class="link"></a>').text(location.formatted_address).attr('href', '#')
      link.click(function(e) {
        e.preventDefault()
        return locationChosenWithData(location)
      })
      li.append(link)
      options.append(li)
    }

    function show() {
      locationChooser.modal('show')
      var mapOptions = {
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        panControl: false,
        zoomControl: true,
        mapTypeControl: false,
        scaleControl: false,
        streetViewControl: false,
        overviewMapControl: false,
        center: new google.maps.LatLng(41.63, -0.88),
        zoom: 2,
      }

      function infoWindowHandler(map, marker, content, d) {
        return function() {
          infowindow.content = content
          infowindow.open(map, marker)
        }
      }

      var map = new google.maps.Map(document.getElementById('location-chooser-map'), mapOptions)
      var infowindow = new google.maps.InfoWindow({ content:'' })

      function findLocations() {
        var address = input.val()
        if (!address) return

        options.empty().append($('<li>Calculating locations...</li>'))
        markers.forEach(function(marker) {
          marker.setMap(null)
        })
        markers = []
        var url = 'https://maps.googleapis.com/maps/api/geocode/json?address='+encodeURIComponent(address)
        $.getJSON(url, function(data) {
          locations = data.results
          options.empty()
          var bounds = new google.maps.LatLngBounds()
          if (locations.length > 0) {
            var latlons = []
            for (var i = 0; i < locations.length; i++) {
              var location = locations[i]
              appendLocation(location)
              var title = location.formatted_address
              var lat = location.geometry.location.lat
              var lon = location.geometry.location.lng
              var latlon = new google.maps.LatLng(lat, lon)
              var marker = new google.maps.Marker({
                position: latlon,
                title: title,
              })
              marker.setMap(map)
              bounds.extend(latlon)
              latlons.push(latlon)
              markers.push(marker)
              var escaped = $('<div>').text(title).html()
              var content = '<div><a href="#" onclick="backbeam.locationChosenWithIndex('+i+'); return false">'+escaped+'</a></div>'
              google.maps.event.addListener(marker, 'click', infoWindowHandler(map, marker, content, data[i]))
            }

            if (latlons.length === 1) {
              map.setCenter(latlons[0])
              map.setZoom(16)
            } else {
              map.fitBounds(bounds)
            }
          } else {
            options.append($('<li>No locations found with that search</li>'))
          }
        })
        return false
      }
      form.unbind('submit')
      form.submit(findLocations)
      findLocations()
    }
    show()
  }
  

})()
