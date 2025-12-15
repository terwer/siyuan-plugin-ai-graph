import { describe, expect, it, vi } from "vitest"
import { DatabaseManagerAdapter } from "../src/data/db/DatabaseManagerAdapter"

/**
 * Milvus 适配器测试
 * 演示如何使用 Milvus 向量数据库适配器
 */
describe("Milvus 适配器测试", () => {
  it("应该能够创建 Milvus 适配器实例", () => {
    // 模拟 MilvusManager 类
    vi.mock("../src/data/db/MilvusManager", () => {
      return {
        MilvusManager: class {
          connect = vi.fn().mockResolvedValue(undefined)
          close = vi.fn()
          saveEntities = vi.fn().mockResolvedValue(undefined)
          saveRelationships = vi.fn().mockResolvedValue(undefined)
          searchSimilarEntities = vi.fn().mockResolvedValue([])
          searchSimilarRelationships = vi.fn().mockResolvedValue([])
        },
      }
    })

    // 测试 Milvus 适配器创建
    const dbManager = new DatabaseManagerAdapter("milvus:localhost:19530")
    expect(dbManager).toBeDefined()
  })

  it("应该能够在 Milvus 适配器上调用向量搜索方法", async () => {
    // 模拟 MilvusManager 类
    const mockMilvusManager = {
      connect: vi.fn().mockResolvedValue(undefined),
      close: vi.fn(),
      saveEntities: vi.fn().mockResolvedValue(undefined),
      saveRelationships: vi.fn().mockResolvedValue(undefined),
      searchSimilarEntities: vi.fn().mockResolvedValue([{ name: "人工智能", type: "concept", distance: 0.85 }]),
      searchSimilarRelationships: vi.fn().mockResolvedValue([]),
    }

    // 创建带有模拟 MilvusManager 的适配器
    const dbManager = new DatabaseManagerAdapter("milvus:localhost:19530")

    // 模拟内部 MilvusManager 实例
    // @ts-expect-error - 访问私有属性用于测试
    dbManager["dbManager"] = mockMilvusManager
    dbManager["isMilvus"] = true

    // 测试向量搜索功能
    const queryVector = Array.from({ length: 128 }, () => Math.random())
    const results = await dbManager.searchSimilarEntities(queryVector, 5)

    expect(results).toHaveLength(1)
    expect(results[0].name).toBe("人工智能")
    expect(results[0].type).toBe("concept")
    expect(results[0].distance).toBe(0.85)
  })
})
