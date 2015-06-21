function TileMantleQueue(store) {
	this.store = store;
}

/**
 * Adds an item to the queue to be processed.
 *
 * @param {TileMantlePreset} preset
 * @param {object} payload
 * @param {function} callback
 */
TileMantleQueue.prototype.add = function(preset, payload, callback) {

};

/**
 * Returns the next item in the queue that should be processed.
 * Two arguments are passed to the callback:
 *
 *   - payload {object}
 *   - callback {function} (call when done processing)
 *
 * @param {function} callback
 * @return {void}
 */
TileMantleQueue.prototype.take = function(callback) {

};

module.exports = TileMantleQueue;