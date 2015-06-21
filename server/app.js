var fs         = require('fs');
var http       = require('http');
var path       = require('path');
var express    = require('express');
var socketio   = require('socket.io');
var bodyParser = require('body-parser');
var TileMantle = require('./lib/TileMantle.js');


var config = require(process.env.CONFIG || (process.cwd() + '/tilemantle.json'));
var tilemantle = new TileMantle(config);

tilemantle.initialize(function(err) {
	if (err) {
		console.error(err)
		process.exit(1);
	}

	// basic setup + socket.io
	var app = express();
	var server = http.createServer(app);
	var io = socketio(server);
	app.use(express.static(path.resolve(__dirname,'../public')));
	app.use(function(req, res, next) { req.tilemantle = tilemantle; next(); });
	tilemantle.bind(io);

	// routes
	app.get('/', require('./routes/index.js'));

	// start listening
	var port = process.env.PORT || config.port || 8080;
	server.listen(port, function(err) {
		if (err) {
			console.error(err);
			process.exit(1);
		}
		console.log('Listening on port ' + port);
	});
});
