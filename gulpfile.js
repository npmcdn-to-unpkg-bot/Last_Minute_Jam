const gulp = require('gulp');
const bs = require('browser-sync');
const reload = bs.reload;

gulp.task('bs', () => {
	bs.init({
		server:{
			baseDir: '.'
		}
	});
});
 
gulp.task('default',['bs'],() => {
	gulp.watch('/js/main.js',[reload]);
});