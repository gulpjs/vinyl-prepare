'use strict';

var path = require('path');

var assign = require('lodash.assign');
var fs = require('graceful-fs');
var through = require('through2');
var defaultTo = require('lodash.defaultto');
var File = require('vinyl');
var valueOrFunction = require('value-or-function');

var boolean = valueOrFunction.boolean;
var number = valueOrFunction.number;
var string = valueOrFunction.string;
var date = valueOrFunction.date;


function src(opt) {
  if (!opt) {
    opt = {};
  }

  function normalize(globFile, enc, callback) {

    var file = new File(globFile);
    if (globFile.originalSymlinkPath) {
      file.path = globFile.originalSymlinkPath;
    }

    // Skip this file if since option is set and current file is too old
    if (opt.since != null) {
      var since = date(opt.since, file);
      if (since === null) {
        throw new Error('expected since option to be a date or timestamp');
      }
      if (file.stat.mtime <= since) {
        return callback();
      }
    }

    return callback(null, file);
  }

  return through.obj(opt, normalize);
}


function dest(outFolder, opt) {
  if (!opt) {
    opt = {};
  }

  if (!outFolder) {
    throw new Error('Invalid output folder');
  }

  function normalize(file, enc, cb) {
    var defaultMode = file.stat ? file.stat.mode : null;

    var options = assign({}, opt, {
      cwd: defaultTo(string(opt.cwd, file), process.cwd()),
      mode: defaultTo(number(opt.mode, file), defaultMode),
      overwrite: defaultTo(boolean(opt.overwrite, file), true),
    });

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

    cb(null, file);
  }

  return through.obj(opt, normalize);
}


module.exports = {
  src: src,
  dest: dest,
};
