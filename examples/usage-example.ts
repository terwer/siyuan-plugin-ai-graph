import {
  DocumentProcessor,
  DatabaseManager,
  EntityExtractor,
  RelationExtractor,
  EntityFusion,
  SearchAPI,
  type Document,
  type LLMConfig,
  FusionStrategy,
} from "../src/data"

/**
 * AI Graph 模块使用示例
 */
async function runExample() {
  console.log("AI Graph 模块使用示例")
  console.log("=======================")

  // 1. 初始化数据库管理器
  console.log("\n1. 初始化数据库...")
  const dbManager = new DatabaseManager({
    dbPath: "./test_data/ai_graph.db",
  })

  // 初始化数据库表
  await dbManager.init()
  console.log("数据库初始化完成")

  // 2. 配置LLM（可选）
  const llmConfig: LLMConfig = {
    endpoint: "https://api.example.com/llm",
    model: "gpt-4",
    apiKey: "your-api-key-here",
    temperature: 0.0,
    headers: {
      "Content-Type": "application/json",
    },
  }

  // 3. 初始化文档处理器
  console.log("\n2. 初始化文档处理器...")
  const documentProcessor = new DocumentProcessor(dbManager)

  // 配置LLM（如果需要）
  // documentProcessor.configureLLM(llmConfig);
  console.log("文档处理器初始化完成")

  // 4. 处理示例文档
  console.log("\n3. 处理示例文档...")
  const exampleDocs: Document[] = [
    {
      id: "doc_1",
      title: "人工智能基础",
      content:
        "人工智能（Artificial Intelligence，简称AI）是计算机科学的一个分支，研究如何使计算机能够模拟人类的智能行为。机器学习是AI的重要组成部分，深度学习是机器学习的一个分支。",
      tags: ["AI", "机器学习"],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: "doc_2",
      title: "深度学习简介",
      content:
        "深度学习（Deep Learning）是机器学习的一种方法，它使用人工神经网络来模拟人脑的结构和功能。卷积神经网络（CNN）和循环神经网络（RNN）是两种常用的深度学习架构。",
      tags: ["深度学习", "神经网络"],
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

  // 6. 使用实体融合
  console.log("\n5. 实体融合示例...")
  const entityFusion = new EntityFusion(dbManager)

  // 获取实体并融合
  const allEntities = await dbManager.getAllEntities()
  if (allEntities.length > 0) {
    const fusedEntities = await entityFusion.execute(allEntities, {
      strategy: FusionStrategy.FUZZY_MATCH,
      threshold: 0.8,
      considerType: true,
    })
    console.log(`实体融合后剩余 ${fusedEntities.length} 个实体`)
  }

  // 7. 获取知识图谱
  console.log("\n6. 获取知识图谱示例...")
  if (entityResults.length > 0) {
    const firstEntityId = entityResults[0].item.id
    if (firstEntityId) {
      try {
        const graph = await searchAPI.getEntityGraph(firstEntityId, {
          depth: 2,
          includeReverse: true,
        })
        console.log(`实体 "${entityResults[0].item.name}" 的知识图谱：`)
        console.log(`- 节点数: ${graph.nodes.length}`)
        console.log(`- 边数: ${graph.edges.length}`)
      } catch (error) {
        console.error("获取知识图谱失败:", error)
      }
    }
  }

  // 8. 清理和关闭
  console.log("\n7. 示例完成，清理资源...")
  await dbManager.close()
  console.log("数据库已关闭")
}

// 运行示例
runExample().catch((error) => {
  console.error("示例运行失败:", error)
})
