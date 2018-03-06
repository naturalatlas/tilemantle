#!/usr/bin/env node
var fs = require('fs');
var yargs = require('yargs');
var async = require('async');
var chalk = require('chalk');
var path = require('path');
var turf = require('@turf/turf');
var numeral = require('numeral');
var request = require('request');
var tilecover = require('@mapbox/tile-cover');
var humanizeDuration = require('humanize-duration');
var pkg = require('../package.json');
var ProgressBar = require('progress');
var bar;
var dateFormat = require('dateformat');

var filesize = function(bytes) {
	return Number((bytes / 1024).toFixed(2)) + 'kB';
};

var argv = require('yargs')
	.usage('Usage: $0 <url> [<url> ...] [options]')
	.version(pkg.version+'\n', 'version', 'Display version number')
	.alias('h', 'help').describe('h', 'Display usage information').boolean('h')
	.alias('l', 'list').describe('l', 'Don\'t perform any requests, just list all tile URLs').boolean('l')
	.alias('a', 'allowfailures').describe('a', 'Skip failures, keep on truckin\'').boolean('a')
	.alias('z', 'zoom').describe('z', 'Zoom levels (comma separated or range)').string('z')
	.alias('e', 'extent').describe('e', 'Extent of region in the form of: nw_lat,nw_lon,se_lat,se_lon').string('e')
	.alias('f', 'file').describe('f', 'GeoJSON file on disk to use as geometry').string('f')
	.alias('p', 'point').describe('p', 'Center of region (use in conjunction with -b)').string('p')
	.alias('b', 'buffer').describe('b', 'Buffer point/geometry by an amount. Affix units at end: mi,km').string('b')
	.alias('d', 'delay').describe('d', 'Delay between requests. Affix units at end: ms,s').string('d')
	.alias('r', 'retries').describe('r', 'Number of retries')
	.alias('m', 'method').describe('m', 'HTTP method to use to fetch tiles').string('m')
	.alias('H', 'header').describe('H', 'Add a request header').string('H')
	.alias('c', 'concurrency').describe('c', 'Number of tiles to request simultaneously')
	.default({delay: '100ms', concurrency: 1, allowfailures: true, retries: 10, method: 'HEAD'})
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
	console.log('  $ tilemantle http://myhost.com/{z}/{x}/{y}.png --zoom=10-14 -f region.geojson');
	console.log('  $ cat region.geojson | tilemantle http://myhost.com/{z}/{x}/{y}.png --zoom=10-14');
	console.log('  $ cat region.geojson | tilemantle http://myhost.com/{z}/{x}/{y}.png --buffer=20mi --zoom=10-14');
	console.log('');
}

if (argv.h) {
	displayHelp();
	process.exit(0);
}

// parse options
var urltemplates = argv._.slice(2);
var validateurlparam = function(template, param) {
	if (template.indexOf(param) === -1) {
		displayHelp();
		console.error('URL missing ' + param + ' parameter');
		process.exit(1);
	}
};

urltemplates.forEach(function(template) {
	if (!/^https?\:/.test(template)) {
		displayHelp();
		console.error('No url template provided');
		process.exit(1);
	}
	validateurlparam(template, '{x}');
	validateurlparam(template, '{y}');
	validateurlparam(template, '{z}');
});

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
            console.log(1)
			callback();
		});
	},
	function determineGeometry(callback) {
		if (rawgeojson) {
            geojson = JSON.parse(rawgeojson);
		} else if (argv.f) {
			geojson = JSON.parse(fs.readFileSync(argv.file, 'utf8'));
		} else if (argv.p) {
			var coords = String(argv.point).split(',').map(parseFloat);
			geojson = turf.point([coords[1], coords[0]]);
		} else if (argv.e) {
			var coords = String(argv.extent).split(',').map(parseFloat);
			geojson = turf.featureCollection([
				turf.point([coords[1], coords[0]]),
				turf.point([coords[3], coords[2]])
			]);
            geojson = turf.bboxPolygon(turf.bbox(geojson));
		} else {
			displayHelp();
			console.error('No geometry provided. Pipe geojson, or use --point or --extent');
			return process.exit(1);
		}

		if (argv.b) {
			var radius = parseFloat(argv.buffer);
			var units = /mi$/.test(argv.buffer) ? 'miles' : 'kilometers';
			geojson = turf.buffer(geojson, radius, units);
		}

        // tilecover doesn't like features
		if(geojson.type === 'FeatureCollection'){
			var merged = turf.clone(geojson.features[0]),features = geojson.features;
			for(var i = 0; i < features.length; i++){
				var poly = features[i];
                if (poly.geometry) merged = turf.union(merged, poly);
			}
            geojson = merged;
		}
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
		// function buildURLs(xyz) {
		// 	urltemplates.forEach(function(template) {
		// 		urls.push(template.replace(/\{x\}/g, xyz[0]).replace(/\{y\}/g, xyz[1]).replace(/\{z\}/g, xyz[2]));
		// 	});
		// }

		var xyzList = buildTileList(geojson, zooms);

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

			bar = new ProgressBar(chalk.gray('[:bar] :percent (:current/:total) eta: :etas'), {total: xyzList.length, width: 20});
            function sleep(sleepTime) {
                for(var start = +new Date; +new Date - start < sleepTime;){}
            }
			async.eachOfLimit(xyzList, argv.concurrency, function(xyz,key, callback) {
                var url = urltemplates[0].replace(/\{x\}/g, xyz[0]).replace(/\{y\}/g, xyz[1]).replace(/\{z\}/g, xyz[2]);
				async.retry(argv.retries, function(callback) {
					var start = (new Date()).getTime();
                    requestProcess.call(null)
					function requestProcess(){
                        request({
                            method: argv.method,
                            url: url,
                            headers: headers
                        }, function(err, res, body) {
                            if (err) {
                            	sleep(5000)
								console.log(chalk.red("\n连接已经断开，5秒后重连！！"))
								requestProcess.call(null)
								return
							}
                            var time = (new Date()).getTime() - start;
                            var statuscolor = res.statusCode !== 200 ? 'red' : 'green';
                            var size_data = filesize(res.body.length);
                            var size_length = res.headers['content-length'] ? filesize(Number(res.headers['content-length'])) : '(no content-length)';
                            process.stdout.cursorTo(0);
                            console.log(chalk.gray('[') + chalk[statuscolor](res.statusCode) + chalk.grey(']') + ' ' + url + ' ' + chalk.blue(time + 'ms') + ' ' + chalk.grey(size_data + ', ' + size_length));
                            if (res.statusCode !== 200) {
                                // tip for http request error
                                var errMsg = 'Request failed (non -200 status)';
                                bar.interrupt(errMsg+'\ncurrent progress is '+ bar.curr+'/'+bar.total);
                                // if in retry,count_failed do not change
                                if(typeof prevKey === "undefined")  prevKey = "undefined";
                                if(prevKey !== key){
                                    count_failed++;
                                    prevKey = key;
                                }
                                callback(errMsg);
                            } else {
                                bar.tick();
                                count_succeeded++;
                                callback();
                            }
                        });
					}

				}, function(err) {
					if (err && argv.allowfailures) err = null;
					callback(err);
				});
			}, callback);
		}
	}
], function(err) {
    var log;
    var duration = humanizeDuration((new Date()).getTime() - t_start);
    var command = process.argv.join(" ");
    var date = new Date();
    var logFileName = "log-"+dateFormat(date,'yyyy-mm-dd-hh-MM-ss')+".log"
	if (count_succeeded || count_failed) {
        console.log('');
        console.log(chalk.grey(numeral(count_succeeded).format('0,0') + ' succeeded, ' + numeral(count_failed).format('0,0') + ' failed after ' + duration));
        log = "执行的命令："+command+"\n耗时:"+duration+"\n成功缓存："+numeral(count_succeeded).format('0,0')+"个，失败"+numeral(count_failed).format('0,0')+"个\n";
	}
	if(!fs.existsSync("log")) fs.mkdirSync("log")
    fs.writeFileSync("log/"+logFileName,log);
    if (err) {
        console.error(chalk.red('Error: ' + (err.message || err)));
        log = err.message || err
        process.exit(1);
    }else{
        process.exit(0);
    }
});
