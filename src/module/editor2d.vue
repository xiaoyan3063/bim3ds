<template>
    <div class="config-editor">
      <!-- 顶部工具栏 -->
      <div class="toolbar">
        <div class="toolbar-left">
          <el-button-group>
            <el-button size="small" @click="addEquipment('pump')" title="添加泵">
              <img src="@/assets/images/pump.png" class="tool-icon" alt="泵">
            </el-button>
            <el-button size="small" @click="addEquipment('valve')" title="添加阀门">
              <img src="@/assets/images/valve.png" class="tool-icon" alt="阀门">
            </el-button>
            <el-button size="small" @click="addEquipment('tank')" title="添加储罐">
              <img src="@/assets/images/tank.png" class="tool-icon" alt="储罐">
            </el-button>
            <el-button size="small" @click="addEquipment('sensor')" title="添加传感器">
              <img src="@/assets/images/sensor.png" class="tool-icon" alt="传感器">
            </el-button>
          </el-button-group>
  
          <el-button-group>
            <el-button size="small" @click="undo" :disabled="!canUndo" title="撤销 (Ctrl+Z)">
              <i class="el-icon-refresh-left"></i>
            </el-button>
            <el-button size="small" @click="redo" :disabled="!canRedo" title="重做 (Ctrl+Y)">
              <i class="el-icon-refresh-right"></i>
            </el-button>
          </el-button-group>
  
          <el-button-group>
            <el-button size="small" @click="clearAll" title="清空画布">
              <i class="el-icon-delete"></i>
            </el-button>
          </el-button-group>
        </div>
  
        <div class="toolbar-right">
          <el-button-group>
            <el-button size="small" @click="exportToPNG" title="导出PNG">
              <i class="el-icon-picture"></i> PNG
            </el-button>
            <el-button size="small" @click="exportToJSON" title="导出JSON">
              <i class="el-icon-download"></i> JSON
            </el-button>
            <el-upload
              action=""
              :show-file-list="false"
              :before-upload="importFromJSON"
              accept=".json"
            >
              <el-button size="small" title="导入JSON">
                <i class="el-icon-upload2"></i> JSON
              </el-button>
            </el-upload>
          </el-button-group>
        </div>
      </div>
  
      <!-- 主体内容 -->
    <div class="editor-body">
        <!-- 左侧设备库 -->
      <div class="library-panel">
        <el-input
          v-model="searchText"
          size="small"
          placeholder="搜索设备..."
          prefix-icon="el-icon-search"
          clearable
        ></el-input>
  
        <el-collapse v-model="activeCategories" accordion>
          <el-collapse-item
            v-for="category in filteredCategories"
            :key="category.name"
            :name="category.name"
            :title="category.name"
          >
            <div class="equipment-list">
              <div
                v-for="item in category.items"
                :key="item.type"
                class="equipment-item"
                draggable="true"
                @dragstart="onDragStart($event, item.type)"
                @click="addEquipment(item.type)"
                :title="item.label"
              >
                <img :src="item.image" class="equipment-icon">
                <span class="equipment-label">{{ item.label }}</span>
              </div>
            </div>
          </el-collapse-item>
        </el-collapse>
      </div>
  
      <!-- 主画布区域 -->
      <div class="main-content">
        <div id="paper" class="paper-container"></div>
      </div>
  
      <!-- 右侧属性面板 -->
      <div class="property-panel" >
        <div class="property-header">
          <h5>属性设置</h5>
          <!-- <el-button size="mini" icon="el-icon-close" @click="closePropertyPanel"></el-button> -->
        </div>
  
        <el-form label-width="80px" size="small" v-if="selectedElement">
          <el-form-item label="设备类型">
            <el-input v-model="selectedElement.type" disabled></el-input>
          </el-form-item>
          <el-form-item label="设备名称">
            <el-input v-model="selectedElement.name"></el-input>
          </el-form-item>
          <el-form-item label="设备ID">
            <el-input v-model="selectedElement.id" disabled></el-input>
          </el-form-item>
          
          <!-- 动态属性 -->
          <template v-for="(value, key) in selectedElement.customProps">
            <el-form-item :label="key" :key="key">
              <el-input v-model="selectedElement.customProps[key]"></el-input>
            </el-form-item>
          </template>
  
          <el-form-item label="添加属性">
            <div class="add-property">
              <el-input v-model="newPropKey" placeholder="属性名" style="width: 100px"></el-input>
              <el-input v-model="newPropValue" placeholder="属性值" style="width: 100px"></el-input>
              <el-button @click="addCustomProperty">添加</el-button>
            </div>
          </el-form-item>
  
          <el-form-item label="连线样式" v-if="isLinkSelected">
            <el-color-picker v-model="selectedElement.color" @change="updateLinkStyle"></el-color-picker>
            <el-select v-model="selectedElement.lineType" @change="updateLinkStyle" style="margin-left: 10px;">
              <el-option label="实线" value="solid"></el-option>
              <el-option label="虚线" value="dashed"></el-option>
            </el-select>
            <el-input-number
              v-model="selectedElement.width"
              :min="1"
              :max="10"
              @change="updateLinkStyle"
              style="margin-left: 10px;"
            ></el-input-number>
          </el-form-item>
        </el-form>
      </div>
    </div>
      
    </div>
  </template>
  
  <script>
  import { dia, shapes, util } from 'jointjs'
  import 'jointjs/dist/joint.css'
  import $ from 'jquery'
  import { debounce, throttle } from 'lodash'
  import { saveAs } from 'file-saver'
  import html2canvas from 'html2canvas'

  // 初始化 joint 对象
    const joint = { dia, shapes, util }
    window.joint = joint

    // 自定义形状定义
    const defineCustomShapes = () => {
    joint.shapes.custom = joint.shapes.custom || {}
    
    joint.shapes.custom.Equipment = joint.shapes.standard.Image.extend({
        defaults: joint.util.deepSupplement({
        type: 'custom.Equipment',
        attrs: {
            image: { 'xlink:href': '' },
            label: { text: '', fill: '#333', fontSize: 12, fontWeight: 'bold' },
            body: { stroke: '#333', strokeWidth: 2 }
        }
        }, joint.shapes.standard.Image.prototype.defaults)
    })
    }
  
  export default {
    name: 'ConfigEditor',
    data() {
      return {
        graph: null,
        paper: null,
        commandManager: null,
        searchText: '',
        activeCategories: ['process'],
        selectedElement: null,
        isLinkSelected: false,
        newPropKey: '',
        newPropValue: '',
        canUndo: false,
        canRedo: false,
        equipmentCategories: [
          {
            name: '工艺设备',
            items: [
              { type: 'pump', label: '离心泵', image: require('@/assets/images/pump.png') },
              { type: 'valve', label: '控制阀', image: require('@/assets/images/valve.png') },
              { type: 'tank', label: '储罐', image: require('@/assets/images/tank.png') },
              { type: 'reactor', label: '反应器', image: require('@/assets/images/reactor.png') }
            ]
          },
          {
            name: '仪表设备',
            items: [
              { type: 'sensor', label: '传感器', image: require('@/assets/images/sensor.png') },
              { type: 'flowmeter', label: '流量计', image: require('@/assets/images/flowmeter.png') },
              { type: 'pressure', label: '压力表', image: require('@/assets/images/pressure.png') },
              { type: 'temperature', label: '温度计', image: require('@/assets/images/temperature.png') }
            ]
          },
          {
            name: '电气设备',
            items: [
              { type: 'motor', label: '电动机', image: require('@/assets/images/motor.png') },
              { type: 'generator', label: '发电机', image: require('@/assets/images/generator.png') },
              { type: 'transformer', label: '变压器', image: require('@/assets/images/transformer.png') }
            ]
          }
        ],
        equipmentProperties: {
          pump: { flowRate: '100 m³/h', pressure: '1.0 MPa' },
          valve: { type: '球阀', diameter: 'DN50' },
          tank: { capacity: '5000 L', material: '不锈钢' },
          sensor: { type: 'PT100', range: '0-200°C' }
        }
      }
    },
    computed: {
      filteredCategories() {
        if (!this.searchText) return this.equipmentCategories
        
        return this.equipmentCategories.map(category => {
          return {
            ...category,
            items: category.items.filter(item => 
              item.label.toLowerCase().includes(this.searchText.toLowerCase()) ||
              item.type.toLowerCase().includes(this.searchText.toLowerCase())
            )
          }
        }).filter(category => category.items.length > 0)
      }
    },
    beforeDestroy() {
        window.removeEventListener('resize', this.handleResize);
    },
    mounted() {
        this.$nextTick(() => {
            this.initEditor()
            this.initKeyboardShortcuts()
        })
    },
    methods: {
      initEditor() {
        // 确保自定义形状已定义
        defineCustomShapes()
        
        // 双重确保 shapes 存在
        if (!joint.shapes.standard) {
            joint.shapes.standard = joint.shapes.standard || {}
        }

        // 确保画布有明确尺寸
        const paperEl = document.getElementById('paper');
        paperEl.style.width = '100%';
        paperEl.style.height = 'calc(100vh - 100px)';
  
        // 创建图形
        this.graph = new joint.dia.Graph({}, { 
            cellNamespace: { 
            ...joint.shapes,
            standard: joint.shapes.standard 
            } 
        })
        
        // 初始化命令管理器 (用于撤销/重做)
        // this.initCommandManager()
        
        // 创建画布
        this.paper = new joint.dia.Paper({
          el: paperEl,
          width: paperEl.clientWidth,
          height: paperEl.clientHeight,
          gridSize: 10,
          model: this.graph,
          cellViewNamespace: joint.shapes,
          snapLinks: true,
          linkPinning: false,
          defaultLink: new joint.shapes.standard.Link(),
          defaultConnectionPoint: { name: 'boundary' },
          interactive: {
            linkMove: false,
            elementMove: true,
            arrowheadMove: true,
            vertexMove: true,
            vertexAdd: true,
            vertexRemove: true,
            useLinkTools: true
          },
          async: true, // 启用异步渲染提高性能
          frozen: false,
          background: {
            color: '#f5f5f5',
            image: null
          },
          markAvailable: true
        })
        
        // 启用元素选择和连接功能
        this.enableLinking()
        
        // 设置元素选择事件
        this.setupSelectionHandling()
        
        // 设置性能优化相关事件
        this.setupPerformanceOptimizations()

        // 拖拽放置处理
        // 拖拽视觉反馈
        paperEl.addEventListener('dragenter', (e) => {
            e.preventDefault()
            paperEl.classList.add('drag-over')
        })
        
        paperEl.addEventListener('dragover', (e) => {
            e.preventDefault()
            e.dataTransfer.dropEffect = 'copy'
        })
        
        paperEl.addEventListener('dragleave', (e) => {
            e.preventDefault()
            paperEl.classList.remove('drag-over')
        })
        
        paperEl.addEventListener('drop', (e) => {
            e.preventDefault()
            paperEl.classList.remove('drag-over')
            
            const type = e.dataTransfer.getData('text/plain')
            if (type) {
                const rect = paperEl.getBoundingClientRect()
                const x = e.clientX - rect.left
                const y = e.clientY - rect.top
                this.addEquipment(type, x, y)
            }
        })

        // 添加窗口大小变化监听
        window.addEventListener('resize', this.handleResize);
      },
      getEventPosition(event) {
            const paperOffset = $(this.paper.el).offset()
            return {
            x: event.clientX - paperOffset.left,
            y: event.clientY - paperOffset.top
            }
        },
      handleResize: debounce(function() {
            const paperEl = document.getElementById('paper');
            this.paper.setDimensions(
            paperEl.clientWidth,
            paperEl.clientHeight
            );
        }, 100),
      
      // 初始化命令管理器 (撤销/重做)
    //   initCommandManager() {
    //     this.commandManager = new joint.dia.CommandManager({
    //       graph: this.graph,
    //       cmdBeforeAdd: (cmdName, cell, graph, options) => {
    //         // 在命令执行前可以做一些处理
    //         return true
    //       }
    //     })
        
    //     // 监听命令管理器状态变化
    //     this.graph.on('change:position change:source change:target add remove', () => {
    //       this.updateUndoRedoState()
    //     })
    //   },
      
      // 更新撤销/重做按钮状态
      updateUndoRedoState: debounce(function() {
        this.canUndo = this.commandManager.canUndo()
        this.canRedo = this.commandManager.canRedo()
      }, 100),
      
      // 撤销操作
      undo() {
        if (this.commandManager.canUndo()) {
          this.commandManager.undo()
        }
      },
      
      // 重做操作
      redo() {
        if (this.commandManager.canRedo()) {
          this.commandManager.redo()
        }
      },
      
      // 设置键盘快捷键
      initKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
          if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
              case 'z':
                if (e.shiftKey) this.redo()
                else this.undo()
                e.preventDefault()
                break
              case 'y':
                this.redo()
                e.preventDefault()
                break
              case 'delete':
                this.removeSelected()
                e.preventDefault()
                break
            }
          }
        })
      },
      
      // 删除选中元素
      removeSelected() {
        if (this.selectedElement) {
          const cell = this.graph.getCell(this.selectedElement.id)
          if (cell) cell.remove()
          this.selectedElement = null
        }
      },
      
      // 启用连接功能
      enableLinking() {
        const link = new joint.shapes.standard.Link()
        link.attr({
          line: {
            stroke: '#333',
            strokeWidth: 2,
            strokeDasharray: '0',
            targetMarker: {
              'type': 'path',
              'd': 'M 10 -5 0 0 10 5 z'
            }
          },
          labels: [
            {
              position: 0.5,
              attrs: {
                text: {
                  text: '',
                  fill: '#333',
                  fontSize: 12
                },
                rect: {
                  fill: 'white',
                  stroke: 'none',
                  rx: 3,
                  ry: 3
                }
              }
            }
          ]
        })
        
        // 双击连线可以编辑文本
        link.on('dblclick', (evt, linkView) => {
          const labelIndex = 0
          const label = linkView.model.label(labelIndex)
          const labelText = label ? label.attrs.text.text : ''
          
          const input = document.createElement('input')
          input.type = 'text'
          input.value = labelText
          input.style.position = 'absolute'
          input.style.top = `${evt.clientY}px`
          input.style.left = `${evt.clientX}px`
          input.style.zIndex = '1000'
          
          document.body.appendChild(input)
          input.focus()
          
          const onBlur = () => {
            linkView.model.label(labelIndex, {
              attrs: {
                text: { text: input.value }
              }
            })
            document.body.removeChild(input)
          }
          
          input.addEventListener('blur', onBlur)
          input.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
              onBlur()
            }
          })
        })
        
        this.paper.on('blank:pointerdown', (evt, x, y) => {
          link.source({ x: x, y: y })
          link.target({ x: x, y: y })
          link.addTo(this.graph)
          
          const onPointerMove = throttle((evt, x, y) => {
            link.target({ x: x, y: y })
          }, 16) // 限制为60fps
          
          const onPointerUp = () => {
            this.paper.off('cell:pointermove', onPointerMove)
            this.paper.off('cell:pointerup', onPointerUp)
          }
          
          this.paper.on('cell:pointermove', onPointerMove)
          this.paper.on('cell:pointerup', onPointerUp)
        })
        
        this.paper.on('element:pointerdown', (elementView, evt, x, y) => {
          link.source(elementView.model)
          link.target({ x: x, y: y })
          link.addTo(this.graph)
          
          const onPointerMove = throttle((evt, x, y) => {
            link.target({ x: x, y: y })
          }, 16) // 限制为60fps
          
          const onPointerUp = (targetElementView) => {
            this.paper.off('cell:pointermove', onPointerMove)
            this.paper.off('cell:pointerup', onPointerUp)
            
            if (targetElementView && targetElementView.model !== link.source()) {
              link.target(targetElementView.model)
            } else {
              link.remove()
            }
          }
          
          this.paper.on('cell:pointermove', onPointerMove)
          this.paper.on('cell:pointerup', onPointerUp)
        })
      },
      
      // 设置元素选择处理
      setupSelectionHandling() {
        this.paper.on('element:pointerclick', (elementView) => {
          const model = elementView.model
          this.selectedElement = {
            id: model.id,
            type: model.get('type') || 'equipment',
            name: model.attr('label/text') || '',
            customProps: model.get('customProps') || {}
          }
          
          if (model.isLink()) {
            this.isLinkSelected = true
            this.selectedElement = {
              ...this.selectedElement,
              color: model.attr('line/stroke') || '#333',
              width: model.attr('line/strokeWidth') || 2,
              lineType: model.attr('line/strokeDasharray') === '5,5' ? 'dashed' : 'solid'
            }
          } else {
            this.isLinkSelected = false
          }
        })
        
        this.paper.on('blank:pointerclick', () => {
          this.selectedElement = null
        })
      },
      
      // 设置性能优化相关
      setupPerformanceOptimizations() {
        // 虚拟滚动处理
        this.paper.on('render:done', throttle(() => {
          // 可以在这里实现虚拟滚动逻辑
          // 只渲染视口内的元素
        }, 100))
        
        // 冻结/解冻处理
        let freezeTimeout
        this.paper.on('element:pointerdown', () => {
          clearTimeout(freezeTimeout)
          this.paper.freeze()
        })
        
        this.paper.on('element:pointerup', () => {
          freezeTimeout = setTimeout(() => {
            this.paper.unfreeze()
          }, 500)
        })
      },
     
    addEquipment(type, x, y) {
        const item = this.equipmentCategories
            .flatMap(c => c.items)
            .find(i => i.type === type)
        if (!item) return
        
        const shape = new joint.shapes.custom.Equipment()
        shape.resize(60, 60)
        shape.attr({
        image: { 'xlink:href': item.image },
        label: { text: item.label, fill: '#333' }
        })
        
        // 设置位置
        const position = this.validatePosition(x, y)
        shape.position(position.x, position.y)
        
        shape.set('type', type)
        shape.set('customProps', { ...this.equipmentProperties[type] || {} })
        
        shape.addTo(this.graph)
        return shape
    },
    
    validatePosition(x, y) {
        if (isNaN(x) || isNaN(y)) {
        return this.getRandomPosition()
        }
        
        const padding = 10
        return {
        x: Math.max(padding, Math.min(x, this.paper.options.width - padding)),
        y: Math.max(padding, Math.min(y, this.paper.options.height - padding))
        }
    },

    getRandomPosition() {
        const padding = 50
        return {
        x: padding + Math.random() * (this.paper.options.width - 2 * padding),
        y: padding + Math.random() * (this.paper.options.height - 2 * padding)
        }
    },
      getValidPosition() {
            const padding = 50;
            return {
            x: padding + Math.random() * (this.paper.options.width - 2 * padding),
            y: padding + Math.random() * (this.paper.options.height - 2 * padding)
            };
        },
      
      // 拖拽开始处理
      onDragStart(event, type) {
        event.dataTransfer.setData('text/plain', type)
        event.dataTransfer.effectAllowed = 'copy'
        
        // 设置拖拽预览图像
        const img = new Image()
        const item = this.equipmentCategories
        .flatMap(c => c.items)
        .find(i => i.type === type)
        
        if (item && item.image) {
        img.src = item.image
        event.dataTransfer.setDragImage(img, 30, 30)
        }
      },
      
      // 清空画布
      clearAll() {
        this.$confirm('确定要清空画布吗?', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }).then(() => {
          this.graph.clear()
          this.selectedElement = null
        }).catch(() => {})
      },
      
      // 关闭属性面板
      closePropertyPanel() {
        this.selectedElement = null
      },
      
      // 添加自定义属性
      addCustomProperty() {
        if (!this.newPropKey.trim() || !this.selectedElement) return
        
        this.$set(this.selectedElement.customProps, this.newPropKey, this.newPropValue)
        
        const cell = this.graph.getCell(this.selectedElement.id)
        if (cell) {
          const customProps = cell.get('customProps') || {}
          customProps[this.newPropKey] = this.newPropValue
          cell.set('customProps', customProps)
        }
        
        this.newPropKey = ''
        this.newPropValue = ''
      },
      
      // 更新连线样式
      updateLinkStyle() {
        if (!this.selectedElement || !this.isLinkSelected) return
        
        const link = this.graph.getCell(this.selectedElement.id)
        if (link) {
          link.attr({
            line: {
              stroke: this.selectedElement.color,
              strokeWidth: this.selectedElement.width,
              strokeDasharray: this.selectedElement.lineType === 'dashed' ? '5,5' : '0'
            }
          })
        }
      },
      
      // 导出为PNG
      exportToPNG() {
        const paperElement = document.getElementById('paper')
        
        // 临时隐藏所有工具和选择框
        const tools = paperElement.querySelectorAll('.joint-tool, .joint-highlight-stroke')
        tools.forEach(tool => tool.style.display = 'none')
        
        html2canvas(paperElement, {
          backgroundColor: '#f5f5f5',
          scale: 2,
          logging: false,
          useCORS: true
        }).then(canvas => {
          // 恢复显示工具
          tools.forEach(tool => tool.style.display = '')
          
          canvas.toBlob(blob => {
            saveAs(blob, `工艺图_${new Date().toISOString().slice(0, 10)}.png`)
          })
        })
      },
      
      // 导出为JSON
      exportToJSON() {
        const json = this.graph.toJSON()
        const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' })
        saveAs(blob, `工艺图_${new Date().toISOString().slice(0, 10)}.json`)
      },
      
      // 从JSON导入
      importFromJSON(file) {
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const json = JSON.parse(e.target.result)
            this.graph.fromJSON(json)
            this.$message.success('导入成功')
          } catch (err) {
            this.$message.error('导入失败: 文件格式不正确')
          }
        }
        reader.readAsText(file)
        return false // 阻止默认上传行为
      }
    }
  }
  </script>
  
  <style scoped>
  .config-editor {
    width: 100%;
    height: calc(100vh - 100px);
    display: flex;
    flex-direction: column;
    background-color: #f0f2f5;
  }
  
  .toolbar {
    padding: 8px 16px;
    background: #fff;
    border-bottom: 1px solid #e6e6e6;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
    z-index: 10;
  }
  
  .toolbar-left, .toolbar-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .tool-icon {
    width: 20px;
    height: 20px;
    object-fit: contain;
  }
  .editor-body {
    display: flex;
    flex: 1;
    height: calc(100vh - 120px);
  }
  .library-panel {
    width: 250px;
    background: #fff;
    border-right: 1px solid #e6e6e6;
    height: calc(100vh - 120px);
    /* overflow-y: auto; */
    padding: 10px;
    box-shadow: 1px 0 4px rgba(0, 0, 0, 0.1);
  }
  .main-content {
    flex: 1;
    display: flex;
    position: relative;
    height: calc(100vh - 120px);
  }

  .property-panel {
    width: 300px;
    background: #fff;
    border-left: 1px solid #e6e6e6;
    height: calc(100vh - 120px);
    overflow-y: auto;
    padding: 10px;
    box-shadow: -1px 0 4px rgba(0, 0, 0, 0.1);
  }
  
  .equipment-list {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
  
  .equipment-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8px;
    border: 1px solid #e6e6e6;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .equipment-item:hover {
    background-color: #f5f7fa;
    border-color: #c0c4cc;
  }
  
  .equipment-icon {
    width: 40px;
    height: 40px;
    object-fit: contain;
    margin-bottom: 4px;
  }
  
  .equipment-label {
    font-size: 12px;
    text-align: center;
    word-break: break-all;
  }
  
  
  .paper-container {
    flex: 1;
    background-color: #fff;
    overflow: hidden;
  }
  
  
  
  .property-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 1px solid #e6e6e6;
  }
  
  .add-property {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  
  /* JointJS 画布样式调整 */
  .joint-paper {
    background-color: #f5f5f5;
    background-image: linear-gradient(#e6e6e6 1px, transparent 1px),
                      linear-gradient(90deg, #e6e6e6 1px, transparent 1px);
    background-size: 20px 20px;
  }
  
  .joint-highlight-stroke {
    stroke: #1890ff !important;
    stroke-width: 2px !important;
  }
  </style>