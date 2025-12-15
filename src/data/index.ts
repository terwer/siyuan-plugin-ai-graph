// 类型导出
export * from "./types"

// 数据库管理
export * from "./db/DatabaseManager"

// 文档处理
export * from "./processor/DocumentProcessor"
export * from "./processor/Tokenizer"

// 实体和关系提取
export * from "./extractor/EntityExtractor"
export * from "./extractor/RelationExtractor"

// 实体融合
export * from "./fusion/EntityFusion"

// 搜索API
export * from "./search/SearchAPI"

// 工具类
export * from "./utils/RequestUtil"

/**
 * AI Graph 数据处理模块
 * 提供文档处理、实体提取、关系抽取、图存储和搜索功能
 */
export const AIGraph = {
  // 版本信息
  version: "1.0.0",

  // 核心功能描述
  description: "智能知识图谱处理模块",

  // 功能列表
  features: [
    "文档分词和倒排索引",
    "实体提取和类型识别",
    "关系抽取和图构建",
    "实体融合和消歧",
    "全文搜索和语义检索",
    "知识图谱可视化支持",
  ],
}

// 默认导出
export default AIGraph
