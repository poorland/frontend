// @ts-ignore 

const proxy = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(proxy('/api', { 
       target: 'https://apibeta.poorland.io' ,
       secure: false,
       changeOrigin: true,
       pathRewrite: {
        '^/api': ''
       }
    }));
    app.use(proxy('/img', { 
        target: 'https://gateway.poorland.io' ,
        secure: false,
        changeOrigin: true,
        pathRewrite: {
         '^/img': ''
        }
     }));
};

