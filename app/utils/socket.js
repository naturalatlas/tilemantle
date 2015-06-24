var _ = require('lodash');

module.exports = _.memoize(function() {
	if (!window.io) {
		console.error('Socket.io not found');
		return null;
	}
	return io(window.location.host);
});