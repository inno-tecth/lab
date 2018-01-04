const merge = require('webpack-merge');
const webpack = require('webpack');
const config = require('./webpack.config.js');

module.exports = merge(config,
    {
        plugins: [
            new webpack.optimize.UglifyJsPlugin()
        ]
    });