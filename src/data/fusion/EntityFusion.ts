import type { Entity, Relationship } from '../types';
import { DatabaseManager } from '../db/DatabaseManager';

/**
 * 实体融合策略类型
 */
export enum FusionStrategy {
  EXACT_MATCH = 'exact_match',      // 精确匹配
  FUZZY_MATCH = 'fuzzy_match',      // 模糊匹配
  SEMANTIC_MATCH = 'semantic_match' // 语义匹配
}

/**
 * 实体融合配置
 */
export interface FusionConfig {
  strategy: FusionStrategy;
  threshold: number;
  considerType: boolean;
  considerContext: boolean;
}

/**
 * 实体融合器，负责融合相似实体
 */
export class EntityFusion {
  private dbManager: DatabaseManager;
  private defaultConfig: FusionConfig = {
    strategy: FusionStrategy.FUZZY_MATCH,
    threshold: 0.8,
    considerType: true,
    considerContext: false,
  };

  constructor(dbManager: DatabaseManager) {
    this.dbManager = dbManager;
  }

  /**
   * 执行实体融合
   */
  async execute(entities: Entity[], config?: Partial<FusionConfig>): Promise<Entity[]> {
    if (entities.length <= 1) return entities;
    
    // 合并配置
    const fusionConfig = { ...this.defaultConfig, ...config };
    
    // 获取已存在的实体
    const existingEntities = await this.dbManager.getEntities();
    
    // 所有实体集合
    const allEntities = [...entities, ...existingEntities];
    
    // 构建实体相似度矩阵
    const similarityMatrix = await this.buildSimilarityMatrix(allEntities, fusionConfig);
    
    // 基于相似度矩阵执行聚类
    const clusters = this.clusterEntities(similarityMatrix, fusionConfig.threshold);
    
    // 合并每个聚类中的实体
    const mergedEntities = await this.mergeClusters(clusters, allEntities, fusionConfig);
    
    // 过滤出新添加的实体对应的融合结果
    return this.mapToOriginalEntities(mergedEntities, entities);
  }

  /**
   * 构建实体相似度矩阵
   */
  private async buildSimilarityMatrix(entities: Entity[], config: FusionConfig): Promise<number[][]> {
    const n = entities.length;
    const matrix = Array(n).fill(null).map(() => Array(n).fill(0));
    
    for (let i = 0; i < n; i++) {
      for (let j = i; j < n; j++) {
        let similarity = 0;
        
        if (i === j) {
          similarity = 1.0;
        } else {
          switch (config.strategy) {
            case FusionStrategy.EXACT_MATCH:
              similarity = this.calculateExactMatchSimilarity(entities[i], entities[j]);
              break;
              
            case FusionStrategy.FUZZY_MATCH:
              similarity = this.calculateFuzzyMatchSimilarity(entities[i], entities[j]);
              break;
              
            case FusionStrategy.SEMANTIC_MATCH:
              similarity = await this.calculateSemanticSimilarity(entities[i], entities[j]);
              break;
          }
          
          // 考虑实体类型
          if (config.considerType && entities[i].type && entities[j].type && entities[i].type !== entities[j].type) {
            similarity *= 0.5; // 类型不匹配时降低相似度
          }
          
          // 考虑上下文（如果实体有上下文信息）
          if (config.considerContext) {
            const contextSimilarity = this.calculateContextSimilarity(entities[i], entities[j]);
            similarity = (similarity + contextSimilarity) / 2;
          }
        }
        
        matrix[i][j] = similarity;
        matrix[j][i] = similarity;
      }
    }
    
    return matrix;
  }

  /**
   * 精确匹配相似度计算
   */
  private calculateExactMatchSimilarity(entity1: Entity, entity2: Entity): number {
    // 名称完全相同
    if (entity1.name === entity2.name) return 1.0;
    
    // 检查别名
    if (entity1.aliases) {
      for (const alias of entity1.aliases) {
        if (alias === entity2.name) return 1.0;
      }
    }
    
    if (entity2.aliases) {
      for (const alias of entity2.aliases) {
        if (alias === entity1.name) return 1.0;
      }
    }
    
    // 检查规范化名称
    if (entity1.normalizedName && entity2.normalizedName && entity1.normalizedName === entity2.normalizedName) {
      return 1.0;
    }
    
    return 0.0;
  }

  /**
   * 模糊匹配相似度计算
   */
  private calculateFuzzyMatchSimilarity(entity1: Entity, entity2: Entity): number {
    // 计算名称相似度
    const nameSim = this.calculateStringSimilarity(entity1.name, entity2.name);
    
    // 计算别名相似度
    let maxAliasSim = 0;
    if (entity1.aliases) {
      for (const alias of entity1.aliases) {
        const sim = this.calculateStringSimilarity(alias, entity2.name);
        maxAliasSim = Math.max(maxAliasSim, sim);
      }
    }
    
    if (entity2.aliases) {
      for (const alias of entity2.aliases) {
        const sim = this.calculateStringSimilarity(entity1.name, alias);
        maxAliasSim = Math.max(maxAliasSim, sim);
      }
    }
    
    // 返回最高相似度
    return Math.max(nameSim, maxAliasSim);
  }

  /**
   * 语义相似度计算（简化版）
   */
  private async calculateSemanticSimilarity(entity1: Entity, entity2: Entity): Promise<number> {
    // 这里可以接入外部语义相似度API
    // 目前使用模糊匹配作为降级方案
    return this.calculateFuzzyMatchSimilarity(entity1, entity2);
  }

  /**
   * 上下文相似度计算
   */
  private calculateContextSimilarity(entity1: Entity, entity2: Entity): number {
    // 如果没有上下文信息，返回0
    if (!entity1.contextWords || !entity2.contextWords || 
        entity1.contextWords.length === 0 || entity2.contextWords.length === 0) {
      return 0.0;
    }
    
    // 计算共同上下文词的数量
    const set1 = new Set(entity1.contextWords);
    const set2 = new Set(entity2.contextWords);
    
    let intersectionSize = 0;
    for (const word of set1) {
      if (set2.has(word)) {
        intersectionSize++;
      }
    }
    
    // Jaccard相似度
    const unionSize = set1.size + set2.size - intersectionSize;
    return unionSize > 0 ? intersectionSize / unionSize : 0.0;
  }

  /**
   * 字符串相似度计算（Levenshtein距离）
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    
    // 边界情况
    if (len1 === 0 || len2 === 0) return 0;
    if (Math.abs(len1 - len2) / Math.max(len1, len2) > 0.5) return 0;
    
    // Levenshtein距离矩阵
    const dp: number[][] = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));
    
    // 初始化
    for (let i = 0; i <= len1; i++) dp[i][0] = i;
    for (let j = 0; j <= len2; j++) dp[0][j] = j;
    
    // 填充矩阵
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i-1].toLowerCase() === str2[j-1].toLowerCase() ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i-1][j] + 1,           // 删除
          dp[i][j-1] + 1,           // 插入
          dp[i-1][j-1] + cost       // 替换
        );
      }
    }
    
    // 计算相似度
    const maxLen = Math.max(len1, len2);
    const distance = dp[len1][len2];
    return Math.max(0, 1 - distance / maxLen);
  }

  /**
   * 实体聚类
   */
  private clusterEntities(similarityMatrix: number[][], threshold: number): number[][] {
    const n = similarityMatrix.length;
    const visited = new Array(n).fill(false);
    const clusters: number[][] = [];
    
    for (let i = 0; i < n; i++) {
      if (!visited[i]) {
        const cluster = this.dfs(i, similarityMatrix, visited, threshold);
        clusters.push(cluster);
      }
    }
    
    return clusters;
  }

  /**
   * DFS遍历查找相似实体聚类
   */
  private dfs(start: number, similarityMatrix: number[][], visited: boolean[], threshold: number): number[] {
    const cluster: number[] = [];
    const stack = [start];
    
    while (stack.length > 0) {
      const current = stack.pop()!;
      
      if (visited[current]) continue;
      visited[current] = true;
      cluster.push(current);
      
      // 查找所有相似度高于阈值的未访问实体
      for (let i = 0; i < similarityMatrix[current].length; i++) {
        if (!visited[i] && similarityMatrix[current][i] >= threshold) {
          stack.push(i);
        }
      }
    }
    
    return cluster;
  }

  /**
   * 合并聚类中的实体
   */
  private async mergeClusters(clusters: number[][], entities: Entity[], config: FusionConfig): Promise<Map<string, Entity>> {
    const mergedMap = new Map<string, Entity>();
    
    for (const cluster of clusters) {
      if (cluster.length === 1) {
        // 单个实体，不需要合并
        const entity = entities[cluster[0]];
        if (entity.id) {
          mergedMap.set(entity.id, entity);
        }
        continue;
      }
      
      // 选择主实体（通常是已有ID的实体）
      let mainEntity = cluster
        .map(idx => entities[idx])
        .find(e => e.id && e.id.startsWith('entity_')); // 假设有ID的实体是已存储的
      
      // 如果没有已有实体，选择第一个实体作为主实体
      if (!mainEntity) {
        mainEntity = entities[cluster[0]];
      }
      
      // 合并其他实体到主实体
      const mergedEntity = await this.mergeEntityCluster(mainEntity, cluster.map(idx => entities[idx]), config);
      
      if (mergedEntity.id) {
        mergedMap.set(mergedEntity.id, mergedEntity);
      }
    }
    
    return mergedMap;
  }

  /**
   * 合并实体聚类中的实体
   */
  private async mergeEntityCluster(mainEntity: Entity, clusterEntities: Entity[], config: FusionConfig): Promise<Entity> {
    const mergedEntity: Entity = {
      ...mainEntity,
      aliases: new Set(mainEntity.aliases || []),
      contextWords: new Set(mainEntity.contextWords || []),
      occurrences: 0,
    };
    
    // 收集所有别名
    for (const entity of clusterEntities) {
      if (entity.id && entity.id !== mergedEntity.id && entity.name !== mergedEntity.name) {
        mergedEntity.aliases!.add(entity.name);
      }
      
      if (entity.aliases) {
        entity.aliases.forEach(alias => mergedEntity.aliases!.add(alias));
      }
      
      // 合并上下文词
      if (entity.contextWords) {
        entity.contextWords.forEach(word => mergedEntity.contextWords!.add(word));
      }
      
      // 累加出现次数
      mergedEntity.occurrences += entity.occurrences || 1;
    }
    
    // 转换Set为数组
    mergedEntity.aliases = Array.from(mergedEntity.aliases!);
    mergedEntity.contextWords = Array.from(mergedEntity.contextWords!);
    
    // 更新数据库
    if (mergedEntity.id) {
      await this.dbManager.updateEntity(mergedEntity);
      
      // 为所有被合并的实体创建别名映射
      for (const entity of clusterEntities) {
        if (entity.id && entity.id !== mergedEntity.id) {
          try {
            // 尝试不同的方法名调用，兼容不同版本的DatabaseManager
            try {
              await this.dbManager.insertEntityAlias({
                entityId: mergedEntity.id!,
                alias: entity.name,
              });
            } catch (e) {
              // 尝试替代方法名
              await this.dbManager.addEntityAlias(mergedEntity.id!, entity.name);
            }
            
            // 添加实体相似度记录
            await this.dbManager.addEntitySimilarity(
              mergedEntity.id!,
              entity.id,
              1.0,
              'fusion'
            );
            
            // 更新关系引用
            try {
              await this.dbManager.updateRelationshipsTarget(entity.id, mergedEntity.id!);
              await this.dbManager.updateRelationshipsSource(entity.id, mergedEntity.id!);
            } catch (e) {
              // 忽略可能不存在的方法
              console.log('Relationship update methods not available');
            }
          } catch (error) {
            console.error('Error during entity merge:', error);
          }
        }
      }
    }
    
    return mergedEntity;
  }

  /**
   * 将融合后的实体映射回原始实体列表
   */
  private mapToOriginalEntities(mergedMap: Map<string, Entity>, originalEntities: Entity[]): Entity[] {
    const result: Entity[] = [];
    
    for (const entity of originalEntities) {
      if (entity.id && mergedMap.has(entity.id)) {
        result.push(mergedMap.get(entity.id)!);
      } else {
        result.push(entity);
      }
    }
    
    return result;
  }

  /**
   * 手动合并两个实体
   */
  async mergeEntities(sourceEntityId: string, targetEntityId: string): Promise<Entity> {
    // 获取两个实体
    const sourceEntity = await this.dbManager.getEntityById(sourceEntityId);
    const targetEntity = await this.dbManager.getEntityById(targetEntityId);
    
    if (!sourceEntity || !targetEntity) {
      throw new Error('One or both entities not found');
    }
    
    // 合并实体
    const mergedEntity: Entity = {
      ...targetEntity,
      aliases: new Set([
        ...(targetEntity.aliases || []),
        ...(sourceEntity.aliases || []),
        sourceEntity.name
      ]),
      contextWords: new Set([
        ...(targetEntity.contextWords || []),
        ...(sourceEntity.contextWords || [])
      ]),
      occurrences: (targetEntity.occurrences || 0) + (sourceEntity.occurrences || 0)
    };
    
    // 转换Set为数组
    mergedEntity.aliases = Array.from(mergedEntity.aliases);
    mergedEntity.contextWords = Array.from(mergedEntity.contextWords);
    
    // 更新数据库
    await this.dbManager.updateEntity(mergedEntity);
    
    // 创建别名映射 - 尝试不同的方法名
    try {
      await this.dbManager.insertEntityAlias({
        entityId: targetEntityId,
        alias: sourceEntity.name
      });
    } catch (e) {
      try {
        await this.dbManager.addEntityAlias(targetEntityId, sourceEntity.name);
      } catch (err) {
        console.error('Failed to add entity alias:', err);
      }
    }
    
    // 添加实体相似度记录
    try {
      await this.dbManager.addEntitySimilarity(
        targetEntityId,
        sourceEntityId,
        1.0,
        'manual_fusion'
      );
    } catch (e) {
      console.error('Failed to add entity similarity:', e);
    }
    
    // 更新关系引用 - 忽略可能不存在的方法
    try {
      await this.dbManager.updateRelationshipsTarget(sourceEntityId, targetEntityId);
      await this.dbManager.updateRelationshipsSource(sourceEntityId, targetEntityId);
    } catch (e) {
      console.log('Relationship update methods not available');
    }
    
    return mergedEntity;
  }
}