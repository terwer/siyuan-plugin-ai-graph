import type { Document, Token, Entity, Relationship, LLMConfig } from '../types';
import { Tokenizer } from './Tokenizer';
import { EntityExtractor } from '../extractor/EntityExtractor';
import { RelationExtractor } from '../extractor/RelationExtractor';
import { DatabaseManager } from '../db/DatabaseManager';

/**
 * 文档处理器，负责文档的完整处理流程
 */
export class DocumentProcessor {
  private tokenizer: Tokenizer;
  private entityExtractor: EntityExtractor;
  private relationExtractor: RelationExtractor;
  private dbManager: DatabaseManager;
  private llmConfig?: LLMConfig;

  constructor(dbManager: DatabaseManager) {
    this.tokenizer = new Tokenizer();
    this.entityExtractor = new EntityExtractor();
    this.relationExtractor = new RelationExtractor();
    this.dbManager = dbManager;
  }

  /**
   * 配置大模型参数
   */
  configureLLM(config: LLMConfig): void {
    this.llmConfig = config;
    this.entityExtractor.configureLLM(config);
    this.relationExtractor.configureLLM(config);
  }

  /**
   * 处理文档
   */
  async processDocument(doc: Document): Promise<{
    tokens: Token[];
    entities: Entity[];
    relationships: Relationship[];
  }> {
    try {
      // 1. 存储文档
      const docId = await this.dbManager.insertDocument(doc);
      
      // 2. 分词处理
      const tokens = await this.tokenizeDocument(doc.content, docId.toString());
      
      // 3. 实体提取
      const entities = await this.extractEntities(doc.content, docId.toString());
      
      // 4. 关系提取
      const relationships = await this.extractRelationships(entities, doc.content, docId.toString());
      
      // 5. 实体融合 - 简化为不执行融合，直接返回实体
      return {
        tokens,
        entities,
        relationships,
      };
    } catch (error) {
      console.error('Error processing document:', error);
      throw error;
    }
  }

  /**
   * 对文档进行分词
   */
  private async tokenizeDocument(content: string, docId: string): Promise<Token[]> {
    // 分词
    const tokens = this.tokenizer.tokenize(content);
    
    // 为每个token添加文档ID
    const docTokens = tokens.map((token, index) => ({
      ...token,
      docId,
      position: index,
    }));
    
    // 创建倒排索引 - 简化为不创建索引
    // await this.createInvertedIndex(docTokens);
    
    return docTokens;
  }

  /**
   * 创建倒排索引 - 简化实现
   */
  private async createInvertedIndex(tokens: Token[]): Promise<void> {
    try {
      // 按token文本分组
      const tokenMap = new Map<string, Token[]>();
      
      tokens.forEach(token => {
        const key = token.text.toLowerCase();
        if (!tokenMap.has(key)) {
          tokenMap.set(key, []);
        }
        tokenMap.get(key)!.push(token);
      });
      
      // 简化的索引创建，不计算复杂的统计信息
      for (const [tokenText, tokenList] of tokenMap) {
        for (const token of tokenList) {
          // 尝试调用insertInvertedIndex方法
          try {
            await this.dbManager.insertInvertedIndex({
              term: token.text,
              docId: token.docId,
              positions: [token.position],
              termFrequency: 1,
              docFrequency: 1,
              tokenType: token.type || 'unknown',
            });
          } catch (e) {
            console.log('Inverted index insertion skipped:', e);
          }
        }
      }
    } catch (error) {
      console.error('Error creating inverted index:', error);
    }
  }

  /**
   * 提取实体
   */
  private async extractEntities(content: string, docId: string): Promise<Entity[]> {
    try {
      // 提取实体
      const entities = await this.entityExtractor.extract(content, docId);
      
      // 存储实体
      for (const entity of entities) {
        try {
          const entityId = await this.dbManager.insertEntity(entity);
          entity.id = entityId;
        } catch (error) {
          console.error('Failed to insert entity:', error);
        }
      }
      
      return entities;
    } catch (error) {
      console.error('Error extracting entities:', error);
      return [];
    }
  }

  /**
   * 提取关系
   */
  private async extractRelationships(entities: Entity[], content: string, docId: string): Promise<Relationship[]> {
    try {
      // 提取关系
      const relationships = await this.relationExtractor.extract(entities, content, docId);
      
      // 存储关系
      for (const relationship of relationships) {
        try {
          // 确保sourceEntityId和targetEntityId是有效的
          if (relationship.sourceEntityId && relationship.targetEntityId) {
            await this.dbManager.insertRelationship(relationship);
          }
        } catch (error) {
          console.error('Failed to insert relationship:', error);
        }
      }
      
      return relationships;
    } catch (error) {
      console.error('Error extracting relationships:', error);
      return [];
    }
  }

  /**
   * 简化的实体融合方法
   */
  private async fuseEntities(entities: Entity[]): Promise<Entity[]> {
    if (entities.length <= 1) return entities;
    
    try {
      // 获取数据库中已有的所有实体
      const allEntities = await this.dbManager.getEntities();
      const entityMap = new Map<string, Entity>();
      
      // 将新实体添加到映射
      entities.forEach(entity => {
        if (entity.id) {
          entityMap.set(entity.id.toString(), entity);
        }
      });
      
      // 检查每个新实体与已有实体的相似度
      for (const entity of entities) {
        for (const dbEntity of allEntities) {
          // 跳过相同实体
          if (entity.id === dbEntity.id) continue;
          
          // 计算相似度
          const similarity = this.calculateEntitySimilarity(entity, dbEntity);
          
          // 如果相似度高，记录相似度关系
          if (similarity > 0.7 && entity.id && dbEntity.id) {
            try {
              // 使用addEntitySimilarity方法
              await this.dbManager.addEntitySimilarity(
                entity.id,
                dbEntity.id,
                similarity,
                'automatic'
              );
            } catch (error) {
              console.error('Failed to add entity similarity:', error);
            }
          }
          
          // 如果相似度非常高，考虑合并实体
          if (similarity > 0.9 && entity.id && dbEntity.id) {
            try {
              await this.mergeEntities(entity, dbEntity);
            } catch (error) {
              console.error('Failed to merge entities:', error);
            }
          }
        }
      }
      
      return Array.from(entityMap.values());
    } catch (error) {
      console.error('Error fusing entities:', error);
      return entities;
    }
  }

  /**
   * 计算两个实体的相似度
   */
  private calculateEntitySimilarity(entity1: Entity, entity2: Entity): number {
    // 名称完全相同
    if (entity1.name === entity2.name) return 1.0;
    
    // 检查类型
    if (entity1.type && entity2.type && entity1.type !== entity2.type) {
      return 0.3; // 类型不同，基础相似度低
    }
    
    // 计算名称的编辑距离
    const nameSimilarity = this.calculateStringSimilarity(entity1.name, entity2.name);
    
    // 简化的相似度计算，不使用别名
    return nameSimilarity;
  }

  /**
   * 计算两个字符串的相似度（基于编辑距离）
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    
    if (len1 === 0 || len2 === 0) return 0;
    
    // 计算最长公共子序列
    const dp: number[][] = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));
    
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        if (str1[i-1] === str2[j-1]) {
          dp[i][j] = dp[i-1][j-1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1]);
        }
      }
    }
    
    const lcsLength = dp[len1][len2];
    
    // 计算相似度：2 * LCS / (长度1 + 长度2)
    return (2 * lcsLength) / (len1 + len2);
  }

  /**
   * 合并两个实体
   */
  private async mergeEntities(sourceEntity: Entity, targetEntity: Entity): Promise<void> {
    if (!sourceEntity.id || !targetEntity.id) return;
    
    try {
      // 简化的合并逻辑，只添加别名
      await this.dbManager.addEntityAlias(targetEntity.id, sourceEntity.name);
      
      // 添加实体相似度记录
      await this.dbManager.addEntitySimilarity(
        targetEntity.id,
        sourceEntity.id,
        1.0,
        'manual_fusion'
      );
    } catch (error) {
      console.error('Failed to merge entities:', error);
    }
  }

  /**
   * 批量处理文档
   */
  async processBatch(documents: Document[]): Promise<Array<{
    docId: string;
    tokens: Token[];
    entities: Entity[];
    relationships: Relationship[];
    error?: string;
  }>> {
    const results = [];
    
    for (const doc of documents) {
      try {
        const { tokens, entities, relationships } = await this.processDocument(doc);
        results.push({
          docId: doc.id || '',
          tokens,
          entities,
          relationships,
        });
      } catch (error) {
        results.push({
          docId: doc.id || '',
          tokens: [],
          entities: [],
          relationships: [],
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    
    return results;
  }
}