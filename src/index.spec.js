'use strict';

var fs = require('fs');
var injectPartials = require('../.');
var gutil = require('gulp-util');
var es = require('event-stream');
var should = require('should');
var path = require('path');

describe('gulp-inject-partials', function(){
	var log;
	var logOutput = [];

	beforeEach(function () {
		log = gutil.log;
		logOutput = [];
		gutil.log = function () {
			logOutput.push(arguments);
		};		
	});

	afterEach(function () {
		gutil.log = log;
	});

	it('should inject single partial', function (done){
		var stream = src(['template1.html'], {read: true})
		.pipe(injectPartials());
		
		streamShouldContain(stream, ['template1.html'], done);
	});
	it('should inject two partials', function (done){
		var stream = src(['template2.html'], {read: true})
		.pipe(injectPartials());
		
		streamShouldContain(stream, ['template2.html'], done);
	});
	it('should inject partials and remove tags', function (done){
		var stream = src(['template2.html'], {read: true})
		.pipe(injectPartials({removeTags: true}));
		
		streamShouldContain(stream, ['template22.html'], done);
	});
	it('should inject nested partials', function(done){
		var stream = src(['template3.html'], {read: true})
		.pipe(injectPartials());
		
		streamShouldContain(stream, ['template3.html'], done);
	});
	it('should inject single partial with custom tags', function (done){
		var stream = src(['template4.html'], {read: true})
		.pipe(injectPartials({
			start: "<##:{{path}}>",
			end: "</##>"
		}));
		
		streamShouldContain(stream, ['template4.html'], done);
	});
	it('should throw exception if partial is not found', function (done){
		var stream = src(['template5.html'], {read: true})
			.pipe(injectPartials());
		
		streamShouldContain(stream, ['template4.html'], done, /not found/);
	});
	it('should throw exception if end tag is missing', function (done){
		var stream = src(['template6.html'], {read: true})
			.pipe(injectPartials());
			
		streamShouldContain(stream, ['template4.html'], done, /Missing end tag for start tag/);
	});
	it('should throw exception if circular partials found', function (done){
		var stream = src(['template7.html'], {read: true})
			.pipe(injectPartials());
			
		streamShouldContain(stream, ['template4.html'], done, /Circular definition found/);
	});
	it('should remove any content between tags during the injection', function(done){
		var stream = src(['template8.html'], {read: true})
		.pipe(injectPartials());
		
		streamShouldContain(stream, ['template3.html'], done);
	});	
	it('should not produce log output if quiet option is set', function (done) {
		var stream = src(['template1.html'], {read: true})
		.pipe(injectPartials({quiet: true}));
		
		stream.on('data', function () {});

		stream.on('end', function () {
			logOutput.should.have.length(0);
			done();
		});
	});
	it('should produce log output if quiet option is not set', function (done) {
		var stream = src(['template1.html'], {read: true})
		.pipe(injectPartials({quiet: false}));
		
		stream.on('data', function () {});

		stream.on('end', function () {
			logOutput.should.have.length(1);
			done();
		});
	});
	it('should use prefix for loading partials from common path', function (done){
		var stream = src(['template9.html'], {read: true})
			.pipe(injectPartials({prefix: 'partials/'}));

		streamShouldContain(stream, ['template9.html'], done);
	});
	it('should inject single partial with UTF-8 BOM', function (done){
		var stream = src(['templateBOM.html'], {read: true})
		.pipe(injectPartials());
		
		streamShouldContain(stream, ['templateBOM.html'], done);
	});
});

// helpers
function src(files, opt) {
	opt = opt || {};
	var stream = es.readArray(files.map(function (file) {
		return fixture(file, opt.read);
	}));
	return stream;
}

// get expected file
function expectedFile(file) {
	var filepath = path.resolve(__dirname, 'expected', file);
	return new gutil.File({
		path: filepath,
		cwd: __dirname,
		base: path.resolve(__dirname, 'expected', path.dirname(file)),
		contents: fs.readFileSync(filepath)
	});
}

// get fixture
function fixture(file, read) {
	var filepath = path.resolve(__dirname, 'fixtures', file);
	return new gutil.File({
		path: filepath,
		cwd: __dirname,
		base: path.resolve(__dirname, 'fixtures', path.dirname(file)),
		contents: read ? fs.readFileSync(filepath) : null
	});
}

function streamShouldContain(stream, files, done, errRegexp) {
	var received = 0;

	stream.on('error', function (err) {
		err.message.should.match(errRegexp);
		done();
	});

	var contents = files.map(function (file) {
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