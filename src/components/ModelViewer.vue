<template>
  <div class="dashboard-container">
    <!-- 大标题 -->
    <div class="dashboard-header">
      <div class="title-bg">
        <h1>机房3D可视化演示demo</h1>
      </div>
      <div class="header-decoration"></div>
    </div>
    
    <!-- 主内容区域 - 模型占据全部空间 -->
    <div class="model-container">
      <div ref="container" class="renderer-container"></div>

      <!-- 中间顶部指标面板 - 浮动在模型上方 -->
      <div class="center-top-panel floating-panel">
        <div class="metric-card" v-for="(metric, index) in centerMetrics" :key="'center-'+index">
          <!-- <div class="metric-icon" :style="{ backgroundColor: metric.color }">
            <i :class="metric.icon"></i>
          </div> -->
          <div class="metric-info">
            <div class="metric-value">{{ metric.value }}</div>
            <div class="metric-title">{{ metric.title }}</div>
          </div>
          <!-- <div class="metric-trend" :class="metric.trend">
            <i :class="metric.trendIcon"></i> {{ metric.trendValue }}
          </div> -->
        </div>
      </div>
      
      <!-- 左侧指标面板 - 浮动在模型上方 -->
      <div class="left-panel floating-panel">
        <div class="metric-card" v-for="(metric, index) in leftMetrics" :key="'left-'+index">
          <div class="metric-icon" :style="{ backgroundColor: metric.color }">
            <i :class="metric.icon"></i>
          </div>
          <div class="metric-info">
            <div class="metric-value">{{ metric.value }}</div>
            <div class="metric-title">{{ metric.title }}</div>
          </div>
          <div class="metric-trend" :class="metric.trend">
            <i :class="metric.trendIcon"></i> {{ metric.trendValue }}
          </div>
        </div>
        <!-- 环形图 -->
        <div class="ring-chart">
          <h3>设备状态分布</h3>
          <div ref="ringChart1" class="chart-container"></div>
        </div>
      </div>
      
      <!-- 右侧指标面板 - 浮动在模型上方 -->
      <div class="right-panel floating-panel">
        <div class="metric-card" v-for="(metric, index) in rightMetrics" :key="'right-'+index">
          <div class="metric-icon" :style="{ backgroundColor: metric.color }">
            <i :class="metric.icon"></i>
          </div>
          <div class="metric-info">
            <div class="metric-value">{{ metric.value }}</div>
            <div class="metric-title">{{ metric.title }}</div>
          </div>
          <div class="metric-trend" :class="metric.trend">
            <i :class="metric.trendIcon"></i> {{ metric.trendValue }}
          </div>
        </div>
        
        <!-- 环形图 -->
        <div class="ring-chart">
          <h3>设备状态分布</h3>
          <div ref="ringChart2" class="chart-container"></div>
        </div>
      </div>
      
      <!-- 数据面板 -->
      <div v-if="panelVisible && selectedNode" 
          class="data-panel"
          :style="{
            left: panelPosition.x + 'px',
            top: panelPosition.y + 'px'
          }">
        <div class="panel-header">
          <h3>{{ selectedNode.name }} 实时数据</h3>
          <button class="close-btn" @click="panelVisible = false">×</button>
        </div>
        <div v-for="(value, key) in selectedNode.data" 
            :key="key" 
            class="data-row">
          <span class="data-label">{{ key }}:</span>
          <span class="data-value" :class="getValueClass(key, value)">{{ value }}</span>
        </div>
        <div class="panel-arrow"></div>
      </div>

      <!-- 悬浮提示框 -->
      <div v-if="tooltipVisible && hoveredNode" 
           class="tooltip"
           :style="{
             left: tooltipPosition.x + 'px',
             top: tooltipPosition.y + 'px'
           }">
        <div class="tooltip-title">{{ hoveredNode.name }}</div>
        <div v-for="(value, key) in hoveredNode.data" 
             :key="key" 
             class="tooltip-row">
          <span class="tooltip-key">{{ key }}:</span>
          <span class="tooltip-value" :class="getValueClass(key, value)">
            {{ value }}
          </span>
        </div>
      </div>
      
      <!-- 控制按钮 -->
      <div class="controls">
        <button @click="startAutoRotation">自动旋转</button>
        <button @click="stopAutoRotation">停止旋转</button>
        <button @click="resetModel">重置视图</button>
      </div>
    </div>
  </div>
</template>

<script>
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import * as echarts from 'echarts'

// 定义模型层级配置，增加初始相机位置和缩放参数
const MODEL_LEVELS = {
  1: { 
    file: '/assets/models/level1.glb', 
    clickPrefix: 'yfdl',
    cameraPosition: { x: 0, y: 35, z: 30 }, // 提高y值增加俯视角度
    targetPosition: { x: 0, y: 0, z: 0 },
    zoom: 1.2,
    nextLevel: 2
  },
  // 2: { 
  //   file: '/assets/models/level2.glb', 
  //   clickPrefix: 'yfdl00333',
  //   cameraPosition: { x: 0, y: 20, z: 40 },
  //   targetPosition: { x: 0, y: 0, z: 0 },
  //   zoom: 1.0,
  //   nextLevel: 3
  // },
  2: { 
    file: '/assets/models/level2.glb', 
    clickPrefix: '基本墙_常规_-_200mm_738',
    cameraPosition: { x: 15, y: 20, z: 30 },
    targetPosition: { x: 0, y: 0, z: 0 },
    zoom: 0.5,
    nextLevel: 3
  },
  3: { 
    file: '/assets/models/level3.glb', 
    clickPrefix: '1-1jianzhu',
    cameraPosition: { x: 10, y: 35, z: 25 },
    targetPosition: { x: 0, y: 0, z: 0 },
    zoom: 1.0,
    nextLevel: 4
  },
  4: { 
    file: '/assets/models/level4.glb', 
    clickPrefix: 'jigui',
    cameraPosition: { x: 5, y: 40, z: 25 },  // 调整位置
    targetPosition: { x: 0, y: 0, z: 0 },
    zoom: 0.8,  // 减小缩放值
    nextLevel: 5
  },
  5: { 
    file: '/assets/models/level5.glb', 
    clickPrefix: null,
    cameraPosition: { x: 10, y: 8, z: 15 },  // 调整位置
    targetPosition: { x: 0, y: 0, z: 0 },
    zoom: 0.5,  // 进一步减小缩放值
    nextLevel: null
  }
}
function debounce(func, wait) {
  let timeout;
  return function() {
    const context = this, args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(context, args);
    }, wait);
  };
}

export default {
  props: {
    modelUrl: {
      type: String,
      default: 'level1.glb' // 默认加载第一层
    },
    realtimeData: {
      type: Object,
      required: true
    },
    logicRelations: {
      type: Array,
      default: () => []
    }
  },
  
  data() {
    return {
      scene: null,
      camera: null,
      renderer: null,
      controls: null,
      model: null,
      mixer: null,
      selectedNode: null,
      highlightedNodes: [],
      autoRotate: false,
      animationFrameId: null,
      panelPosition: { x: 0, y: 0 },
      panelVisible: false,
      hoveredNode: null,
      tooltipPosition: { x: 0, y: 0 },
      tooltipVisible: false,
      developmentMode: true,
      currentBuilding: null,
      lastTargetUpdate: 0,
      buildingHelper: null,
      isUserRotating: false,
      lastUserInteraction: 0,
      currentLevel: 1, // 当前模型层级
      modelCache: {}, // 模型缓存
      isLoading: false, // 防止重复加载
      debouncedResize: null,
      resizeObserver: null,
      hoverTimeout: null,      // 存储延迟定时器
      debouncedHandleHover: null, // 存储防抖函数
      leftMetrics: [
        {
          icon: 'el-icon-office-building',
          title: '园区建筑总数',
          value: '24',
          trend: 'up',
          trendValue: '+2%',
          trendIcon: 'el-icon-top',
          color: '#409EFF'
        },
        {
          icon: 'el-icon-cpu',
          title: '运行设备数',
          value: '1,856',
          trend: 'up',
          trendValue: '+5.3%',
          trendIcon: 'el-icon-top',
          color: '#67C23A'
        },
        {
          icon: 'el-icon-user',
          title: '今日访客数',
          value: '1,245',
          trend: 'down',
          trendValue: '-3.2%',
          trendIcon: 'el-icon-bottom',
          color: '#E6A23C'
        },
        {
          icon: 'el-icon-data-line',
          title: '能耗总量(kWh)',
          value: '28,456',
          trend: 'down',
          trendValue: '-1.8%',
          trendIcon: 'el-icon-bottom',
          color: '#F56C6C'
        }
      ],
      rightMetrics: [
        {
          icon: 'el-icon-warning-outline',
          title: '告警设备数',
          value: '12',
          trend: 'down',
          trendValue: '-2',
          trendIcon: 'el-icon-bottom',
          color: '#F56C6C'
        },
        {
          icon: 'el-icon-sunny',
          title: '光照强度(lx)',
          value: '1,245',
          trend: 'up',
          trendValue: '+120',
          trendIcon: 'el-icon-top',
          color: '#E6A23C'
        },
        {
          icon: 'el-icon-thermometer',
          title: '平均温度(℃)',
          value: '26.5',
          trend: 'steady',
          trendValue: '0.0',
          trendIcon: 'el-icon-right',
          color: '#909399'
        },
        {
          icon: 'el-icon-cloudy',
          title: '空气质量(AQI)',
          value: '42',
          trend: 'up',
          trendValue: '+3',
          trendIcon: 'el-icon-top',
          color: '#67C23A'
        }
      ],
      ringChart1: null,
      ringChart2: null,
      centerMetrics: [
        {
          icon: 'el-icon-data-board',
          title: 'CPU使用率',
          value: '78%',
          trend: 'up',
          trendValue: '+5%',
          trendIcon: 'el-icon-top',
          color: '#409EFF'
        },
        {
          icon: 'el-icon-memory',
          title: '内存使用率',
          value: '64%',
          trend: 'steady',
          trendValue: '0%',
          trendIcon: 'el-icon-right',
          color: '#67C23A'
        },
        {
          icon: 'el-icon-connection',
          title: '网络负载',
          value: '42%',
          trend: 'down',
          trendValue: '-8%',
          trendIcon: 'el-icon-bottom',
          color: '#E6A23C'
        },
        {
          icon: 'el-icon-refrigerator',
          title: '温度(℃)',
          value: '26.5',
          trend: 'up',
          trendValue: '+1.2',
          trendIcon: 'el-icon-top',
          color: '#F56C6C'
        },
        {
          icon: 'el-icon-lightning',
          title: '电力负载',
          value: '85%',
          trend: 'up',
          trendValue: '+3%',
          trendIcon: 'el-icon-top',
          color: '#909399'
        }
      ],
    }
  },
  
  watch: {
    realtimeData: {
      handler(newVal) {
        this.updateModelData(newVal)
      },
      deep: true
    }
  },
  
  mounted() {
    // this.setTopDisplay(true);
    this.initScene()  
    this.loadModel(MODEL_LEVELS[1].file) // 初始加载第一层    
    this.setupEventListeners()
    this.setupHoverEvents()
    this.startRendering()
    this.initRingChart()   
    
    // this.$_initResizeEvent();
  },
  
  beforeDestroy() {
    this.cleanup()
    // this.setTopDisplay(false);
    // const element = document.getElementsByClassName("containerStyle");
    // if(element.length>0){
    //     document.getElementsByClassName("containerStyle")[0].style.height = "calc(100% - 50px)"; 
    // }
    // this.$_destroyResizeEvent();
  },
  
  methods: {
    cleanup() {
      this.controls.removeEventListener('change', this.handleRotation);
      cancelAnimationFrame(this.animationFrameId); //在组件销毁时停止渲染循环
      window.removeEventListener('resize', this.handleResize);      
      if (this.debouncedResize) {
        this.debouncedResize.cancel();
        window.removeEventListener('resize', this.debouncedResize);
      }
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
      }
      const dom = this.renderer.domElement;
      dom.removeEventListener('mousemove', this.debouncedHandleHover);
      dom.removeEventListener('mouseout', this.handleMouseOut);
      this.debouncedHandleHover.cancel(); // 取消未执行的防抖调用
      
      if (this.$refs.container && this.renderer.domElement.parentNode === this.$refs.container) {
          this.$refs.container.removeChild(this.renderer.domElement);
      }
      
      if (this.model) {
          this.model.traverse(node => {
              if (node.material) node.material.dispose();
              if (node.geometry) node.geometry.dispose();
          });
      }
      
      if (this.renderer) {
          this.renderer.dispose();
      }
      if (this.ringChart1) {
        this.ringChart1.dispose()
      }
      if (this.ringChart2) {
        this.ringChart2.dispose()
      }
    },
    $_initResizeEvent() {
        window.addEventListener('resize', this._onResize);
    },
    $_destroyResizeEvent() {
        window.removeEventListener('resize', this._onResize);
    },
    
    initRingChart() {
      this.$nextTick(() => {
        this.ringChart1 = echarts.init(this.$refs.ringChart1)
        this.ringChart2 = echarts.init(this.$refs.ringChart2)
        const option = {
          tooltip: {
            trigger: 'item'
          },
          legend: {
            top: '0%',
            left: 'center',
            textStyle: {
              color: '#fff'
            }
          },
          series: [
            {
              name: '设备状态',
              type: 'pie',
              radius: ['40%', '70%'],
              center: ['50%', '60%'],
              avoidLabelOverlap: false,
              itemStyle: {
                borderRadius: 10,
                borderColor: '#0a1a2b',
                borderWidth: 2
              },
              label: {
                show: false,
                position: 'center'
              },
              emphasis: {
                label: {
                  show: true,
                  fontSize: '18',
                  fontWeight: 'bold',
                  color: '#fff'
                }
              },
              labelLine: {
                show: false
              },
              data: [
                { value: 1048, name: '正常运行', itemStyle: { color: '#67C23A' } },
                { value: 735, name: '待机状态', itemStyle: { color: '#E6A23C' } },
                { value: 580, name: '维护中', itemStyle: { color: '#409EFF' } },
                { value: 48, name: '故障', itemStyle: { color: '#F56C6C' } }
              ]
            }
          ]
        }
        this.ringChart1.setOption(option)
        this.ringChart2.setOption(option)
        
        // 响应式调整
        window.addEventListener('resize', this.resizeRingChart)
      })
    },
    
    resizeRingChart() {
      if (this.ringChart1) {
        this.ringChart1.resize()
      }
      if (this.ringChart2) {
        this.ringChart2.resize()
      }
    },
    
    initScene() {
      //场景初始化
      this.scene = new THREE.Scene()  //创建3D场景容器，所有对象（模型、灯光等）的父级
      this.scene.background = new THREE.Color(0x02090F)
      this.scene.fog = new THREE.FogExp2(0x02090F, 0.002)  //添加指数雾效，颜色与背景一致，密度为0.002，距离越远物体越模糊
      //相机配置
      this.camera = new THREE.PerspectiveCamera(
        35,  //视野角度（FOV）
        this.$refs.container.clientWidth / this.$refs.container.clientHeight,  //宽高比：根据容器尺寸动态计算
        0.1,  //近裁剪面（小于此距离不渲染）
        1000  //远裁剪面（超过此距离不渲染）
      )
      this.camera.position.set(0, 25, 30);  //相机初始位置（X:0, Y:25, Z:30），形成俯视角
      //渲染器设置
      this.renderer = new THREE.WebGLRenderer({ 
        antialias: true,  //开启抗锯齿
        powerPreference: "high-performance",  //优先使用高性能GPU
        outputEncoding: THREE.sRGBEncoding  //使用sRGB色彩空间（更真实的颜色）
      })
      // 清除内联样式：防止Three.js自动添加的CSS样式干扰布局
      this.renderer.domElement.removeAttribute('style');
      this.renderer.domElement.style.cssText = '';
      //渲染器高级属性
      this.renderer.gammaFactor = 2.2;  //伽马校正值（2.2是标准值），改善颜色显示
      this.renderer.physicallyCorrectLights = true;  //启用物理光照模型（更真实的光照衰减）
      this.renderer.setSize(
          this.$refs.container.clientWidth,
          this.$refs.container.clientHeight
      )  //设置渲染器尺寸为容器大小
      this.renderer.shadowMap.enabled = true  //启用阴影，并使用软阴影（PCFSoftShadowMap）
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
      this.$refs.container.appendChild(this.renderer.domElement)  //将Canvas添加到DOM容器中
      //控制器配置
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);  //添加轨道控制器（允许鼠标旋转/缩放场景）
      this.controls.enableDamping = true;  //启用阻尼效果（惯性滑动）
      this.controls.dampingFactor = 0.2; //阻尼系数（值越小滑动越久）
      this.controls.autoRotateSpeed = 2.0;  //自动旋转速度（若启用自动旋转）
      //灯光系统
      // 添加环境光（均匀照亮所有面）
      const ambientLight = new THREE.AmbientLight(0x404040, 1.8)
      this.scene.add(ambientLight)
      
      // 主定向光（模拟太阳）
      const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1.3);
      directionalLight1.position.set(1, 1, 1).normalize();
      directionalLight1.castShadow = true;
      this.scene.add(directionalLight1);
      
      // 补光（平衡阴影）
      const directionalLight2 = new THREE.DirectionalLight(0xffffff, 1.2);
      directionalLight2.position.set(-1, 0.5, -1).normalize();
      this.scene.add(directionalLight2);
      
      // 添加顶部光源增强俯视效果
      const topLight = new THREE.DirectionalLight(0xffffff, 1.0);
      topLight.position.set(0, 1, 0);
      this.scene.add(topLight);
      
      // 添加半球光模拟环境反射
      const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
      this.scene.add(hemisphereLight);
      
      // // 添加网格地面
      // const gridHelper = new THREE.GridHelper(100, 100, 0x1a3b5d, 0x0a1a2b);
      // gridHelper.position.y = -0.5;
      // this.scene.add(gridHelper);
    },
    
    async loadModel(modelPath, targetLevel = 1) {
      if (this.isLoading) return;
      this.isLoading = true;

      try {
        console.log(`开始加载层级 ${targetLevel} 模型: ${modelPath}`);
        
        // 1. 加载模型
        const loader = new GLTFLoader();
        const gltf = await loader.loadAsync(modelPath);
        const model = gltf.scene;  //提取模型的主场景（包含所有网格、灯光等）
        console.log("model",model);
        
        // 2. 重置模型变换：清除模型的旋转、位移和缩放，确保初始状态一致
        model.rotation.set(0, 0, 0);
        model.position.set(0, 0, 0);
        model.scale.set(1, 1, 1);
        
        // 3. 计算模型尺寸
        const box = new THREE.Box3().setFromObject(model);  //计算模型的包围盒
        const size = box.getSize(new THREE.Vector3());  //获取包围盒的宽、高、深
        const maxDim = Math.max(size.x, size.y, size.z);  //取最大维度，用于后续统一缩放
        console.log(`模型最大尺寸: ${maxDim}`);
        
        // 4. 计算缩放因子
        const targetBaseSize = {
          1: 30, 2: 25, 3: 20, 4: 15, 5: 10
        };  ////targetBaseSize：定义不同层级的目标基准尺寸（经验值）
        const scaleFactor = targetBaseSize[targetLevel] / maxDim;   //将模型缩放到目标尺寸的比例因子
        console.log(`缩放因子: ${scaleFactor}`);
        
        // 5. 应用缩放
        model.scale.set(scaleFactor, scaleFactor, scaleFactor);  //按比例因子等比例缩放模型，确保不同层级的模型尺寸统一
        
        // 6. 重新计算中心位置并居中
        model.updateMatrixWorld();  //更新模型的世界矩阵（应用缩放后必须调用）
        const newBox = new THREE.Box3().setFromObject(model);  //计算模型的包围盒
        const center = newBox.getCenter(new THREE.Vector3());  //计算缩放后的包围盒中心
        model.position.sub(center);  //将模型中心移动到原点（0,0,0），便于后续定位
        
        // 7. 设置相机和控制器
        const levelConfig = MODEL_LEVELS[targetLevel];
        this.camera.position.copy(new THREE.Vector3(
          levelConfig.cameraPosition.x,
          levelConfig.cameraPosition.y,
          levelConfig.cameraPosition.z
        ));  //根据层级配置设置相机位置
        this.controls.target.copy(new THREE.Vector3(
          levelConfig.targetPosition.x,
          levelConfig.targetPosition.y,
          levelConfig.targetPosition.z
        ));  //设置轨道控制器的观察目标点

        this.camera.zoom = levelConfig.zoom;  //调整视角缩放
        this.camera.updateProjectionMatrix();
        
        // 8. 添加到场景
        if (this.model) this.scene.remove(this.model);
        this.model = model;
        this.scene.add(this.model);
        
        // 9. 更新控制器
        this.controls.update();  //强制更新控制器状态，确保相机和目标点变化立即生效
        
        // 10. 设置交互
        this.setupModelInteractions(model);
        
        // 11. 更新当前层级
        this.currentLevel = targetLevel;
        
        console.log(`层级 ${targetLevel} 加载完成`);

      } catch (error) {
        console.error(`层级 ${targetLevel} 加载失败:`, error);
      } finally {
        this.isLoading = false;
      }
    },    
    
    setupModelInteractions(model) {
      model.traverse(node => {
        if (node.isMesh) {
          // 确保模型可交互
          node.userData.clickable = true;

          // 提高材质亮度和反射
          if (node.material) {
            node.material = node.material.clone(); // 避免影响原始材质
            node.material.emissiveIntensity = 0.1; // 增加自发光
            node.material.envMapIntensity = 1.0; // 环境贴图强度
            node.material.needsUpdate = true;
            
            // 如果是标准材质
            if (node.material instanceof THREE.MeshStandardMaterial) {
              node.material.roughness = 0.5; // 减少粗糙度
              node.material.metalness = 0.1; // 适当金属度
            }
          }
          
          // 存储原始材质
          node.userData.originalMaterial = node.material.clone();          
        }       
        
      });
    },
    
    switchToCachedModel(level) {
      if (this.model) {
        this.scene.remove(this.model);
      }
      
      this.model = this.modelCache[level];
      this.currentLevel = level;
      this.scene.add(this.model);
    },
    
    updateModelData(data) {
      if (!this.model) return;
      console.log("data", data);
      this.model.traverse((node) => {
        if (node.isMesh && data[node.name]) {
          node.userData.currentData = data[node.name];
        }
      });
    },
    
    setupEventListeners() {
      this.renderer.domElement.addEventListener('click', this.handleClick);
      window.addEventListener('resize', this.handleResize);
      // 添加防抖版本的事件监听
      this.debouncedResize = debounce(this.handleResize, 100);
      window.addEventListener('resize', this.debouncedResize);

      this.controls.addEventListener('start', () => {
        this.isUserRotating = true;
        this.lastUserInteraction = Date.now();
      });
      this.controls.addEventListener('end', () => {
        this.isUserRotating = false;
      });
      this.resizeObserver = new ResizeObserver(this.debouncedResize);
      this.resizeObserver.observe(this.$refs.container);
    },
    
    selectNode(node) {
      this.resetHighlights();
      
      this.selectedNode = {
          name: node.name,
          data: node.userData.currentData || {}
      };
      
      node.material.emissive = new THREE.Color(0xffff00);  //设置材质自发光颜色为黄色（0xffff00）
      node.material.emissiveIntensity = 0.5;  //发光强度（0.5为中等亮度）
      this.highlightedNodes.push(node);  //将节点加入高亮列表，便于统一管理
      //计算世界坐标并更新面板位置
      const worldPosition = new THREE.Vector3();
      node.getWorldPosition(worldPosition);  //获取节点在三维空间中的全局坐标
      this.updatePanelPosition(worldPosition);
    },
    //将3D坐标转换为屏幕坐标，定位数据面板
    updatePanelPosition(worldPosition) {
      //坐标转换（3D → 2D）
      const vector = worldPosition.clone();
      vector.project(this.camera); //将三维世界坐标通过相机投影转换为标准化设备坐标（NDC，范围[-1,1]）
      //转换为屏幕像素坐标
      this.panelPosition.x = (vector.x * 0.5 + 0.5) * this.renderer.domElement.clientWidth;
      this.panelPosition.y = -(vector.y * 0.5 - 0.5) * this.renderer.domElement.clientHeight;
      //边界处理（防止面板溢出屏幕）
      const panelWidth = 300;
      const panelHeight = 200;
      
      this.panelPosition.x = Math.min(
        this.panelPosition.x, 
        window.innerWidth - panelWidth - 20
      );
      this.panelPosition.y = Math.min(
        this.panelPosition.y, 
        window.innerHeight - panelHeight - 20
      );
    },
    
    resetHighlights() {
      this.highlightedNodes.forEach(node => {
        node.material.emissive = new THREE.Color(0x000000);
        node.material.emissiveIntensity = 0;
      });
      this.highlightedNodes = [];
    },
    
    handleResize() {
      const container = this.$refs.container;
      if (!container || !this.renderer) return;

      // 获取容器实际像素尺寸
      const width = container.clientWidth;
      const height = container.clientHeight;

      // 完全禁用Three.js的样式修改
      this.renderer.domElement.style.width = '';
      this.renderer.domElement.style.height = '';

      // 更新渲染器（强制更新尺寸）
      this.renderer.setSize(width, height, false); // 第三个参数 false 禁止修改CSS样式

      // 更新相机
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();

      // 重新居中模型
      if (this.model) {
        const box = new THREE.Box3().setFromObject(this.model);
        const center = box.getCenter(new THREE.Vector3());
        this.controls.target.copy(center);        
      }
      this.controls.update();

      // 强制重绘
      requestAnimationFrame(() => {
        this.renderer.render(this.scene, this.camera);
      });
      
      // 更新图表
      this.resizeRingChart();
    },
    //启动Three.js的渲染循环，持续更新场景和相机状态
    startRendering() {
      const animate = () => {
          this.animationFrameId = requestAnimationFrame(animate);  //浏览器API，以屏幕刷新率（通常60FPS）递归调用animate函数
          
          if (this.autoRotate && !this.isUserRotating && 
              Date.now() - this.lastUserInteraction > 1000) {
            this.controls.autoRotate = true;  //当前是否有用户手动操作（如拖动场景）；用户最后一次操作后等待1秒再恢复自动旋转（避免冲突）
          } else {
            this.controls.autoRotate = false;
          }
          
          this.controls.update(); //更新控制器状态
          this.renderer.render(this.scene, this.camera);  //将三维场景（this.scene）通过相机（this.camera）视角渲染到Canvas
      };
      animate();
    },
    
    startAutoRotation() {
      this.autoRotate = true;
      if (this.controls) {
        this.controls.autoRotate = true;
        this.controls.autoRotateSpeed = 2.0;
      }
    },
    
    stopAutoRotation() {
      this.autoRotate = false;
      if (this.controls) {
        this.controls.autoRotate = false;
      }
    },
    
    getValueClass(key, value) {
      if (key === 'status') {
        return `status-${value}`;
      }
      if (key === 'temperature' && value > 80) {
        return 'high-temperature';
      }
      return '';
    },
    
    setupHoverEvents() {
      const dom = this.renderer.domElement;
      // 防抖函数（100ms触发一次）
      this.debouncedHandleHover = debounce(this.handleHover, 100, {
        leading: true,  // 首次触发立即执行
        trailing: true  // 结束后再触发一次
      });
      dom.addEventListener('mousemove', this.debouncedHandleHover);
      dom.addEventListener('mouseout', this.handleMouseOut);
    },
    
    handleHover(event) {
      if (!this.model) return; // 确保模型已加载

      // 清除之前的延迟（避免多次触发）
      if (this.hoverTimeout) clearTimeout(this.hoverTimeout);
      
      // 设置新的延迟（300ms后显示）
      this.hoverTimeout = setTimeout(() => {
        const mouse = new THREE.Vector2(
          (event.clientX / this.renderer.domElement.clientWidth) * 2 - 1,
          -(event.clientY / this.renderer.domElement.clientHeight) * 2 + 1
        );
        
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);
        
        const interactableObjects = [];
        this.model.traverse(obj => {
          if (obj.visible && obj.userData.clickable) {
            interactableObjects.push(obj);
          }
        });
        
        const intersects = raycaster.intersectObjects(interactableObjects, true);
        
        if (intersects.length > 0) {
          const hoveredObj = intersects[0].object;
          this.hoveredNode = {
            name: hoveredObj.name,
            data: hoveredObj.userData.currentData || {}
          };
          this.updateTooltipPosition(hoveredObj, event);
          this.tooltipVisible = true;
        } else {
          this.tooltipVisible = false;
        }
      }, 300); // 延迟300ms
    },
    
    handleMouseOut() {
      // 立即隐藏提示框，并清除延迟
      if (this.hoverTimeout) clearTimeout(this.hoverTimeout);
      this.tooltipVisible = false;
      this.hoveredNode = null;
    },
    
    updateTooltipPosition(obj, event) {
      const worldPosition = new THREE.Vector3();
      obj.getWorldPosition(worldPosition);
      
      // 两种定位方式结合
      const vector = worldPosition.clone().project(this.camera);
      const rect = this.renderer.domElement.getBoundingClientRect();
      
      let x, y;
      
      // 如果3D坐标转换有效
      if (!isNaN(vector.x)) {
        x = ((vector.x + 1) / 2) * rect.width + rect.left;
        y = (-(vector.y - 1) / 2) * rect.height + rect.top;
      } else {
        // 使用鼠标位置作为后备
        x = event.clientX + 15;
        y = event.clientY + 15;
      }
      
      // 边界检查
      const tooltipWidth = 200;
      const tooltipHeight = 150;
      const offset = 15;
      
      x = Math.min(x, window.innerWidth - tooltipWidth - offset);
      y = Math.min(y, window.innerHeight - tooltipHeight - offset);
      x = Math.max(x, offset);
      y = Math.max(y, offset);
      
      this.tooltipPosition = { x, y };
    },

    handleClick(event) {
      event.stopPropagation();
      
      // 忽略UI元素的点击
      if (this.isClickOnUI(event)) return;
      
      // 获取点击的3D对象
      const clickedObject = this.getClickedObject(event);
      if (!clickedObject) {
        this.tooltipVisible = false;
        return;
      }
      
      // 检查是否需要切换层级
      this.checkLevelTransition(clickedObject);
    },
    
    isClickOnUI(event) {
      const panel = this.$el.querySelector('.data-panel');
      const tooltip = this.$el.querySelector('.tooltip');
      return (panel && panel.contains(event.target)) || 
             (tooltip && tooltip.contains(event.target));
    },
    
    getClickedObject(event) {
      const mouse = this.getNormalizedMousePosition(event);
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, this.camera);
      
      const interactableObjects = this.getInteractableObjects();
      const intersects = raycaster.intersectObjects(interactableObjects, true);
      
      return intersects.length > 0 ? intersects[0].object : null;
    },
    
    getNormalizedMousePosition(event) {
      const rect = this.renderer.domElement.getBoundingClientRect();
      return new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );
    },
    
    getInteractableObjects() {
      const objects = [];
      this.model?.traverse(obj => {
        if (obj.visible && obj.userData.clickable) {
          objects.push(obj);
        }
      });
      return objects;
    },
    
    checkLevelTransition(clickedObject) {
      const currentLevelConfig = MODEL_LEVELS[this.currentLevel];
      const nextLevel = currentLevelConfig.nextLevel;
      
      if (nextLevel && clickedObject.name.startsWith(currentLevelConfig.clickPrefix)) {
        console.log(`从层级 ${this.currentLevel} 跳转到 ${nextLevel}`, {
          currentLevel: this.currentLevel,
          clickedObject: clickedObject.name,
          expectedPrefix: currentLevelConfig.clickPrefix
        });
        
        // 确保加载的是下一层级的模型
        this.loadModel(MODEL_LEVELS[nextLevel].file, nextLevel);
        
        // 更新当前层级状态
        this.currentLevel = nextLevel;
        console.log('当前层级已更新为:', this.currentLevel);
      } else {
        // this.selectNode(clickedObject);
      }
    },
    
    resetModel() {
      if (!this.model) return;
      if (this.modelCache[1]) {
        this.switchToCachedModel(1);
        
        // 计算模型包围盒与中心点
        const box = new THREE.Box3().setFromObject(this.model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        
        // 计算合适的相机位置
        const distance = maxDim * 1.5;  //相机距离基于模型尺寸动态调整（1.5 倍为经验值）
        
        // 设置相机位置
        this.camera.position.set(
          center.x,
          center.y + distance * 0.3,  // 适当抬高视角（俯角30%）
          center.z + distance  // 向后移动保持距离
        );
        
        // 设置目标点
        this.controls.target.copy(center);  //将轨道控制器的焦点对准模型中心
        
        // 重置相机旋转
        this.camera.rotation.set(0, 0, 0);  //清除相机旋转，确保视角为初始状态
        
        // 计算合适的缩放
        const fov = this.camera.fov * (Math.PI / 180);  //将相机的视野角度转为弧度
        const fitZoom = maxDim / (2 * Math.tan(fov / 2) * this.camera.position.distanceTo(center));  //根据模型尺寸和相机距离计算理想缩放值（确保模型完整可见）
        this.camera.zoom = fitZoom * 0.9; // 留出边距,0.9 倍缩放避免模型紧贴视口边缘
        
        this.camera.updateProjectionMatrix();
        this.controls.update();  //强制刷新控制器参数（如目标点、阻尼等）
      } else {
        this.loadModel(MODEL_LEVELS[1].file, 1);
      }
    },
    
    setTopDisplay(ishiden) {               
        if (ishiden) {
            if (document.getElementsByClassName("plat-appHeader")[0]) {
                document.getElementsByClassName(
                "plat-appHeader"
                )[0].style.display = "none";
            }          
        } else {
            if (document.getElementsByClassName("plat-appHeader")[0]) {
                document.getElementsByClassName(
                "plat-appHeader"
                )[0].style.display = "block";
            }                          
        }
        // const isContainerStyle = document.getElementsByClassName("isContainerStyle");
        const containerStyle = document.getElementsByClassName("containerStyle");  
        if(containerStyle.length>0){
            containerStyle[0].style.height = "100vh"; 
            containerStyle[0].style.flex = 1;
        } 
        // if(isContainerStyle.length>0){
        //     isContainerStyle[0].style.height = "100vh"; 
        //     isContainerStyle[0].style.flex = 1;  
        // }
        
    },
  }
}
</script>

<style scoped>
.dashboard-container {
  position: relative;
  width: 100%;
  height: 100vh;
  /* height: calc(100vh - 52px); */
  margin: 0; /* 清除默认边距 */
  padding: 0; /* 清除默认内边距 */
  overflow: hidden;
  color: #fff;
  font-family: 'Arial', sans-serif;
}

.dashboard-header {
  position: relative;
  text-align: center;
  z-index: 10;
  height: 60px; /* 固定标题高度 */
  display: flex;
  flex-direction: column;
  justify-content: center;
  background-color: #02090F;
}

.title-bg {
  display: inline-block;
  padding: 0 40px;
}

.dashboard-header h1 {
  margin: 0;
  font-size: 32px;
  font-weight: bold;
  color: #fff;
  text-shadow: 0 0 10px rgba(100, 240, 255, 0.7);
  letter-spacing: 2px;
  padding: 10px 0;
}

.header-decoration {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 80%;
  height: 2px;
  background: linear-gradient(90deg, transparent 0%, #64f0ff 50%, transparent 100%);
  box-shadow: 0 0 10px rgba(100, 240, 255, 0.5);
}

.dashboard-content {
  display: flex;
  height: calc(100% - 100px);
  /* padding: 20px; */
}

.left-panel, .right-panel {
  width: 280px;
  padding: 15px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.model-container {
  flex: 1;
  overflow: hidden;
  box-shadow: 0 0 30px rgba(0, 150, 255, 0.2);
  background: rgba(10, 26, 43, 0.7);
  position: absolute;
  top: 60px; /* 标题高度 */
  left: 0;
  right: 0;
  bottom: 0;
  min-width: 0;
  width: 100% !important;
  height: calc(100% - 60px);
}

.renderer-container {
  position: relative;
  width: 100% !important;
  height: 100% !important;
  overflow: hidden;
  display: block; /* 确保 canvas 是块级元素 */
  margin: 0 !important;
  padding: 0 !important;
  outline: none; /* 移除焦点边框 */
}

/* 覆盖Three.js默认canvas样式 */
.renderer-container > canvas {
  width: 100% !important;
  height: 100% !important;
  min-width: 0 !important;
  min-height: 0 !important;
  max-width: none !important;
  max-height: none !important;
  display: block !important;
  position: static !important;
}

.level-indicator {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(16, 42, 66, 0.8);
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 14px;
  border: 1px solid rgba(100, 200, 255, 0.3);
}

.dashboard-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  padding: 10px 0;
  text-align: center;
  background: linear-gradient(90deg, rgba(16, 42, 66, 0.5) 0%, rgba(32, 84, 132, 0.5) 100%);
}

.footer-decoration {
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, #64f0ff 50%, transparent 100%);
  margin-bottom: 10px;
}

.footer-info {
  display: flex;
  justify-content: center;
  gap: 20px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.renderer-container {
  width: 100%;
  height: 100%;
}

/* 浮动面板样式 */
.floating-panel {
  position: absolute;
  top: 20px;
  width: 280px;
  padding: 15px;
  display: flex;
  flex-direction: column;
  gap: 15px;
  background: rgba(16, 42, 66, 0.5);
  border-radius: 8px;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(100, 200, 255, 0.2);
  z-index: 10;
}

.left-panel {
  left: 20px;
}

.right-panel {
  right: 20px;
}

.metric-card {
  background: rgba(16, 42, 66, 0.7);
  border-radius: 8px;
  padding: 15px;
  display: flex;
  align-items: center;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
}

.metric-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(0, 150, 255, 0.3);
}

.metric-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
  font-size: 20px;
  color: white;
}

.metric-info {
  flex: 1;
}

.metric-value {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 5px;
  background: linear-gradient(90deg, #fff 0%, #64f0ff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.metric-title {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
}

.metric-trend {
  font-size: 14px;
  padding: 4px 8px;
  border-radius: 12px;
  background: rgba(100, 240, 255, 0.1);
}

.metric-trend.up {
  color: #67c23a;
}

.metric-trend.down {
  color: #f56c6c;
}

.metric-trend.steady {
  color: #e6a23c;
}

.ring-chart {
  margin-top: auto;
  background: rgba(16, 42, 66, 0.7);
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.ring-chart h3 {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 16px;
  text-align: center;
  color: #64f0ff;
}

.chart-container {
  width: 100%;
  height: 250px;
}

.data-panel {
  position: absolute;
  width: 280px;
  background: rgba(16, 42, 66, 0.95);
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 5px 30px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(100, 200, 255, 0.2);
  z-index: 100;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  color: #64f0ff;
}

.close-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  font-size: 20px;
  cursor: pointer;
  transition: color 0.2s;
}

.close-btn:hover {
  color: #f56c6c;
}

.data-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
}

.data-label {
  color: rgba(255, 255, 255, 0.7);
}

.data-value {
  font-weight: bold;
}

.data-value.status-normal {
  color: #67c23a;
}

.data-value.status-warning {
  color: #e6a23c;
}

.data-value.status-error {
  color: #f56c6c;
}

.data-value.high-temperature {
  color: #f56c6c;
  animation: pulse 1.5s infinite;
}

.panel-arrow {
  position: absolute;
  width: 0;
  height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-top: 10px solid rgba(16, 42, 66, 0.95);
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  filter: drop-shadow(0 2px 2px rgba(0, 0, 0, 0.3));
}

.tooltip {
  position: absolute;
  width: 220px;
  background: rgba(16, 42, 66, 0.95);
  border-radius: 6px;
  padding: 12px;
  font-size: 13px;
  box-shadow: 0 3px 15px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(100, 200, 255, 0.2);
  pointer-events: none;
  z-index: 99;
}

.tooltip-title {
  font-weight: bold;
  color: #64f0ff;
  margin-bottom: 8px;
  font-size: 14px;
}

.tooltip-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
}

.tooltip-key {
  color: rgba(255, 255, 255, 0.7);
}

.tooltip-value {
  font-weight: bold;
}

.controls {
  position: absolute;
  bottom: 50px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 10px;
  z-index: 10;
}

.controls button {
  padding: 8px 15px;
  background: rgba(16, 42, 66, 0.8);
  border: 1px solid rgba(100, 200, 255, 0.3);
  color: white;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 12px;
}

.controls button:hover {
  background: rgba(32, 84, 132, 0.8);
  border-color: #64f0ff;
}

/* 新增中间顶部面板样式 */
.center-top-panel {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: auto;
  display: flex;
  flex-direction: row;
  gap: 15px;
  padding: 15px;
  background: rgba(16, 42, 66, 0.5);
  border-radius: 8px;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(100, 200, 255, 0.2);
  z-index: 10;
}
/* 调整指标卡片在水平布局中的样式 */
.center-top-panel .metric-card {
  flex-direction: column;
  align-items: flex-start;
  min-width: 120px;
  padding: 12px;
}

.center-top-panel .metric-icon {
  margin-right: 0;
  margin-bottom: 10px;
}

.center-top-panel .metric-info {
  width: 100%;
}

.center-top-panel .metric-value {
  font-size: 20px;
  margin-bottom: 3px;
}

.center-top-panel .metric-title {
  font-size: 12px;
  white-space: nowrap;
}

.center-top-panel .metric-trend {
  margin-top: 5px;
  align-self: flex-end;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.6; }
  100% { opacity: 1; }
}
</style>