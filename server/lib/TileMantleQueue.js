var tilebelt = require('tilebelt');


function TileMantleQueue(store) {
	this.store = store;
}

/**
 * Adds an item to the queue to be processed.
 *
 * @param {TileMantlePreset} preset
 * @param {int} x
 * @param {int} y
 * @param {int} z
 * @param {function} callback
 */
TileMantleQueue.prototype.insert = function(preset, x, y, z, callback) {
	this.store.insert(preset.name, x, y, z, callback);
};

/**
 * Returns the next item in the queue that should be processed.
 * Two arguments are passed to the callback:
 *
 *   - err {object}
 *   - payload {object|null}
 *
 * @param {function} callback
 * @return {void}
 */
TileMantleQueue.prototype.take = function(callback) {
	this.store.take(callback);
};

/**
 * Finds the tiles in the queue in the given area. Options include:
 *
 *   - "limit" {int}
 *
 * @param {int} z
 * @param {int[]} xrange
 * @param {int[]} yrange
 * @param {object}  opts
 * @param {function} callback
 * @return {void}
 */
TileMantleQueue.prototype.select = function(z, xrange, yrange, opts, callback) {
	// translate lng/lat to tile x/y
	xrange.sort();
	yrange.sort();

	var nw = tilebelt.pointToTile(xrange[0],yrange[1],z);
	var se = tilebelt.pointToTile(xrange[1],yrange[0],z);
	var xrange_tile = [nw[0], se[0]];
	var yrange_tile = [nw[1], se[1]];
	xrange_tile.sort();
	yrange_tile.sort();

	var geojson = opts.geojson;
	this.store.select(z, xrange_tile, yrange_tile, opts, function(err, items) {
		if (err) return callback(err);
		if (!geojson) return callback(null, items);

		return callback(null, {
			type: 'FeatureCollection',
			features: items.map(function(item) {
				return {
					type: 'Feature',
					properties: item,
					geometry: tilebelt.tileToGeoJSON([item.x,item.y,item.z])
				};
			})
		});
	});
};

module.exports = TileMantleQueue;