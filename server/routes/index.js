var fs = require('fs');
var React = require('react');
var html = fs.readFileSync(require.resolve('../templates/index.html'), 'utf8');
var App = require('../ui.js');

module.exports = function(req, res, next) {
	var props = {config: req.tilemantle.config};
	var apphtml = React.renderToString(React.createElement(App, props));

	res.send(html
		.replace('{{app}}', apphtml)
		.replace('{{props}}', JSON.stringify(props).replace(/\//,'\\/')));
};