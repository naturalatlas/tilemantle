var fs = require('fs');
var tmp = require('tmp');
var gdal = require('gdal');
gdal.verbose();

module.exports = function(geom, degrees, callback) {
	tmp.file({postfix: 'json'}, function(err, path, fd, cleanup) {
		if (err) return callback(err);

		var geojson = JSON.stringify(geom);
		fs.writeFile(path, geojson, 'utf8', function(err) {
			if (err) return callback(err);
			var result;

			try {
				result = new gdal.Polygon();
				var d = gdal.open(path, 'r', 'GeoJSON');
				d.layers.forEach(function(layer) {
					layer.features.forEach(function(feature) {
						result = result.union(feature.getGeometry().buffer(degrees));
					});
				});
				result = result.toJSON();
				d.close();
			} catch (e) {
				cleanup();
				return callback(e);
			}

			cleanup();
			callback(null, JSON.parse(result));
		});
	});
};