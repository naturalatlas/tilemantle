var _ = require('lodash');
var React = require('react');
var Leaflet = require('./controls/Leaflet.jsx');

module.exports = React.createClass({
	render() {
		return <div id="tilemantle-app">
			<Leaflet layers={this.props.config.display_layers} />
		</div>;
	}
});