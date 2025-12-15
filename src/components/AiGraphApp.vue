<template>
  <div class="ai-graph-app">
    <div class="ai-graph-header">
      <h2>{{ i18n.aiGraph }} - v{{ version }}</h2>
      <p>{{ i18n.aiGraphDescription }}</p>
    </div>
    
    <div class="ai-graph-content">
      <div class="ai-graph-controls">
        <button class="btn-primary" @click="generateGraph" :disabled="isGenerating">
          {{ isGenerating ? i18n.generatingGraph : i18n.generateGraph }}
        </button>
        <button class="btn-secondary" @click="exportGraph" :disabled="isGenerating">
          {{ i18n.exportGraph }}
        </button>
      </div>
      
      <div class="ai-graph-visualization">
        <!-- 知识图谱可视化区域 -->
        <div v-if="isGenerating" class="graph-loading">
          <div class="loading-spinner"></div>
          <p>{{ i18n.generatingGraph }}</p>
        </div>
        <div id="graph-container" class="graph-container" :style="{ display: graphData && !isGenerating ? 'block' : 'none' }"></div>
        <div v-if="!graphData && !isGenerating" class="graph-placeholder">
          {{ i18n.clickGenerateGraph }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { Graph } from '@antv/g6'
import { GraphAPIService } from '../api/graph-api'
import { DatabaseManager } from '../data/db/DatabaseManager'
import { workspaceDir } from '../Constants'

// 定义 props
interface Props {
  pluginInstance: any
  dialog: any
}

const props = defineProps<Props>()
const { pluginInstance, dialog } = props

// 响应式状态
const isGenerating = ref(false)
const version = ref('0.0.1')
const graphData = ref(null)
const graphInstance = ref(null)

// 获取国际化资源
const i18n = pluginInstance.i18n

// 初始化图数据服务
let graphAPIService: GraphAPIService | null = null

// 初始化服务
const initServices = async () => {
  try {
    // 初始化数据库管理器
    // 使用思源笔记的工作空间目录下的ai_graph.db文件
    const dbPath = `${workspaceDir}/ai_graph.db`
    const dbManager = new DatabaseManager(dbPath)
    
    // 初始化图数据服务
    graphAPIService = new GraphAPIService(dbManager)
  } catch (error) {
    console.error('Failed to initialize services:', error)
  }
}

// 生成知识图谱
const generateGraph = async () => {
  if (isGenerating.value || !graphAPIService) return
  
  isGenerating.value = true
  try {
    // 获取真实的图数据
    const data = await graphAPIService.getAllGraphData()
    
    graphData.value = data
    
    // 等待DOM更新后渲染图
    await nextTick()
    await renderGraph()
  } catch (error) {
    console.error('Error generating graph:', error)
    // TODO: 显示错误消息
  } finally {
    isGenerating.value = false
  }
}

// 渲染图
const renderGraph = async () => {
  try {
    // 添加更多的调试信息
    console.log('Checking graph data:')
    console.log('isGenerating:', isGenerating.value)
    console.log('graphData ref:', graphData.value)
    
    // 检查数据是否存在
    if (!graphData.value) {
      console.error('Graph data is not available')
      return
    }
    
    // 等待DOM更新后再查找容器元素
    await nextTick()
    
    // 尝试多种方式获取容器元素
    let containerElement = null;
    
    // 方式1: 通过ID查找
    containerElement = document.getElementById('graph-container')
    console.log('查找容器元素方式1 (by ID):', containerElement)
    
    // 方式2: 通过类名查找
    if (!containerElement) {
      const elements = document.getElementsByClassName('graph-container')
      if (elements.length > 0) {
        containerElement = elements[0]
        console.log('查找容器元素方式2 (by class):', containerElement)
      }
    }
    
    // 方式3: 通过querySelector查找
    if (!containerElement) {
      containerElement = document.querySelector('.graph-container')
      console.log('查找容器元素方式3 (by querySelector):', containerElement)
    }
    
    // 如果还是找不到，记录页面上的所有元素信息
    if (!containerElement) {
      console.error('Graph container element not found in DOM')
      console.log('Document body:', document.body.innerHTML.substring(0, 500) + '...')
      return
    }
    
    console.log('Found container element:', containerElement)
    
    // 销毁之前的图实例
    if (graphInstance.value) {
      graphInstance.value.destroy()
    }
    
    // 配置G6图实例
    const width = containerElement.offsetWidth || 800
    const height = containerElement.offsetHeight || 600
    
    console.log('Creating G6 graph with dimensions:', width, height)
    
    // 使用导入的Graph类创建实例
    graphInstance.value = new Graph({
      container: containerElement,
      width,
      height,
      layout: {
        type: 'force',
        preventOverlap: true,
        linkDistance: 150,
        nodeStrength: -30,
        edgeStrength: 0.1,
      },
      defaultNode: {
        type: 'circle',
        size: 40,
        style: {
          fill: '#409EFF',
          stroke: '#409EFF',
        },
        labelCfg: {
          position: 'bottom',
          style: {
            fill: '#333',
            fontSize: 12,
          },
        },
      },
      defaultEdge: {
        type: 'line',
        style: {
          stroke: '#ccc',
          endArrow: {
            path: 'M 0,0 L 8,4 L 8,-4 Z',
            fill: '#ccc',
          },
        },
      },
      nodeStateStyles: {
        hover: {
          fill: '#409EFF',
          stroke: '#409EFF',
        },
      },
      edgeStateStyles: {
        hover: {
          stroke: '#409EFF',
        },
      },
      modes: {
        default: ['drag-canvas', 'zoom-canvas', 'drag-node'],
      },
    })
    
    // 加载数据
    graphInstance.value.data(graphData.value)
    
    // 渲染图
    graphInstance.value.render()
    
    // 添加调试日志
    console.log('Graph rendered with data:', graphData.value)
  } catch (error) {
    console.error('Error creating or rendering G6 graph:', error)
  }
}

// 导出知识图谱
const exportGraph = () => {
  console.log('Exporting knowledge graph...')
  // TODO: 实现知识图谱导出逻辑
  // 可以导出为JSON、图片或其他格式
  if (graphInstance.value) {
    // 示例：导出为JSON格式
    const graphData = graphInstance.value.save(); // G6的save方法
    const jsonData = JSON.stringify(graphData, null, 2);
    
    // 创建下载链接
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'knowledge-graph-data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// 组件挂载时的初始化
onMounted(() => {
  console.log('AiGraphApp mounted')
  // 初始化版本信息
  try {
    version.value = pluginInstance.version || '0.0.1'
  } catch (e) {
    console.error('Failed to get version:', e)
  }
  
  // 初始化服务
  initServices()
  
  // 添加窗口大小变化监听器
  const handleResize = () => {
    // 尝试多种方式获取容器元素
    let containerElement = document.getElementById('graph-container') || 
                          document.querySelector('.graph-container')
    
    if (graphInstance.value && containerElement) {
      graphInstance.value.changeSize(
        containerElement.offsetWidth || 800,
        containerElement.offsetHeight || 600
      )
    }
  }
  
  window.addEventListener('resize', handleResize)
  
  // 组件卸载时清理事件监听器
  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
  })
})

// 组件卸载时的清理
onUnmounted(() => {
  console.log('AiGraphApp unmounted')
  // 清理资源
  if (graphInstance.value) {
    graphInstance.value.destroy()
  }
})
</script>

<style scoped lang="stylus">
.ai-graph-app
  width 100%
  height 100%
  display flex
  flex-direction column
  background-color var(--b3-theme-background)
  color var(--b3-theme-on-background)

.ai-graph-header
  padding 16px 24px
  border-bottom 1px solid var(--b3-border-color)
  background-color var(--b3-theme-surface)

  h2
    margin 0 0 8px 0
    font-size 20px
    font-weight 600
    color var(--b3-theme-primary)

  p
    margin 0
    font-size 14px
    color var(--b3-theme-on-surface-variant)

.ai-graph-content
  flex 1
  display flex
  flex-direction column
  padding 24px
  overflow hidden

.ai-graph-controls
  display flex
  gap 12px
  margin-bottom 24px

.btn-primary,
.btn-secondary
  padding 8px 16px
  border none
  border-radius 4px
  font-size 14px
  cursor pointer
  transition all 0.2s ease

.btn-primary
  background-color var(--b3-theme-primary)
  color white

  &:hover
    background-color var(--b3-theme-primary-light)
  
  &:disabled
    opacity 0.6
    cursor not-allowed

.btn-secondary
  background-color var(--b3-theme-surface)
  color var(--b3-theme-on-surface)
  border 1px solid var(--b3-border-color)

  &:hover
    background-color var(--b3-theme-hover)
  
  &:disabled
    opacity 0.6
    cursor not-allowed

.ai-graph-visualization
  flex 1
  display flex
  flex-direction column
  background-color var(--b3-theme-surface)
  border-radius 8px
  border 1px solid var(--b3-border-color)
  overflow hidden

.graph-placeholder,
.graph-loading
  display flex
  flex-direction column
  align-items center
  justify-content center
  padding 48px
  color var(--b3-theme-on-surface-variant)

.graph-loading
  gap 16px

.loading-spinner
  width 40px
  height 40px
  border 4px solid var(--b3-border-color)
  border-top 4px solid var(--b3-theme-primary)
  border-radius 50%
  animation spin 1s linear infinite

@keyframes spin
  0%
    transform rotate(0deg)
  100%
    transform rotate(360deg)

.graph-container
  flex 1
  width 100%
  height 100%
</style>
