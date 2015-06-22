var _ = require('lodash');
var React = require('react');

module.exports = React.createClass({

	getDefaultProps() {
		return {
			layers: [],
			onSelection: function(geom) {}
		};
	},
	componentDidMount() {
		var L = require('leaflet');
		require('leaflet-draw');
		L.Icon.Default.imagePath = '/images';

		var el = React.findDOMNode(this);
		var leafletDefaults = {};
		var opts = _.extend(leafletDefaults, this.props.leafletOptions);

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
		this.initLeafletDrawing();
	},
	initLeafletDrawing() {
		var self = this;
		var map = this.map;
		var drawnItems = this.selection = new L.FeatureGroup();
		map.addLayer(drawnItems);

		var shapeColor = '#eba638';
		var drawControl = new L.Control.Draw({
			position: 'topright',
			draw: {
				circle: false,
				rectangle: {shapeOptions: {color: shapeColor}},
				polygon: {shapeOptions: {color: shapeColor}},
				polyline: {shapeOptions: {color: shapeColor}},
				line: {shapeOptions: {color: shapeColor}}
			},
			edit: {
				featureGroup: drawnItems,
				remove: true
			}
		});
		map.addControl(drawControl);
		map.on('draw:created', function(e) {
			drawnItems.addLayer(e.layer);
			self.props.onSelection(drawnItems.toGeoJSON());
		});
	},
	clearSelection() {
		var selection = this.selection;
		_.values(selection._layers).forEach(function(layer) {
			selection.removeLayer(layer);
		});
		this.props.onSelection(null);
	},
	render() {
		return <div className="leaflet-map"></div>;
	}
});