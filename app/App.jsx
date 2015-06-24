var _ = require('lodash');
var request = require('superagent');
var React = require('react');
var Leaflet = require('./controls/Leaflet.jsx');
var socket = require('./utils/socket.js');

module.exports = React.createClass({
	getDefaultProps() {
		return {
			config: {}
		};
	},
	getInitialState() {
		return {
			queueLength: null,
			selectedGeometry: null,
			selectedPreset: null
		};
	},
	componentDidMount() {
		var self = this;
		socket().on('queue_length', function(count) {
			self.setState({queueLength: count});
		});
	},
	handleSelection(geom) {
		this.setState({selectedGeometry: geom});
	},
	handleInvalidate() {
		var self = this;
		request.post('/api/invalidate').query({
			preset: this.state.selectedPreset
		}).send(this.state.selectedGeometry).end(function(err, res) {
			if (err) {
				console.error(err);
				alert(err.toString());
			} else if (!res.ok) {
				alert((res.body && res.body.message) || 'Invalidation failed');
			} else {
				self.handleClear();
			}
		});
	},
	handleClear() {
		this.refs.leaflet.clearSelection();
	},
	handlePreset(e) {
		this.setState({selectedPreset: e.target.value||null});
	},
	handleReset() {
		if (!confirm('Are you sure you want to clear the queue?')) return;
		request.post('/api/reset').end(function(err, res) {
			if (err || !res.ok) alert('Failed to clear queue');
			alert('Queue cleared!');
		});
	},
	renderPresetSelect() {
		var self = this;
		var presets = [{title: '', el: <option key="empty" value="">Select a Preset</option>}];
		Object.keys(this.props.config.presets).forEach(function(key) {
			var preset = self.props.config.presets[key];
			presets.push({
				title: preset.title,
				el: <option key={key} value={key}>{preset.title}</option>
			});
		});
		presets = _.sortBy(presets, 'title');

		return <select disabled={!this.state.selectedGeometry} value={this.state.selectedPreset} onChange={this.handlePreset}>
			{_.pluck(presets,'el')}
		</select>;
	},
	renderQueueLength() {
		if (typeof this.state.queueLength !== 'number') {
			return;
		}
		return <span id="tilemantle-queue-size"><strong>{this.state.queueLength}</strong> Tiles Left<button onClick={this.handleReset}>Reset</button></span>;
	},
	render() {

		return <div id="tilemantle-app">
			<div id="tilemantle-header">
				<span id="tilemantle-logo">TileMantle</span>
				{this.renderPresetSelect()}
				<button onClick={this.handleInvalidate} disabled={!this.state.selectedGeometry||!this.state.selectedPreset}>Queue</button>
				<button onClick={this.handleClear} disabled={!this.state.selectedGeometry}>Clear</button>
				{this.renderQueueLength()}
			</div>
			<div id="tilemantle-body">
				<Leaflet ref="leaflet" onSelection={this.handleSelection} layers={this.props.config.display_layers} />
			</div>
		</div>;
	}
});