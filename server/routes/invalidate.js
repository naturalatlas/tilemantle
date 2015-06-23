module.exports = function(req, res, next) {
	// resolve the preset
	var presetName = req.query.preset;
	var preset = req.tilemantle.preset(presetName);
	if (!preset) {
		return res.status(404).json({message: 'The "' + presetName + '" preset was not found'});
	}

	preset.queue(req.body, req.tilemantle.queue(), function(err) {
		if (err) return res.status(400).json({message: err.toString(), stack: err.stack});
		res.json({acknowledged: true});
	});
};