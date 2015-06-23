var fs = require('fs');
var async = require('async');
var sqlite3 = require('sqlite3');

function SQLite(opts) {
	this.options = opts;
	this.db = null;
}

SQLite.prototype.init = function(callback) {
	var self = this;
	var exists = false;
	var file = self.options.file;
	async.series([
		function checkExistence(callback) {
			if (!file) return callback(new Error('No "file" given for SQLite database'));
			if (file === ':memory:') return callback();
			fs.exists(file, function(result) {
				exists = result;
				callback();
			});
		},
		function createTables(callback) {
			self.db = new sqlite3.Database(file, function(err) {
				if (err) return callback(err);
				if (exists) return callback();
				var queries = [
					'CREATE TABLE queue(x INTEGER, y INTEGER, z INTEGER, preset TEXT, ts INTEGER)',
					'CREATE UNIQUE INDEX uniq ON queue (z,x,y,preset)'
				];
				async.eachSeries(queries, function(query, callback) {
					self.db.run(query, callback);
				}, callback);
			});
		}
	], callback);
};

SQLite.prototype.select = function(z, xrange, yrange, opts, callback) {
	opts = opts || {};
	opts.limit = opts.limit || 500;
	var query = 'SELECT rowid AS id, x, y, z, preset, ts FROM queue WHERE z = ? AND (x BETWEEN ? AND ?) AND (y BETWEEN ? AND ?) LIMIT ?';
	this.db.all(query, [z, xrange[0], xrange[1], yrange[0], yrange[1], opts.limit], function(err, rows) {
		if (err) return callback(err);
		callback(null, rows);
	});
};

SQLite.prototype.take = function(callback) {
	var self = this;
	var tx_active = false;
	var item = null;

	async.series([
		function lock(callback) {
			self.db.run('BEGIN EXCLUSIVE', function(err) {
				tx_active = !err;
				callback(err);
			});
		},
		function fetchItem(callback) {
			self.db.get('SELECT rowid AS id, x, y, z, preset, ts FROM queue', function(err, result) {
				if (!err) item = result;
				callback(err);
			});
		},
		function deleteItem(callback) {
			self.db.run('DELETE FROM queue WHERE rowid = ?', [item.id], callback);
		},
		function unlock(callback) {
			self.db.run('COMMIT', callback);
		}
	], function(err) {
		if (err && tx_active) {
			self.db.run('ROLLBACK');
		}
		callback(err, item);
	});
};

SQLite.prototype.insert = function(preset, x, y, z, callback) {
	this.db.run('INSERT INTO queue (x, y, z, preset, ts) VALUES (?, ?, ?, ?, ?)', [
		x, y, z, preset, Date.now()
	], function(err) {
		if (err && err.message.indexOf('UNIQUE constraint failed') > -1) {
			// ignore errors saying it's already in the queue
			return callback();
		}
		callback(err);
	});
};

module.exports = SQLite;