const WebpackShopwareDynamicChunkSplittingPlugin = require('./webpack-plugin');
const utils = require('./utils');
const browser = require('./browser');

module.exports = {
    WebpackShopwareDynamicChunkSplittingPlugin,
    ...utils,
    ...browser
};