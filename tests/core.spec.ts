import { DatabaseManager, Document, DocumentProcessor, EntityExtractor, LLMConfig, Tokenizer } from "../src/data"

import { afterAll, beforeAll, describe, it, expect } from "vitest"

const llmConfig: LLMConfig = {
  endpoint: "http://localhost:8000/v1/chat/completions",
  model: "deepseek-r1",
  apiKey: "",
  temperature: 0.0,
  headers: {
    "Content-Type": "application/json",
  },
}

describe("AI Graph Core Tests", () => {
  let dbManager: DatabaseManager
  let tokenizer: Tokenizer
  let entityExtractor: EntityExtractor

  beforeAll(async () => {
    // 初始化数据库管理器
    dbManager = new DatabaseManager(":memory:") // 使用内存数据库进行测试

    // 初始化分词器
    tokenizer = new Tokenizer()

    // 初始化实体提取器
    entityExtractor = new EntityExtractor()
    // 添加更通用的地名规则用于测试
    entityExtractor.addCustomEntityType("location", [/北京/g, /上海/g, /中国/g])
    // 配置LLM
    entityExtractor.configureLLM(llmConfig)
  })

  afterAll(async () => {
    // 关闭数据库连接
    try {
      dbManager.close()
    } catch (error) {
      console.error("Error closing database connection:", error)
    }
  })

  describe("Tokenizer Tests", () => {
    it("should tokenize Chinese text correctly", async () => {
      const text = "人工智能是计算机科学的分支。"
      const tokens = await tokenizer.tokenize(text)

      // 验证分词结果
      console.log("tokens:", tokens)
      expect(tokens.length).toBeGreaterThan(0)
      expect(tokens.some((t) => t.text === "人工智能")).toBeTruthy()
      expect(tokens.some((t) => t.text === "计算机科学")).toBeTruthy()
    })

    it("should tokenize English text correctly", async () => {
      const text = "Artificial intelligence is a branch of computer science."
      const tokens = await tokenizer.tokenize(text)

      // 验证分词结果
      console.log("tokens:", tokens)
      expect(tokens.length).toBeGreaterThan(0)
      expect(tokens.some((t) => t.text === "Artificial")).toBeTruthy()
      expect(tokens.some((t) => t.text === "intelligence")).toBeTruthy()
    })
  })

  describe("Database Tests", () => {
    it("should insert and retrieve document", async () => {
      const testDoc: Document = {
        docId: "test_doc_id",
        title: "Test Document",
        content: "This is a test document for AI Graph.",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      // 插入文档
      await dbManager.saveDocument(testDoc)

      // 检索文档
      const retrievedDoc = await dbManager.getDocument(testDoc.docId)
      console.log("retrievedDoc:", retrievedDoc)
      expect(retrievedDoc).toBeDefined()
      expect(retrievedDoc?.title).toBe(testDoc.title)
    })
  })

  describe("Entity Extraction Tests", () => {
    it("should extract entities from text", async () => {
      const text = "北京是中国的首都，上海是中国的经济中心。"
      const entities = await entityExtractor.extract(text, "test_doc_id")

      // 验证实体提取结果
      expect(entities).toBeDefined()
      expect(entities.length).toBeGreaterThan(0)
      console.log("entities:", entities)
      expect(entities.some((e) => e.name.includes("北京"))).toBeTruthy()
      expect(entities.some((e) => e.name.includes("上海"))).toBeTruthy()
      expect(entities.some((e) => e.name.includes("中国"))).toBeTruthy()
    })
  })

  describe("Document Processor Tests", () => {
    it("should process document completely", async () => {
      const documentProcessor = new DocumentProcessor(dbManager)
      documentProcessor.configureLLM(llmConfig)

      const testDoc: Document = {
        docId: "test_doc_id_2",
        title: "测试文档",
        content: "张三是李四的同事，他们都在阿里巴巴工作。",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      // 处理文档
      const result = await documentProcessor.processDocument(testDoc)

      // 验证处理结果
      expect(result).toBeDefined()
      console.log("result:", result)
      expect(result).toHaveProperty("tokens")
      expect(result).toHaveProperty("entities")
      expect(result).toHaveProperty("relationships")
    }, 60000)
  })
})
