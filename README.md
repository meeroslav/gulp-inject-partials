# gulp-inject-partials

> A recursive injection of partials based on their path name for [gulp](https://github.com/wearefractal/gulp).

`gulp-inject-partials` parses target file, located defined placeholders and injects file contents based on their relative path. See [Basic usage](#basic-usage) and [More examples](#more-examples) below.

**Note:** NodeJs v4 or above is required.

## Installation

Install `gulp-inject-partials` as a development dependancy:

```shell
npm install --save-dev gulp-inject-partials
```

## Basic usage

** Target file `index.html`:**

Each pair of comments are the injection placeholders (aka. tags, see [`options.starttag`](#optionsstarttag) and [`options.endtag`](#optionsendtag)).

```html
<!DOCTYPE html>
<html>
<head>
  <title>My index</title>
</head>
<body>
  <!-- partial:partial/_mypartial.html -->
  <!-- endpartial -->
</body>
</html>
```

**The `gulpfile.js`:**

```javascript
var gulp = require('gulp');
var injectPartials = require('gulp-inject-partials');

gulp.task('index', function () {
  var target = gulp.src('./src/index.html');
  // It's not necessary to read the files (will speed up things), we're only after their paths:

  return target.pipe(injectPartials())
    .pipe(gulp.dest('./src'));
});
```

## License

[MIT](http://en.wikipedia.org/wiki/MIT_License) © [Miroslav Jonas](mailto:meeroslav@yahoo.com)

