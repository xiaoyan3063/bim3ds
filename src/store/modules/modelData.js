export default {
    namespaced: true, // 必须设置命名空间
    state: {
        modelUrl: '', //require('@/assets/models/test1.glb'), // 默认模型路径
        realtimeData: {
            '立方体': { temperature: 45, pressure: 1.2, status: 'normal' },
            '柱体003': { temperature: 78, pressure: 1.8, status: 'warning' },
            'conveyor_1': { speed: 2.4, status: 'normal' }
        },
        logicRelations: [
            { from: '立方体', to: 'conveyor_1', type: 'material-flow' },
            { from: '柱体003', to: 'conveyor_1', type: 'material-flow' }
        ]
    },
    mutations: { //mutations 是唯一允许直接修改 state 的地方
        UPDATE_DATA(state, payload) {
            state.realtimeData = { //state.realtimeData被更新为一个新对象:原有的数据被保留,新的数据（payload）会覆盖原有的对应键值
                ...state.realtimeData, //使用 JavaScript 的展开运算符（...），将现有的 realtimeData 展开到一个新的对象中,这一步是为了保留原有的数据
                ...payload //将传入的 payload 数据也展开到新的对象中,如果 payload 中包含与 realtimeData 相同的键，则会覆盖原有的值
            }
        }
    },
    //在 Vuex 中，actions 负责处理异步逻辑（如 API 调用），而 mutations 负责同步更新状态    
    actions: {
        //fetchData action 通过 commit('UPDATE_DATA', mockData) 来触发状态更新，而不需要直接操作 state
        async fetchData({ commit }) {
            // 这里可以替换为实际的API调用
            const mockData = {
                '立方体': {
                    temperature: Math.floor(40 + Math.random() * 15),
                    pressure: 1.0 + Math.random() * 0.5,
                    status: Math.random() > 0.9 ? 'error' : 'normal'
                },
                '柱体003': {
                    temperature: Math.floor(70 + Math.random() * 20),
                    pressure: 1.5 + Math.random() * 0.8,
                    status: Math.random() > 0.85 ? 'error' : 'warning'
                }
            }
            commit('UPDATE_DATA', mockData)
        }
    }
}