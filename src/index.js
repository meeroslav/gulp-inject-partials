'use strict';
var through = require('through2');
var gutil = require('gulp-util');
var path = require('path');
var fs = require('fs');
var escapeStringRegexp = require('escape-string-regexp');
var magenta = gutil.colors.magenta;
var cyan = gutil.colors.cyan;

var PLUGIN_NAME = 'gulp-inject-partials';
var DEFAULT_START = '<!-- partial:{{path}} -->';
var DEFAULT_END = '<!-- partial -->';
var FILE_PATH_REGEX = "((\/|\\.\/)?((\\.\\.\/)+)?((\\w|\\-)(\\.(\\w|\\-))?)+((\/((\\w|\\-)(\\.(\\w|\\-))?)+)+)?)";
var PATH_REGEX = /\\\{\\\{path\\\}\\\}/; // ugly I know
var LEADING_WHITESPACE_REGEXP = /^\s*/;

module.exports = function(opt) {
	opt = opt || {};

	opt.start = defaults(opt, 'start', DEFAULT_START);
	opt.end = defaults(opt, 'end', DEFAULT_END);
	opt.removeTags = bool(opt, 'removeTags', false);
	opt.quiet = bool(opt, 'quiet', false);

	function handleStream(target, encoding, cb){
		if (target.isNull()) {
			return cb(null, target);
		}
		
		if (target.isStream()) {
			return cb(error(target.path + ': Streams not supported for target templates!'));
		}
		
		try {
			var tagsRegExp = getRegExpTags(opt);
			target.contents = processContent(target, opt, tagsRegExp, [target.path]);
			this.push(target);
			cb();
		} catch(err) {
			this.emit('error', err);
			cb();
		};
	}

	return through.obj(handleStream);
};

function processContent(target, opt, tagsRegExp, listOfFiles){
	var targetContent = String(target.contents);
	var targetPath = target.path;
	var files = extractFilePaths(targetContent, targetPath, opt, tagsRegExp);
	// recursively process files
	files.forEach(function(fileData){
		if (listOfFiles.indexOf(fileData.file.path) !== -1) {
			throw error("Circular definition found. File: " + fileData.file.path + " referenced in a child file.");
		}
		listOfFiles.push(fileData.file.path);
		var content = processContent(fileData.file, opt, tagsRegExp, listOfFiles);
		listOfFiles.pop();
		
		targetContent = inject(targetContent, String(content), opt, fileData.tags);
	});
	if (listOfFiles.length === 1 && !opt.quiet) {
		log(cyan(files.length) + ' partials injected into ' + magenta(targetPath) + '.');
	}
	return new Buffer(targetContent);
}

function inject(targetContent, sourceContent, opt, tagsRegExp){
	var startTag = tagsRegExp.start;
	var endTag = tagsRegExp.end;    
	var startMatch;
	var endMatch;

	while ((startMatch = startTag.exec(targetContent)) !== null) {
		// Take care of content length change:
		endTag.lastIndex = startTag.lastIndex;
		endMatch = endTag.exec(targetContent);
		if (!endMatch) {
			throw error('Missing end tag for start tag: ' + startMatch[0]);
		}
		var toInject = [sourceContent];
		// <everything before startMatch>:
		var newContents = targetContent.slice(0, startMatch.index);
		
		if (opt.removeTags) {
			// Take care of content length change:
			startTag.lastIndex -= startMatch[0].length;
		} else {
			// <startMatch> + <endMatch>
			toInject.unshift(startMatch[0]);
			toInject.push(endMatch[0]);
		}
		var previousInnerContent = targetContent.substring(startTag.lastIndex, endMatch.index);
		var indent = getLeadingWhitespace(previousInnerContent);   
		// <new inner content>:
		newContents += toInject.join(indent);
		// <everything after endMatch>:
		newContents += targetContent.slice(endTag.lastIndex);
		// replace old content with new:
		targetContent = newContents;
	}
	startTag.lastIndex = 0;
	endTag.lastIndex = 0;
	return targetContent;
}

function getRegExpTags(opt, fileUrl) {
	function parseTag(tag, replacement) {
		return new RegExp(escapeStringRegexp(tag).replace(PATH_REGEX, replacement || FILE_PATH_REGEX), 'g');
	}

	if (fileUrl) {
		return {
			start: parseTag(opt.start, fileUrl),
			end: parseTag(opt.end, fileUrl)
		}
	}
	return {
		start: parseTag(opt.start),
		startex: parseTag(opt.start, "(.+)"),
		end: parseTag(opt.end)
	}
}

function extractFilePaths(content, targetPath, opt, tagsRegExp) {
	var files = [];
	var tagMatches;

	// get all start matches
	tagMatches = content.match(tagsRegExp.start);
	tagMatches && tagMatches.forEach(function(tagMatch){
		var fileUrl = tagsRegExp.startex.exec(tagMatch)[1];
		var filePath = setFullPath(targetPath, fileUrl);
		try {
			var fileContent = fs.readFileSync(filePath);
			files.push({
				file: new gutil.File({
					path: filePath,
					cwd: __dirname,
					base: path.resolve(__dirname, 'expected', path.dirname(filePath)),
					contents: fileContent
				}),
				tags: getRegExpTags(opt, fileUrl)
			});
		} catch (e) {
			throw error(filePath + " not found.");
		}
		// reset the regex
		tagsRegExp.startex.lastIndex = 0;
	});
	return files;
}

function getLeadingWhitespace(str) {
	return str.match(LEADING_WHITESPACE_REGEXP)[0];
}

function defaults(options, prop, defaultValue) {
	return options[prop] || defaultValue;
}

function bool(options, prop, defaultVal) {
	return typeof options[prop] === 'undefined' ? defaultVal : Boolean(options[prop]);
}

function error(message) {
	return new gutil.PluginError(PLUGIN_NAME, message);
}

function log(message) {
	gutil.log(magenta(PLUGIN_NAME), message);
}

function setFullPath(targetPath, file) {
	var base = path.dirname(targetPath);

	return path.resolve(base, file);
}