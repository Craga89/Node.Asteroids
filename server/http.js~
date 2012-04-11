/**
 * Module dependencies.
 */
var express = require('express'),
	routes = require('./routes');

// Setup root directory
var rootdir = __dirname + '/..';

// Setup Express server
var app = express.createServer();

// Shared server configuration
app.configure(function(){
	app.set('views', rootdir + '/views');
	app.set('view engine', 'html');
	app.register('.html', require('jade'));

	app.use(express.logger());
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(express.cookieParser());
	app.use(express.session({
		secret: 'craigsworks'
	}));
	app.use(app.router);
});

// Configure development environment
app.configure('development', function(){
	app.use(express.static(rootdir + '/public'));
	app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

// Configure production evironment
app.configure('production', function(){
	var oneYear = 31557600000;
	app.use(express.static(rootdir + '/public', { maxAge: oneYear }));
	app.use(express.errorHandler());
});

// Setup application routes
app.get('/', routes.index);

// Listen on port 3000
app.listen(3000);
console.log('Express server listening on port %d in %s mode', app.address().port, app.settings.env);

// Export our server
module.exports.express = app;