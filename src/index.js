'use strict';

var through = require('through2');
var PluginError = require('plugin-error');
var fancyLog = require('fancy-log');
var colors = require('ansi-colors');
var File = require('vinyl');
var path = require('path');
var fs = require('fs');
var stripBomBuf = require('strip-bom-buf');
var escapeStringRegexp = require('escape-string-regexp');
var magenta = colors.magenta;
var cyan = colors.cyan;
var red = colors.red;


/**
 * Constants
 */
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
	opt.prefix = defaults(opt, 'prefix', '');
	opt.ignoreError = bool(opt, 'ignoreError', false);

  /**
   * Handle injection of files
   * @param target
   * @param encoding
   * @param cb
   * @returns {*}
   */
  function handleStream(target, encoding, cb){
		if (target.isNull()) {
			return cb(null, target);
		}

		if (target.isStream()) {
			return cb(error(target.path + ': Streams not supported for target templates!'));
		}

		try {
			var tagsRegExp = getRegExpTags(opt, null);
			target.contents = processContent(target, opt, tagsRegExp, [target.path]);
			this.push(target);
			return cb();
		} catch(err) {
			this.emit('error', err);
			return cb();
		}
	}

	return through.obj(handleStream);
};

/**
 * Parse content and create new template
 * with all injections made
 *
 * @param {Object} target
 * @param {Object} opt
 * @param {Object} tagsRegExp
 * @param {Array} listOfFiles
 * @returns {Buffer}
 */
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
	if (listOfFiles.length === 1 && !opt.quiet && files.length) {
		log(cyan(files.length) + ' partials injected into ' + magenta(targetPath) + '.');
	}
	return new Buffer(targetContent);
}

/**
 * Inject tags into target content between given
 * start and end tags
 *
 * @param {String} targetContent
 * @param {String} sourceContent
 * @param {Object} opt
 * @param {Object} tagsRegExp
 * @returns {String}
 */
function inject(targetContent, sourceContent, opt, tagsRegExp){
	var startTag = tagsRegExp.start;
	var endTag = tagsRegExp.end;
	var startMatch;
	var endMatch;

	while ((startMatch = startTag.exec(targetContent)) !== null) {
		// Take care of content length change
		endTag.lastIndex = startTag.lastIndex;
		endMatch = endTag.exec(targetContent);
		if (!endMatch) {
			throw error('Missing end tag for start tag: ' + startMatch[0]);
		}
		var toInject = [sourceContent];
		// content part before start tag
		var newContents = targetContent.slice(0, startMatch.index);

		if (opt.removeTags) {
			// Take care of content length change
			startTag.lastIndex -= startMatch[0].length;
		} else {
			// <startMatch> + partial body + <endMatch>
			toInject.unshift(startMatch[0]);
			toInject.push(endMatch[0]);
		}
		var previousInnerContent = targetContent.substring(startTag.lastIndex, endMatch.index);
		var indent = getLeadingWhitespace(previousInnerContent);
		// add new content
		newContents += toInject.join(indent);
		// append rest of target file
		newContents += targetContent.slice(endTag.lastIndex);
		// replace old content with new
		targetContent = newContents;
	}
	startTag.lastIndex = 0;
	endTag.lastIndex = 0;
	return targetContent;
}

/**
 * Prepare regular expressions for parsing template
 * Replace {{path}} with regular expression for matching relative path
 * or with exact file path
 *
 * @param {Object} opt
 * @param {String} fileUrl
 * @returns {Object}
 */
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

/**
 * Parse content and get all partials to be injected
 * @param {String} content
 * @param {String} targetPath
 * @param {Object} opt
 * @param {Object} tagsRegExp
 * @returns {Array}
 */
function extractFilePaths(content, targetPath, opt, tagsRegExp) {
	var files = [];
	var tagMatches;

	// get all start matches
	tagMatches = content.match(tagsRegExp.start);
	if (tagMatches) {
		tagMatches.forEach(function(tagMatch){
			var fileUrl = tagsRegExp.startex.exec(tagMatch)[1];
			var filePath = setFullPath(targetPath, opt.prefix + fileUrl);
			try {
				var fileContent = stripBomBuf(fs.readFileSync(filePath));
				files.push({
					file: new File({
						path: filePath,
						cwd: __dirname,
						base: path.resolve(__dirname, 'expected', path.dirname(filePath)),
						contents: fileContent
					}),
					tags: getRegExpTags(opt, fileUrl)
				});
			} catch (e) {
			  if (opt.ignoreError) {
          log(red(filePath + ' not found.'));
        } else {
          throw error(filePath + ' not found.');
        }
			}
			// reset the regex
			tagsRegExp.startex.lastIndex = 0;
		});
	}
	return files;
}

/////////////////////////////////////
// HELPER FUNCTIONS
/////////////////////////////////////
/**
 * @param str
 * @returns {*}
 */
function getLeadingWhitespace(str) {
	return str.match(LEADING_WHITESPACE_REGEXP)[0];
}

/**
 * @param options
 * @param prop
 * @param defaultValue
 * @returns {*}
 */
function defaults(options, prop, defaultValue) {
	return options[prop] || defaultValue;
}

/**
 * @param options
 * @param prop
 * @param defaultVal
 * @returns {boolean}
 */
function bool(options, prop, defaultVal) {
	return typeof options[prop] === 'undefined' ? defaultVal : Boolean(options[prop]);
}

/**
 * @param message
 * @returns {*}
 */
function error(message) {
	return new PluginError(PLUGIN_NAME, message);
}

/**
 * @param message
 */
function log(message) {
	fancyLog(magenta(PLUGIN_NAME), message);
}

/**
 * @param targetPath
 * @param file
 */
function setFullPath(targetPath, file) {
	var base = path.dirname(targetPath);

	return path.resolve(base, file);
}
