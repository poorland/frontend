const { whenDev, whenProd } = require('@craco/craco');
const path = require('path');
const resolve = dir => path.resolve(__dirname, dir)
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const CompressionWebpackPlugin = require('compression-webpack-plugin');

module.exports = {
    // devServer: {
    //     proxy: {
    //         "/api": {
    //             target: "https://apibeta.poorland.io",
    //             changeOrigin: true,
    //             secure: false,
    //             pathRewrite: {
    //                 '^/api': '',
    //             },
    //         },
    //         "/img": {
    //             target: "https://gateway.poorland.io",
    //             changeOrigin: true,
    //             secure: false,
    //             pathRewrite: {
    //                 '^/img': '',
    //             },
    //         }
    //     },
    // },
    webpack: {
        configure: (webpackConfig, { env, paths }) => {
            isBuildProd || isBuildDev ? false : webpackConfig.devtool;
            webpackConfig.devtool = false;
            return webpackConfig;
        },
        resolve: {
            alias: {
                "@": resolve("src"),
            }
        },
        plugins: [
            ...whenProd(
                () => [
                    new UglifyJsPlugin({
                        uglifyOptions: {
                            output: {
                                comments: false
                            },
                            warnings: false,
                            compress: {
                                drop_debugger: true,
                                drop_console: true,
                                pure_funcs: ['console.log']
                            },
                        },
                        sourceMap: false,
                        parallel: true,
                    }),
                    new CompressionWebpackPlugin({
                        algorithm: 'gzip',
                        test: /\.(js|css|html|svg)$/,
                        threshold: 10240,
                        minRatio: 0.8
                    })
                    // ,
                    // new CompressionWebpackPlugin({
                    //     algorithm: 'brotliCompress',
                    //     test: /\.(js|css|html|svg)$/,
                    //     compressionOptions: {
                    //         level: 11
                    //     },
                    //     threshold: 10240,
                    //     minRatio: 0.8
                    // })
                ], []
            )
        ],
        mode: 'extends',
        configure: {
            module: {
                rules: [
                    {
                        test: /\.mjs$/,
                        include: /node_modules/,
                        type: "javascript/auto"
                    },
                ],

            },
        }
    }
};
