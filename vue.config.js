const path = require('path'); // 引入 Node.js 的 path 模块
module.exports = {
    chainWebpack: config => {
        config.module
            .rule('glb')
            .test(/\.(glb|gltf)$/)
            .use('file-loader')
            .loader('file-loader')
            .options({
                name: 'assets/models/[name].[hash:8].[ext]',
                esModule: false // 避免ES模块导出
            })
            .end()
    },
    configureWebpack: {
        resolve: {
            alias: {
                joint: path.resolve(__dirname, 'node_modules/jointjs/dist/joint.js'),
                '@': path.resolve(__dirname, 'src')
            }
        }
    }
}