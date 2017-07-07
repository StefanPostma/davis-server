'use strict';

const gulp = require('gulp');
const version = require('./package.json').version;
const untar = require('gulp-untar');
const source = require('vinyl-source-stream');
const request = require('request');

const dist = `dynatrace-davis-dist-${version}.tar`;

gulp.task('get-dist', () =>
  request(`https://github.com/Dynatrace/davis-server/releases/download/v${version}/${dist}`)
    .pipe(source(dist))
    .pipe(untar())
    .pipe(gulp.dest('./web/dist')));

