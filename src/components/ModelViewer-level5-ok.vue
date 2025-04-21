<template>
  <div class="model-container">
    <div ref="container" class="renderer-container"></div>
    
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
      <button @click="resetModel">重置视图</button>
      <button @click="toggleBuildingHelper">
        {{ buildingHelper ? '隐藏' : '显示' }}边界
      </button>
    </div>
    
    <!-- 模型层级指示器 -->
    <div class="level-indicator">
      当前层级: {{ currentLevel }}
    </div>
  </div>
</template>

<script>
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

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
  2: { 
    file: '/assets/models/level2.glb', 
    clickPrefix: 'yfdl00333',
    cameraPosition: { x: 0, y: 20, z: 40 },
    targetPosition: { x: 0, y: 0, z: 0 },
    zoom: 1.0,
    nextLevel: 3
  },
  3: { 
    file: '/assets/models/level3.glb', 
    clickPrefix: '1-1jianzhu',
    cameraPosition: { x: 0, y: 35, z: 25 },
    targetPosition: { x: 0, y: 0, z: 0 },
    zoom: 1.0,
    nextLevel: 4
  },
  4: { 
    file: '/assets/models/level4.glb', 
    clickPrefix: 'jigui',
    cameraPosition: { x: 0, y: 40, z: 25 },  // 调整位置
    targetPosition: { x: 0, y: 0, z: 0 },
    zoom: 0.8,  // 减小缩放值
    nextLevel: 5
  },
  5: { 
    file: '/assets/models/level5.glb', 
    clickPrefix: null,
    cameraPosition: { x: 0, y: 8, z: 15 },  // 调整位置
    targetPosition: { x: 0, y: 0, z: 0 },
    zoom: 0.5,  // 进一步减小缩放值
    nextLevel: null
  }
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
      isLoading: false // 防止重复加载
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
    this.initScene()  
    this.loadModel(MODEL_LEVELS[1].file) // 初始加载第一层
    this.setupEventListeners()
    this.setupHoverEvents()
    this.startRendering()
  },
  
  beforeDestroy() {
    this.cleanup()
  },
  
  methods: {
    initScene() {
      this.scene = new THREE.Scene()
      // this.scene.background = new THREE.Color(0x02090F)
      
      this.camera = new THREE.PerspectiveCamera(
        35,
        this.$refs.container.clientWidth / this.$refs.container.clientHeight,
        0.1,
        1000
      )
      this.camera.position.set(0, 15, 30);
      // 添加正交相机作为备选（如果需要）
      this.orthoCamera = new THREE.OrthographicCamera(
        this.$refs.container.clientWidth / -2,
        this.$refs.container.clientWidth / 2,
        this.$refs.container.clientHeight / 2,
        this.$refs.container.clientHeight / -2,
        0.1,
        1000
      );
          
      this.renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        powerPreference: "high-performance", // 高性能模式
        outputEncoding: THREE.sRGBEncoding // 使用sRGB编码增强色彩
      })
      this.renderer.gammaFactor = 2.2; // Gamma校正
      this.renderer.physicallyCorrectLights = true; // 物理正确光照
      this.renderer.setSize(
          this.$refs.container.clientWidth,
          this.$refs.container.clientHeight
      )
      this.$refs.container.appendChild(this.renderer.domElement)

      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.2;
      this.controls.autoRotateSpeed = 2.0;
      
      const ambientLight = new THREE.AmbientLight(0xffffff, 1.8)
      this.scene.add(ambientLight)
      
      // 添加更强的平行光
      const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1.3);
      directionalLight1.position.set(1, 1, 1).normalize();
      this.scene.add(directionalLight1);
      
      // 添加第二盏补光
      const directionalLight2 = new THREE.DirectionalLight(0xffffff, 1.2);
      directionalLight2.position.set(-1, 0.5, -1).normalize();
      this.scene.add(directionalLight2);
      
      // 添加顶部光源增强俯视效果
      const topLight = new THREE.DirectionalLight(0xffffff, 1.0);
      topLight.position.set(0, 1, 0);
      this.scene.add(topLight);
      
      // 可选：添加半球光模拟环境反射
      const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
      this.scene.add(hemisphereLight);
    },
    
    async loadModel(modelPath, targetLevel = 1) {
      if (this.isLoading) return;
      this.isLoading = true;

      try {
        console.log(`开始加载层级 ${targetLevel} 模型: ${modelPath}`);
        
        // 1. 加载模型
        const loader = new GLTFLoader();
        const gltf = await loader.loadAsync(modelPath);
        const model = gltf.scene;
        
        // 2. 重置模型变换
        model.rotation.set(0, 0, 0);
        model.position.set(0, 0, 0);
        model.scale.set(1, 1, 1);
        
        // 3. 计算模型尺寸
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        console.log(`模型最大尺寸: ${maxDim}`);
        
        // 4. 计算缩放因子
        const targetBaseSize = {
          1: 30, 2: 25, 3: 20, 4: 15, 5: 10
        };
        const scaleFactor = targetBaseSize[targetLevel] / maxDim;
        console.log(`缩放因子: ${scaleFactor}`);
        
        // 5. 应用缩放
        model.scale.set(scaleFactor, scaleFactor, scaleFactor);
        
        // 6. 重新计算中心位置并居中
        model.updateMatrixWorld();
        const newBox = new THREE.Box3().setFromObject(model);
        const center = newBox.getCenter(new THREE.Vector3());
        model.position.sub(center);
        
        // 7. 设置相机和控制器
        const levelConfig = MODEL_LEVELS[targetLevel];
        this.camera.position.copy(new THREE.Vector3(
          levelConfig.cameraPosition.x,
          levelConfig.cameraPosition.y,
          levelConfig.cameraPosition.z
        ));
        this.controls.target.copy(new THREE.Vector3(
          levelConfig.targetPosition.x,
          levelConfig.targetPosition.y,
          levelConfig.targetPosition.z
        ));

        this.camera.zoom = levelConfig.zoom;
        this.camera.updateProjectionMatrix();
        
        // 8. 添加到场景
        if (this.model) this.scene.remove(this.model);
        this.model = model;
        this.scene.add(this.model);
        
        // 9. 更新控制器
        this.controls.update();
        
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
    
    calculateFitZoom(boundingBox, camera) {
      const size = boundingBox.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = camera.fov * (Math.PI / 180);
      const distance = Math.abs(maxDim / Math.sin(fov / 2));
      return distance / (camera.position.distanceTo(boundingBox.getCenter(new THREE.Vector3())));
    },
    // 新增的相机动画方法
    animateCameraToPosition(targetPosition, targetLookAt, duration) {
      return new Promise((resolve) => {
        const startPosition = this.camera.position.clone();
        const startLookAt = this.controls.target.clone();
        const startTime = Date.now();

        const animate = () => {
          const now = Date.now();
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          
          // 使用缓动函数
          const easing = this.easeOutCubic(progress);
          
          // 插值相机位置
          this.camera.position.lerpVectors(
            startPosition,
            targetPosition,
            easing
          );
          
          // 插值观察目标
          this.controls.target.lerpVectors(
            startLookAt,
            targetLookAt,
            easing
          );
          
          this.controls.update();
          
          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            resolve();
          }
        };
        
        animate();
      });
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
    easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3);
    },
    switchToCachedModel(level) {
      if (this.model) {
        this.scene.remove(this.model);
      }
      
      this.model = this.modelCache[level];
      this.currentLevel = level;
      this.scene.add(this.model);
      this.resetModel();
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

      this.controls.addEventListener('start', () => {
        this.isUserRotating = true;
        this.lastUserInteraction = Date.now();
      });
      this.controls.addEventListener('end', () => {
        this.isUserRotating = false;
      });
    },
    
    selectNode(node) {
      this.resetHighlights();
      
      this.selectedNode = {
          name: node.name,
          data: node.userData.currentData || {}
      };
      
      node.material.emissive = new THREE.Color(0xffff00);
      node.material.emissiveIntensity = 0.5;
      this.highlightedNodes.push(node);

      const worldPosition = new THREE.Vector3();
      node.getWorldPosition(worldPosition);
      this.updatePanelPosition(worldPosition);
      // this.panelVisible = true;
    },
    
    updatePanelPosition(worldPosition) {
      const vector = worldPosition.clone();
      vector.project(this.camera);
      
      this.panelPosition.x = (vector.x * 0.5 + 0.5) * this.renderer.domElement.clientWidth;
      this.panelPosition.y = -(vector.y * 0.5 - 0.5) * this.renderer.domElement.clientHeight;
      
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
      if (this.$refs.container) {
          this.camera.aspect = this.$refs.container.clientWidth / this.$refs.container.clientHeight;
          this.camera.updateProjectionMatrix();
          this.renderer.setSize(
              this.$refs.container.clientWidth,
              this.$refs.container.clientHeight
          );
          // 重置视图以确保模型可见
          this.resetModel();
      }
    },
    
    startRendering() {
      const animate = () => {
          this.animationFrameId = requestAnimationFrame(animate);
          
          if (this.autoRotate && !this.isUserRotating && 
              Date.now() - this.lastUserInteraction > 1000) {
            this.controls.autoRotate = true;
          } else {
            this.controls.autoRotate = false;
          }
          
          this.controls.update();
          this.renderer.render(this.scene, this.camera);
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
    
    cleanup() {
      this.controls.removeEventListener('change', this.handleRotation);
      cancelAnimationFrame(this.animationFrameId);
      window.removeEventListener('resize', this.handleResize);
      
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
    },
    
    setupHoverEvents() {
      const dom = this.renderer.domElement;
      dom.addEventListener('mousemove', this.handleHover);
      dom.addEventListener('mouseout', this.handleMouseOut);
    },
    
    handleHover(event) {
      if (!this.model) return; // 确保模型已加载
      
      // 转换鼠标坐标
      const mouse = new THREE.Vector2(
        (event.clientX / this.renderer.domElement.clientWidth) * 2 - 1,
        -(event.clientY / this.renderer.domElement.clientHeight) * 2 + 1
      );
      
      // 射线检测
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, this.camera);
      
      // 只检测可见且可交互的对象
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
        
        // 更新提示框位置
        this.updateTooltipPosition(hoveredObj, event);
        this.tooltipVisible = true;
      } else {
        this.tooltipVisible = false;
      }
    },
    
    handleMouseOut() {
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
    
    findBuildingByName(buildingName) {
      let target = null;
      this.model.traverse(child => {
        if (child.name === buildingName && child.isObject3D) {
          target = child;
        }
      });
      return target;
    },

    setBuildingVisibility(building, isVisible) {
      building.visible = isVisible;
      building.children.forEach(child => {
        if (child.isObject3D || child.isMesh) {
          this.setBuildingVisibility(child, isVisible);
        }
      });
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
    toggleControls(enabled) {
      this.controls.enabled = enabled;
    },
    
    resetModel() {
      if (!this.model) return;
      if (this.modelCache[1]) {
        this.switchToCachedModel(1);
        
        // 计算模型包围盒
        const box = new THREE.Box3().setFromObject(this.model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        
        // 计算合适的相机位置
        const distance = maxDim * 1.5;
        
        // 设置相机位置
        this.camera.position.set(
          center.x,
          center.y + distance * 0.3,
          center.z + distance
        );
        
        // 设置目标点
        this.controls.target.copy(center);
        
        // 重置相机旋转
        this.camera.rotation.set(0, 0, 0);
        
        // 计算合适的缩放
        const fov = this.camera.fov * (Math.PI / 180);
        const fitZoom = maxDim / (2 * Math.tan(fov / 2) * this.camera.position.distanceTo(center));
        this.camera.zoom = fitZoom * 0.9; // 留出边距
        
        this.camera.updateProjectionMatrix();
        this.controls.update();
      } else {
        this.loadModel(MODEL_LEVELS[1].file, 1);
      }
    },
    
    printModelStructure() {
      console.group('模型结构');
      this.model.traverse(child => {
        console.log(
          `名称: ${child.name}, 类型: ${child.type}, ` +
          `可见: ${child.visible}, 子对象: ${child.children.length}`
        );
      });
      console.groupEnd();
    },
    
    toggleBuildingHelper() {
      if (this.buildingHelper) {
        this.scene.remove(this.buildingHelper);
        this.buildingHelper = null;
      } else if (this.model) {
        this.buildingHelper = new THREE.BoxHelper(this.model, 0xffff00);
        this.scene.add(this.buildingHelper);
      }
    },
    
    smoothLookAt(target) {
      return new Promise(resolve => {
        const startPos = this.camera.position.clone();
        const startTarget = this.controls.target.clone();
        const duration = 800;
        let startTime = null;

        const animate = timestamp => {
          if (!startTime) startTime = timestamp;
          const progress = Math.min((timestamp - startTime) / duration, 1);
          
          const easing = progress < 0.5 
            ? 2 * progress * progress 
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;
          
          this.camera.position.lerpVectors(
            startPos,
            target.clone().add(new THREE.Vector3(0, 30, 50)),
            easing
          );
          
          this.controls.target.lerpVectors(startTarget, target, easing);
          
          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            this.controls.target.copy(target);
            this.controls.update();
            resolve();
          }
        };
        
        requestAnimationFrame(animate);
      });
    }
  }
}
</script>

<style scoped>
.model-container {
  position: relative;
  width: 100%;
  height: 800px;
  border: 1px solid #eee;
  border-radius: 8px;
  overflow: hidden;
  z-index: 1;
}

.renderer-container {
  width: 100%;
  height: 100%;
  transform: translateZ(0);
}

.data-panel {
  position: absolute;
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
  bottom: 8px;
  left: 8px;
  z-index: 10;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-width: 80%;
}

.controls button {
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  white-space: nowrap;
}

.controls button:hover {
  background: #f0f0f0;
}

.controls button:active {
  background: #e0e0e0;
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
  background: rgba(30, 30, 30, 0.92);
  color: #fff;
  padding: 12px 16px;
  border-radius: 6px;
  pointer-events: none;
  z-index: 1000;
  font-size: 13px;
  max-width: 250px;
  transform: translate(15px, -50%);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
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

.controls::after {
  content: "左键旋转 | 滚轮缩放 | 右键平移";
  display: block;
  margin-top: 10px;
  font-size: 12px;
  color: #666;
}

.level-indicator {
  position: absolute;
  top: 5px;
  left: 5px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 5px 8px;
  border-radius: 4px;
  font-size: 14px;
  z-index: 10;
}
/* 添加这些样式确保模型可见 */
.renderer-container {
  background-color: #f0f0f0; /* 添加背景色便于调试 */
}

</style>
