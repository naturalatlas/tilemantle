var _ = require('lodash');
var async = require('async');
var turf = require('turf');
var tilebelt = require('tilebelt');
var tilecover = require('tile-cover');
var buffer = require('./utils/buffer.js');

// var deg_per_tile = {};
// for (var z = 0, zmax = 25; z <= zmax; z++) {
// 	var bbox = tilebelt.tileToBBOX([0,0,z]);
// 	var xdelta = Math.abs(bbox[0]-bbox[2]);
// 	var ydelta = Math.abs(bbox[1]-bbox[3]);
// 	deg_per_tile[z] = Math.max(xdelta, ydelta);
// }
// console.log(deg_per_tile);

var deg_per_tile = {
	'0': 360,
	'1': 180,
	'2': 90,
	'3': 45,
	'4': 22.5,
	'5': 11.25,
	'6': 5.625,
	'7': 2.8125,
	'8': 1.40625,
	'9': 0.703125,
	'10': 0.3515625,
	'11': 0.17578125,
	'12': 0.087890625,
	'13': 0.0439453125,
	'15': 0.010986328125,
	'16': 0.0054931640625,
	'17': 0.00274658203125,
	'18': 0.001373291015625,
	'19': 0.0006866455078125,
	'20': 0.00034332275390625,
	'21': 0.000171661376953125,
	'22': 0.0000858306884765625,
	'23': 0.00004291534423828125,
	'24': 0.000021457672119140625,
	'25': 0.000010728836059570312
};


var performbuffer = function(geom, amt, callback) {
	if (!amt) return callback(null, geom);
	buffer(geom, amt, callback);
};

function TileMantlePreset(name, opts) {
	this.name = name;
	this.options = opts;
	this.metatile = opts.metatile || 1;

	if ([1,2,4,8].indexOf(this.metatile) === -1) {
		throw new Error("Metatile option must be 1, 2, 4, or 8");
	}
}

/**
 * Computes the number of degrees a geometry should be buffered by.
 *
 * @param {int} z
 * @return {void}
 */
TileMantlePreset.prototype._getBufferDegrees = function(z) {
	if (!this.options.buffer) return 0;
	var buffer = this.options.buffer;
	var n = (typeof buffer === 'object') ? buffer[z] : buffer;
	if (!n) return 0;
	return (deg_per_tile[z]||0)*(n||0) - (deg_per_tile[z]||0)*0.1;
};

/**
 * Uses the preset options to add tiles the queue to be re-rendered.
 *
 * @param {object} geom
 * @param {TileMantleQueue} queue
 * @param {function} callback
 * @return {void}
 */
TileMantlePreset.prototype.queue = function(geom, queue, callback) {
	var self = this;
	var minZoom = this.options.minZoom || 0;
	var maxZoom = this.options.maxZoom || 22;
	var metatile = this.metatile;
	var zooms = _.range(minZoom, maxZoom+1);

	async.eachSeries(zooms, function(z, callback) {
		var bufferamt = self._getBufferDegrees(z);

		performbuffer(geom, bufferamt, function(err, finalgeom) {
			if (err) return callback(err);

			// tilecover doesn't like features
			if (finalgeom.type !== 'Polygon') {
				finalgeom = turf.merge(finalgeom);
			}
			if (finalgeom.type === 'FeatureCollection') {
				if (finalgeom.features.length > 1) return callback(new Error('Too many features'));
				finalgeom = finalgeom.features[0];
			}
			if (finalgeom.type === 'Feature') {
				finalgeom = finalgeom.geometry;
			}

			var tiles = []; 

			if (metatile === 1) {
				tiles = tilecover.tiles(finalgeom, {min_zoom: z, max_zoom: z});
			} else {
				var dz = {"2":1, "4":2, "8":3}[metatile];
				var metatiles = tilecover.tiles(finalgeom, {min_zoom: z - dz, max_zoom: z - dz});
				metatiles.forEach(function(xyz){
					var z = xyz[2] + dz;
					var x0 = xyz[0] * metatile;
					var y0 = xyz[1] * metatile;
					for(var dy = 0; dy < metatile; dy++){
						for(var dx = 0; dx < metatile; dx++){
							var x = x0 + dx;
							var y = y0 + dy;
							tiles.push([x, y, z]);
						}
					}
				});
			}

			async.eachSeries(tiles, function(xyz, callback) {
				queue.insert(self, xyz[0], xyz[1], xyz[2], callback);
			}, callback);
		});

	}, function(err) {
		callback(err);
	});
};

module.exports = TileMantlePreset;

