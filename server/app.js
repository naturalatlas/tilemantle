var fs         = require('fs');
var http       = require('http');
var path       = require('path');
var express    = require('express');
var socketio   = require('socket.io');
var JSON5      = require('json5');
var bodyParser = require('body-parser');
var TileMantle = require('./lib/TileMantle.js');


var configfile = process.env.CONFIG || (process.cwd() + '/tilemantle.json');
var config = JSON5.parse(fs.readFileSync(configfile, 'utf8'));
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
	app.use(bodyParser.json({limit: tilemantle.config.upload_limit || '5mb'}));
	app.use(function(req, res, next) { req.tilemantle = tilemantle; next(); });
	tilemantle.bind(io);

	// routes
	app.get('/', require('./routes/index.js'));
	app.post('/api/invalidate', require('./routes/invalidate.js'));
	app.get('/api/queue', require('./routes/queue.js'));

	// start listening
	var port = process.env.PORT || config.port || 8080;
	server.listen(port, function(err) {
		if (err) {
			console.error(err);
			process.exit(1);
		}
		console.log('Listening on port ' + port);
		tilemantle.start();
	});
});
