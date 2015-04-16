Changelog
=========

**Version 0.6.0 - Apr 16, 2015**

## Configuration changes

Data model is now defined in `model.json` instead of in `config.json`. To migrate from 0.5.x just move the contents of your `model` section from `config.json` to `model.json`. So your `model.json` file looks like this:

```json
{
  "entities": [ ... ]
}
```

Now you can also load different configuration files depending on the `NODE_ENV` variable. For example if `NODE_ENV=production` you need a `config-production.json` file. If `NODE_ENV` is not set or blank then `config.json` is used.

Also, there's different behavior depending on your `NODE_ENV` variable. If it starts with `prod` then files are not hot-reloaded and templates are cached.

## Changes in controllers

In `routes.json` you can now specify an `action` to any controller. If you don't specify one then `run` is supposed. For example:

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

* No global variables used which is good for many reasons
* You can specify more than one controller in each file
* We can add more parameters in the future without having to worry about naming collissions
* You can name your parameters as you wish. Example: `req` instead of `request`
* You can use `return` easily in your controllers. Such as `if (something) return response.send('Hello')`

The new `libs` object has a `require` method that let you require files inside the `libs` folder. For example `var filters = libs.require('filters')`.

The `logger` object let's you log information to the console with `logger.log('Hello world')`. This method will log the given message besides additional information such as a formatted date, the HTTP method, request path and the source file of the invoked controller. There are also `warn` and `error` methods available.
