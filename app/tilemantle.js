var React = require('react');
var App = require('./App.jsx');

if (typeof window !== 'undefined') {
	console.log('Initializing UI...');
	var props = window.TILEMANTLE_PROPS;
	React.render(React.createElement(App, props||{}), document.getElementById('tilemantle'));
	console.log('UI mounted.');
}

module.exports = App;