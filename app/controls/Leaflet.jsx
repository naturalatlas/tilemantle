var _ = require('lodash');
var React = require('react');

module.exports = React.createClass({

	componentDidMount() {
		var L = require('leaflet');
		var el = React.findDOMNode(this);
		var opts = _.extend({}, this.props.leafletOptions);

		// use osm as a default layer
		var layers = this.props.layers ? _.clone(this.props.layers) : [];
		if (!layers || !layers.length) {
			layers = [{"title": "OpenStreetMap", "url_1x": "http://{s}.tile.osm.org/{z}/{x}/{y}.png", "attribution": "&copy; <a href=\"http://osm.org/copyright\">OpenStreetMap</a> contributors"}]
		}

		// create leaflet layers
		var retina = window.devicePixelRatio > 1;
		layers.forEach(function(layer) {
			var leafletLayer = L.tileLayer(retina && layer.url_2x ? layer.url_2x : layer.url_1x, layer);
			layer.leaflet = leafletLayer;
		});

		// layer selector control
		var layerList = {};
		layers.forEach(function(layer) {
			if (!layer.title) return;
			layerList[layer.title] = layer.leaflet;
		});

		// initialize leaflet
		opts.layers = _.pluck(layers, 'leaflet');
		var map = this.map = L.map(el, opts).setView([39.57182223734374,-100.283203125], 6);
		L.control.layers(layerList, {}).addTo(map);
	},
	render() {
		return <div className="leaflet-map"></div>;
	}
});