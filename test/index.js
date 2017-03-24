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

describe('.dest()', function() {

  it('exports an object', function(done) {
    expect(typeof prepare).toEqual('object');
    done();
  });

  it('exports a dest function', function(done) {
    expect(typeof prepare.dest).toEqual('function');
    done();
  });

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

  it('outputs files where the base ends in a separator', function(done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files).toInclude(file);
      expect(files[0].base.slice(0,-1)).toEqual(outputBase.slice(0,-1), 'base should be the same minus the separator');
      expect(files[0].base.slice(-1)).toEqual(path.sep, 'base should end in a separator');
    }

    pipe([
      from.obj([file]),
      prepare.dest(outputBase),
      concat(assert),
    ], done);
  });

  it('sourcemaps option', function(done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: null,
    });

    function assert() {
      // TODO: assert something
    }

    pipe([
      from.obj([file]),
      prepare.dest(outputBase, { sourcemaps: true }),
      concat(assert),
    ], done);
  });

});
