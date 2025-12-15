import type { Document, Token, Entity, Relationship, LLMConfig } from "../types"
import { Tokenizer } from "./Tokenizer"
import { EntityExtractor } from "../extractor/EntityExtractor"
import { RelationExtractor } from "../extractor/RelationExtractor"
import { DatabaseManager } from "../db/DatabaseManager"

/**
 * 文档处理器，负责文档的完整处理流程
 */
export class DocumentProcessor {
  private tokenizer: Tokenizer
  private entityExtractor: EntityExtractor
  private relationExtractor: RelationExtractor
  private dbManager: DatabaseManager

  constructor(dbManager: DatabaseManager) {
    this.tokenizer = new Tokenizer()
    this.entityExtractor = new EntityExtractor()
    this.relationExtractor = new RelationExtractor()
    this.dbManager = dbManager
  }

  /**
   * 配置大模型参数
   */
  configureLLM(config: LLMConfig): void {
    this.tokenizer.configureLLM(config)
    this.entityExtractor.configureLLM(config)
    this.relationExtractor.configureLLM(config)
  }

  /**
   * 处理文档
   */
  async processDocument(doc: Document): Promise<{
    tokens: Token[]
    entities: Entity[]
    relationships: Relationship[]
  }> {
    try {
      // 1. 存储文档
      await this.dbManager.saveDocument(doc)

      // 2. 分词处理
      const tokens = await this.tokenizeDocument(doc.content, doc.docId)

      // 3. 实体提取
      let entities = await this.extractEntities(doc.content, doc.docId)

      // 4. 存储实体并重新加载（获取ID）
      if (entities.length > 0) {
        await this.dbManager.saveEntities(entities)
        // 重新加载实体以获取数据库分配的ID
        entities = await this.dbManager.getEntities(doc.docId)
      }

      // 5. 关系提取
      const relationships = await this.extractRelationships(entities, doc.content, doc.docId)

      // 6. 实体融合 - 简化为不执行融合，直接返回实体
      return {
        tokens,
        entities,
        relationships,
      }
    } catch (error) {
      console.error("Error processing document:", error)
      throw error
    }
  }

  /**
   * 对文档进行分词
   */
  private async tokenizeDocument(content: string, docId: string): Promise<Token[]> {
    // 分词
    const tokens = await this.tokenizer.tokenize(content)

    // 创建倒排索引
    await this.dbManager.buildInvertedIndex(docId, tokens)

    return tokens
  }

  /**
   * 提取实体
   */
  private async extractEntities(content: string, docId: string): Promise<Entity[]> {
    try {
      // 提取实体
      const entities = await this.entityExtractor.extract(content, docId)

      return entities
    } catch (error) {
      console.error("Error extracting entities:", error)
      return []
    }
  }

  /**
   * 提取关系
   */
  private async extractRelationships(entities: Entity[], content: string, docId: string): Promise<Relationship[]> {
    try {
      // 提取关系
      const relationships = await this.relationExtractor.extract(entities, content, docId)

      // 存储关系
      if (relationships.length > 0) {
        await this.dbManager.saveRelationships(relationships)
      }

      return relationships
    } catch (error) {
      console.error("Error extracting relationships:", error)
      return []
    }
  }
}
