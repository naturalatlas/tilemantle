#!/usr/bin/env node
var yargs = require('yargs');
var async = require('async');
var chalk = require('chalk');
var path = require('path');
var turf = require('turf');
var numeral = require('numeral');
var request = require('request');
var tilecover = require('tile-cover');
var humanizeDuration = require('humanize-duration');
var pkg = require('../package.json');

var filesize = function(bytes) {
	return Number((bytes / 1024).toFixed(2)) + 'kB';
};

var argv = require('yargs')
	.usage('Usage: $0 <url> [options]')
	.version(pkg.version+'\n', 'version', 'Display version number')
	.alias('h', 'help').describe('h', 'Display usage information').boolean('h')
	.alias('l', 'list').describe('l', 'Don\'t perform any requests, just list all tile URLs').boolean('l')
	.alias('z', 'zoom').describe('z', 'Zoom levels (comma separated or range)').string('z')
	.alias('e', 'extent').describe('e', 'Extent of region in the form of: nw_lat,nw_lon,se_lat,se_lon').string('e')
	.alias('p', 'point').describe('p', 'Center of region (use in conjunction with -b)').string('p')
	.alias('b', 'buffer').describe('b', 'Buffer point/geometry by an amount. Affix units at end: mi,km').string('b')
	.alias('d', 'delay').describe('d', 'Delay between requests. Affix units at end: ms,s').string('d')
	.alias('m', 'method').describe('m', 'HTTP method to use to fetch tiles').string('m')
	.alias('H', 'header').describe('H', 'Add a request header').string('H')
	.alias('c', 'concurrency').describe('c', 'Number of tiles to request simultaneously')
	.default({delay: '100ms', concurrency: 1, method: 'HEAD'})
	.check(function(argv) {
		if (!/^\d+(\.\d+)?(ms|s)$/.test(argv.delay)) throw new Error('Invalid "delay" argument');
		if (!/^((\d+\-\d+)|(\d+(,\d+)*))$/.test(argv.zoom)) throw new Error('Invalid "zoom" argument');
	})
	.parse(process.argv);

function displayHelp() {
	yargs.showHelp();
	console.log('Examples:');
	console.log('  $ tilemantle http://myhost.com/{z}/{x}/{y}.png --point=44.523333,-109.057222 --buffer=12mi --zoom=10-14');
	console.log('  $ tilemantle http://myhost.com/{z}/{x}/{y}.png --extent=44.523333,-109.057222,41.145556,-104.801944 --zoom=10-14');
	console.log('  $ cat region.geojson | tilemantle http://myhost.com/{z}/{x}/{y}.png --zoom=10-14');
	console.log('  $ cat region.geojson | tilemantle http://myhost.com/{z}/{x}/{y}.png --buffer=20mi --zoom=10-14');
	console.log('');
}

if (argv.help) {
	displayHelp();
	process.exit(0);
}

// parse options
var urltemplate = argv._[2];
var validateurlparam = function(template, param) {
	if (template.indexOf(param) === -1) {
		displayHelp();
		console.error('URL missing ' + param + ' parameter');
		process.exit(1);
	}
};
if (!/^https?\:/.test(urltemplate)) {
	displayHelp();
	console.error('No url template provided');
	process.exit(1);
}
validateurlparam(urltemplate, '{x}');
validateurlparam(urltemplate, '{y}');
validateurlparam(urltemplate, '{z}');

// execute
var count_succeeded = 0;
var count_failed = 0;
var rawgeojson = '';
var t_start = (new Date()).getTime();

async.series([
	function readFromPipe(callback) {
		process.stdin.on('readable', function() {
			var chunk = this.read();
			if (chunk === null) {
				callback();
			} else {
				rawgeojson += chunk;
			}
		});
		process.stdin.on('end', function() {
			callback();
		});
	},
	function determineGeometry(callback) {
		if (rawgeojson) {
			geojson = JSON.parse(geojson);
		} else if (argv.point) {
			var coords = String(argv.point).split(',').map(parseFloat);
			geojson = turf.point(coords[1], coords[0]);
		} else if (argv.extent) {
			var coords = String(argv.extent).split(',').map(parseFloat);
			var input = turf.featurecollection([
				turf.point([coords[1], coords[0]]),
				turf.point([coords[3], coords[2]])
			]);
			geojson = turf.extent(input);
		} else {
			displayHelp();
			console.error('No geometry provided. Pipe geojson, or use --point or --extent');
			return process.exit(1);
		}

		if (argv.buffer) {
			var radius = parseFloat(argv.buffer);
			var units = /mi$/.test(argv.buffer) ? 'miles' : 'kilometers';
			geojson = turf.buffer(geojson, radius, units);
		}

		// tilecover doesn't like features
		geojson = turf.merge(geojson);
		if (geojson.type === 'Feature') {
			geojson = geojson.geometry;
		}

		callback();
	},
	function performAction(callback) {
		var zooms = [];
		if (argv.zoom.indexOf('-') > -1) {
			var parts = argv.zoom.split('-').map(Number);
			var minzoom = parts[0];
			var maxzoom = parts[1];
			for (var z = minzoom; z <= maxzoom; z++) {
				zooms.push(z);
			}
		} else {
			zooms = argv.zoom.split(',').map(Number);
			zooms.sort();
		}

		function buildTileList(geojson, zooms) {
			var groups = [];
			zooms.forEach(function(z) {
				groups.push(tilecover.tiles(geojson, {min_zoom: z, max_zoom: z}));
			});
			var result = [];
			return result.concat.apply(result, groups);
		}
		function formatURL(xyz) {
			return urltemplate.replace(/\{x\}/g, xyz[0]).replace(/\{y\}/g, xyz[1]).replace(/\{z\}/g, xyz[2]);
		}

		var urls = buildTileList(geojson, zooms).map(formatURL);
		if (argv.list) {
			for (var i = 0, n = urls.length; i < n; i++) {
				console.log(urls[i]);
			}
			callback();
		} else {
			// build request headers
			var headers = {};
			if (argv.header) {
				if (!Array.isArray(argv.header)) argv.header = [argv.header];
				argv.header.forEach(function(header) {
					var delim = header.indexOf(':');
					if (delim === -1) return;
					var key = header.substring(0, delim).trim();
					var value = header.substring(delim + 1).trim();
					headers[key] = value;
				});
			}
			if (!headers['User-Agent']) {
				headers['User-Agent'] = 'TileMantle/' + pkg.version;
			}

			async.eachLimit(urls, argv.concurrency, function(url, callback) {
				var start = (new Date()).getTime();
				request({
					method: argv.method,
					url: url,
					headers: headers
				}, function(err, res, body) {
					if (err) return callback(err);
					var time = (new Date()).getTime() - start;
					var statuscolor = res.statusCode !== 200 ? 'red' : 'green';
					var size_data = filesize(res.body.length);
					var size_length = res.headers['content-length'] ? filesize(Number(res.headers['content-length'])) : '(no content-length)';

					console.log(chalk.gray('[') + chalk[statuscolor](res.statusCode) + chalk.grey(']') + ' ' + url + ' ' + chalk.blue(time + 'ms') + ' ' + chalk.grey(size_data + ', ' + size_length));
					if (res.statusCode !== 200) {
						count_failed++;
						callback('Request failed (non-200 status)');
					} else {
						count_succeeded++;
						callback();
					}
				});
			}, callback);
		}
	}
], function(err) {
	if (count_succeeded || count_failed) {
		var duration = (new Date()).getTime() - t_start;
		console.log('');
		console.log(chalk.grey(numeral(count_succeeded).format('0,0') + ' succeeded, ' + numeral(count_failed).format('0,0') + ' failed after ' + humanizeDuration(duration)));
	}
	if (err) {
		console.error(chalk.red('Error: ' + (err.message || err)));
		process.exit(1);
	} else {
		process.exit(0);
	}
});