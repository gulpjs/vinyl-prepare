'use strict';

var path = require('path');

var fs = require('graceful-fs');
var assign = require('lodash.assign');
var through = require('through2');
var defaultTo = require('lodash.defaultto');
var valueOrFunction = require('value-or-function');

var boolean = valueOrFunction.boolean;
var number = valueOrFunction.number;
var string = valueOrFunction.string;

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
  dest: dest,
};
