import Vue from 'vue'
import App from './App.vue'
import store from './store'
import ElementUI from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'
// import * as echarts from 'echarts';

Vue.use(ElementUI)
    // 将 echarts 挂载到 Vue 原型链上
    // Vue.prototype.$echarts = echarts;

Vue.config.productionTip = false

new Vue({
    store,
    render: h => h(App),
}).$mount('#app')