var _ = require('lodash');

module.exports = function(req, res, next) {
	var z = parseInt(req.query.z, 10);
	var xmin = parseFloat(req.query.xmin);
	var xmax = parseFloat(req.query.xmax);
	var ymin = parseFloat(req.query.ymin);
	var ymax = parseFloat(req.query.ymax);
	var limit = parseInt(req.query.limit, 10);

	if (isNaN(z)) return res.status(400).json({message: 'Invalid or missing "z" argument'});
	if (isNaN(xmin)) return res.status(400).json({message: 'Invalid or missing "xmin" argument'});
	if (isNaN(xmax)) return res.status(400).json({message: 'Invalid or missing "xmax" argument'});
	if (isNaN(ymin)) return res.status(400).json({message: 'Invalid or missing "ymin" argument'});
	if (isNaN(ymax)) return res.status(400).json({message: 'Invalid or missing "ymax" argument'});

	var opts = {};
	if (limit) opts.limit = limit;
	if (req.query.geojson) opts.geojson = true;

	req.tilemantle.queue().select(z, [xmin,xmax], [ymin,ymax], opts, function(err, items) {
		if (err) return res.status(500).json({message: err.toString()});
		res.json(items);
	});
};