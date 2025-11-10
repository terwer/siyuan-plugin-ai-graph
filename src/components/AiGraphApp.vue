<template>
  <div class="ai-graph-app">
    <div class="ai-graph-header">
      <h2>{{ i18n.aiGraph }} - v{{ version }}</h2>
      <p>{{ i18n.aiGraphDescription }}</p>
    </div>
    
    <div class="ai-graph-content">
      <div class="ai-graph-controls">
        <button class="btn-primary" @click="generateGraph">
          {{ i18n.generateGraph }}
        </button>
        <button class="btn-secondary" @click="exportGraph">
          {{ i18n.exportGraph }}
        </button>
      </div>
      
      <div class="ai-graph-visualization">
        <!-- 知识图谱可视化区域 -->
        <div v-if="!isGenerating" class="graph-placeholder">
          {{ i18n.clickGenerateGraph }}
        </div>
        <div v-else class="graph-loading">
          <div class="loading-spinner"></div>
          <p>{{ i18n.generatingGraph }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

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

// 获取国际化资源
const i18n = pluginInstance.i18n

// 生成知识图谱
const generateGraph = async () => {
  isGenerating.value = true
  try {
    // TODO: 实现知识图谱生成逻辑
    console.log('Generating knowledge graph...')
    // 模拟生成过程
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // 生成完成后的处理
    console.log('Graph generation completed')
  } catch (error) {
    console.error('Error generating graph:', error)
    // TODO: 显示错误消息
  } finally {
    isGenerating.value = false
  }
}

// 导出知识图谱
const exportGraph = () => {
  console.log('Exporting knowledge graph...')
  // TODO: 实现知识图谱导出逻辑
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
})

// 组件卸载时的清理
onUnmounted(() => {
  console.log('AiGraphApp unmounted')
  // 清理资源
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

.btn-secondary
  background-color var(--b3-theme-surface)
  color var(--b3-theme-on-surface)
  border 1px solid var(--b3-border-color)

  &:hover
    background-color var(--b3-theme-hover)

.ai-graph-visualization
  flex 1
  display flex
  align-items center
  justify-content center
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
</style>