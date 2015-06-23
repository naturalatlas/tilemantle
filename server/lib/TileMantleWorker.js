var async = require('async');

function TileMantleWorker(tilemantle) {
	var self = this;
	this.enable = true;
	this.idle_delay = typeof tilemantle.config.idle_delay === 'number' ? tilemantle.config.idle_delay : 250;
	this.delay_between_tiles = typeof tilemantle.config.delay_between_tiles === 'number' ? tilemantle.config.delay_between_tiles : 50;
	this.tilemantle = tilemantle;

	async.forever(function(callback) {
		if (!self.enable) return;
		self.tilemantle.queue().take(function(err, payload) {
			if (err) {
				console.error(err);
				callback();
			} else if (!payload) {
				setTimeout(function() { callback(); }, self.idle_delay);
			} else {
				self.tilemantle.execute(payload, function(err) {
					if (err) console.error(err);
					callback();
				});
			}
		});
	}, function(err) {
		console.error(err);
	});
}

TileMantleWorker.prototype.stop = function() {
	this.enable = true;
};

module.exports = TileMantleWorker;