var _ = require('lodash');
var webpack = require('webpack');

var common = {
	bail: true,
	cache: true,
	entry: {'tilemantle':'./app/tilemantle.js'},
	plugins: [
		new webpack.optimize.OccurenceOrderPlugin(true),
		new webpack.optimize.DedupePlugin()
	],
	module: {
		loaders: [
			{test: /\.(jsx|js)$/, exclude: /node_modules/, loader: 'babel-loader?cacheDirectory=/tmp'},
		]
	}
};

var serverside = _.extend({}, common, {
	output: {
		library: 'TileMantle',
		libraryTarget: 'commonjs2',
		path: __dirname + '/server',
		filename: 'ui.js'
	}
});

var clientside = _.extend({}, common, {
	output: {
		path: __dirname + '/public/js',
		filename: '[name].js'
	}
});

module.exports = process.env.BUILD === 'SERVER' ? serverside : clientside;

