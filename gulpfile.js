'use strict';

const gulp             = require('gulp');

const postcss          = require('gulp-postcss');
const autoprefixer     = require("autoprefixer");
const csso             = require("gulp-csso");
const minify           = require('gulp-minify');
const browserReporter  = require('postcss-browser-reporter');

const postcssImport    = require('postcss-import');
const postcssVariables = require('postcss-advanced-variables');
const postcssColor     = require('postcss-color-function');
const postcssNested    = require('postcss-nested');
const postcssExtend    = require('postcss-extend');

const mqpacker         = require("@lipemat/css-mqpacker");
const sourcemaps       = require('gulp-sourcemaps');

const nunjucksRender   = require('gulp-nunjucks-render');

const rename           = require('gulp-rename');

const plumber          = require('gulp-plumber');
const server           = require('browser-sync').create();
const replace          = require('gulp-replace');
const htmlmin          = require('gulp-htmlmin');

const del              = require('del');
const fs               = require("fs");

const newer            = require('gulp-newer');

const concat           = require('gulp-concat');
const remember         = require('gulp-remember');

const debug            = require('gulp-debug');
const w3cjs            = require('gulp-w3cjs');

require('dotenv').config();

const site = process.env.SITE_NAME;
const domain = process.env.DOMAIN;
const action = process.env.API;

const html = (files, since = {}) => {

	gulp.src(files, since)
		.pipe(plumber())
		.pipe(debug({title: 'html:'}))
		.pipe(nunjucksRender({
			data: {
				url: 'https://' + domain,
				domain,
				site,
				action
			},
			path: 'src/'
		}))
		.pipe(w3cjs({
			url : 'https://validator.w3.org/nu/'
		}))
		.pipe(w3cjs.reporter())
		.pipe(gulp.dest('build' + folder ));

};

const htmlBuild = () => {

	gulp.src('src/**/index.html')
		.pipe(nunjucksRender({
			data: {
				url: 'https://' + domain,
				domain,
				site,
				action,
				build : true
			},
			path: 'src/'
		}))
		.pipe(replace('css/styles.css', 'css/styles.min.css?' + Date.now()))
		.pipe(replace('js/scripts.js', 'js/scripts.min.js?' + Date.now()))
		.pipe(gulp.dest('build'));

};

gulp.task('html', () => html('src/**/index.html', {since: gulp.lastRun('html')}));
gulp.task('html:touch', () => html('src/**/index.html'));
gulp.task('html:main', () => html('src/index.html', {}));
gulp.task('html:build', () => htmlBuild());

gulp.task('css', () => {

	return gulp.src('src/css/style.css')
			.pipe(plumber())
			.pipe(sourcemaps.init())
			.pipe(postcss([
				postcssImport(),
				postcssVariables(),
				postcssColor(),
				postcssNested(),
				postcssExtend(),
				autoprefixer({
					overrideBrowserslist: 'Android >= 5'
				}),
				mqpacker(),
				browserReporter()
			]))
			.pipe(sourcemaps.write())
			.pipe(rename('styles.css'))
			.pipe(gulp.dest('build/css'))
			.pipe(csso())
			.pipe(rename({suffix: ".min"}))
			.pipe(gulp.dest('build/css'))

});

gulp.task('js', () => {

	return gulp.src([

		'src/js/min/*.js',
		'src/js/js.js',
		'src/js/*.js',
		'!src/js/min/swiper.min.js',
		'!src/js/min/inputmask.min.js'

	], {since: gulp.lastRun('js')})

		.pipe(debug({title: 'js'}))
		.pipe(sourcemaps.init())
		.pipe(remember('js'))
		.pipe(concat('scripts.js'))
		.pipe(sourcemaps.write())

// prod

		.pipe(minify({
			preserveComments: "some",
			ext : {
				min:'.min.js'
			}
		}))

		.pipe(gulp.dest('build/js'))

});

gulp.task('serve', () => {

	server.init({
		server: 'build',
		files: [
			{
				match: ['build/**/*.*', '!build/**/*.min.{css,js}'],
				fn: server.reload()
			}
		]
	});

});

gulp.task('clear', () => del('build'));

gulp.task('copy', () => {

	return gulp.src(['src/**/*.*', '!src/**/*.{css,html,js}'])
			.pipe(newer('build'))
			.pipe(debug({title: 'copy:newer'}))
			.pipe(gulp.dest('build'))

});

gulp.task('watch', () => {
	gulp.watch('src/js/*.*', gulp.series('js'));
	gulp.watch('src/css/*.*', gulp.series('css'));
	gulp.watch('src/**/index.html', gulp.series('html'));
	gulp.watch(['src/main/**','!src/main/index.html'], gulp.series('html:main'));
	gulp.watch(['src/_include/**/*.html','src/template/**/*.html'], gulp.series('html:touch'));
	gulp.watch(['src/**/*.*', '!src/**/*.{css,html,js}'], gulp.series('copy'));
});

gulp.task('build', gulp.series(
	'clear',
	gulp.parallel('copy','html:build','css','js')
	));

gulp.task('default', gulp.series(
	'clear',
	gulp.parallel('css','js'),
	'html',
	'copy',
	gulp.parallel('watch','serve')
	));