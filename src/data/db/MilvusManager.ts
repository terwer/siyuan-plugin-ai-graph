import { DataType, ErrorCode, MilvusClient } from "@zilliz/milvus2-sdk-node"
import type { Document, Entity, Relationship, Token } from "../types"

/**
 * Milvus 向量数据库管理器
 * 提供向量检索能力，支持实体和关系的向量化存储与搜索
 */
export class MilvusManager {
  private client: MilvusClient | null = null
  private collectionName: string = "entities"
  private relationshipCollectionName: string = "relationships"
  private isConnected: boolean = false

  constructor(private milvusAddress: string = "localhost:19530") {}

  /**
   * 连接到 Milvus 服务器
   */
  async connect(): Promise<void> {
    try {
      this.client = new MilvusClient({
        address: this.milvusAddress,
      })

      await this.client.ping()
      this.isConnected = true
      console.log("Successfully connected to Milvus")

      // 初始化集合
      await this.initCollections()
    } catch (error) {
      console.error("Failed to connect to Milvus:", error)
      throw error
    }
  }

  /**
   * 初始化集合结构
   */
  private async initCollections(): Promise<void> {
    if (!this.client || !this.isConnected) {
      throw new Error("Milvus client not connected")
    }

    // 创建实体集合
    try {
      const entityCollectionExists = await this.client.hasCollection({
        collection_name: this.collectionName,
      })

      if (!entityCollectionExists.value) {
        await this.client.createCollection({
          collection_name: this.collectionName,
          fields: [
            {
              name: "id",
              data_type: DataType.Int64,
              is_primary_key: true,
              autoID: true,
            },
            {
              name: "entity_id",
              data_type: DataType.Int64,
            },
            {
              name: "entity_name",
              data_type: DataType.VarChar,
              max_length: 255,
            },
            {
              name: "doc_id",
              data_type: DataType.VarChar,
              max_length: 255,
            },
            {
              name: "entity_type",
              data_type: DataType.VarChar,
              max_length: 100,
            },
            {
              name: "vector",
              data_type: DataType.FloatVector,
              dim: 128, // 默认维度，可根据实际模型调整
            },
            {
              name: "confidence",
              data_type: DataType.Float,
            },
            {
              name: "source",
              data_type: DataType.VarChar,
              max_length: 50,
            },
          ],
        })

        // 创建索引
        await this.client.createIndex({
          collection_name: this.collectionName,
          field_name: "vector",
          index_name: "vector_index",
          index_type: "IVF_FLAT",
          metric_type: "L2",
          params: {
            nlist: 1024,
          },
        })

        // 加载集合
        await this.client.loadCollectionSync({
          collection_name: this.collectionName,
        })
      }
    } catch (error) {
      console.error("Failed to initialize entity collection:", error)
      throw error
    }

    // 创建关系集合
    try {
      const relationshipCollectionExists = await this.client.hasCollection({
        collection_name: this.relationshipCollectionName,
      })

      if (!relationshipCollectionExists.value) {
        await this.client.createCollection({
          collection_name: this.relationshipCollectionName,
          fields: [
            {
              name: "id",
              data_type: DataType.Int64,
              is_primary_key: true,
              autoID: true,
            },
            {
              name: "rel_id",
              data_type: DataType.Int64,
            },
            {
              name: "source_entity_id",
              data_type: DataType.Int64,
            },
            {
              name: "target_entity_id",
              data_type: DataType.Int64,
            },
            {
              name: "doc_id",
              data_type: DataType.VarChar,
              max_length: 255,
            },
            {
              name: "rel_type",
              data_type: DataType.VarChar,
              max_length: 100,
            },
            {
              name: "vector",
              data_type: DataType.FloatVector,
              dim: 128, // 默认维度，可根据实际模型调整
            },
            {
              name: "confidence",
              data_type: DataType.Float,
            },
            {
              name: "source",
              data_type: DataType.VarChar,
              max_length: 50,
            },
          ],
        })

        // 创建索引
        await this.client.createIndex({
          collection_name: this.relationshipCollectionName,
          field_name: "vector",
          index_name: "vector_index",
          index_type: "IVF_FLAT",
          metric_type: "L2",
          params: {
            nlist: 1024,
          },
        })

        // 加载集合
        await this.client.loadCollectionSync({
          collection_name: this.relationshipCollectionName,
        })
      }
    } catch (error) {
      console.error("Failed to initialize relationship collection:", error)
      throw error
    }
  }

  /**
   * 保存实体（包含向量化）
   */
  async saveEntities(entities: Entity[]): Promise<void> {
    if (!this.client || !this.isConnected) {
      throw new Error("Milvus client not connected")
    }

    try {
      // 为每个实体生成向量（这里简化处理，实际应使用模型生成向量）
      const entityData = entities.map((entity) => ({
        entity_id: entity.id || 0,
        entity_name: entity.name,
        doc_id: entity.docId,
        entity_type: entity.type,
        vector: this.generateDummyVector(128), // 生成虚拟向量，实际应使用模型
        confidence: entity.confidence || 1.0,
        source: entity.source || "rule",
      }))

      const result = await this.client.insert({
        collection_name: this.collectionName,
        data: entityData,
      })

      if (result.status.error_code !== ErrorCode.SUCCESS) {
        throw new Error(`Failed to insert entities: ${result.status.reason}`)
      }

      console.log(`Inserted ${entities.length} entities into Milvus`)
    } catch (error) {
      console.error("Failed to save entities to Milvus:", error)
      throw error
    }
  }

  /**
   * 保存关系（包含向量化）
   */
  async saveRelationships(relationships: Relationship[]): Promise<void> {
    if (!this.client || !this.isConnected) {
      throw new Error("Milvus client not connected")
    }

    try {
      // 为每个关系生成向量（这里简化处理，实际应使用模型生成向量）
      const relationshipData = relationships.map((rel) => ({
        rel_id: rel.id || 0,
        source_entity_id: rel.sourceEntityId,
        target_entity_id: rel.targetEntityId,
        doc_id: rel.docId,
        rel_type: rel.type,
        vector: this.generateDummyVector(128), // 生成虚拟向量，实际应使用模型
        confidence: rel.confidence,
        source: rel.source || "rule",
      }))

      const result = await this.client.insert({
        collection_name: this.relationshipCollectionName,
        data: relationshipData,
      })

      if (result.status.error_code !== ErrorCode.SUCCESS) {
        throw new Error(`Failed to insert relationships: ${result.status.reason}`)
      }

      console.log(`Inserted ${relationships.length} relationships into Milvus`)
    } catch (error) {
      console.error("Failed to save relationships to Milvus:", error)
      throw error
    }
  }

  /**
   * 向量搜索相似实体
   */
  async searchSimilarEntities(queryVector: number[], limit: number = 10): Promise<any[]> {
    if (!this.client || !this.isConnected) {
      throw new Error("Milvus client not connected")
    }

    try {
      const result = await this.client.search({
        collection_name: this.collectionName,
        vectors: [queryVector],
        search_params: {
          anns_field: "vector",
          topk: limit.toString(),
          metric_type: "L2",
          params: JSON.stringify({ nprobe: 16 }),
        },
        output_fields: ["entity_id", "entity_name", "doc_id", "entity_type", "confidence", "source"],
      })

      if (result.status.error_code !== ErrorCode.SUCCESS) {
        throw new Error(`Failed to search entities: ${result.status.reason}`)
      }

      return result.results.map((item) => ({
        entityId: item.entity_id,
        name: item.entity_name,
        docId: item.doc_id,
        type: item.entity_type,
        confidence: item.confidence,
        source: item.source,
        distance: item.score,
      }))
    } catch (error) {
      console.error("Failed to search similar entities:", error)
      throw error
    }
  }

  /**
   * 向量搜索相似关系
   */
  async searchSimilarRelationships(queryVector: number[], limit: number = 10): Promise<any[]> {
    if (!this.client || !this.isConnected) {
      throw new Error("Milvus client not connected")
    }

    try {
      const result = await this.client.search({
        collection_name: this.relationshipCollectionName,
        vectors: [queryVector],
        search_params: {
          anns_field: "vector",
          topk: limit.toString(),
          metric_type: "L2",
          params: JSON.stringify({ nprobe: 16 }),
        },
        output_fields: ["rel_id", "source_entity_id", "target_entity_id", "doc_id", "rel_type", "confidence", "source"],
      })

      if (result.status.error_code !== ErrorCode.SUCCESS) {
        throw new Error(`Failed to search relationships: ${result.status.reason}`)
      }

      return result.results.map((item) => ({
        relId: item.rel_id,
        sourceEntityId: item.source_entity_id,
        targetEntityId: item.target_entity_id,
        docId: item.doc_id,
        type: item.rel_type,
        confidence: item.confidence,
        source: item.source,
        distance: item.score,
      }))
    } catch (error) {
      console.error("Failed to search similar relationships:", error)
      throw error
    }
  }

  /**
   * 生成虚拟向量（用于测试）
   */
  private generateDummyVector(dim: number): number[] {
    return Array.from({ length: dim }, () => Math.random())
  }

  /**
   * 关闭连接
   */
  close(): void {
    if (this.client) {
      this.client.closeConnection()
      this.isConnected = false
      console.log("Milvus connection closed")
    }
  }

  // 以下是适配器接口中需要实现但与向量检索无关的方法
  // 这些方法可以简单实现或抛出错误，因为主要功能由其他适配器处理

  async saveDocument(doc: Document): Promise<void> {
    // 文档存储仍由主数据库处理
    console.warn("saveDocument is not implemented in Milvus adapter, use primary database")
  }

  async getDocument(docId: string): Promise<Document | null> {
    // 文档检索仍由主数据库处理
    console.warn("getDocument is not implemented in Milvus adapter, use primary database")
    return null
  }

  async deleteDocument(docId: string): Promise<void> {
    // 文档删除仍由主数据库处理
    console.warn("deleteDocument is not implemented in Milvus adapter, use primary database")
  }

  async getEntities(docId?: string, entityType?: string): Promise<Entity[]> {
    // 实体检索仍由主数据库处理
    console.warn("getEntities is not implemented in Milvus adapter, use primary database")
    return []
  }

  async getAllRelationships(): Promise<Relationship[]> {
    // 关系检索仍由主数据库处理
    console.warn("getAllRelationships is not implemented in Milvus adapter, use primary database")
    return []
  }

  async buildInvertedIndex(docId: string, tokens: Token[]): Promise<void> {
    // 倒排索引仍由主数据库处理
    console.warn("buildInvertedIndex is not implemented in Milvus adapter, use primary database")
  }

  async addEntityAlias(entityId: number, alias: string): Promise<void> {
    // 别名处理仍由主数据库处理
    console.warn("addEntityAlias is not implemented in Milvus adapter, use primary database")
  }

  async addEntitySimilarity(
    entityId1: number,
    entityId2: number,
    similarityScore: number,
    calculationMethod: string
  ): Promise<void> {
    // 相似度处理仍由主数据库处理
    console.warn("addEntitySimilarity is not implemented in Milvus adapter, use primary database")
  }
}
