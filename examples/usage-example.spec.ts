import { describe, it } from "vitest"
import { DocumentProcessor, LLMConfig, SearchAPI } from "../src/data"
import { DatabaseManagerAdapter } from "../src/data/db/DatabaseManagerAdapter"
import type { Document } from "../src/data/types"

/**
 * AI Graph 模块使用示例
 * 基于 core.spec.ts 测试逻辑重构，确保可运行
 */
describe("AI Graph 模块使用示例", () => {
  it("AI Graph 模块使用示例", async () => {
    await runExample()
  }, 15000) // 增加超时时间到15秒
})

const runExample = async () => {
  console.log("AI Graph 模块使用示例")
  console.log("=======================")

  // 1. 初始化数据库管理器
  console.log("\n1. 初始化数据库...")
  // 使用内存数据库进行示例
  const dbManager = new DatabaseManagerAdapter(":memory:")
  console.log("数据库初始化完成")

  // 2. 配置LLM（可选）
  const llmConfig: LLMConfig = {
    endpoint: "http://localhost:8000/v1/chat/completions",
    model: "deepseek-r1",
    apiKey: "",
    temperature: 0.0,
    headers: {
      "Content-Type": "application/json",
    },
  }

  // 3. 初始化文档处理器
  console.log("\n2. 初始化文档处理器...")
  const documentProcessor = new DocumentProcessor(dbManager)
  // 配置LLM（如果需要）
  documentProcessor.configureLLM(llmConfig)
  console.log("文档处理器初始化完成")

  // 4. 处理示例文档
  console.log("\n3. 处理示例文档...")
  const exampleDocs: Document[] = [
    {
      docId: "doc_1",
      title: "人工智能基础",
      content:
        "人工智能（Artificial Intelligence，简称AI）是计算机科学的一个分支，研究如何使计算机能够模拟人类的智能行为。机器学习是AI的重要组成部分，深度学习是机器学习的一个分支。",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      docId: "doc_2",
      title: "深度学习简介",
      content:
        "深度学习（Deep Learning）是机器学习的一种方法，它使用人工神经网络来模拟人脑的结构和功能。卷积神经网络（CNN）和循环神经网络（RNN）是两种常用的深度学习架构。",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ]

  // 处理文档
  for (const doc of exampleDocs) {
    try {
      const result = await documentProcessor.processDocument(doc)
      console.log(`\n文档 "${doc.title}" 处理完成：`)
      console.log(`- 提取到 ${result.tokens.length} 个词元`)
      console.log(`- 提取到 ${result.entities.length} 个实体：`)
      result.entities.forEach((entity) => {
        console.log(`  * ${entity.name} (类型: ${entity.type || "unknown"})`)
      })
      console.log(`- 提取到 ${result.relationships.length} 个关系`)
    } catch (error) {
      console.error(`处理文档 "${doc.title}" 时出错：`, error)
    }
  }

  // 5. 使用搜索API
  console.log("\n4. 搜索示例...")
  const searchAPI = new SearchAPI(dbManager)

  // 搜索文档
  const docResults = await searchAPI.searchDocuments("深度学习")
  console.log(`\n搜索 "深度学习" 的结果 (${docResults.length} 个):`)
  docResults.forEach((result) => {
    console.log(`- ${result.item.title} (相关度: ${result.score.toFixed(2)})`)
  })

  // 搜索实体
  const entityResults = await searchAPI.searchEntities("学习")
  console.log(`\n搜索实体 "学习" 的结果 (${entityResults.length} 个):`)
  entityResults.forEach((result) => {
    console.log(`- ${result.item.name} (类型: ${result.item.type || "unknown"})`)
  })

  // 6. 实体融合示例（简化版）
  console.log("\n5. 实体融合示例...")
  // 获取实体（限制数量避免数据爆炸）
  const entities = await dbManager.getEntities(undefined, undefined)
  const limitedEntities = entities.slice(0, 100)
  console.log(`获取到 ${limitedEntities.length} 个实体用于处理`)

  // 7. 关系搜索示例
  console.log("\n6. 关系搜索示例...")
  try {
    const relationshipResults = await searchAPI.searchRelationships({
      limit: 10,
      offset: 0,
    })
    console.log(`获取到 ${relationshipResults.length} 个关系`)
  } catch (error) {
    console.error("关系搜索出错:", error)
  }

  // 8. 向量搜索示例（仅在 Milvus 适配器可用时）
  console.log("\n7. 向量搜索示例...")
  try {
    // 只有在 Milvus 适配器可用时才执行向量搜索
    // @ts-expect-error - 访问私有属性用于检查
    if (dbManager["isMilvus"]) {
      // 创建一个虚拟查询向量
      const dummyVector = Array.from({ length: 128 }, () => Math.random())

      // 尝试向量搜索
      const vectorResults = await dbManager.searchSimilarEntities(dummyVector, 5)
      console.log(`向量搜索返回 ${vectorResults.length} 个相似实体`)

      vectorResults.forEach((result) => {
        console.log(`- ${result.name} (类型: ${result.type}, 相似度: ${result.distance.toFixed(4)})`)
      })
    } else {
      console.log("向量搜索不可用: 当前使用的是 SQLite/IndexedDB 适配器，仅 Milvus 适配器支持向量搜索")
    }
  } catch (error) {
    console.log("向量搜索不可用:", (error as Error).message)
  }

  // 9. 清理和关闭
  console.log("\n8. 示例完成，清理资源...")
  dbManager.close()
  console.log("数据库已关闭")
}
