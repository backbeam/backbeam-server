var moment = require('moment')
var tz = require('moment-timezone').tz

var formats = {
  'ymd': 'YYYY-MM-DD',
  'dmy': 'DD-MM-YYYY',
  'mdy': 'MM-DD-YYYY',
}

exports.formatDatetime = function(timestamp, format, timezone) {
  return tz(timestamp, timezone).format(formats[format]+' HH:mm')
}

exports.formatDate = function(timestamp, format, timezone) {
  return tz(timestamp, timezone).format(formats[format])
}

exports.formatTime = function(timestamp, timezone) {
  return tz(timestamp, timezone).format('HH:mm')
}

exports.parseDatetime = function(value, format, timezone) {
  return tz(value, formats[format]+' HH:mm', timezone).valueOf()
}

exports.parseDatetimeForm = function(body, fieldid) {
  var date = body['_date-'+fieldid]
  var time = body['_time-'+fieldid]
  var format = body['_format-'+fieldid]
  var timezone = body['_timezone-'+fieldid]
  return exports.parseDatetime(date+' '+time, format, timezone)
}

exports.formatDay = function(value, format) {
  if (!value) return null
  var year = value.substring(0, 4)
  var month = value.substring(4, 6)
  var day = value.substring(6, 8)

  if (year && month && day) {
    if (format === 'dmy') {
      return [day, month, year].join('-')
    } else if (format === 'mdy') {
      return [month, day, year].join('-')
    } else if (format === 'ymd') {
      return [year, month, day].join('-')
    }
  }
  return null
}

exports.parseDay = function(value, format) {
  var matches
  if (format === 'dmy') {
    if ((matches = value.match(/^(\d{2,2})-(\d{2,2})-(\d{4,4})$/))) {
      return [matches[3], matches[2], matches[1]].join('')
    }
  } else if (format === 'mdy') {
    if ((matches = value.match(/^(\d{2,2})-(\d{2,2})-(\d{4,4})$/))) {
      return [matches[3], matches[1], matches[2]].join('')
    }
  } else if (format === 'ymd') {
    if ((matches = value.match(/^(\d{4,4})-(\d{2,2})-(\d{2,2})$/))) {
      return [matches[1], matches[2], matches[3]].join('')
    }
  }
  return null
}

exports.parseDayForm = function(body, fieldid) {
  var value = body['_day-'+fieldid]
  var format = body['_format-'+fieldid]
  return exports.parseDay(value, format)
}
