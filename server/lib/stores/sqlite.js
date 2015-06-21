var sqlite3 = require('sqlite3');

function SQLite(opts) {
	this.db =
}


SQLite.prototype.init = function(callback) {
	var queries = [
		'CREATE TABLE queue(x INTEGER, y INTEGER, z INTEGER, ts INTEGER, payload)',
		'CREATE INDEX coord ON queue (z,x,y)',
		'CREATE INDEX coord(ts)',
	];
	this.db.execute()
};

SQLite.prototype.insert = function(payload, callback) {

};

SQLite.prototype.take = function(callback) {

};

module.exports = SQLite;