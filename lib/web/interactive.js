var util = require('util')
var editor = require('open-text-editor')
var mkdirp = require('mkdirp')
var path = require('path')
var fs = require('fs')
var txain = require('txain')
var _ = require('underscore')

module.exports = function(app) {
  var intractive = {}

  app.get('/_debug/open', function(req, res, next) {
    var core = req.core
    if (core.isProduction()) {
      return next()
    }
    var file = req.query.file
    var line = req.query.line
    editor.open(file, line, function(err) {
      if (err) console.log('err', err)
    })
    res.end()
  })

  var steps = []
  app.post('/admin/recording-start', function(req, res, next) {
    steps = []
    res.end()
  })

  app.post('/admin/recording-finish', function(req, res, next) {
    var core = req.core
    var code = testSourceCode()
    steps = []
    var dir = path.join(core.fs.root, 'test')
    var fullpath = path.join(dir, req.body.filename)
    txain(function(callback) {
      mkdirp(dir, callback)
    })
    .then(function(callback) {
      fs.writeFile(fullpath, code, 'utf8', callback)
    })
    .then(function(callback) {
      editor.open(fullpath, 0, function(err) {
        if (err) console.log('err', err)
      })
      callback()
    })
    .end(function(err) {
      if (err) return next(err)
      res.end()
    })
  })

  app.get('/_debug/find-controller', function(req, res, next) {
    var _path = require('url').parse(req.query.path).pathname
    if (!_path) return res.json({})
    require('./index').findController(req.core, req.query.method, _path, function(err, controller) {
      if (err) return next(err)
      res.json({
        controller: controller,
      })
    })
  })

  intractive.track = function(req, res) {
    var info = {
      method: req.method,
      path: req.path,
      query: req.query,
      body: req.body || [],
      // TODO: multipart
    }

    res.on('finish', function() {
      steps.push(info)
      info.statusCode = res.statusCode
    })
  }

  app.use(function(req, res, next) {
    var core = req.core
    if (!core.isProduction()) {
      req.interactiveScript = ';('+interactive.toString()+')();'
    }
    next()
  })

  function testSourceCode() {
    var code = [
      "var utils = require('./test-utils')",
      "var request = utils.request",
      "var assert = require('assert')",
      "var txain = require('txain')",
      "",
      "describe('Test <name>', function() {",
      "  ",
      "  before(function(done) {",
      "    utils.cleanDatabase(done)",
      "  })",
      "  ",
      "  it('should test something', function(done) {",
      "  ",
      "    txain(function(callback) {",
    ]

    var i = 0
    steps.forEach(function(step) {

      function serialize(key, data) {
        code.push("        ."+key+"({")

        _.keys(data).forEach(function(k) {
          var value = data[k]
          if (_.isString(value)) {
            value = "'"+value+"'"
          } else {
            value = JSON.stringify(value)
          }
          code.push("          '"+k+"': "+value+",")
        })

        code.push("        })")
      }

      if (i++ > 0) {
        code = code.concat([
          "    .then(function(callback) {",
        ])
      }
      code = code.concat([
        "      request",
        "        ."+step.method.toLowerCase()+"('"+step.path+"')",
      ])
      if (step.query && _.size(step.query) > 0) {
        serialize('query', step.query)
      }
      if (step.body && _.size(step.body) > 0) {
        serialize('body', step.body)
      }

      code = code.concat([
        "        .end(function(err, res) {",
        "          assert.ifError(err)",
        "          assert.equal("+step.statusCode+", res.statusCode, res.text)",
        "          // TODO: assert res.body or res.text or both",
        "          callback()",
        "        })",
      ])
    })

    code = code.concat([
      "    })",
      "    .end(done)",
      "",
      "  })",
      "  ",
      "})",
    ])

    return code.join('\n')
  }

  return intractive
}

function interactive() {

  var touchDevice = ('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch

  function loadScript(url, callback) {
    var head = document.getElementsByTagName('head')[0]
    var script = document.createElement('script')
    script.type = 'text/javascript'
    script.onreadystatechange = function (){
      if (this.readyState == 'complete') callback()
    }
    script.onload = callback
    script.src = url
    head.appendChild(script)
  }

  function serializeCss(obj) {
    var str = ''
    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        str += key+':'+obj[key]+';'
      }
    }
    return str
  }

  function init() {
    var dbg, dbgText, overlay, overlayText

    dbgText = document.createTextNode('DEBUG')
    dbg = document.createElement('div')
    dbg.setAttribute('style', serializeCss({
      'display': 'none',
      'position':' fixed',
      'background-color': 'red',
      'color': 'white',
      'padding': '10px',
      'top': 0,
      'right': 0,
      'z-index': 9999999,
      'font-family': '\'Helvetica Neue\', Helvetica, Arial, sans-serif',
    }))
    dbg.appendChild(dbgText)
    document.body.appendChild(dbg)

    overlayText = document.createTextNode('')
    overlay = document.createElement('div')
    overlay.setAttribute('style', serializeCss({
      'display': 'none',
      'position': 'absolute',
      'background': 'black',
      'opacity': 0.6,
      'transition': '0.2s',
      'pointer-events': 'none',
      'color': 'white',
      'font-family': '\'Helvetica Neue\', Helvetica, Arial, sans-serif',
      'padding': '5px',
      'margin': 0,
      'overflow': 'hidden',
      'white-space': 'pre',
      'z-index': 9999999,
    }))
    overlay.appendChild(overlayText)
    document.body.appendChild(overlay)

    var states = ['views', 'controllers']
    var debug = -1

    function switchDebugMode() {
      debug++
      if (debug >= states.length) {
        debug = -1
        overlay.style.width = '0'
        overlay.style.height = '0'
        focusedNode = null

        dbg.style.display = 'none'
        overlay.style.display = 'none'
      } else {
        dbgText.nodeValue = ('debug '+states[debug]).toUpperCase()
        dbg.style.display = 'block'
        overlay.style.display = 'block'
      }
    }

    var focusedNode = null

    function focusNode(e) {
      if (debug < 0) return
      overlay.style.display = 'block'
      var target = e.target
      if (debug === 1) {
        var info = findController()
        if (!info) {
          overlay.style.left = '0'
          overlay.style.top = '0'
          overlay.style.width = '0'
          overlay.style.height = '0'
          focusedNode = null
          return
        }
        console.log('info', info)
        if (focusedNode === target) return
        // request controller information
        var req = new XMLHttpRequest()
        req.open('get', '/_debug/find-controller?method='+encodeURIComponent(info.method)+'&path='+encodeURIComponent(info.path), true)
        req.send()
        req.onload = function() {
          var data = JSON.parse(this.responseText)
          console.log('data', data)
          var description = nodeDescription()
          if (data.controller && data.controller.file) {
            description += '\n'+data.controller.file
            description += '\n'+data.controller.action
            target.info = data.controller
          }
          overlayText.nodeValue = description
        }
      }

      function nodeDescription() {
        var description = target.nodeName.toLowerCase()
        var id = target.getAttribute('id')
        if (id) {
          description += '#'+id
        }
        return description
      }

      function findController() {
        while (true) {
          if (target.nodeName === 'A') {
            return {
              path: target.getAttribute('href'),
              method: 'GET',
            }
          }
          if (target.nodeName === 'FORM') {
            return {
              path: target.getAttribute('action'), // || window.location.pathname ?
              method: target.getAttribute('method') || 'GET',
            }
          }
          target = target.parentNode
          if (!target) return
        }
      }

      function getPosition(element) {
        var xPosition = 0;
        var yPosition = 0;
      
        while (element) {
          xPosition += (element.offsetLeft /*- element.scrollLeft*/ + element.clientLeft);
          yPosition += (element.offsetTop /*- element.scrollTop*/ + element.clientTop);
          element = element.offsetParent;
        }
        return { x: xPosition, y: yPosition };
      }

      function focusOn(target) {
        var position = getPosition(target)
        overlay.style.left = position.x+'px'
        overlay.style.top = position.y+'px'
        overlay.style.width = target.offsetWidth+'px'
        overlay.style.height = target.offsetHeight+'px'
        focusedNode = target
      }

      focusOn(target)
      overlayText.nodeValue = nodeDescription()
    }

    function openFile(e) {
      if (debug < 0) return
      e.preventDefault()
      e.stopPropagation && e.stopPropagation()
      var node = e.target
      var file, line;
      if (debug === 1) {
        
        function findParent(elem) {
          while (true) {
            if (!elem) return
            if (elem.nodeName === 'A' || elem.nodeName === 'FORM') {
              return elem
            }
            elem = elem.parentNode
          }
        }

        node = findParent(node)
        if (node) {
          file = node.info && node.info.fullpath
          line = 0
        }
      } else {
        do {
          file = file || node.getAttribute('jade_file')
          line = line || node.getAttribute('jade_line')
          node = node.parentNode
        } while((!file || !line) && node)
      }

      if (file && typeof line !== 'undefined') {
        var req = new XMLHttpRequest()
        req.open('get', '/_debug/open?file='+encodeURIComponent(file)+'&line='+encodeURIComponent(line), true)
        req.send()
      }
    }

    if (touchDevice) {
      console.log('press to enable/disable the debug mode')
      new Hammer(document.body).on('press', switchDebugMode)
      new Hammer(document.body).on('tap', function(e) {
        e.target === focusedNode ? openFile(e) : focusNode(e)
      })
    } else {
      console.log('press shift+cmd+p to enable/disable the debug mode (where `cmd` is your command or control key)')
      Mousetrap.bind('shift+mod+p', switchDebugMode)

      document.addEventListener('click', openFile, true)
      document.addEventListener('mousemove', focusNode, true)
    }
  }

  var helper = touchDevice ?
    'https://cdnjs.cloudflare.com/ajax/libs/hammer.js/2.0.4/hammer.min.js' :
    'https://cdnjs.cloudflare.com/ajax/libs/mousetrap/1.4.6/mousetrap.js'
  loadScript(helper, init)

}
