module.exports = function(req, res, next) {
	req.tilemantle.queue().reset(function(err) {
		if (err) return res.status(500).json({message: err.toString()});
		else return res.json({acknowledged: true});
	});
};