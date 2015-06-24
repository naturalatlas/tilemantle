var async = require('async');
var assert = require('chai').assert;
var SQLite = require('../server/lib/stores/sqlite.js');

describe('Stores', function() {
	describe('"sqlite"', function() {
		describe('take()', function() {
			it('should operate normally', function(done) {
				var store = new SQLite({file: ':memory:'});
				async.series([
					function init(callback) { store.init(callback); },
					function insert1(callback) { store.insert('a',1,2,3, callback); },
					function insert2(callback) { store.insert('b',4,5,6, callback); },
					function multitake(callback) {
						var completed = 0;
						var results = {};
						var cb = function(err, item) {
							if (err) throw err;
							results[completed] = item;
							if (++completed === 2) {
								assert.equal(results[0].x,1);
								assert.equal(results[0].y,2);
								assert.equal(results[0].z,3);
								assert.equal(results[0].preset,'a');
								assert.equal(results[1].x,4);
								assert.equal(results[1].y,5);
								assert.equal(results[1].z,6);
								assert.equal(results[1].preset,'b');
								callback();
							}
						};
						store.take(cb);
						store.take(cb);
					}
				], function(err) {
					if (err) throw err;
					done();
				});
			});
		});
	});
});