var _ = require('lodash');
var React = require('react');
var tilebelt = require('tilebelt');
var request = require('superagent');
var colors = {
	grid: '#969b92',
	user: '#e3762d',
	queue: '#f7a944',
	success: '#aee64e'
};

var MAX_TILES = 100;

module.exports = React.createClass({
	getDefaultProps() {
		return {
			layers: [],
			onSelection: function(geom) {}
		};
	},
	getTileStyle(feature) {
		if (feature.properties.complete) {
			var opacity = 0.5 * feature.properties.i / this._completeTiles.length;
			return {fillColor: colors.success, fillOpacity: opacity, color: '#50be00', weight: 1, opacity: 1};
		} else {
			return {stroke: false, fillPattern: this.queueStripes, fillOpacity: 0.4};
		}
	},
	componentDidMount() {
		var L = require('leaflet');
		require('leaflet-draw');
		require('../vendor/leaflet.pattern.js');
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
		L.control.layers(layerList, {}, {collapsed: false}).addTo(map);

		this.userStripes = new L.StripePattern({angle: 45, color: colors.user});
		this.queueStripes = new L.StripePattern({angle: 45, color: colors.queue});
		this.userStripes.addTo(map);
		this.queueStripes.addTo(map);
		this.initLeafletTileGrid();
		this.initLeafletDrawing();

		this.refreshQueueLayer();
		this.map.on('moveend', this.refreshQueueLayer);
		setInterval(this.refreshQueueLayer, 2500);

		this.renderCompletedTiles = _.throttle(this.renderCompletedTiles, 500);
		this.initSocket();
	},
	initSocket() {
		var self = this;
		if (!window.io) return console.warn('Socket.io not found');
		var socket = io(window.location.host);
		socket.on('tile_end', function(payload) {
			self.handleTileComplete(payload);
		});
	},
	initLeafletTileGrid() {
		var L = require('leaflet');
		var canvasTiles = L.tileLayer.canvas({zIndex: 9999});
		canvasTiles.drawTile = function(canvas, tilePoint, zoom) {
			var ctx = canvas.getContext('2d');
			ctx.lineWidth = 1;
			ctx.strokeStyle = ctx.fillStyle = colors.grid;
			ctx.rect(0.5,0.5,257,257);
			ctx.stroke();
			if (ctx.setLineDash) ctx.setLineDash([2,2]);
			ctx.moveTo(127.5,0);
			ctx.lineTo(127.5,256);
			ctx.stroke();
			ctx.moveTo(0,127.5);
			ctx.lineTo(256,127.5);
			ctx.stroke();
			ctx.fillText('x:'+tilePoint.x + ' y:' + tilePoint.y + ' z:' + zoom, 5, 10);
		};
		canvasTiles.addTo(this.map);
	},
	initLeafletDrawing() {
		var self = this;
		var map = this.map;
		var drawnItems = this.selection = new L.FeatureGroup();

		var drawControl = new L.Control.Draw({
			position: 'topright',
			draw: {
				circle: false,
				rectangle: {shapeOptions: {stroke: false, fillPattern: this.userStripes, fillOpacity: 1}},
				polygon: {shapeOptions: {stroke: false, fillPattern: this.userStripes, fillOpacity: 1}},
				polyline: {shapeOptions: {color: colors.user}},
				line: {shapeOptions: {color: colors.user}}
			},
			edit: {
				featureGroup: drawnItems,
				remove: true
			}
		});
		map.addControl(drawControl);
		map.addLayer(drawnItems);

		map.on('draw:created', function(e) {
			drawnItems.addLayer(e.layer);
			self.props.onSelection(drawnItems.toGeoJSON());
		});
	},
	refreshQueueLayer() {
		var self = this;
		var map = this.map;
		var bounds = map.getBounds();

		var newQueueLayer = L.layerGroup();
		var oldQueueLayer = self._queueLayer;
		self._queueLayer = newQueueLayer;
		newQueueLayer.addTo(map);

		// cancel pending requests
		if (this._refreshXHRs) this._refreshXHRs.forEach(function(xhr) { xhr.abort(); });
		this._refreshXHR = [];

		var zoomsLoaded = 0;
		var zoomsExpected = 0;

		function loadZoom(z) {
			zoomsExpected++;
			self._refreshXHR.push(request.get('/api/queue').query({
				z: z,
				xmin: bounds.getWest(),
				xmax: bounds.getEast(),
				ymin: bounds.getNorth(),
				ymax: bounds.getSouth(),
				geojson: 1
			}).end(function(err, res) {
				zoomsLoaded++;
				if (zoomsLoaded === zoomsExpected) {
					if (oldQueueLayer) {
						map.removeLayer(oldQueueLayer);
						oldQueueLayer = null;
					}
				}

				if (err) return console.error(err);
				if (!res.ok) return;
				L.geoJson(res.body, {style: self.getTileStyle}).addTo(newQueueLayer);
			}));
		}

		loadZoom(map.getZoom());
		loadZoom(map.getZoom()+1);
	},
	clearSelection() {
		var selection = this.selection;
		_.values(selection._layers).forEach(function(layer) {
			selection.removeLayer(layer);
		});
		this.props.onSelection(null);
	},
	handleTileComplete(payload) {
		this._completeTiles = this._completeTiles || [];
		this._completeTiles.push([payload.x,payload.y,payload.z]);
		if (this._completeTiles.length > MAX_TILES) {
			this._completeTiles.shift();
		}

		this.renderCompletedTiles();
	},
	renderCompletedTiles() {
		var geojson = {
			type: 'FeatureCollection',
			features: this._completeTiles.map(function(tile, i) {
				return {
					type: 'Feature',
					properties: {complete: true, i: i},
					geometry: tilebelt.tileToGeoJSON(tile)
				};
			})
		};

		if (this._completedLayer) this.map.removeLayer(this._completedLayer);
		var newLayer = L.geoJson(geojson, {style: this.getTileStyle, zIndex: 9998}).addTo(this.map);
		this._completedLayer = newLayer;
	},
	render() {
		return <div className="leaflet-map"></div>;
	}
});