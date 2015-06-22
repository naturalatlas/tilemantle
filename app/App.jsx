var _ = require('lodash');
var React = require('react');
var Leaflet = require('./controls/Leaflet.jsx');

module.exports = React.createClass({
	getInitialState() {
		return {
			selectedGeometry: null
		};
	},
	handleSelection(geom) {
		this.setState({selectedGeometry: geom});
	},
	handleInvalidate() {
		// TODO: send request to server
		this.handleClear();
	},
	handleClear() {
		this.refs.leaflet.clearSelection();
	},
	render() {
		return <div id="tilemantle-app">
			<div id="tilemantle-header">
				<span id="tilemantle-logo">TileMantle</span>
				<button onClick={this.handleInvalidate} disabled={!this.state.selectedGeometry}>Queue</button>
				<button onClick={this.handleClear} disabled={!this.state.selectedGeometry}>Clear</button>
			</div>
			<div id="tilemantle-body">
				<Leaflet ref="leaflet" onSelection={this.handleSelection} layers={this.props.config.display_layers} />
			</div>
		</div>;
	}
});