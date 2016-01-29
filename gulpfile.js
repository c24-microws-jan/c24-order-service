'use strict';

const util = require('util');
const gulp = require('gulp');
const shell = require('gulp-shell');
const minimist = require('minimist');
const runSequence = require('run-sequence');
const liveServer = require('gulp-live-server');
const TinyShipyardClient = require('tiny-shipyard-client');
const pkg = require('./package.json');

const args = minimist(process.argv.slice(2), { string: ['tag'] });
const options = {
  serviceName: pkg.name,
  instances: 2,
  registryHost: '46.101.193.82',
  registryPort: '5000',
  shipyardUrl: 'http://46.101.245.190:8080',
  shipyardServiceKey: 'DnqWOkAiUb7YKn6htbJk8RkB8auuJ6fIs1A2',
  versionTag: /^v?\d+\.\d+\.\d+$/.test(args.tag) ? args.tag.replace(/^v/, '') : undefined // do we have a version tag?
}

let server;

gulp.task('test', function (done) {
  done(); // Nothing here yet ;-)
});

gulp.task('serve', function (done) {
  server = server || liveServer.new('index.js');
  server.start();
  done();
});

gulp.task('watch', ['serve'], function () {
  gulp.watch(['**/*.js', '!node_modules/**', '!gulpfile.js'], ['test', 'serve']);
});

gulp.task('build', shell.task([
  `docker build -t ${options.serviceName} .`,
]));

gulp.task('push', shell.task([
  `docker run --privileged -d -p 5000:5000 -e REGISTRY_HOST="${options.registryHost}" -e REGISTRY_PORT="${options.registryPort}" rsmoorthy/registry-forwarder`,
  `docker tag ${options.serviceName} localhost:5000/${options.serviceName}:${options.versionTag}`,
  `docker push localhost:5000/${options.serviceName}:${options.versionTag}`
]));

gulp.task('deploy', function (done) {
  const client = new TinyShipyardClient(options.shipyardUrl, options.shipyardServiceKey);
  const imageName = `${options.registryHost}:${options.registryPort}/${options.serviceName}:${options.versionTag}`;
  let promise = client.createContainer(imageName);
  if (options.instances > 1) {
    promise = promise.then(id => client.scaleContainer(id, options.instances - 1));
  }
  promise.then(() => done(), error => done(error));
});

gulp.task('ci', function (done) {
  runSequence.apply(null, options.versionTag ? ['test', 'build', 'push', 'deploy', done] : ['test', 'build', done]);
});

gulp.task('default', ['watch'], function () {});
