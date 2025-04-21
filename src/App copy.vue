<template>
  <div id="app">
    <!-- <img alt="Vue logo" src="./assets/logo.png">
    <HelloWorld msg="Welcome to Your Vue.js App"/> -->
    <!-- <h1>三维监控系统</h1> -->
     <!-- <div>
        <model-viewer
          :model-url="modelUrl"
          :realtime-data="realtimeData"
          :logic-relations="logicRelations"
        />
     </div> -->
     <!-- <editor2d /> -->
  </div>
</template>

<script>
// import editor2d from './module/editor2d.vue'
// import ModelViewer from './components/ModelViewer.vue'

export default {
  name: 'App',
  components: {
    // editor2d
  },
  data() {
    return {
      // modelUrl: '/assets/models/buildings.glb',//require('@/assets/models/buildings.glb'),//process.env.NODE_ENV === 'production' ? require('@/assets/models/buildings.glb') : '/assets/models/buildings.glb',//
      // dataUpdateInterval: null
    }
  },
  computed: {
    // realtimeData() {
    //   return this.$store?.state?.modelData?.realtimeData || this.getDefaultData()  // 安全访问
    // },
    // logicRelations() {
    //   return this.$store?.state?.modelData?.logicRelations || [] 
    // }
  },
  created() {
    // // 初始数据加载
    // this.$store?.dispatch('modelData/fetchData').catch(err => {
    //   console.error('数据加载失败:', err)
    // })
    // // 设置定时数据更新
    // this.dataUpdateInterval = setInterval(() => {
    //   this.$store?.dispatch('modelData/fetchData')
    // }, 3000)    
  },
  beforeDestroy() {
    // clearInterval(this.dataUpdateInterval)
  },
  methods: {
    // getDefaultData() {
    //   // 返回一个合理的默认数据结构
    //   return {
    //     // 假设您的模型中有这些节点
    //     '立方体1': { temperature: 45, pressure: 1.2, status: 'normal' },
    //     '立方体': { temperature: 78, pressure: 1.8, status: 'warning' },
    //     'Building_08_building_11_0': { temperature: 55, pressure: 6.8, status: 'warning' },
    //     'Building_08_BrickSmallPainted_0': { temperature: 36, pressure: 5.9, status: 'normal' },
    //     'Building_06_BrickSmallBrown_0': { temperature: 55, pressure: 6.8, status: 'warning' },
    //     'Building_06_Shops_28_0': { temperature: 36, pressure: 5.9, status: 'normal' },
    //     'Building_06_building_07_0': { temperature: 55, pressure: 6.8, status: 'warning' },
    //     'Building_06_Shops_29_0': { temperature: 36, pressure: 5.9, status: 'normal' },
    //     'Building_06_ConcreteBare_0': { temperature: 55, pressure: 6.8, status: 'warning' },
    //   }
    // }
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  /* color: #2c3e50; */
  /* margin-top: 20px; */
  background: #02090F;
}
h1 {
  margin-bottom: 30px;
}
</style>
