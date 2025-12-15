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
import { DatabaseManagerAdapter } from '../data/db/DatabaseManagerAdapter'
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
    // 对于Electron环境，使用IndexedDB作为平滑过渡方案
    const dbManager = new DatabaseManagerAdapter("indexeddb")    
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
    // 新版数据
    const data = {
      tokens: [
        { text: '张三', start: 0, end: 2, type: 'chinese', source: 'llm' },
        { text: '是', start: 2, end: 3, type: 'chinese', source: 'llm' },
        { text: '李四', start: 3, end: 5, type: 'chinese', source: 'llm' },
        { text: '的', start: 5, end: 6, type: 'chinese', source: 'llm' },
        { text: '同事', start: 6, end: 8, type: 'chinese', source: 'llm' },
        { text: '，', start: 8, end: 9, type: 'punctuation', source: 'llm' },
        { text: '他们', start: 9, end: 11, type: 'chinese', source: 'llm' },
        { text: '都', start: 11, end: 12, type: 'chinese', source: 'llm' },
        { text: '在', start: 12, end: 13, type: 'chinese', source: 'llm' },
        {
          text: '阿里巴巴',
          start: 13,
          end: 17,
          type: 'chinese',
          source: 'llm'
        },
        { text: '工作', start: 17, end: 19, type: 'chinese', source: 'llm' },
        {
          text: '。',
          start: 19,
          end: 20,
          type: 'punctuation',
          source: 'llm'
        }
      ],
      entities: [
        {
          id: 1,
          name: '张三',
          type: '人名',
          docId: 'test_doc_id_2',
          startPos: 0,
          endPos: 2,
          source: 'llm',
          confidence: 0.9,
          properties: undefined
        },
        {
          id: 2,
          name: '李四',
          type: '人名',
          docId: 'test_doc_id_2',
          startPos: 3,
          endPos: 5,
          source: 'llm',
          confidence: 0.9,
          properties: undefined
        },
        {
          id: 3,
          name: '阿里巴巴',
          type: '组织名',
          docId: 'test_doc_id_2',
          startPos: 10,
          endPos: 14,
          source: 'llm',
          confidence: 0.9,
          properties: undefined
        }
      ],
      relationships: [
        {
          sourceEntityId: 1,
          targetEntityId: 2,
          type: 'cooccur',
          docId: 'test_doc_id_2',
          confidence: 0.5,
          source: 'cooccur',
          evidenceText: '张三是李四的同事，他们都在阿里巴巴工作'
        },
        {
          sourceEntityId: 1,
          targetEntityId: 3,
          type: 'cooccur',
          docId: 'test_doc_id_2',
          confidence: 0.5,
          source: 'cooccur',
          evidenceText: '张三是李四的同事，他们都在阿里巴巴工作'
        },
        {
          sourceEntityId: 2,
          targetEntityId: 3,
          type: 'cooccur',
          docId: 'test_doc_id_2',
          confidence: 0.5,
          source: 'cooccur',
          evidenceText: '张三是李四的同事，他们都在阿里巴巴工作'
        },
        {
          sourceEntityId: 1,
          targetEntityId: 2,
          type: 'associate',
          docId: 'test_doc_id_2',
          confidence: 0.9,
          source: 'llm',
          evidenceText: '张三是李四的同事'
        },
        {
          sourceEntityId: 1,
          targetEntityId: 3,
          type: 'belong_to',
          docId: 'test_doc_id_2',
          confidence: 0.9,
          source: 'llm',
          evidenceText: '他们都在阿里巴巴工作'
        },
        {
          sourceEntityId: 2,
          targetEntityId: 3,
          type: 'belong_to',
          docId: 'test_doc_id_2',
          confidence: 0.9,
          source: 'llm',
          evidenceText: '他们都在阿里巴巴工作'
        }
      ]
    }
    
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
        type: 'dagre',   // 使用 dagre 布局算法
        rankdir: 'LR',   // 改为从左到右的布局方向（水平布局）
        nodesep: 80,     // 增加节点间水平间距
        ranksep: 90,     // 增加节点间垂直间距
      },
      defaultNode: {
        type: 'circle',
        size: 70,        // 增大节点尺寸
        style: {
          // 使用 Ant Design 的主色调
          fill: '#1890ff',
          stroke: '#40a9ff',
          lineWidth: 2,
          // 添加阴影效果
          shadowColor: 'rgba(0, 0, 0, 0.15)',
          shadowBlur: 6,
          shadowOffsetX: 2,
          shadowOffsetY: 2,
        },
        labelCfg: {
          position: 'bottom',
          style: {
            fill: 'rgba(0, 0, 0, 0.85)',
            fontSize: 16,
            fontFamily: 'Chinese Quote, -apple-system, BlinkMacSystemFont, Segoe UI, PingFang SC, Hiragino Sans GB, Microsoft YaHei, Helvetica Neue, Helvetica, Arial, sans-serif',
            fontWeight: 500,
          },
        },
      },
      defaultEdge: {
        type: 'quadratic',  // 使用二次贝塞尔曲线使连接线更流畅
        style: {
          stroke: '#91d5ff',   // 使用 Ant Design 的蓝色系
          lineWidth: 2,
          // 添加阴影效果
          shadowColor: 'rgba(0, 0, 0, 0.08)',
          shadowBlur: 4,
          shadowOffsetX: 1,
          shadowOffsetY: 1,
        },
        markerEnd: {
          path: 'M 0,0 L 12,6 L 12,-6 Z',
          fill: '#1890ff',
          stroke: '#1890ff',
          lineWidth: 1,
        },
        labelCfg: {
          autoRotate: true,
          style: {
            fontFamily: 'Chinese Quote, -apple-system, BlinkMacSystemFont, Segoe UI, PingFang SC, Hiragino Sans GB, Microsoft YaHei, Helvetica Neue, Helvetica, Arial, sans-serif',
            fontSize: 14,
            fill: 'rgba(0, 0, 0, 0.65)',
            background: {
              fill: '#ffffff',
              stroke: '#d9d9d9',
              padding: [4, 6, 4, 6],
              radius: 4,
            },
          },
        },
      },
      nodeStateStyles: {
        hover: {
          fill: '#40a9ff',
          stroke: '#1890ff',
          lineWidth: 3,
          // 悬停时增强阴影效果
          shadowBlur: 10,
          shadowOffsetX: 3,
          shadowOffsetY: 3,
        },
      },
      edgeStateStyles: {
        hover: {
          lineWidth: 3,
          stroke: '#1890ff',
          // 悬停时增强阴影效果
          shadowBlur: 6,
          shadowOffsetX: 2,
          shadowOffsetY: 2,
        },
      },
      modes: {
        default: ['drag-canvas', 'zoom-canvas', 'drag-node'],
      },
      // 添加处理平行边的转换
      transforms: [
        {
          type: 'process-parallel-edges',
          mode: 'bundle',
          distance: 80,
          loopDistance: 80,
        },
      ],
    })
    
    // 转换数据格式以适配 G6
    const g6Data = transformDataToG6Format(graphData.value)
    
    // 检查数据是否有效
    if (!g6Data || !g6Data.nodes || !g6Data.edges) {
      console.error('Invalid G6 data structure:', g6Data)
      return
    }
    
    // 加载数据
    graphInstance.value.data(g6Data)
    
    // 渲染图
    graphInstance.value.render()
    
    // 渲染完成后再次检查
    setTimeout(() => {
      console.log('Graph items after render:');
      console.log('Nodes count:', graphInstance.value.getNodes().length);
      console.log('Edges count:', graphInstance.value.getEdges().length);
    }, 100);
  } catch (error) {
    console.error('Error creating or rendering G6 graph:', error)
  }
}

// 转换数据格式以适配 G6
const transformDataToG6Format = (data) => {
  // 创建节点映射
  const nodeMap = new Map()
  const nodes = []
  const edges = []
  
  // 处理实体节点
  if (data.entities && Array.isArray(data.entities)) {
    data.entities.forEach(entity => {
      // 确保 entity.id 是数字或可以转换为数字
      const entityId = typeof entity.id === 'number' ? entity.id : parseInt(entity.id, 10);
      const nodeId = `entity_${entityId}`
      if (!nodeMap.has(nodeId)) {
        nodeMap.set(nodeId, true)
        // 先创建基础节点对象
        const node = {
          id: nodeId, // 确保 ID 是字符串类型
          label: entity.name,
          entityType: entity.type
        }
        
        // 为不同类型的节点设置不同的样式
        switch (entity.type) {
          case '人名':
            node.style = {
              fill: '#ff4d4f',  // Ant Design 红色系 - 用于人名
              stroke: '#ff7875',
              lineWidth: 2,
              shadowColor: 'rgba(0, 0, 0, 0.15)',
              shadowBlur: 6,
              shadowOffsetX: 2,
              shadowOffsetY: 2,
            };
            break;
          case '组织名':
            node.style = {
              fill: '#52c41a',  // Ant Design 绿色系 - 用于组织名
              stroke: '#73d13d',
              lineWidth: 2,
              shadowColor: 'rgba(0, 0, 0, 0.15)',
              shadowBlur: 6,
              shadowOffsetX: 2,
              shadowOffsetY: 2,
            };
            break;
          default:
            node.style = {
              fill: '#1890ff',  // Ant Design 蓝色系 - 默认
              stroke: '#40a9ff',
              lineWidth: 2,
              shadowColor: 'rgba(0, 0, 0, 0.15)',
              shadowBlur: 6,
              shadowOffsetX: 2,
              shadowOffsetY: 2,
            };
        }
        
        // 然后添加其他属性，但要确保不覆盖已设置的属性
        Object.keys(entity).forEach(key => {
          // 跳过 id 属性，因为我们已经设置了字符串类型的 id
          if (key !== 'id' && !(key in node)) {
            node[key] = entity[key]
          }
        })
        nodes.push(node)
      }
    })
  }
  
  // 如果某些关系引用的节点不存在，我们需要创建它们
  if (data.relationships && Array.isArray(data.relationships)) {
    // 先收集所有关系中涉及的节点ID
    const referencedNodeIds = new Set()
    data.relationships.forEach(relationship => {
      // 确保 ID 是数字或可以转换为数字
      const sourceId = typeof relationship.sourceEntityId === 'number' ? relationship.sourceEntityId : parseInt(relationship.sourceEntityId, 10);
      const targetId = typeof relationship.targetEntityId === 'number' ? relationship.targetEntityId : parseInt(relationship.targetEntityId, 10);
      referencedNodeIds.add(sourceId)
      referencedNodeIds.add(targetId)
    })
    
    // 为未在实体列表中出现的节点创建占位符节点
    referencedNodeIds.forEach(id => {
      const nodeId = `entity_${id}`
      if (!nodeMap.has(nodeId)) {
        nodeMap.set(nodeId, true)
        const node = {
          id: nodeId,
          label: `未知实体(${id})`,
          entityType: 'unknown',
          style: {
            fill: '#CCCCCC',
            stroke: '#999999',
            lineWidth: 2
          }
        }
        nodes.push(node)
      }
    })
    
    // 为每条边创建唯一ID
    const edgeCountMap = new Map();
    
    // 处理关系边
    data.relationships.forEach((relationship, index) => {
      // 确保 ID 是数字或可以转换为数字
      const sourceId = typeof relationship.sourceEntityId === 'number' ? relationship.sourceEntityId : parseInt(relationship.sourceEntityId, 10);
      const targetId = typeof relationship.targetEntityId === 'number' ? relationship.targetEntityId : parseInt(relationship.targetEntityId, 10);
      const sourceNodeId = `entity_${sourceId}`
      const targetNodeId = `entity_${targetId}`
      
      // 为每条边创建唯一ID
      const edgeId = `edge_${index}`;
      
      // 现在确保源节点和目标节点都存在（因为我们已经创建了所有引用的节点）
      // 直接创建边，无需检查节点是否存在
      const edge = {
        id: edgeId,
        source: sourceNodeId, // 确保 source 是字符串类型
        target: targetNodeId, // 确保 target 是字符串类型
        label: relationship.type
      }
      
      // 为不同类型的边设置不同的样式和偏移量
      switch (relationship.type) {
        case 'cooccur':
          edge.style = {
            stroke: '#ff4d4f',  // Ant Design 红色系 - 用于共现关系
            lineWidth: 2,
            shadowColor: 'rgba(0, 0, 0, 0.08)',
            shadowBlur: 4,
            shadowOffsetX: 1,
            shadowOffsetY: 1,
          };
          edge.markerEnd = {
            path: 'M 0,0 L 12,6 L 12,-6 Z',
            fill: '#ff4d4f',
            stroke: '#ff4d4f',
            lineWidth: 1,
          };
          // 添加悬停样式
          edge.stateStyles = {
            hover: {
              stroke: '#ff7875',
              lineWidth: 3,
              shadowBlur: 6,
              shadowOffsetX: 2,
              shadowOffsetY: 2,
            }
          };
          // 为平行边设置偏移量
          edge.type = 'quadratic';
          edge.curveOffset = 0;
          break;
        case 'associate':
          edge.style = {
            stroke: '#52c41a',  // Ant Design 绿色系 - 用于关联关系
            lineWidth: 2,
            shadowColor: 'rgba(0, 0, 0, 0.08)',
            shadowBlur: 4,
            shadowOffsetX: 1,
            shadowOffsetY: 1,
          };
          edge.markerEnd = {
            path: 'M 0,0 L 12,6 L 12,-6 Z',
            fill: '#52c41a',
            stroke: '#52c41a',
            lineWidth: 1,
          };
          // 添加悬停样式
          edge.stateStyles = {
            hover: {
              stroke: '#73d13d',
              lineWidth: 3,
              shadowBlur: 6,
              shadowOffsetX: 2,
              shadowOffsetY: 2,
            }
          };
          // 为平行边设置偏移量
          edge.type = 'quadratic';
          edge.curveOffset = 25;
          break;
        case 'belong_to':
          edge.style = {
            stroke: '#722ed1',  // Ant Design 紫色系 - 用于归属关系
            lineWidth: 2,
            shadowColor: 'rgba(0, 0, 0, 0.08)',
            shadowBlur: 4,
            shadowOffsetX: 1,
            shadowOffsetY: 1,
          };
          edge.markerEnd = {
            path: 'M 0,0 L 12,6 L 12,-6 Z',
            fill: '#722ed1',
            stroke: '#722ed1',
            lineWidth: 1,
          };
          // 添加悬停样式
          edge.stateStyles = {
            hover: {
              stroke: '#9254de',
              lineWidth: 3,
              shadowBlur: 6,
              shadowOffsetX: 2,
              shadowOffsetY: 2,
            }
          };
          // 为平行边设置偏移量
          edge.type = 'quadratic';
          edge.curveOffset = -25;
          break;
        default:
          edge.style = {
            stroke: '#91d5ff',  // Ant Design 蓝色系 - 默认
            lineWidth: 2,
            shadowColor: 'rgba(0, 0, 0, 0.08)',
            shadowBlur: 4,
            shadowOffsetX: 1,
            shadowOffsetY: 1,
          };
          edge.markerEnd = {
            path: 'M 0,0 L 12,6 L 12,-6 Z',
            fill: '#1890ff',
            stroke: '#1890ff',
            lineWidth: 1,
          };
          // 添加悬停样式
          edge.stateStyles = {
            hover: {
              stroke: '#40a9ff',
              lineWidth: 3,
              shadowBlur: 6,
              shadowOffsetX: 2,
              shadowOffsetY: 2,
            }
          };
          // 为平行边设置偏移量
          edge.type = 'quadratic';
          edge.curveOffset = 40;
      }
      
      // 特殊处理自环边
      if (sourceId === targetId) {
        edge.type = 'loop';
        // 根据类型设置不同的自环边位置
        switch (relationship.type) {
          case 'cooccur':
            edge.loopCfg = {
              position: 'top',
              dist: 60,
            };
            break;
          case 'associate':
            edge.loopCfg = {
              position: 'right',
              dist: 60,
            };
            break;
          case 'belong_to':
            edge.loopCfg = {
              position: 'bottom',
              dist: 60,
            };
            break;
          default:
            edge.loopCfg = {
              position: 'left',
              dist: 60,
            };
        }
      }
      
      // 然后添加其他属性，但要确保不覆盖已设置的属性
      Object.keys(relationship).forEach(key => {
        // 跳过 sourceEntityId 和 targetEntityId 属性，因为我们已经设置了字符串类型的 source 和 target
        if (key !== 'sourceEntityId' && key !== 'targetEntityId' && !(key in edge)) {
          edge[key] = relationship[key]
        }
      })
      edges.push(edge)
    })
  }
  
  return {
    nodes,
    edges
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
      // 增加额外的宽度和高度以确保足够的显示空间
      const width = Math.max(containerElement.offsetWidth || 800, window.innerWidth - 100)
      const height = Math.max(containerElement.offsetHeight || 600, window.innerHeight - 200)
      
      graphInstance.value.changeSize(width, height)
    }
  }
  
  // 延迟执行一次 resize 以确保容器已正确渲染
  setTimeout(handleResize, 100)
  
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
  // 使用 Ant Design 推荐的背景色
  background-color #f5f5f5
  color rgba(0, 0, 0, 0.85)
  // 统一字体族
  font-family Chinese Quote, -apple-system, BlinkMacSystemFont, Segoe UI, PingFang SC, Hiragino Sans GB, Microsoft YaHei, Helvetica Neue, Helvetica, Arial, sans-serif

.ai-graph-header
  padding 24px 32px
  // 使用 Ant Design 的头部背景色
  background-color #ffffff
  // 添加底部阴影以增强层次感
  box-shadow 0 2px 8px rgba(0, 0, 0, 0.09)
  border-bottom none

  h2
    margin 0 0 12px 0
    font-size 24px
    font-weight 600
    // 使用 Ant Design 的主色调
    color #1890ff
    // 统一字体族
    font-family Chinese Quote, -apple-system, BlinkMacSystemFont, Segoe UI, PingFang SC, Hiragino Sans GB, Microsoft YaHei, Helvetica Neue, Helvetica, Arial, sans-serif

  p
    margin 0
    font-size 16px
    // 使用 Ant Design 的次要文本色
    color rgba(0, 0, 0, 0.65)
    // 统一字体族
    font-family Chinese Quote, -apple-system, BlinkMacSystemFont, Segoe UI, PingFang SC, Hiragino Sans GB, Microsoft YaHei, Helvetica Neue, Helvetica, Arial, sans-serif

.ai-graph-content
  flex 1
  display flex
  flex-direction column
  // 增加内边距以符合 Ant Design 的留白原则
  padding 32px
  overflow hidden
  // 使用 Ant Design 的背景色
  background-color #f5f5f5

.ai-graph-controls
  display flex
  gap 16px
  // 增加底部外边距以增强层次感
  margin-bottom 32px
  // 添加背景色和圆角以增强视觉效果
  background-color #ffffff
  padding 16px 24px
  border-radius 6px
  box-shadow 0 2px 8px rgba(0, 0, 0, 0.09)
  // 统一字体族
  font-family Chinese Quote, -apple-system, BlinkMacSystemFont, Segoe UI, PingFang SC, Hiragino Sans GB, Microsoft YaHei, Helvetica Neue, Helvetica, Arial, sans-serif

.btn-primary,
.btn-secondary
  padding 8px 16px
  border none
  // 使用 Ant Design 推荐的圆角
  border-radius 4px
  font-size 14px
  cursor pointer
  transition all 0.2s ease
  // 添加阴影效果
  box-shadow 0 2px 0 rgba(0, 0, 0, 0.015)
  // 统一字体族
  font-family Chinese Quote, -apple-system, BlinkMacSystemFont, Segoe UI, PingFang SC, Hiragino Sans GB, Microsoft YaHei, Helvetica Neue, Helvetica, Arial, sans-serif
  // 统一字体粗细
  font-weight 400
  // 统一行高
  line-height 1.5

.btn-primary
  // 使用 Ant Design 的主色调蓝色
  background-color #1890ff
  color white
  border-color #1890ff

  &:hover
    // 悬停时加深颜色
    background-color #40a9ff
    border-color #40a9ff
  
  &:disabled
    opacity 0.6
    cursor not-allowed

.btn-secondary
  // 使用 Ant Design 的次要按钮样式
  background-color #ffffff
  color rgba(0, 0, 0, 0.85)
  border 1px solid #d9d9d9

  &:hover
    // 悬停时使用主色调
    border-color #1890ff
    color #1890ff
  
  &:disabled
    opacity 0.6
    cursor not-allowed

.ai-graph-visualization
  flex 1
  display flex
  flex-direction column
  // 使用白色背景以增强对比度
  background-color #ffffff
  // 增加圆角和阴影以符合 Ant Design 的卡片样式
  border-radius 8px
  box-shadow 0 2px 8px rgba(0, 0, 0, 0.09)
  overflow hidden
  // 添加内边距以提供更好的视觉边界
  padding 24px

.graph-placeholder,
.graph-loading
  display flex
  flex-direction column
  align-items center
  justify-content center
  padding 64px
  // 使用 Ant Design 的次要文本色
  color rgba(0, 0, 0, 0.45)
  // 统一字体族
  font-family Chinese Quote, -apple-system, BlinkMacSystemFont, Segoe UI, PingFang SC, Hiragino Sans GB, Microsoft YaHei, Helvetica Neue, Helvetica, Arial, sans-serif

.graph-loading
  gap 24px

.loading-spinner
  width 48px
  height 48px
  border 4px solid #f0f0f0
  // 使用 Ant Design 的主色调
  border-top 4px solid #1890ff
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
  // 添加边框以提供更好的视觉边界
  border 1px solid #f0f0f0
  border-radius 4px
</style>
