import Vue from 'vue'
import Vuex from 'vuex'
import modelData from './modules/modelData'

Vue.use(Vuex)

export default new Vuex.Store({
    modules: {
        modelData: modelData
    }
})