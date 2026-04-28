const path = require('path');

module.exports = {
  mode: 'none',
  target: 'node',
  entry: {
    extension: './src/extension.ts',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    libraryTarget: 'commonjs',
  },
  resolve: {
    mainFields: ['module', 'main'],
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
          },
        ],
      },
    ],
  },
  externals: {
    vscode: 'commonjs vscode',
    'tree-sitter': 'commonjs tree-sitter',
    'tree-sitter-javascript': 'commonjs tree-sitter-javascript',
    'tree-sitter-typescript': 'commonjs tree-sitter-typescript',
    'tree-sitter-python': 'commonjs tree-sitter-python',
    '@ladybugdb/core': 'commonjs @ladybugdb/core',
  },
};
