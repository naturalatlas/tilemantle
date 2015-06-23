var _ = require('lodash');
var webpack = require('webpack');

var common = {
	bail: true,
	cache: true,
	entry: {'tilemantle':'./app/tilemantle.js'},
	plugins: [
		new webpack.optimize.OccurenceOrderPlugin(true),
		new webpack.optimize.DedupePlugin(),
		new webpack.DefinePlugin({
			'global.GENTLY': false // for superagent (https://github.com/visionmedia/superagent/wiki/Superagent-for-Webpack)
		})
	],
	module: {
		loaders: [
			{test: /\.(jsx|js)$/, exclude: /node_modules/, loader: 'babel-loader?cacheDirectory=/tmp'},
		]
	},
	resolve: {
		root: __dirname
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
	},
	resolve: _.extend({}, common.resolve, {
		alias: {
			'superagent': 'node_modules/superagent/lib/client.js'
		}
	})
});

module.exports = process.env.BUILD === 'SERVER' ? serverside : clientside;

