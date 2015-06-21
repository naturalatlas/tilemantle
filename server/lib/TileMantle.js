var _ = require('lodash');

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
		var presetConfig = presets[name];
		if (presetConfig) {
			this._presets[name] = new TileMantlePreset(name, presetConfig);
		} else {
			this._presets[name] = null;
		}
	}
	return this.presets[name];
};

/**
 * Executes the payload coming from the queue. A payload is
 * expected to have:
 *
 *   - preset {string}
 *   - x {int}
 *   - y {int}
 *   - z {int}
 *   - headers {object} (optional)
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

	// finalize options
	var defaults = {retries: 0, retry_delay: 1000, method: 'HEAD', headers: {}};
	var baseopts = _.extend(defaults, this.config.defaults, preset.defaults, payload);

	// execute each url in preset in order
	async.eachSeries(preset.options.requests, function(request, callback) {
		var opts = _.extend({}, baseopts, request);
		var url = request.url
			.replace(/\{x\}/g, payload.x)
			.replace(/\{y\}/g, payload.y)
			.replace(/\{z\}/g, payload.z);

		async.retry(opts.retries, function(callback) {
			var cb = function(err) {
				if (err && opts.retries && opts.retry_delay) {
					return setTimeout(function() { callback(err); }, opts.retry_delay);
				}
				callback(err);
			};

			request({
				url: url,
				method: opts.method,
				headers: opts.headers
			}, function(err, res, body) {
				if (err) return cb(err);
				if (res.statusCode < 200 || res.statusCode >= 300) {
					return cb(new Error('Received HTTP ' + res.statusCode + ' status'));
				}
				callback();
			});
		});
	}, callback);
};

/**
 * Performs any setup needed before the server can start
 * processing tile requests.
 *
 * @param {function} callback
 * @return {void}
 */
TileMantle.prototype.initialize = function(callback) {
	if (!this._init) return callback();
	this._init = true;

	async.series([
		function initStore(callback) {
			var store = this.store();
			if (!store.init) return callback();
			store.init(callback)
		}
	], callback);
};

module.exports = TileMantle;