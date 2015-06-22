module.exports = function(req, res, next) {
	var presetName = req.body.preset;
	var preset = req.tilemantle.preset(presetName);
	if (!preset) {
		return res.status(404).json({message: 'The "' + presetName + '" preset was not found'});
	}
	req.tilemantle.invalidate()
	res.json({acknowledged: true});
};