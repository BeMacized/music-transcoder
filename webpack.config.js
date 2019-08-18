var nodeExternals = require('webpack-node-externals');
var CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: './src/main.ts',
    mode: 'development',
    output: {
        filename: 'app.js'
    },
    target: 'node',
    externals: [nodeExternals()],
    resolve: {
        extensions: ['.ts']
    },
    node: {
        __dirname: true,
    },
    plugins: [new CopyWebpackPlugin([{ from: 'src/assets/*', flatten: true }])],
    module: {
        rules: [{ test: /\.ts$/, loader: 'ts-loader' }]
    }
};
