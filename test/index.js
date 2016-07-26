'use strict';

require('mocha');
var assert = require('assert');
var File = require('vinyl');
var path = require('path');
var through = require('through2');

var prepare = require('../');
var dataWrap = function(fn) {
  return function(data, enc, cb) {
    fn(data);
    cb();
  };
};

describe('vinyl-prepare', function() {
  it('should export an object', function(done) {
    assert.equal(typeof prepare, 'object');
    done();
  });

  it('should export a write function', function(done) {
    assert.equal(typeof prepare.write, 'function');
    done();
  });

  it('should pass through writes with cwd', function(done) {
    var inputPath = path.join(__dirname, './fixtures/test.coffee');

    var expectedFile = new File({
      base: __dirname,
      cwd: __dirname,
      path: inputPath,
      contents: null,
    });

    var buffered = [];

    var onEnd = function() {
      assert.equal(buffered.length, 1);
      assert.deepEqual(buffered[0], expectedFile);
      done();
    };

    var stream = prepare.write('./out-fixtures/', { cwd: __dirname });

    var bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);
    stream.pipe(bufferStream);
    stream.write(expectedFile);
    stream.end();
  });

  it('should pass through writes with default cwd', function(done) {
    var inputPath = path.join(__dirname, './fixtures/test.coffee');

    var expectedFile = new File({
      base: __dirname,
      cwd: __dirname,
      path: inputPath,
      contents: null,
    });

    var buffered = [];

    var onEnd = function() {
      assert.equal(buffered.length, 1);
      assert.deepEqual(buffered[0], expectedFile);
      done();
    };

    var stream = prepare.write(path.join(__dirname, './out-fixtures/'));

    var bufferStream = through.obj(dataWrap(buffered.push.bind(buffered)), onEnd);
    stream.pipe(bufferStream);
    stream.write(expectedFile);
    stream.end();
  });

  it('should allow piping multiple dests in streaming mode', function(done) {
    var inputPath1 = path.join(__dirname, './out-fixtures/multiple-first');
    var inputPath2 = path.join(__dirname, './out-fixtures/multiple-second');
    var inputBase = path.join(__dirname, './out-fixtures/');
    var stream1 = prepare.write('./out-fixtures/', { cwd: __dirname });
    var stream2 = prepare.write('./out-fixtures/', { cwd: __dirname });
    var rename = through.obj(function(file, _, next) {
      file.path = inputPath2;
      this.push(file);
      next();
    });

    stream1.on('data', function(file) {
      assert.equal(file.path, inputPath1);
    });

    stream1.pipe(rename).pipe(stream2);
    stream2.on('data', function(file) {
      assert.equal(file.path, inputPath2);
    }).once('end', done);

    var file = new File({
      base: inputBase,
      path: inputPath1,
      cwd: __dirname,
      contents: null,
    });

    stream1.write(file);
    stream1.end();
  });

  it('should emit finish event', function(done) {
    var srcPath = path.join(__dirname, './fixtures/test.coffee');
    var stream = prepare.write('./out-fixtures/', { cwd: __dirname });

    stream.once('finish', function() {
      done();
    });

    var file = new File({
      path: srcPath,
      cwd: __dirname,
      contents: new Buffer('1234567890'),
    });

    stream.write(file);
    stream.end();
  });

  it('should respect readable listeners on prepare stream', function(done) {
    var srcPath = path.join(__dirname, './fixtures/test.coffee');
    var srcStream = through.obj();
    var prepareStream = prepare.write('./out-fixtures/', { cwd: __dirname });

    srcStream
      .pipe(prepareStream);

    var readables = 0;
    prepareStream.on('readable', function() {
      var data = prepareStream.read();

      if (data != null) {
        readables++;
      }
    });

    prepareStream.on('error', done);

    prepareStream.on('finish', function() {
      assert.equal(readables, 1);
      done();
    });

    var file = new File({
      path: srcPath,
      cwd: __dirname,
      contents: null,
    });
    srcStream.write(file);
    srcStream.end();
  });

  it('should respect data listeners on prepare stream', function(done) {
    var srcPath = path.join(__dirname, './fixtures/test.coffee');
    var srcStream = through.obj();
    var prepareStream = prepare.write('./out-fixtures/', { cwd: __dirname });

    srcStream
      .pipe(prepareStream);

    var datas = 0;
    prepareStream.on('data', function() {
      datas++;
    });

    prepareStream.on('error', done);

    prepareStream.on('finish', function() {
      assert.equal(datas, 1);
      done();
    });

    var file = new File({
      path: srcPath,
      cwd: __dirname,
      contents: null,
    });
    srcStream.write(file);
    srcStream.end();
  });

  it('should pass options to through2', function(done) {
    var srcPath = path.join(__dirname, './fixtures/test.coffee');
    var content = new Buffer('test');
    var stream = prepare.write('./out-fixtures/', { cwd: __dirname, objectMode: false });

    stream.on('error', function(err) {
      assert.equal(err.message, 'Invalid non-string/buffer chunk');
      done();
    });

    var file = new File({
      path: srcPath,
      cwd: __dirname,
      contents: content,
    });

    stream.write(file);
    stream.end();
  });
});
