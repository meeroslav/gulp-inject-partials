# gulp-inject-partials

[![NPM version](https://img.shields.io/npm/v/gulp-inject-partials.svg)](https://npmjs.org/package/gulp-inject-partials)
[![Build Status](https://travis-ci.org/meeroslav/gulp-inject-partials.svg?branch=master)](https://travis-ci.org/meeroslav/gulp-inject-partials)
[![Code Climate](https://codeclimate.com/github/meeroslav/gulp-inject-partials/badges/gpa.svg)](https://codeclimate.com/github/meeroslav/gulp-inject-partials)

> A recursive injection of partials based on their path name for [gulp](https://github.com/wearefractal/gulp).

**Gulp-inject-partials** parses target file, located defined placeholders and injects file contents based on their relative path. See [Basic usage](#basic-usage) and [More examples](#more-examples) below.
Gulp-inject-partials is based/inspired by [`gulp-inject`](https://github.com/klei/gulp-inject).

**Note:** NodeJs v4 or above is required.

## Installation

Install `gulp-inject-partials` as a development dependancy:

```shell
npm install --save-dev gulp-inject-partials
```

## Basic usage

Each pair of comments are the injection placeholders (aka. tags, see [`options.start`](#optionsstart) and [`options.end`](#optionsend)).

**index.html**
```html
<!DOCTYPE html>
<html>
<head>
  <title>My index</title>
</head>
<body>
  <!-- partial:partial/_mypartial.html -->
  <!-- partial -->
</body>
</html>
```
**partial/_mypartial.html**
```html
<div>
  This text is in partial
</div>
```
**gulpfile.js**
```javascript
var gulp = require('gulp');
var injectPartials = require('gulp-inject-partials');

gulp.task('index', function () {
  return gulp.src('./src/index.html')
           .pipe(injectPartials())
           .pipe(gulp.dest('./src'));
});
```
**Results in**
```html
<!DOCTYPE html>
<html>
<head>
  <title>My index</title>
</head>
<body>
  <!-- partial:views/_mypartial.html -->
  <div>
  This text is in partial
</div>
  <!-- partial -->
</body>
</html>
```

## More examples

### Injecting nested partials

Nesting partials works same way as single level injection. When injecting partials, `gulp-inject-partials` will parse parent file in search for partials to inject. Once it finds a partial will then recursively parse child partial.

**index.html**
```html
<!DOCTYPE html>
<html>
<head>
  <title>My index</title>
</head>
<body>
  <!-- partial:views/_mypartial.html -->
  <!-- partial -->
</body>
</html>
```
**views/_mypartial.html**
```html
<div>
  This is in partial
  <!-- partial:_mypartial2.html -->
  <!-- partial -->
  <!-- partial:_mypartial3.html -->
  <!-- partial -->
</div>
```
**views/_mypartial2.html**
```html
<div>
  This text is in partial 2
</div>
```
**views/_mypartial3.html**
```html
<div>
  This text is in partial 3
</div>
```
**gulpfile.js**
```javascript
var gulp = require('gulp');
var injectPartials = require('gulp-inject-partials');

gulp.task('index', function () {
  return gulp.src('./src/index.html')
           .pipe(injectPartials())
           .pipe(gulp.dest('./src'));
});
```
**Results in**
```html
<!DOCTYPE html>
<html>
<head>
  <title>My index</title>
</head>
<body>
  <!-- partial:views/_mypartial.html -->
  <div>
  This is in partial
  <!-- partial:_mypartial2.html -->
  <div>
  This text is in partial 2
</div>
  <!-- partial -->
  <!-- partial:_mypartial3.html -->
  <div>
  This text is in partial 3
</div>
  <!-- partial -->
</div>
  <!-- partial -->
</body>
</html>
```

### Setting the custom `start` and/or `end` tag

It's possible to change start and end tag by setting [`option.start`](#optionsstart) and [`options.end`](#optionsend) respectivelly.

**index.html**
```html
<!DOCTYPE html>
<html>
<head>
  <title>My index</title>
</head>
<body>
  <## partial/_mypartial.html>
  </##>
</body>
</html>
```
**partial/_mypartial.html**
```html
<div>
  This text is in partial
</div>
```
**gulpfile.js**
```javascript
var gulp = require('gulp');
var injectPartials = require('gulp-inject-partials');

gulp.task('index', function () {
  return gulp.src('./src/index.html')
           .pipe(injectPartials({
              start: '<## {{path}}>',
              end: '</##>'
           }))
           .pipe(gulp.dest('./src'));
});
```
**Results in**
```html
<!DOCTYPE html>
<html>
<head>
  <title>My index</title>
</head>
<body>
  <!-- partial:views/_mypartial.html -->
  <div>
  This text is in partial
</div>
  <!-- partial -->
</body>
</html>
```

### Remove tags after insertion

For production purposes we would like inject tags to be removed and have a clean html. This is possible with [`options.removeTags`](#optionsremovetags).

**index.html**
```html
<!DOCTYPE html>
<html>
<head>
  <title>My index</title>
</head>
<body>
  <!-- partial:partial/_mypartial.html -->
  <!-- partial -->
</body>
</html>
```
**partial/_mypartial.html**
```html
<div>
  This text is in partial
</div>
```
**gulpfile.js**
```javascript
var gulp = require('gulp');
var injectPartials = require('gulp-inject-partials');

gulp.task('index', function () {
  return gulp.src('./src/index.html')
           .pipe(injectPartials({
              removeTags: true
           }))
           .pipe(gulp.dest('./src'));
});
```
**Results in**
```html
<!DOCTYPE html>
<html>
<head>
  <title>My index</title>
</head>
<body>
  <div>
  This text is in partial
</div>
</body>
</html>
```

## API

### inject(options)

#### options.start
Type: `String`
Param (optional):
  - `path` - relative path to source file

Default: `<!-- partial:{{path}} -->`

Used to dynamically set starting placeholder tag, which might contain relative `path` to source file. Even thou this parameter is optional, whithout it no file would be injected.

#### options.end
Type: `String`
Param (optional):
  - `path` - relative path to source file

Default: `<!-- partial -->`

Used to dynamically set ending placeholder tag, which might contain relative `path` to source file.

#### options.removeTags
Type: `Boolean`

Default: false

When `true` the start and end tags will be removed when injecting files.

#### options.quiet
Type: `Boolean`

Default: false

When `true` gulp task will not render any information to console.

## License

[MIT](http://en.wikipedia.org/wiki/MIT_License) © [Miroslav Jonas](mailto:meeroslav@yahoo.com)

