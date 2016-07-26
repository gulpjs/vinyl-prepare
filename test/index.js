'use strict';

var path = require('path');
var File = require('vinyl');
var expect = require('expect');
var miss = require('mississippi');
require('mocha');

var prepare = require('../');

var applyUmask = require('./utils/apply-umask');
var testStreams = require('./utils/test-streams');
var testConstants = require('./utils/test-constants');

var to = miss.to;
var from = miss.from;
var pipe = miss.pipe;
var concat = miss.concat;

var count = testStreams.count;
var rename = testStreams.rename;
var includes = testStreams.includes;
var slowCount = testStreams.slowCount;

function noop(file, enc, next) {
  next();
}

var outputRelative = testConstants.outputRelative;
var inputBase = testConstants.inputBase;
var outputBase = testConstants.outputBase;
var inputPath = testConstants.inputPath;
var outputPath = testConstants.outputPath;
var outputRenamePath = testConstants.outputRenamePath;
var inputDirpath = testConstants.inputDirpath;
var contents = testConstants.contents;

describe('vinyl-prepare', function() {
  it('should export an object', function(done) {
    expect(typeof prepare).toEqual('object');
    done();
  });

  it('should export a write function', function(done) {
    expect(typeof prepare.write).toEqual('function');
    done();
  });

  it('throws on invalid folder (empty)', function(done) {
    var stream;
    try {
      stream = prepare.write();
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
      stream = prepare.write('');
    } catch (err) {
      expect(err).toExist();
      expect(stream).toNotExist();
      expect(err.message).toEqual('Invalid output folder');
      done();
    }
  });

  it('use options.cwd as when a string', function(done) {
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
      prepare.write(outputRelative, { cwd: __dirname }),
      concat(assert),
    ], done);
  });

  it('should use the default cwd', function(done) {
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
      prepare.write(outputBase),
      concat(assert),
    ], done);
  });

  it('update file paths to the right folder with relative cwd', function(done) {
    var cwd = path.relative(process.cwd(), __dirname);

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: new Buffer(contents),
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
      prepare.write(outputRelative, { cwd: cwd }),
      concat(assert),
    ], done);
  });

  it('update file paths to the right folder with cwd as a function', function(done) {
    var cwd = function() {
      return path.relative(process.cwd(), __dirname);
    };

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: new Buffer(contents),
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
      prepare.write(outputRelative, { cwd: cwd }),
      concat(assert),
    ], done);
  });

  it('update file paths to the right folder with function and relative cwd', function(done) {
    var cwd = path.relative(process.cwd(), __dirname);

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: new Buffer(contents),
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
      prepare.write(outputFn, { cwd: cwd }),
      concat(assert),
    ], done);
  });

  it('update file stat modes with the mode specified in options', function(done) {
    var expectedMode = applyUmask('777');

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: new Buffer(contents),
    });

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files).toInclude(file);
      expect(files[0].cwd).toEqual(__dirname, 'cwd should have changed');
      expect(files[0].stat.mode).toEqual(expectedMode, 'stat.mode should have changed');
    }

    pipe([
      from.obj([file]),
      prepare.write(outputBase, { cwd: __dirname, mode: expectedMode }),
      concat(assert),
    ], done);
  });

  it('update file stat modes with the mode specified in options as a function', function(done) {
    var expectedMode = applyUmask('777');
    var expectedModeFn = function() {
      return expectedMode;
    };

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: new Buffer(contents),
    });

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files).toInclude(file);
      expect(files[0].cwd).toEqual(__dirname, 'cwd should have changed');
      expect(files[0].stat.mode).toEqual(expectedMode, 'stat.mode should have changed');
    }

    pipe([
      from.obj([file]),
      prepare.write(outputBase, { cwd: __dirname, mode: expectedModeFn }),
      concat(assert),
    ], done);
  });

  it('update file.flag when overwrite is specified in options', function(done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: new Buffer(contents),
    });

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files).toInclude(file);
      expect(files[0].cwd).toEqual(__dirname, 'cwd should have changed');
      expect(files[0].flag).toEqual('w', 'flag should have changed');
    }

    pipe([
      from.obj([file]),
      prepare.write(outputBase, { cwd: __dirname, overwrite: true }),
      concat(assert),
    ], done);
  });

  it('update file.flag when overwrite is specified in options as a function', function(done) {
    var overwrite = function() {
      return true;
    };

    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: new Buffer(contents),
    });

    function assert(files) {
      expect(files.length).toEqual(1);
      expect(files).toInclude(file);
      expect(files[0].cwd).toEqual(__dirname, 'cwd should have changed');
      expect(files[0].flag).toEqual('w', 'flag should have changed');
    }

    pipe([
      from.obj([file]),
      prepare.write(outputBase, { cwd: __dirname, mode: overwrite }),
      concat(assert),
    ], done);
  });

  it('allows piping multiple times in streaming mode', function(done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: new Buffer(contents),
    });

    pipe([
      from.obj([file]),
      includes({ path: inputPath }),
      prepare.write(outputBase),
      rename(outputRenamePath),
      includes({ path: outputRenamePath }),
      prepare.write(outputBase),
    ], done);
  });

  it('does not get clogged by highWaterMark', function(done) {
    var expectedCount = 17;
    var highwatermarkFiles = [];
    for (var idx = 0; idx < expectedCount; idx++) {
      var file = new File({
        base: inputBase,
        path: inputPath,
        contents: new Buffer(contents),
      });
      highwatermarkFiles.push(file);
    }

    pipe([
      from.obj(highwatermarkFiles),
      count(expectedCount),
      prepare.write(outputBase),
      count(expectedCount),
      to.obj(noop),
    ], done);
  });

  it('allows backpressure when piped to another, slower stream', function(done) {
    this.timeout(20000);

    var expectedCount = 24;
    var highwatermarkFiles = [];
    for (var idx = 0; idx < expectedCount; idx++) {
      var file = new File({
        base: inputBase,
        path: inputPath,
        contents: new Buffer(contents),
      });
      highwatermarkFiles.push(file);
    }

    pipe([
      from.obj(highwatermarkFiles),
      count(expectedCount),
      prepare.write(outputBase),
      slowCount(expectedCount),
    ], done);
  });

  it('respects readable listeners on destination stream', function(done) {
    var file = new File({
      base: inputBase,
      path: inputDirpath,
      contents: null,
    });

    var prepareWriteStream = prepare.write(outputBase);

    var readables = 0;
    prepareWriteStream.on('readable', function() {
      var data = prepareWriteStream.read();

      if (data != null) {
        readables++;
      }
    });

    function assert(err) {
      expect(readables).toEqual(1);
      done(err);
    }

    pipe([
      from.obj([file]),
      prepareWriteStream,
    ], assert);
  });

  it('respects data listeners on destination stream', function(done) {
    var file = new File({
      base: inputBase,
      path: inputDirpath,
      contents: null,
    });

    var prepareWriteStream = prepare.write(outputBase);

    var datas = 0;
    prepareWriteStream.on('data', function() {
      datas++;
    });

    function assert(err) {
      expect(datas).toEqual(1);
      done(err);
    }

    pipe([
      from.obj([file]),
      prepareWriteStream,
    ], assert);
  });

  // TODO: need a better way to pass these options through
  // Or maybe not at all since we fixed highWaterMark
  it('passes options to through2', function(done) {
    var file = new File({
      base: inputBase,
      path: inputPath,
      contents: new Buffer(contents),
    });

    function assert(err) {
      expect(err.message).toMatch(/Invalid non-string\/buffer chunk/);
      done();
    }

    pipe([
      from.obj([file]),
      prepare.write(outputBase, { objectMode: false }),
    ], assert);
  });
});
