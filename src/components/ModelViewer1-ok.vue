<template>
  <div class="model-container">
    <div ref="container" class="renderer-container"></div>
    
    <!-- <div v-if="selectedNode" class="data-panel">
      <h3>{{ selectedNode.name }} 实时数据</h3>
      <div v-for="(value, key) in selectedNode.data" :key="key" class="data-row">
        <span class="data-label">{{ key }}:</span>
        <span class="data-value" :class="getValueClass(key, value)">{{ value }}</span>
      </div>
    </div> -->
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
    
    <div class="controls">
      <button @click="startAutoRotation">自动旋转</button>
      <button @click="stopAutoRotation">停止旋转</button>
    </div>
  </div>
</template>

<script>
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

export default {
  props: {
    modelUrl: {
      type: String,
      required: true
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
      tooltipVisible: false
    }
  },
  
  watch: {
    realtimeData: {
      handler(newVal) {
        this.updateModelData(newVal)
      },
      deep: true
    },
    
    logicRelations: {
      handler() {
        this.updateLogicRelations()
      },
      deep: true
    }
  },
  
  mounted() {
    this.initScene()  
    this.loadModel()  
    this.setupEventListeners()
    this.setupHoverEvents()
    this.startRendering()
    
    // 初始数据更新
    this.$nextTick(() => {
      this.updateModelData(this.realtimeData)
      this.updateLogicRelations()
    })
  },
  
  beforeDestroy() {
    this.cleanup()
  },
  
  methods: {
    //初始化 Three.js 场景、相机、渲染器
    initScene() {
      // 创建场景
      this.scene = new THREE.Scene()
      // 设置场景背景色为浅灰色(十六进制颜色0xf0f0f0)
      this.scene.background = new THREE.Color(0xf0f0f0)
      
      // 创建透视相机
      this.camera = new THREE.PerspectiveCamera(
        75, // 视野角度(FOV) - 垂直视角75度
        this.$refs.container.clientWidth / this.$refs.container.clientHeight, // 宽高比(根据容器尺寸计算)
        0.1,  // 近裁剪面 - 距离相机0.1单位以内的物体不显示
        1000  // 远裁剪面 - 距离相机1000单位以外的物体不显示
      )
      this.camera.position.z = 50  // 设置相机位置 - 沿z轴向后移动5个单位
      
      // 创建WebGL渲染器
      this.renderer = new THREE.WebGLRenderer({ 
          antialias: true  // 开启抗锯齿使边缘更平滑
      })
      // 设置渲染器尺寸为容器大小
      this.renderer.setSize(
          this.$refs.container.clientWidth, // 宽度
          this.$refs.container.clientHeight // 高度
      )
      // 将渲染器的DOM元素(Canvas)添加到容器中
      this.$refs.container.appendChild(this.renderer.domElement)
      
      // 添加环境光(均匀照亮所有物体)
      const ambientLight = new THREE.AmbientLight(
          0xffffff, // 白光
          0.5 // 光照强度
      )
      this.scene.add(ambientLight) // 将环境光添加到场景
      
      // 添加平行光(方向性光源)
      const directionalLight = new THREE.DirectionalLight(
          0xffffff, // 白光
          0.8 // 光照强度
      )
      // 设置平行光方向(从右上方照射)
      directionalLight.position.set(0, 1, 1)
      this.scene.add(directionalLight) // 将平行光添加到场景
    },
    //加载 GLB/GLTF 模型并设置交互支持
    async loadModel() {
      // 创建GLTF加载器实例（用于加载.glb/.gltf格式的3D模型）
      const loader = new GLTFLoader()
      
      try {
          // 异步加载模型文件（this.modelUrl是模型文件路径）
          const gltf = await loader.loadAsync(this.modelUrl)
          // 获取模型的主场景对象
          this.model = gltf.scene
          console.log("model:",this.model)
          // 遍历模型的所有子节点
          this.model.traverse((node) => {
              // 只处理网格类型的节点（实际可见的3D物体）
              if (node.isMesh && node.name=="立方体") { //只为网格节点（isMesh）添加交互支持
                console.log("model-name:",node.name)
                  // 给节点添加可点击标记
                  node.userData.clickable = true
                  // 保存原始材质的副本（用于后续重置）
                  node.userData.originalMaterial = node.material.clone()
                  
                  // 如果实时数据中有这个节点的数据，进行初始绑定
                  console.log("realtimeData:",this.realtimeData)
                  if (this.realtimeData[node.name]) {
                      console.log("realtimeData-name:",this.realtimeData[node.name])
                      // 将实时数据存储到节点自定义数据中
                      node.userData.currentData = this.realtimeData[node.name]  //数据存储在 userData 中（Three.js提供的自定义数据容器）
                  }
              }
          })
          
          // 将模型添加到场景中
          this.scene.add(this.model)
          
          // 初始化轨道控制器（实现鼠标拖拽/缩放等交互）
          this.controls = new OrbitControls(this.camera, this.renderer.domElement)
          
          // 检查模型是否包含动画
          if (gltf.animations?.length) {
              // 创建动画混合器
              this.mixer = new THREE.AnimationMixer(this.model)
              // 播放所有动画片段
              gltf.animations.forEach(clip => {
                  this.mixer.clipAction(clip).play()
              })
          }
          
          // // 设置初始选中的节点（默认选择第一个子节点）
          // if (this.model.children.length > 0) {
          //     this.selectedNode = {
          //         name: this.model.children[0].name, // 节点名称
          //         // 获取该节点的实时数据，如果没有则使用空对象
          //         data: this.realtimeData[this.model.children[0].name] || {}
          //     }
          // }          
      } catch (error) {
          // 捕获并打印加载错误
          console.error('模型加载失败:', error)
      }
  },
    //根据实时数据更新模型外观
    updateModelData(data) {
      if (!this.model) return
      console.log("data",data)
      this.model.traverse((node) => {
        if (node.isMesh && data[node.name]) {
          // 更新节点数据
          node.userData.currentData = data[node.name]
          
          // 根据数据更新外观
          this.applyDataToMaterial(node, data[node.name])
        }
      })
    },
    //将数据应用到3D模型的材质上
    applyDataToMaterial(node, data) {
      // 温度数据可视化处理
      if (data.temperature !== undefined) {  // 检查是否存在温度数据
          const temp = data.temperature  // 获取温度值
          
          // 创建基于温度的颜色：
          // - 红色通道：温度/100（最大为1）
          // - 绿色通道：固定0.2（保持一定绿色成分）
          // - 蓝色通道：1 - 温度/100（温度越高蓝色越少）
          const tempColor = new THREE.Color(
              Math.min(1, temp / 100),  // 红色分量（限制最大值1）
              0.2,                     // 固定绿色分量
              Math.max(0, 1 - temp / 100) // 蓝色分量（不低于0）
          )
          
          // 将计算的颜色应用到模型材质
          node.material.color.copy(tempColor)
      }
      
      // 状态数据可视化处理
      if (data.status) {  // 检查是否存在状态数据
          switch (data.status) {  // 根据不同状态设置不同效果
              case 'error':  // 错误状态
                  node.material.emissive = new THREE.Color(0xff0000)  // 设置自发光颜色为红色
                  node.material.emissiveIntensity = 0.5  // 自发光强度50%
                  break
                  
              case 'warning':  // 警告状态
                  node.material.emissive = new THREE.Color(0xff9900)  // 设置自发光颜色为橙色
                  node.material.emissiveIntensity = 0.3  // 自发光强度30%
                  break
                  
              default:  // 正常状态
                  node.material.emissive = new THREE.Color(0x000000)  // 关闭自发光（黑色）
                  node.material.emissiveIntensity = 0  // 自发光强度0%
          }
      }
    },
    //更新节点间的关系连线
    updateLogicRelations() {
      // 1. 清除场景中所有旧的关系连线
      this.scene.children  // 获取场景所有子对象
      .filter(obj => obj.userData.isRelationLine)  // 筛选出标记为关系线的对象
      .forEach(line => this.scene.remove(line))  // 逐条移除关系线

      // 2. 根据最新数据绘制新关系线
      this.logicRelations.forEach(relation => {  // 遍历逻辑关系数组
          // 2.1 通过节点名称获取起始和结束节点
          const fromNode = this.model.getObjectByName(relation.from)
          const toNode = this.model.getObjectByName(relation.to)
          
          // 2.2 确保两个节点都存在
          if (fromNode && toNode) {
              // 2.3 创建两个三维向量存储节点位置
              const fromPos = new THREE.Vector3()
              const toPos = new THREE.Vector3()
              
              // 2.4 获取节点的世界坐标位置
              fromNode.getWorldPosition(fromPos)  // 获取起始节点全局位置
              toNode.getWorldPosition(toPos)     // 获取目标节点全局位置
              
              // 2.5 创建连线几何体（两点确定一条直线）
              const geometry = new THREE.BufferGeometry().setFromPoints([fromPos, toPos])
              
              // 2.6 创建连线材质
              const material = new THREE.LineBasicMaterial({ 
                  color: this.getRelationColor(relation.type),  // 根据关系类型获取颜色
                  linewidth: 2  // 线宽（注意：实际渲染中可能需要额外配置）
              })
              
              // 2.7 创建连线对象
              const line = new THREE.Line(geometry, material)
              line.userData.isRelationLine = true  // 标记为关系线（便于后续识别）
              
              // 2.8 将连线添加到场景
              this.scene.add(line)
          }
      })
    },
    
    getRelationColor(type) {
      const colors = {
        'material-flow': 0x00ff00,
        'signal-flow': 0x0000ff,
        'error-flow': 0xff0000,
        'default': 0xaaaaaa
      }
      return colors[type] || colors.default
    },
    
    setupEventListeners() {
      this.renderer.domElement.addEventListener('click', this.handleClick)
      window.addEventListener('resize', this.handleResize)
    },
    
    handleClick(event) {
      console.log("event",event)
      // 如果点击的是面板或面板内的元素，不处理
      const panel = this.$el.querySelector('.data-panel')
      const tooltip = this.$el.querySelector('.tooltip')
      if ((panel && panel.contains(event.target)) || 
          (tooltip && tooltip.contains(event.target))) {
        return
      }
      // 1. 将鼠标点击位置转换为标准化设备坐标（NDC）
      const mouse = new THREE.Vector2(
          // X坐标转换：[-1, 1]范围（左侧-1，右侧1）
          (event.clientX / this.renderer.domElement.clientWidth) * 2 - 1, // 将屏幕X坐标映射到[-1,1]
          // Y坐标转换：[-1, 1]范围（底部-1，顶部1）
          -(event.clientY / this.renderer.domElement.clientHeight) * 2 + 1  // 反转Y轴并映射到[-1,1]
      )
      
      // 2. 创建光线投射器（用于检测点击与3D对象的交集）
      const raycaster = new THREE.Raycaster()
      
      // 3. 从相机位置发射光线，方向指向鼠标点击位置
      raycaster.setFromCamera(mouse, this.camera)
      
      // 4. 计算光线与场景中所有对象的交点（true表示递归检测子对象）
      const intersects = raycaster.intersectObjects(this.scene.children, true)
      console.log("intersects",intersects)
      // 5. 如果存在交点（点击到了物体）
      if (intersects.length > 0) {
          // 5.1 获取第一个被点击的物体（最靠近相机的交点）
          const clickedObject = intersects[0].object
          
          // 5.2 检查物体是否标记为可点击
          if (clickedObject.userData.clickable) {
              // 5.3 执行选中逻辑
              this.selectNode(clickedObject)
          }

          // // 隐藏所有楼栋，显示点击的楼栋
          // if (clickedObject.name.includes('Building_')) {
          //   this.model.traverse(child => {
          //     if (child.isMesh) {
          //       // 只显示当前点击的楼栋（如"Building_A"开头的所有部分）
          //       child.visible = child.name.startsWith(clickedObject.name);
          //     }
          //   });
          // }
      }
      // 点击后隐藏提示框
      this.tooltipVisible = false
    },
    
    selectNode(node) {
      // 1. 重置之前所有高亮节点（恢复原始外观）
      this.resetHighlights()
      
      // 2. 更新当前选中节点的数据
      this.selectedNode = {
          name: node.name,  // 记录节点名称
          data: node.userData.currentData || {}  // 关联节点数据（若无则用空对象）
      }
      
      // 3. 应用高亮效果
      node.material.emissive = new THREE.Color(0xffff00)  // 设置自发光颜色为黄色
      node.material.emissiveIntensity = 0.5  // 发光强度50%
      
      // 4. 记录高亮节点（用于后续重置）
      this.highlightedNodes.push(node)

      // 获取对象的世界坐标
      const worldPosition = new THREE.Vector3()
      node.getWorldPosition(worldPosition)
      
      // 转换为屏幕坐标
      this.updatePanelPosition(worldPosition)
      this.panelVisible = true
    },
    updatePanelPosition(worldPosition) {
      // 将三维坐标转换为屏幕坐标
      const vector = worldPosition.clone()
      vector.project(this.camera)
      
      // 计算屏幕位置
      this.panelPosition.x = (vector.x * 0.5 + 0.5) * this.renderer.domElement.clientWidth
      this.panelPosition.y = -(vector.y * 0.5 - 0.5) * this.renderer.domElement.clientHeight
      
      // 确保面板不会超出视口
      const panelWidth = 300 // 预估面板宽度
      const panelHeight = 200 // 预估面板高度
      
      this.panelPosition.x = Math.min(
        this.panelPosition.x, 
        window.innerWidth - panelWidth - 20
      )
      this.panelPosition.y = Math.min(
        this.panelPosition.y, 
        window.innerHeight - panelHeight - 20
      )
    },
    resetHighlights() {
      this.highlightedNodes.forEach(node => {
        node.material.emissive = new THREE.Color(0x000000) // 关闭发光
        node.material.emissiveIntensity = 0
      })
      this.highlightedNodes = []  // 清空记录
    },
    //浏览器窗口大小变化时，保持3D场景的正确比例和清晰度。
    handleResize() {
      if (this.$refs.container) {  // 确保容器存在
          // 更新相机宽高比
          this.camera.aspect = this.$refs.container.clientWidth / this.$refs.container.clientHeight
          this.camera.updateProjectionMatrix()  // 必须调用以应用新的投影矩阵
          
          // 同步调整渲染器尺寸
          this.renderer.setSize(
              this.$refs.container.clientWidth,
              this.$refs.container.clientHeight
          )
      }
    },
    
    startRendering() {
      const animate = () => {
          // 1. 注册下一帧回调（形成循环）
          this.animationFrameId = requestAnimationFrame(animate) //使用requestAnimationFrame实现平滑动画
          
          // 2. 更新模型动画（16ms≈60FPS的帧间隔）
          if (this.mixer) {
              this.mixer.update(0.016)   //固定时间步长（0.016s）确保动画速度一致
          }
          
          // 3. 处理自动旋转逻辑
          if (this.autoRotate && this.controls) {
              this.controls.autoRotate = true
              this.controls.update()  // 必须调用以更新控制器状态
          }

          // 如果面板可见且有选中节点，更新位置
          if (this.panelVisible && this.selectedNode) {
            const node = this.model.getObjectByName(this.selectedNode.name)
            if (node) {
              const worldPosition = new THREE.Vector3()
              node.getWorldPosition(worldPosition)
              this.updatePanelPosition(worldPosition)
            }
          }
          
          // 4. 执行实际渲染
          this.renderer.render(this.scene, this.camera)

      }
      animate()  // 启动循环
    },
    
    startAutoRotation() {
      this.autoRotate = true  // 仅设置标志位，实际控制在渲染循环中处理
    },
    
    stopAutoRotation() {
      this.autoRotate = false  // 关闭标志位
      if (this.controls) {
        this.controls.autoRotate = false  // 立即停止旋转
      }
    },
    
    getValueClass(key, value) {
      if (key === 'status') {
        return `status-${value}`  // 生成状态相关class（如status-error）
      }
      if (key === 'temperature' && value > 80) {
        return 'high-temperature'  // 高温特殊样式
      }
      return '' // 默认无附加样式
    },
    //防止内存泄漏的关键操作
    cleanup() {
      // 1. 停止动画循环
      cancelAnimationFrame(this.animationFrameId)
      
      // 2. 移除事件监听
      window.removeEventListener('resize', this.handleResize)
      
      // 3. 移除DOM元素
      if (this.$refs.container && this.renderer.domElement.parentNode === this.$refs.container) {
          this.$refs.container.removeChild(this.renderer.domElement)
      }
      
      // 4. 释放模型资源
      if (this.model) {
          this.model.traverse(node => {
              if (node.material) node.material.dispose()  // 销毁材质
              if (node.geometry) node.geometry.dispose()  // 销毁几何体
          })
      }
      
      // 5. 销毁渲染器
      if (this.renderer) {
          this.renderer.dispose()
      }
    },
    setupHoverEvents() {
      const dom = this.renderer.domElement
      dom.addEventListener('mousemove', this.handleHover)
      dom.addEventListener('mouseout', this.handleMouseOut)
    },
    
    handleHover(event) {
      // 如果面板可见，则不处理悬浮
      if (this.panelVisible) return
      
      // 计算鼠标位置
      const mouse = new THREE.Vector2(
        (event.clientX / this.renderer.domElement.clientWidth) * 2 - 1,
        -(event.clientY / this.renderer.domElement.clientHeight) * 2 + 1
      )
      
      // 射线检测
      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(mouse, this.camera)
      
      // 只检测可交互对象
      const interactableObjects = []
      this.model?.traverse(obj => {
        if (obj.userData.clickable) interactableObjects.push(obj)
      })
      
      const intersects = raycaster.intersectObjects(interactableObjects, true)
      
      if (intersects.length > 0) {
        const hoveredObj = intersects[0].object
        this.hoveredNode = {
          name: hoveredObj.name,
          data: hoveredObj.userData.currentData || {}
        }
        
        // 更新提示框位置
        const worldPosition = new THREE.Vector3()
        hoveredObj.getWorldPosition(worldPosition)
        this.updateTooltipPosition(worldPosition, event)
        
        this.tooltipVisible = true
      } else {
        this.tooltipVisible = false
      }
    },
    
    handleMouseOut() {
      this.tooltipVisible = false
      this.hoveredNode = null
    },
    
    updateTooltipPosition(worldPosition, event) {
      // 方法1：使用3D对象的世界坐标
      // const vector = worldPosition.clone()
      // vector.project(this.camera)
      
      // this.tooltipPosition.x = (vector.x * 0.5 + 0.5) * this.renderer.domElement.clientWidth
      // this.tooltipPosition.y = -(vector.y * 0.5 - 0.5) * this.renderer.domElement.clientHeight
      
      // 方法2：直接使用鼠标位置（更简单）
      this.tooltipPosition = { x: event.clientX, y: event.clientY }
      
      // 边界检查
      const tooltipWidth = 200
      const tooltipHeight = 150
      
      this.tooltipPosition.x = Math.min(
        this.tooltipPosition.x,
        window.innerWidth - tooltipWidth - 10
      )
      this.tooltipPosition.y = Math.min(
        this.tooltipPosition.y,
        window.innerHeight - tooltipHeight - 10
      )
    }
  }
}
</script>

<style scoped>
.model-container {
  position: relative;
  width: 100%;
  height: 600px;
  border: 1px solid #eee;
  border-radius: 8px;
  overflow: hidden;
}

.renderer-container {
  width: 100%;
  height: 100%;
  transform: translateZ(0); /* 创建新的层叠上下文 */
}

.data-panel {
  position: absolute;
  /* top: 20px; */
  right: 20px;
  background: rgba(255, 255, 255, 0.95);
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  max-width: 300px;
  z-index: 10;
}

.data-row {
  margin: 8px 0;
  display: flex;
  justify-content: space-between;
}

.data-label {
  font-weight: bold;
  margin-right: 10px;
}

.data-value {
  text-align: right;
}

.status-error {
  color: #ff0000;
}

.status-warning {
  color: #ff9900;
}

.high-temperature {
  color: #ff5500;
  font-weight: bold;
}

.controls {
  position: absolute;
  bottom: 20px;
  left: 20px;
  z-index: 10;
}

.controls button {
  margin-right: 10px;
  padding: 5px 10px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

.controls button:hover {
  background: #f0f0f0;
}

.data-panel {
  position: fixed;
  background: rgba(255, 255, 255, 0.95);
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  max-width: 300px;
  z-index: 10;
  transform: translateY(-50%); /* 垂直居中 */
  pointer-events: auto; /* 允许与面板交互 */
}

.panel-arrow {
  position: absolute;
  width: 0;
  height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-top: 10px solid rgba(255, 255, 255, 0.95);
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
}

/* 添加响应式调整 */
/* @media (max-width: 768px) {
  .data-panel {
    max-width: 250px;
    font-size: 14px;
  }
} */

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #666;
}
.data-panel {
  transition: left 0.2s ease-out, top 0.2s ease-out;
}

.tooltip {
  position: fixed;
  background: rgba(30, 30, 30, 0.92); /* 更深的半透明背景 */
  color: #fff;
  padding: 12px 16px;
  border-radius: 6px;
  pointer-events: none;
  z-index: 1000;
  font-size: 13px;
  max-width: 250px;
  transform: translate(15px, -50%);
  /* 字体优化 */
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  /* 阴影增强 */
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
  /* 边框增强对比 */
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.tooltip-title {
  font-weight: 600;
  margin-bottom: 6px;
  font-size: 14px;
  letter-spacing: 0.3px;
}

.tooltip-row {
  display: flex;
  justify-content: space-between;
  margin: 5px 0;
  line-height: 1.4;
}

.tooltip-key {
  margin-right: 10px;
  opacity: 0.8;
}

.tooltip-value {
  font-weight: 500;
}

.tooltip-value.status-error {
  color: #ff6b6b;
}

.tooltip-value.status-warning {
  color: #ffcc5c;
}

.tooltip-value.high-temperature {
  color: #ff8c66;
}
</style>