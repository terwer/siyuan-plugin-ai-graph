import type { Document, Entity, Relationship, Token } from "../types"
import { DatabaseManager } from "./DatabaseManager"
import { IndexedDBManager } from "./IndexedDBManager"

/**
 * 数据库管理器适配器
 * 提供统一的接口来支持不同的数据库实现（SQLite/IndexedDB）
 */
export class DatabaseManagerAdapter {
  private dbManager: DatabaseManager | IndexedDBManager
  private isIndexedDB: boolean

  constructor(dbPathOrType: string) {
    // 根据参数判断使用哪种数据库实现
    if (dbPathOrType === "indexeddb") {
      this.dbManager = new IndexedDBManager()
      this.isIndexedDB = true
    } else {
      this.dbManager = new DatabaseManager(dbPathOrType)
      this.isIndexedDB = false
    }
  }

  /**
   * 保存文档
   */
  async saveDocument(doc: Document): Promise<void> {
    return this.dbManager.saveDocument(doc)
  }

  /**
   * 获取文档
   */
  async getDocument(docId: string): Promise<Document | null> {
    return this.dbManager.getDocument(docId)
  }

  /**
   * 删除文档
   */
  async deleteDocument(docId: string): Promise<void> {
    return this.dbManager.deleteDocument(docId)
  }

  /**
   * 保存实体
   */
  async saveEntities(entities: Entity[]): Promise<void> {
    return this.dbManager.saveEntities(entities)
  }

  /**
   * 获取实体
   */
  async getEntities(docId?: string, entityType?: string): Promise<Entity[]> {
    return this.dbManager.getEntities(docId, entityType)
  }



  /**
   * 保存关系
   */
  async saveRelationships(relationships: Relationship[]): Promise<void> {
    return this.dbManager.saveRelationships(relationships)
  }

  /**
   * 获取所有关系
   */
  async getAllRelationships(): Promise<Relationship[]> {
    return this.dbManager.getAllRelationships()
  }

  /**
   * 构建倒排索引
   */
  async buildInvertedIndex(docId: string, tokens: Token[]): Promise<void> {
    return this.dbManager.buildInvertedIndex(docId, tokens)
  }

  /**
   * 添加实体别名
   */
  async addEntityAlias(entityId: number, alias: string): Promise<void> {
    return this.dbManager.addEntityAlias(entityId, alias)
  }

  /**
   * 添加实体相似度
   */
  async addEntitySimilarity(
    entityId1: number,
    entityId2: number,
    similarityScore: number,
    calculationMethod: string
  ): Promise<void> {
    return this.dbManager.addEntitySimilarity(entityId1, entityId2, similarityScore, calculationMethod)
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    if (this.isIndexedDB && this.dbManager instanceof IndexedDBManager) {
      this.dbManager.close()
    } else if (!this.isIndexedDB && this.dbManager instanceof DatabaseManager) {
      this.dbManager.close()
    }
  }
}
