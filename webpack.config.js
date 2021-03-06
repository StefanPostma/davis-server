const webpack = require('webpack');
const path = require('path');
const webpackMerge = require('webpack-merge');

// Webpack Config
const webpackConfig = {
  entry: {
    main: './web/src/main.ts',
  },

  output: {
    publicPath: '',
    path: path.resolve(__dirname, './web/dist'),
  },

  plugins: [
    new webpack.ContextReplacementPlugin(
      // The (\\|\/) piece accounts for path separators in *nix and Windows
      /angular(\\|\/)core(\\|\/)src(\\|\/)linker/,
      path.resolve(__dirname, './web/src'),
      {
        // your Angular Async Route paths relative to this root directory
      }),
  ],

  module: {
    loaders: [
      // .ts files for TypeScript
      {
        test: /\.ts$/,
        loaders: [
          'awesome-typescript-loader',
          'angular2-template-loader',
          'angular2-router-loader',
        ],
      },
      { test: /\.css$/, loaders: ['to-string-loader', 'css-loader'] },
      { test: /\.html$/, loader: 'raw-loader' },
      { test: /\.json$/, loader: 'json-loader' },
    ],
  },

  stats: {
    errorDetails: true,
  },
};


// Our Webpack Defaults
const defaultConfig = {
  devtool: 'source-map',

  output: {
    filename: '[name].bundle.js',
    sourceMapFilename: '[name].map',
    chunkFilename: '[id].chunk.js',
  },

  resolve: {
    extensions: ['.ts', '.js', ''],
    modules: [path.resolve(__dirname, 'node_modules')],
  },

  node: {
    global: true,
    crypto: 'empty',
    __dirname: true,
    __filename: true,
    process: true,
    Buffer: false,
    clearImmediate: false,
    setImmediate: false,
  },
  
  plugins: [
    new webpack.ProvidePlugin({
      jQuery: 'jquery',
      $: 'jquery',
      jquery: 'jquery'
    })
  ],
};


module.exports = webpackMerge(defaultConfig, webpackConfig);
