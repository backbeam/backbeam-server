(function() {

  var backbeam = window.backbeam = {}

  $(document).ajaxError(function(event, request, settings) {
    swal('Ooops!', 'Error requesting page '+settings.url, 'error')
  })

  $(window).resize(function() {
    resizeFullHeightComponents($(document))
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

  backbeam.configureQuickSearch = function(data) {
    var quicksearch = []
    var quicksearchNames = {}
    var routes = data.routes
    var libs = data.libs
    var views = data.views

    routes.forEach(function(route) {
      quicksearch.push({
        id: '/web/controller/'+route.file,
        text: route.method+' '+route.path,
        search: route.method+' '+route.path+' '+route.file,
      })
    })

    views.forEach(function(view) {
      quicksearch.push({
        id: '/web/view/'+view,
        text: view,
        search: view,
      })
    })

    libs.forEach(function(lib) {
      quicksearch.push({
        id: '/web/lib/'+lib,
        text: lib,
        search: lib,
      })
    })

    backbeam.quicksearch = quicksearch
    quicksearch.forEach(function(item) {
      quicksearchNames[item.id] = item.text
    })
    backbeam.quicksearchNames = quicksearchNames
  }

  backbeam.configureWebDevelopment = function(data) {
    var urls2ids = {}
    var counter = 1
    var tabManager = {}
    var history = []
    var storageKey = 'web-development-editors'
    var editorTab = $('#editor-tabs')

    function addHistory(url) {
      var i = $.inArray(url, history)
      if (i >= 0) {
        history.splice(i, 1)
      }
      history.push(url)
    }

    function removeHistory(url) {
      var i = $.inArray(url, history)
      if (i >= 0) {
        history.splice(i, 1)
      }
    }

    tabManager.refreshOverview = function() {
      tabManager.refreshTab(backbeam.baseUrl+'/web/overview')
    }

    tabManager.refreshTab = function(url) {
      var id = urls2ids[url]
      if (!id) return

      var editor = $('#editor-'+id)
      editor.get(0).browse(url)
    }

    tabManager.showTab = function(url) {
      addHistory(url)

      var id = urls2ids[url]
      if (!id) return

      var li = $('[data-tab="'+id+'"]')
      if (li.size() > 0) {
        $('#editor-tabs .active').removeClass('active')
        li.addClass('active')

        scrollToTab(li)

        $('#editors > div').hide()
        var editor = $('#editor-'+id)
        if (editor.hasClass('lazy')) {
          var url = li.attr('data-url')
          editor.removeClass('lazy')
          editor.get(0).browse(url)
        }
        editor.show()
        return true
      }
      return false
    }

    var draggingTab = null

    function createDragOver(over) {
      return function(e) {
        if (draggingTab && !over.hasClass('dragging')) {
          var x = e.clientX - over.offset().left
          var width = over.width()

          if (x < width / 2) {
            draggingTab.insertBefore(over)
          } else {
            draggingTab.insertAfter(over)
          }
        }
      }
    }

    tabManager.updateCurrentTabName = function(name) {
      var li = $('#editor-tabs li.active')
      li.find('.name').text(name)
    }

    tabManager.updateCurrentTabURL = function(url) {
      var li = $('#editor-tabs li.active')
      var oldurl = li.attr('data-url')
      var id = urls2ids[oldurl]
      delete urls2ids[oldurl]
      urls2ids[url] = id
      li.attr('data-url', url)
      tabManager.saveSession()
    }

    tabManager.addTab = function(options, callback) {
      var url       = options.url
      var name      = options.name
      var hideClose = options.hideClose
      var notFocus  = options.notFocus
      var lazy      = options.lazy

      $('#open-file').modal('hide')

      if (tabManager.showTab(url)) return

      var id = urls2ids[url]
      if (!id) {
        id = counter
        urls2ids[url] = counter++
      }
      var tabHtml = ['<li draggable="true" data-tab="'+id+'" class="active">',
                      '<a class="tab"><span class="name"></span> ',
                      '<small class="glyphicon glyphicon-remove x-close"></small></a></li>']
      var tab = $(tabHtml.join(''))
      tab.attr('data-url', url)
      tab.find('.name').text(name)
      if (hideClose) {
        tab.addClass('default')
        tab.find('.x-close').remove()
      }

      var div = $('<div id="editor-'+id+'"></div>')
      div.on('click', 'a.internal', function(e) {
        e.preventDefault()
        var href = $(this).attr('data-href')
        div.browse(href)
      })
      div.on('click', '.opens-tab', function(e) {
        e.preventDefault()
        var href = $(this).attr('data-href')
        var name = $(this).attr('data-name')
        tabManager.addTab({
          url: href,
          name: name,
        })
      })

      div.get(0).browse = function(url, callback) {
        div.load(url, function(response, status, xhr) {
          // TODO: errors
          div.lastURL = url
          configureComponents(div)
          processQueue()
          callback && callback(response, status, xhr)
        })
      }
      div.browse = div.get(0).browse
      div.get(0).refresh = function() {
        div.browse(div.lastURL)
      }

      if (notFocus) {
        tab.removeClass('active')
        div.hide()
      } else {
        $('#editor-tabs .active').removeClass('active')
        $('#editors > div').hide()
      }
      tab.insertBefore($('#editor-latest-tab'))
      if (!notFocus) {
        scrollToTab(tab)
      }
      $('#editors').append(div)

      if (!lazy) {
        div.browse(url, callback)
      } else {
        div.addClass('lazy')
      }

      tab.get(0).addEventListener('dragstart', (function(_tab) {
        return function(e) {
          e.dataTransfer.effectAllowed = 'move'
          e.dataTransfer.setData('text', 'anything') // for Firefox
          _tab.addClass('dragging')
          draggingTab = _tab
        }
      })(tab))
      
      tab.get(0).addEventListener('dragend', (function(_tab) {
        return function(e) {
          _tab.removeClass('dragging')
          draggingTab = null
        }
      })(tab))

      tab.get(0).addEventListener('dragover', createDragOver(tab))

      if (!hideClose) {
        tabManager.saveSession()
      }
      checkScrollStatus()
    }

    tabManager.saveSession = function() {
      if (typeof Storage !== 'undefined') {
        var data = { tabs:[] }
        $('#editor-tabs > li').each(function() {
          var self = $(this)
          var url = self.attr('data-url')
          var name = self.find('span.name').text()
          if (url && name) {
            data.tabs.push({
              url: url,
              name: name,
            })
          }
        })
        // TODO: save history
        localStorage.setItem(storageKey, JSON.stringify(data))
      }
    }

    tabManager.closeActiveTab = function() {
      var li = $('#editor-tabs li.active')
      tabManager.closeTab(li)
    }

    tabManager.closeTab = function(li, alertIfDirty) {
      var id = li.attr('data-tab')
      $('#editor-'+id).remove()
      li.remove()
      var url = li.attr('data-url')
      removeHistory(url)

      if (li.hasClass('active') && history.length > 0) {
        tabManager.showTab(history[history.length - 1])
      }

      if (alertIfDirty) {
        // TODO: alert if dirty
      }

      tabManager.saveSession()
      checkScrollStatus()
    }

    tabManager.updateCurrentTab = function(name, url) {
      var li = $('#editor-tabs li.active')
      li.find('a span').text(name)

      var id = li.attr('data-tab')
      var oldUrl = li.attr('data-url')
      removeHistory(oldUrl)
      addHistory(url)
      urls2ids[url] = id
      li.attr('data-url', url)
    }

    tabManager.closeAll = function() {
      $('#editor-tabs li').each(function() {
        var li = $(this)
        if (li.find('.x-close').size() > 0) {
          tabManager.closeTab(li, false)
        }
      })
    }

    editorTab.on('click', '.x-close', function() {
      var li = $(this).closest('li')
      tabManager.closeTab(li, true)
    })

    editorTab.on('mousedown', '.tab', function() {
      return tabManager.showTab($(this).closest('li').attr('data-url'))

      var li = $(this).closest('li')
      var id = li.attr('data-tab')
      var url = li.attr('data-url')
      addHistory(url)
      $('#editors > div').hide()
      $('#editor-'+id).show()
      $('#editor-tabs .active').removeClass('active')
      li.addClass('active')
    })

    tabManager.addTab({
      name: 'Overview',
      url: backbeam.baseUrl+'/web/overview',
      hideClose: true
    }, function() {
      // tabManager.configureTypeAhead(data)
    })
    tabManager.addTab({
      name: 'Assets',
      url: backbeam.baseUrl+'/web/assets',
      hideClose: true,
      notFocus: true
    })
    tabManager.addTab({
      name: 'Playground',
      url: backbeam.baseUrl+'/web/playground',
      hideClose: true,
      notFocus: true
    })

    if (typeof Storage !== 'undefined') {
      var session = localStorage.getItem(storageKey)
      if (session) {
        try {
          session = JSON.parse(session)
          for (var i = 0; i < session.tabs.length; i++) {
            var tab = session.tabs[i]
            tabManager.addTab({
              url: tab.url,
              name: tab.name,
              notFocus: true,
              lazy: true
            })
          }
        } catch(e) {

        }
      }
    }

    $('#editor-tabs-scroll-left').click(function(e) {
      e.preventDefault()
      editorTab.animate({scrollLeft:'-=100'}, 'fast', checkScrollStatus)
    })

    $('#editor-tabs-scroll-right').click(function(e) {
      e.preventDefault()
      editorTab.animate({scrollLeft:'+=100'}, 'fast', checkScrollStatus)
    })

    function scrollToTab(li) {
      var left = li.position().left
      if (left < 0) {
        editorTab.animate({
          scrollLeft: editorTab.scrollLeft() + left
        }, 'fast', checkScrollStatus)
        return
      }
      var x = left + li.width()
      var diff = x - editorTab.width()
      if (diff > 0) {
        editorTab.animate({
          scrollLeft: editorTab.scrollLeft() + diff
        }, 'fast', checkScrollStatus)
      }
    }

    function checkScrollStatus() {
      if (editorTab.get(0).scrollWidth - editorTab.scrollLeft() - editorTab.width() === 0) {
        $('#editor-tabs-scroll-right').addClass('invisible')
      } else {
        $('#editor-tabs-scroll-right').removeClass('invisible')
      }

      if (editorTab.scrollLeft() === 0) {
        $('#editor-tabs-scroll-left').addClass('invisible')
      } else {
        $('#editor-tabs-scroll-left').removeClass('invisible')
      }
    }

    checkScrollStatus()

    return tabManager
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

})()
