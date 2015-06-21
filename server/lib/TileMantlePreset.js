function TileMantlePreset(tilemantle, name, opts) {
	this.tilemantle = tilemantle;
	this.name = name;
	this.options = opts;
}

/**
 * Options:
 *   - buffer {int} Number of tiles to expand the region by. Useful
 *                  for cases when labels can span multiple tiles.
 *
 * @param  {[type]}   opts     [description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
TileMantlePreset.prototype.queue = function(opts, callback) {
	_.defaults(opts, {
		buffer: 0,
		geom: null,
		zooms: null
	});
};

module.exports = TileMantlePreset;