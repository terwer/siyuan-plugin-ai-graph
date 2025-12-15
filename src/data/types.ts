/**
 * 数据类型定义
 */

// 文档类型
export interface Document {
  docId: string
  title: string
  content: string
  createdAt?: number
  updatedAt?: number
}

// 分词结果类型
export interface Token {
  text: string // 分词后的文本
  start: number // 在原文本中的起始位置
  end: number // 在原文本中的结束位置
  type?: string // 词类型（可选）
  weight?: number // 权重（可选）
}

// 实体类型
export interface Entity {
  id?: number // 实体ID
  name: string // 实体名称
  type: string // 实体类型
  docId: string // 所属文档ID
  startPos: number // 在文档中的起始位置
  endPos: number // 在文档中的结束位置
  properties?: Record<string, any> // 额外属性
  source?: string // 实体来源（如'rule', 'dict', 'llm'）
  confidence?: number // 置信度
}

// 关系类型
export interface Relationship {
  id?: number // 关系ID
  sourceEntityId: number // 源实体ID
  targetEntityId: number // 目标实体ID
  type: string // 关系类型
  docId: string // 所属文档ID
  confidence: number // 置信度
  properties?: Record<string, any> // 额外属性
  source?: string // 关系来源（如'rule', 'cooccur', 'llm'）
  evidenceText?: string // 支持该关系的文本证据
}

// 相似实体类型
export interface SimilarEntity {
  entityId: number
  name: string
  similarityScore: number
  type: string
}

// 大模型配置类型
export interface LLMConfig {
  apiKey?: string
  endpoint?: string
  model?: string
  temperature?: number
  promptTemplate?: string
  headers?: Record<string, string>
  filters?: Array<(url: string, options: RequestInit) => void>
}

// 搜索选项类型
export interface SearchOptions {
  limit?: number
  offset?: number
  sortBy?: "relevance" | "date" | "title"
  filterBy?: Record<string, any>
}

// 搜索结果类型
export interface SearchResult<T = any> {
  item: T
  score: number
  highlights: string[]
  matchPositions: number[]
}
// 网络图类型
export interface NetworkGraph {
  nodes: Array<{
    id: number
    name: string
    type: string
  }>
  edges: Array<{
    source: number
    target: number
    type: string
    confidence: number
  }>
}

// 实体别名类型
export interface EntityAlias {
  id?: number
  entityId: number
  alias: string
  createdAt?: number
}

// 实体相似度记录类型
export interface EntitySimilarity {
  id?: number
  entityId1: number
  entityId2: number
  similarityScore: number
  calculationMethod: string
  calculatedAt?: number
}
