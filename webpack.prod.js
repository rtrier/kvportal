const {merge}  = require('webpack-merge');
const common = require('./webpack.common.js');
// const HtmlMinimizerPlugin = require('html-minimizer-webpack-plugin');

module.exports = merge(common, {
  mode: 'production'



  //   // splitChunks: {     
  //   //   chunks: 'all'
  //     // cacheGroups: {
  //     //   vendors: {
  //     //     priority: -10,
  //     //     test: /[\\/]node_modules[\\/]/
  //     //   }
  //     // },
  //     // chunks: 'async',
  //     // minChunks: 1,
  //     // minSize: 30000,
  //     // name: false
  //   // }
  // }
});