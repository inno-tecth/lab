const path = require('path');

var config = {
  entry: './src/index.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: [ '.tsx', '.ts', '.js' ]
  },
  output: {
    filename: 'app.js',
    path: path.resolve(__dirname, 'app')
  }
};
module.exports = (env, argv) => {
    if(argv.mode == 'development')
    {
        config.devtool = 'source-map';
    }
    return config;
}