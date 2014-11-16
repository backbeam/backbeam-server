module.exports.pluralize = function(count, singular, plural) {
  return count > 1 ? plural : singular
}