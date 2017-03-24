'use strict';

var path = require('path');

var fs = require('graceful-fs');
var assign = require('lodash.assign');
var through = require('through2');
var defaultTo = require('lodash.defaultto');
var valueOrFunction = require('value-or-function');
var sourcemap = require('vinyl-sourcemap');

var boolean = valueOrFunction.boolean;
var number = valueOrFunction.number;
var string = valueOrFunction.string;

function sourcemapCoercer(option) {
  if (typeof option === 'boolean' && option === true) {
    return {};
  }

  if (typeof option === 'string') {
    return { path: option };
  }

  if (typeof option === 'object' && !Array.isArray(option)) {
    return option;
  }

  return null;
}

function dest(outFolder, opt) {
  if (!opt) {
    opt = {};
  }

  if (!outFolder) {
    throw new Error('Invalid output folder');
  }

  function normalize(file, enc, cb) {
    var self = this;

    var defaultMode = file.stat ? file.stat.mode : null;

    var options = assign({}, opt, {
      cwd: defaultTo(string(opt.cwd, file), process.cwd()),
      mode: defaultTo(number(opt.mode, file), defaultMode),
      overwrite: defaultTo(boolean(opt.overwrite, file), true),
      sourcemaps: defaultTo(valueOrFunction(sourcemapCoercer, opt.sourcemaps), false),
    });

    var sourcemapOptions;
    if (options.sourcemaps) {
      // TODO: defaults
      sourcemapOptions = {
        // TODO: rename?
        path: string(options.sourcemaps.path, file),
        includeContent: boolean(options.sourcemaps.includeContent, file),
        addComment: boolean(options.sourcemaps.addComment, file),
        sourceRoot: string(options.sourcemaps.sourceRoot, file),
        // TODO: is there a better name for this option?
        mapFile: string(options.sourcemaps.mapFile, file),
        // TODO: rename or remove this option
        destPath: string(options.sourcemaps.destPath, file),
        // TODO: maybe rename?
        sourceMappingURLPrefix: string(options.sourcemaps.sourceMappingURLPrefix, file),
        // TODO: maybe rename?
        sourceMappingURL: string(options.sourcemaps.sourceMappingURL, file),
        // TODO: add clone option? gulp-sourcemaps added this at some point
      };
    }

    options.flag = (options.overwrite ? 'w' : 'wx');

    var cwd = path.resolve(options.cwd);

    var outFolderPath = string(outFolder, file);
    if (!outFolderPath) {
      return cb(new Error('Invalid output folder'));
    }
    var basePath = path.resolve(cwd, outFolderPath);
    var writePath = path.resolve(basePath, file.relative);

    // Wire up new properties
    file.stat = (file.stat || new fs.Stats());
    file.stat.mode = options.mode;
    file.flag = options.flag;
    file.cwd = cwd;
    // Ensure the base always ends with a separator
    // TODO: add a test for this
    file.base = path.normalize(basePath + path.sep);
    file.path = writePath;

    if (!sourcemapOptions) {
      return cb(null, file);
    }

    // TODO: change this function signature to take (file, options, cb)
    // The options can contain the output path
    sourcemap.write(file, sourcemapOptions, onWritten);

    function onWritten(err, outFile, outSourceMap) {
      if (err) {
        return cb(err);
      }

      self.push(outFile);
      if (outSourceMap) {
        self.push(outSourceMap);
      }

      cb();
    }
  }

  return through.obj(opt, normalize);
}

module.exports = {
  dest: dest,
};
