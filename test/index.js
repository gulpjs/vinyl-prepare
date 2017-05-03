'use strict';

var path = require('path');

var File = require('vinyl');
var expect = require('expect');
var miss = require('mississippi');

var prepare = require('../');

var applyUmask = require('./utils/apply-umask');
var testConstants = require('./utils/test-constants');

var from = miss.from;
var pipe = miss.pipe;
var concat = miss.concat;

var outputRelative = testConstants.outputRelative;
var inputBase = testConstants.inputBase;
var outputBase = testConstants.outputBase;
var inputPath = testConstants.inputPath;
var outputPath = testConstants.outputPath;
var symlinkPath = testConstants.symlinkPath;

describe('prepare', function() {

  it('exports an object', function(done) {
    expect(typeof prepare).toEqual('object');
    done();
  });

  it('exports a src function', function(done) {
    expect(typeof prepare.src).toEqual('function');
    done();
  });

  it('exports a dest function', function(done) {
    expect(typeof prepare.dest).toEqual('function');
    done();
  });

});

describe('.src()', function() {

  it('doesn\'t wrap in vinyl if already a vinyl', function(done) {
    var file = new File({
      path: inputPath,
    });

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files[0]).toBe(file);
    }

    pipe([
      from.obj([file]),
      prepare.src(),
      concat(assert),
    ], done);
  });

  it('sets path to originalSymlinkPath, if given', function(done) {
    var file = new File({
      path: inputPath,
      originalSymlinkPath: symlinkPath,
    });

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files[0]).toBe(file);
      expect(files[0].path).toEqual(symlinkPath);
    }

    pipe([
      from.obj([file]),
      prepare.src(),
      concat(assert),
    ], done);
  });

  it('errors if since option is invalid (value)', function(done) {
    var file = new File({
      path: inputPath,
    });
    var since = true;

    function assert(err) {
      expect(err).toExist();
      expect(err.message).toEqual('Invalid since option');
      done();
    }

    pipe([
      from.obj([file]),
      prepare.src({ since: since }),
    ], assert);
  });

  it('errors if since option is invalid (function)', function(done) {
    var file = new File({
      path: inputPath,
    });
    var since = function() {
      return true;
    };

    function assert(err) {
      expect(err).toExist();
      expect(err.message).toEqual('Invalid since option');
      done();
    }

    pipe([
      from.obj([file]),
      prepare.src({ since: since }),
    ], assert);
  });

  it('skips files if older than since given in options', function(done) {
    var now = Date.now();
    var file = new File({
      path: inputPath,
      stat: {
        mtime: now - 1001,
      },
    });

    function assert(files) {
      expect(files.length).toEqual(0);
    }

    pipe([
      from.obj([file]),
      prepare.src({ since: now }),
      concat(assert),
    ], done);
  });

  it('skips files if older than since given in options as a function', function(done) {
    var now = Date.now();
    var file = new File({
      path: inputPath,
      stat: {
        mtime: now - 1001,
      },
    });

    function assert(files) {
      expect(files.length).toEqual(0);
    }

    pipe([
      from.obj([file]),
      prepare.src({
        since: function() {
          return now;
        },
      }),
      concat(assert),
    ], done);
  });

});

describe('.dest()', function() {

  it('throws on invalid folder (empty)', function(done) {
    var stream;
    try {
      stream = prepare.dest();
    } catch (err) {
      expect(err).toExist();
      expect(stream).toNotExist();
      expect(err.message).toEqual('Invalid output folder');
      done();
    }
  });

  it('throws on invalid folder (empty string)', function(done) {
    var stream;
    try {
      stream = prepare.dest('');
    } catch (err) {
      expect(err).toExist();
      expect(stream).toNotExist();
      expect(err.message).toEqual('Invalid output folder');
      done();
    }
  });

  it('errors if outFolder function returns invalid value', function(done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    function assert(err) {
      expect(err).toExist();
      expect(err.message).toEqual('Invalid output folder');
      done();
    }

    pipe([
      from.obj([file]),
      prepare.dest(function() {
        return '';
      }),
      concat(),
    ], assert);
  });

  it('updates file cwd with cwd specified in options', function(done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files).toInclude(file);
      expect(files[0].cwd).toEqual(__dirname, 'cwd should have changed');
    }

    pipe([
      from.obj([file]),
      prepare.dest(outputRelative, { cwd: __dirname }),
      concat(assert),
    ], done);
  });

  it('uses the default cwd', function(done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files).toInclude(file);
      expect(files[0].cwd).toEqual(process.cwd(), 'cwd should not have changed');
    }

    pipe([
      from.obj([file]),
      prepare.dest(outputBase),
      concat(assert),
    ], done);
  });

  it('updates file paths to the right folder with relative cwd', function(done) {
    var cwd = path.relative(process.cwd(), __dirname);

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files).toInclude(file);
      expect(files[0].cwd).toEqual(__dirname, 'cwd should have changed');
      expect(files[0].base).toEqual(outputBase, 'base should have changed');
      expect(files[0].path).toEqual(outputPath, 'path should have changed');
    }

    pipe([
      from.obj([file]),
      prepare.dest(outputRelative, { cwd: cwd }),
      concat(assert),
    ], done);
  });

  it('updates file paths to the right folder with cwd as a function', function(done) {
    function cwd() {
      return path.relative(process.cwd(), __dirname);
    }

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files).toInclude(file);
      expect(files[0].cwd).toEqual(__dirname, 'cwd should have changed');
      expect(files[0].base).toEqual(outputBase, 'base should have changed');
      expect(files[0].path).toEqual(outputPath, 'path should have changed');
    }

    pipe([
      from.obj([file]),
      prepare.dest(outputRelative, { cwd: cwd }),
      concat(assert),
    ], done);
  });

  it('updates file paths to the right folder with function and relative cwd', function(done) {
    var cwd = path.relative(process.cwd(), __dirname);

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    function outputFn(f) {
      expect(f).toExist();
      expect(f).toExist(file);
      return outputRelative;
    }

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files).toInclude(file);
      expect(files[0].cwd).toEqual(__dirname, 'cwd should have changed');
      expect(files[0].base).toEqual(outputBase, 'base should have changed');
      expect(files[0].path).toEqual(outputPath, 'path should have changed');
    }

    pipe([
      from.obj([file]),
      prepare.dest(outputFn, { cwd: cwd }),
      concat(assert),
    ], done);
  });

  it('updates file stat modes with the mode specified in options', function(done) {
    var expectedMode = applyUmask('777');

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files).toInclude(file);
      expect(files[0].cwd).toEqual(__dirname, 'cwd should have changed');
      expect(files[0].stat.mode).toEqual(expectedMode, 'stat.mode should have changed');
    }

    pipe([
      from.obj([file]),
      prepare.dest(outputBase, { cwd: __dirname, mode: expectedMode }),
      concat(assert),
    ], done);
  });

  it('updates file stat modes with the mode specified in options as a function', function(done) {
    var expectedMode = applyUmask('777');
    function expectedModeFn() {
      return expectedMode;
    };

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files).toInclude(file);
      expect(files[0].cwd).toEqual(__dirname, 'cwd should have changed');
      expect(files[0].stat.mode).toEqual(expectedMode, 'stat.mode should have changed');
    }

    pipe([
      from.obj([file]),
      prepare.dest(outputBase, { cwd: __dirname, mode: expectedModeFn }),
      concat(assert),
    ], done);
  });

  it('updates file.flag when overwrite is specified in options', function(done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files).toInclude(file);
      expect(files[0].cwd).toEqual(__dirname, 'cwd should have changed');
      expect(files[0].flag).toEqual('w', 'flag should have changed');
    }

    pipe([
      from.obj([file]),
      prepare.dest(outputBase, { cwd: __dirname, overwrite: true }),
      concat(assert),
    ], done);
  });

  it('updates file.flag when overwrite is specified in options as a function', function(done) {
    function overwrite() {
      return true;
    };

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files).toInclude(file);
      expect(files[0].cwd).toEqual(__dirname, 'cwd should have changed');
      expect(files[0].flag).toEqual('w', 'flag should have changed');
    }

    pipe([
      from.obj([file]),
      prepare.dest(outputBase, { cwd: __dirname, mode: overwrite }),
      concat(assert),
    ], done);
  });

});
