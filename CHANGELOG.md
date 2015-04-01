Changelog
=========

**Version 0.6.0 - Mar 30, 2015**

Data model is now defined in `model.json` instead of in `config.json`. To migrate from 0.5.x just move the contents of your `model` section from `config.json` to `model.json`. So your `model.json` file looks like this:

```json
{
  "entities": [ ... ]
}
```

In `routes.json` you can now specify an `action` to any controller. For example:

```json
{
  "method": "GET",
  "path": "/",
  "file": "home.js",
  "action": "run"
}
```

Then your controller should look like the following:

```javascript
exports.run = function(backbeam, request, response, libs, logger) {
  // your code
}
```

This has two main benefits:

* No global variables used
* You can specify more than one controller in each file

The new `libs` object has a `require` method that let you require files inside the `libs` folder. For example `var filters = libs.require('filters')`.

The `logger` object let's you log information to the console with `logger.log('Hello world')`. This method will log the given message besides additional information such as a formatted date, the HTTP method, request path and the source file of the invoked controller. There are also `warn` and `error` methods available.
