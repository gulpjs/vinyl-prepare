'use strict';

var path = require('path');

var fs = require('graceful-fs');
var assign = require('lodash.assign');
var through = require('through2');
var valueOrFunction = require('value-or-function');

function defaultValue(defVal, value) {
  // Double equal to support null & undefined
  return value == null ? defVal : value;
}

var boolean = valueOrFunction.boolean;
var number = valueOrFunction.number;
var string = valueOrFunction.string;

function prepareWrite(outFolder, opt) {
  if (!opt) {
    opt = {};
  }

  if (!outFolder) {
    throw new Error('Invalid output folder');
  }

  function normalize(file, enc, cb) {
    var defaultMode = file.stat ? file.stat.mode : null;

    var options = assign({}, opt, {
      cwd: defaultValue(process.cwd(), string(opt.cwd, file)),
      mode: defaultValue(defaultMode, number(opt.mode, file)),
      overwrite: defaultValue(true, boolean(opt.overwrite, file)),
    });

    options.flag = (options.overwrite ? 'w' : 'wx');

    var cwd = path.resolve(options.cwd);

    var outFolderPath = string(outFolder, file);
    if (!outFolderPath) {
      return cb(new Error('Invalid output folder'));
    }
    var basePath = path.resolve(cwd, outFolderPath);
    if (!basePath) {
      return cb(new Error('Invalid base option'));
    }

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

    cb(null, file);
  }

  return through.obj(opt, normalize);
}

module.exports = {
  write: prepareWrite,
};
