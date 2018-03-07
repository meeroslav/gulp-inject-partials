'use strict';

const fs = require('fs');
const injectPartials = require('../.');
const File = require('vinyl');
const es = require('event-stream');
const should = require('should');
const path = require('path');
const sinon = require('sinon');
const chai = require('chai');
const expect = chai.expect;
const sinonChai = require('sinon-chai');

chai.use(sinonChai);

describe('gulp-inject-partials', function () {
  beforeEach(function() {
    sinon.spy(console, 'log');
  });

  afterEach(function() {
    console.log.restore();
  });

  it('should inject single partial', function (done) {
    const stream = src(['template1.html'], { read: true })
      .pipe(injectPartials());

    streamShouldContain(stream, ['template1.html'], done);
  });
  it('should inject two partials', function (done) {
    const stream = src(['template2.html'], { read: true })
      .pipe(injectPartials());

    streamShouldContain(stream, ['template2.html'], done);
  });
  it('should inject partials and remove tags', function (done) {
    const stream = src(['template2.html'], { read: true })
      .pipe(injectPartials({ removeTags: true }));

    streamShouldContain(stream, ['template22.html'], done);
  });
  it('should inject nested partials', function (done) {
    const stream = src(['template3.html'], { read: true })
      .pipe(injectPartials());

    streamShouldContain(stream, ['template3.html'], done);
  });
  it('should inject single partial with custom tags', function (done) {
    const stream = src(['template4.html'], { read: true })
      .pipe(injectPartials({
        start: '<##:{{path}}>',
        end: '</##>'
      }));

    streamShouldContain(stream, ['template4.html'], done);
  });
  it('should throw exception if partial is not found', function (done) {
    const stream = src(['template5.html'], { read: true })
      .pipe(injectPartials());

    streamShouldContain(stream, ['template4.html'], done, /not found/);
  });
  it('should throw exception if end tag is missing', function (done) {
    const stream = src(['template6.html'], { read: true })
      .pipe(injectPartials());

    streamShouldContain(stream, ['template4.html'], done, /Missing end tag for start tag/);
  });
  it('should throw exception if circular partials found', function (done) {
    const stream = src(['template7.html'], { read: true })
      .pipe(injectPartials());

    streamShouldContain(stream, ['template4.html'], done, /Circular definition found/);
  });
  it('should remove any content between tags during the injection', function (done) {
    const stream = src(['template8.html'], { read: true })
      .pipe(injectPartials());

    streamShouldContain(stream, ['template3.html'], done);
  });
  it('should not produce log output if quiet option is set', function (done) {
    const stream = src(['template1.html'], { read: true })
      .pipe(injectPartials({ quiet: true }));

    stream.on('data', function () {
    });

    stream.on('end', function () {
      expect(console.log).not.to.be.called;
      done();
    });
  });
  it('should produce log output if quiet option is not set', function (done) {
    const stream = src(['template1.html'], { read: true })
      .pipe(injectPartials({ quiet: false }));

    stream.on('data', function () {
    });

    stream.on('end', function () {
      expect(console.log).to.be.called;
      done();
    });
  });
  it('should use prefix for loading partials from common path', function (done) {
    const stream = src(['template9.html'], { read: true })
      .pipe(injectPartials({ prefix: 'partials/' }));

    streamShouldContain(stream, ['template9.html'], done);
  });
  it('should inject single partial with UTF-8 BOM', function (done) {
    const stream = src(['templateBOM.html'], { read: true })
      .pipe(injectPartials());

    streamShouldContain(stream, ['templateBOM.html'], done);
  });
});

// helpers
function src(files, opt) {
  opt = opt || {};
  return es.readArray(files.map(function (file) {
    return fixture(file, opt.read);
  }));
}

// get expected file
function expectedFile(file) {
  const filePath = path.resolve(__dirname, 'expected', file);
  return new File({
    path: filePath,
    cwd: __dirname,
    base: path.resolve(__dirname, 'expected', path.dirname(file)),
    contents: fs.readFileSync(filePath)
  });
}

// get fixture
function fixture(file, read) {
  const filePath = path.resolve(__dirname, 'fixtures', file);
  return new File({
    path: filePath,
    cwd: __dirname,
    base: path.resolve(__dirname, 'fixtures', path.dirname(file)),
    contents: read ? fs.readFileSync(filePath) : null
  });
}

function streamShouldContain(stream, files, done, errRegexp) {
  let received = 0;

  stream.on('error', function (err) {
    err.message.should.match(errRegexp);
    done();
  });

  const contents = files.map(function (file) {
    return String(expectedFile(file).contents);
  });
  stream.on('data', function (newFile) {
    should.exist(newFile);
    should.exist(newFile.contents);

    if (contents.length === 1) {
      String(newFile.contents).should.equal(contents[0]);
    } else {
      contents.should.containEql(String(newFile.contents));
    }

    if (++received === files.length) {
      done();
    }
  });
}
