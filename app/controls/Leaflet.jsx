var _ = require('lodash');
var React = require('react');

module.exports = React.createClass({

	componentDidMount() {
		var L = require('leaflet');
		var el = React.findDOMNode(this);
		console.log(el);
		var map = this.map = L.map(el, _.extend({}, this.props.leafletOptions)).setView([39.57182223734374,-100.283203125], 5);

		// use osm as a default layer
		var layers = this.props.layers;
		if (!layers || !layers.length) {
			layers = [{"url_1x": "http://{s}.tile.osm.org/{z}/{x}/{y}.png", "attribution": "&copy; <a href=\"http://osm.org/copyright\">OpenStreetMap</a> contributors"}]
		}

		// add layers to map
		var retina = window.devicePixelRatio > 1;
		layers.forEach(function(layer) {
			console.log([retina && layer.url_2x ? layer.url_2x : layer.url_1x, layer]);
			L.tileLayer(retina && layer.url_2x ? layer.url_2x : layer.url_1x, layer).addTo(map);
		});
	},
	render() {
		return <div className="leaflet-map"></div>;
	}
});