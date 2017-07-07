'use strict';

const gulp = require('gulp');
const webpack = require('webpack-stream');
const wp = require('webpack');
const fs = require('fs');
const runSequence = require('run-sequence');
const mocha = require('gulp-spawn-mocha');
const update = require('gulp-update')();
const rimraf = require('rimraf');
const bump = require('gulp-bump');
const conventionalChangelog = require('gulp-conventional-changelog');
const minimist = require('minimist');
const tar = require('gulp-tar');
const github = require('gulp-github-release');
const spawn = require('child_process').spawn;
const wpconfig = require('./webpack.config.js');

require('dotenv').config({ silent: true });

const destinationFolder = 'web/dist';
const options = minimist(process.argv.slice(2), {
  string: 'branch',
  default: { branch: '' },
});

gulp.task('changelog', () =>
  gulp.src('CHANGELOG.md', {
    buffer: false,
  })
    .pipe(conventionalChangelog({
      preset: 'angular',
    }))
    .pipe(gulp.dest('./')));

gulp.task('bump-version', () =>
  gulp.src(['package.json'])
    .pipe(bump({ type: 'minor' }))
    .pipe(gulp.dest('./')));

gulp.task('patch-version', () =>
  gulp.src(['package.json'])
    .pipe(bump({ type: 'patch' }))
    .pipe(gulp.dest('./')));

gulp.task('update', () =>
  gulp.watch('./package.json').on('change', (file) => {
    update.write(file);
  }));

gulp.task('pack', ['compile:prod'], (done) => {
  if (/^win/.test(process.platform)) {
    return spawn('cmd.exe', ['/c', 'npm.cmd', 'pack', '.'])
      .on('close', done);
  }
  return spawn('npm', ['pack', '.'])
    .on('close', done);
});

gulp.task('npminstall', (done) => {
  if (/^win/.test(process.platform)) {
    return spawn('cmd.exe', ['/c', 'npm.cmd', 'install'])
      .on('close', done);
  }
  return spawn('npm', ['install'])
    .on('close', done);
});

gulp.task('npmupdate', (done) => {
  if (/^win/.test(process.platform)) {
    return spawn('cmd.exe', ['/c', 'npm.cmd', 'update'])
      .on('close', done);
  }
  return spawn('npm', ['update'])
    .on('close', done);
});

gulp.task('make-release', ['compile:prod', 'pack'], () => {
  const version = JSON.parse(fs.readFileSync('package.json')).version;
  const dist = `dynatrace-davis-dist-${version}.tar`;
  return gulp.src('web/dist/**')
    .pipe(tar(dist))
    .pipe(gulp.dest('./'));
});

gulp.task('github-release', ['make-release'], () => {
  const version = JSON.parse(fs.readFileSync('package.json')).version;
  return gulp.src([
    `dynatrace-davis-dist-${version}.tar`,
    `dynatrace-davis-${version}.tgz`,
  ])
    .pipe(github({
      token: process.env.GITHUB_TOKEN,
      prerelease: true,
      manifest: JSON.parse(fs.readFileSync('package.json')),
    }));
});


gulp.task('clean', (cb) => {
  rimraf('./web/dist', cb);
});

gulp.task('copy', ['copy:html', 'copy:assets']);
gulp.task('copy:html', () =>
  gulp.src('web/src/**/*.html').pipe(gulp.dest(destinationFolder)));
gulp.task('copy:assets', () =>
  gulp.src('web/src/assets/**/*').pipe(gulp.dest(`${destinationFolder}/assets`)));

function compile(config) {
  return gulp.src('web/src/main.ts')
    .pipe(webpack(config))
    .pipe(gulp.dest('web/dist/'));
}

gulp.task('compile', ['compile:prod']);
gulp.task('compile:dev', ['copy'], () => compile(wpconfig));
gulp.task('compile:prod', ['copy'], () => {
  wpconfig.plugins.push(new wp.optimize.UglifyJsPlugin());
  return compile(wpconfig);
});

gulp.task('watch', ['copy'], () => {
  wpconfig.watch = true;
  wpconfig.stats = wpconfig.stats || {};
  wpconfig.stats.errorDetails = true;
  compile(wpconfig);
  return gulp.watch([
    'web/src/**/*.html',
    'web/src/assets/**/*',
  ], ['copy']);
});

gulp.task('test', () =>
   gulp.src(['tests/all.js'], { read: false })
    .pipe(mocha({
      reporter: 'spec',
      timeout: 20000,
    })));

gulp.task('commit', (done) => {
  const version = JSON.parse(fs.readFileSync('package.json')).version;
  spawn('git', ['add', '.'])
    .on('close', () => {
      spawn('git', ['commit', '-m', `[Prerelease] bump ${version}`])
        .on('close', done);
    });
});

gulp.task('checkout-master', (done) => {
  spawn('git', ['checkout', 'master'])
    .on('close', done);
});

gulp.task('checkout-dev', (done) => {
  spawn('git', ['checkout', 'dev'])
    .on('close', done);
});

gulp.task('checkout-branch', (done) => {
  spawn('git', ['checkout', options.branch])
    .on('close', done);
});

gulp.task('merge-master', (done) => {
  spawn('git', ['merge', '--no-ff', 'master'])
    .on('close', done);
});

gulp.task('merge-dev', (done) => {
  spawn('git', ['merge', '--no-ff', 'dev'])
    .on('close', done);
});

gulp.task('merge-branch', (cb) => {
  if (!options.branch) cb('must specify a branch');
  spawn('git', ['merge', '--no-ff', options.branch])
    .on('close', cb);
});

gulp.task('pull', (done) => {
  spawn('git', ['pull'])
    .on('close', done);
});

gulp.task('push', (done) => {
  spawn('git', ['push'])
    .on('close', done);
});

gulp.task('npm-publish', ['compile:prod'], (done) => {
  if (/^win/.test(process.platform)) {
    return spawn('cmd.exe', ['/c', 'npm.cmd', 'publish'])
      .on('close', done);
  }
  return spawn('npm', ['publish'])
    .on('close', done);
});

gulp.task('publish', (cb) => {
  runSequence(
    'checkout-master',
    'pull',
    'npminstall',
    'npmupdate',
    'test',
    'npm-publish',
    cb);
});

gulp.task('release-dev-patch', (cb) => {
  if (!process.env.GITHUB_TOKEN) throw new Error('must set GITHUB_TOKEN env variable');
  runSequence(
    'clean',
    'checkout-master',
    'pull',
    'merge-dev',
    'npminstall',
    'npmupdate',
    'test',
    'bump-version',
    'changelog',
    'commit',
    'push',
    'github-release',
    'checkout-dev',
    'merge-master',
    'push',
    cb);
});

gulp.task('release-minor', (cb) => {
  if (!process.env.GITHUB_TOKEN) throw new Error('must set GITHUB_TOKEN env variable');
  runSequence(
    'clean',
    'checkout-master',
    'pull',
    'merge-dev',
    'npminstall',
    'npmupdate',
    'test',
    'patch-version',
    'changelog',
    'commit',
    'push',
    'github-release',
    'checkout-dev',
    'merge-master',
    'push',
    cb);
});

gulp.task('release-patch', (cb) => {
  if (!options.branch) throw new Error('must specify a branch');
  if (!process.env.GITHUB_TOKEN) throw new Error('must set GITHUB_TOKEN env variable');
  runSequence(
    'clean',
    'checkout-master',
    'pull',
    'checkout-branch',
    'patch-version',
    'changelog',
    'commit',
    'checkout-master',
    'merge-branch',
    'npminstall',
    'npmupdate',
    'test',
    'push',
    'github-release',
    'checkout-dev',
    'merge-branch',
    'push',
    cb);
});
