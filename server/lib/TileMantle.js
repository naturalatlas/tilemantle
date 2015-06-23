var _ = require('lodash');
var async = require('async');
var TileMantleQueue = require('./TileMantleQueue.js');
var TileMantlePreset = require('./TileMantlePreset.js');

function TileMantle(config) {
	this.config = config;
	this._presets = {};
}

/**
 * Attaches a socket.io instance to tilemantle, so that progress events
 * can be sent to the browser.
 *
 * @param {object} io
 * @return {void}
 */
TileMantle.prototype.bind = function(io) {
	this._io = io;
};

/**
 * Emits an event that can be picked up by the front-end.
 *
 * @param {string} event
 * @param {object} data
 * @return {void}
 */
TileMantle.prototype.emit = function(event, data) {
	if (this._io) return;
	data = data || {};
	data.timestamp = Date.now();
	this._io.emit(event, data);
};

/**
 * Returns an instance of the store configured for the project.
 *
 * @throws {Error}
 * @param {string} adapter
 * @param {object} [opts]
 * @return {object}
 */
TileMantle.prototype.store = function() {
	if (!this._store) {
		if (!this.config.store) throw new Error('No stores configured for the project');
		if (!this.config.store.adapter) throw new Error('Store configuration is missing adapter type');
		var adapter = this.config.store.adapter;
		var opts = this.config.store;

		var Adapter = require('./stores/' + adapter + '.js');
		this._store = new Adapter(opts);
	}

	return this._store;
};

/**
 * Returns the tilemantle queue configured for the project.
 *
 * @throws {Error}
 * @return {TileMantleQueue}
 */
TileMantle.prototype.queue = function() {
	if (!this._queue) {
		this._queue = new TileMantleQueue(this.store());
	}

	return this._queue;
};

/**
 * Returns the preset identified by the given name.
 *
 * @param {string} name
 * @return {TileMantlePreset}
 */
TileMantle.prototype.preset = function(name) {
	if (!this._presets.hasOwnProperty(name)) {
		var presets = this.config.presets || {};
		var presetConfig = _.extend({}, this.config.preset_defaults, presets[name]);
		this._presets[name] = new TileMantlePreset(name, presetConfig);
	}
	return this._presets[name];
};

/**
 * Executes the payload coming from the queue. A payload is
 * expected to have:
 *
 *   - preset {string}
 *   - x {int}
 *   - y {int}
 *   - z {int}
 *   - ts {int}
 *
 * @param {object} payload
 * @param {function} callback
 * @return {void}
 */
TileMantle.prototype.execute = function(payload, callback) {
	var self = this;

	// determine the preset
	var preset;
	try { preset = this.preset(payload.preset); }
	catch(e) { return callback(e); }
	if (!preset) return callback(new Error('Preset "' + payload.preset + '" not found'));

	// final options
	var retries = preset.options.retries || 0;
	var retry_delay = preset.options.retry_delay || 1000;

	// emit event
	this.emit('tile_start', {payload: payload});

	// execute each url in preset in order
	async.eachSeries(preset.options.requests, function(request, callback) {
		var headers = request.headers;
		var method = request.method || preset.options.method || 'HEAD';
		var url = request.url
			.replace(/\{x\}/g, payload.x)
			.replace(/\{y\}/g, payload.y)
			.replace(/\{z\}/g, payload.z);

		async.retry(retries, function(callback) {
			var cb = function(err) {
				if (err && retries && retry_delay) {
					return setTimeout(function() { callback(err); }, retry_delay);
				}
				callback(err);
			};

			request({
				url: url,
				method: method,
				headers: headers
			}, function(err, res, body) {
				if (err) return cb(err);
				if (res.statusCode < 200 || res.statusCode >= 300) {
					return cb(new Error('Received HTTP ' + res.statusCode + ' status'));
				}
				callback();
			});
		});
	}, function(err) {
		self.emit('tile_end', {payload: payload, err: err});
		callback(err);
	});
};

/**
 * Performs any setup needed before the server can start
 * processing tile requests.
 *
 * @param {function} callback
 * @return {void}
 */
TileMantle.prototype.initialize = function(callback) {
	var self = this;
	if (this._init) return callback();
	this._init = true;

	async.series([
		function initStore(callback) {
			var store = self.store();
			if (!store.init) return callback();
			store.init(callback)
		}
	], callback);
};

module.exports = TileMantle;