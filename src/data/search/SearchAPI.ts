import type { Document, Entity, Relationship, SearchOptions, SearchResult, NetworkGraph } from "../types"
import { DatabaseManager } from "../db/DatabaseManager"
import { Tokenizer } from "../processor/Tokenizer"

/**
 * 搜索API类，提供全文搜索和实体搜索功能
 */
export class SearchAPI {
  private dbManager: DatabaseManager
  private tokenizer: Tokenizer

  constructor(dbManager: DatabaseManager) {
    this.dbManager = dbManager
    this.tokenizer = new Tokenizer()
  }

  /**
   * 搜索文档
   */
  async searchDocuments(query: string, options: SearchOptions = {}): Promise<SearchResult<Document>[]> {
    try {
      // 分词查询
      const queryTokens = this.tokenizer.tokenize(query)

      // 默认搜索选项
      const searchOptions = {
        limit: 10,
        offset: 0,
        fuzzy: false,
        sortBy: "relevance",
        ...options,
      }

      // 获取匹配的文档ID和分数
      const docScores = await this.calculateDocumentRelevance(queryTokens, searchOptions)

      // 获取文档详情
      const results: SearchResult<Document>[] = []

      for (const { docId, score, highlights } of docScores) {
        try {
          const doc = await this.dbManager.getDocument(docId)
          if (doc) {
            results.push({
              item: doc,
              score,
              highlights,
              matchPositions: [], // 可以扩展实现
            })
          }
        } catch (error) {
          console.error(`Failed to retrieve document ${docId}:`, error)
        }
      }

      // 排序和分页
      return this.sortAndPaginate(results, searchOptions)
    } catch (error) {
      console.error("Error in searchDocuments:", error)
      return []
    }
  }

  /**
   * 搜索实体
   */
  async searchEntities(query: string, options: SearchOptions = {}): Promise<SearchResult<Entity>[]> {
    try {
      // 默认搜索选项
      const searchOptions = {
        limit: 10,
        offset: 0,
        fuzzy: false,
        sortBy: "relevance",
        entityTypes: [],
        ...options,
      }

      // 搜索实体
      const entities = await this.dbManager.getEntities(query, searchOptions)

      // 转换为搜索结果格式
      const results: SearchResult<Entity>[] = entities.map((entity) => ({
        item: entity,
        score: entity.score || 1.0,
        highlights: [entity.name],
        matchPositions: [],
      }))

      // 排序和分页
      return this.sortAndPaginate(results, searchOptions)
    } catch (error) {
      console.error("Error in searchEntities:", error)
      return []
    }
  }

  /**
   * 搜索关系
   */
  async searchRelationships(
    options: {
      sourceEntityId?: string
      targetEntityId?: string
      relationType?: string
      limit?: number
      offset?: number
    } = {}
  ): Promise<Relationship[]> {
    try {
      // 默认选项
      const searchOptions = {
        limit: 50,
        offset: 0,
        ...options,
      }

      return await this.dbManager.getRelationships(searchOptions)
    } catch (error) {
      console.error("Error in searchRelationships:", error)
      return []
    }
  }

  /**
   * 计算文档相关性分数
   */
  private async calculateDocumentRelevance(
    queryTokens: any[],
    options: SearchOptions
  ): Promise<Array<{ docId: string; score: number; highlights: string[] }>> {
    try {
      // 文档分数映射
      const docScoreMap = new Map<string, { score: number; highlights: Set<string> }>()

      // 计算查询词在文档中的TF-IDF
      for (const token of queryTokens) {
        try {
          // 获取包含该词的倒排索引
          const indexes = await this.dbManager.getInvertedIndex(token.text, options.fuzzy)

          // 计算每个文档的分数
          for (const index of indexes) {
            const docId = index.docId

            if (!docScoreMap.has(docId)) {
              docScoreMap.set(docId, { score: 0, highlights: new Set() })
            }

            // 计算TF-IDF分数
            const tf = index.termFrequency / index.totalTokens // 归一化的词频
            const idf = Math.log(index.totalDocuments / index.docFrequency)
            const tfIdfScore = tf * idf

            // 累加分值
            const docScore = docScoreMap.get(docId)!
            docScore.score += tfIdfScore

            // 添加高亮
            docScore.highlights.add(token.text)
          }
        } catch (error) {
          console.error(`Error processing token ${token.text}:`, error)
        }
      }

      // 转换为数组并计算最终分数
      const results: Array<{ docId: string; score: number; highlights: string[] }> = []

      docScoreMap.forEach((value, docId) => {
        results.push({
          docId,
          score: value.score,
          highlights: Array.from(value.highlights),
        })
      })

      // 按照分数排序
      return results.sort((a, b) => b.score - a.score)
    } catch (error) {
      console.error("Error in calculateDocumentRelevance:", error)
      return []
    }
  }

  /**
   * 排序和分页
   */
  private sortAndPaginate<T>(results: SearchResult<T>[], options: SearchOptions): SearchResult<T>[] {
    // 排序
    const sortedResults = [...results]

    switch (options.sortBy) {
      case "score":
      case "relevance":
        sortedResults.sort((a, b) => (b.score || 0) - (a.score || 0))
        break

      case "createdAt":
        sortedResults.sort((a, b) => {
          const dateA = (a.item as any).createdAt || 0
          const dateB = (b.item as any).createdAt || 0
          return dateB - dateA
        })
        break

      case "updatedAt":
        sortedResults.sort((a, b) => {
          const dateA = (a.item as any).updatedAt || 0
          const dateB = (b.item as any).updatedAt || 0
          return dateB - dateA
        })
        break
    }

    // 分页
    const { limit, offset } = options
    return sortedResults.slice(offset, offset + limit)
  }

  /**
   * 获取实体的知识图谱
   */
  async getEntityGraph(
    entityId: string,
    options: {
      depth?: number
      includeReverse?: boolean
    } = {}
  ): Promise<NetworkGraph> {
    try {
      // 默认选项
      const graphOptions = {
        depth: 2,
        includeReverse: true,
        ...options,
      }

      // 实体节点和关系边
      const nodes = new Map<string, Entity>()
      const edges = new Map<string, Relationship>()

      // 递归获取关系
      await this.fetchEntityRelations(entityId, 0, graphOptions, nodes, edges, new Set())

      // 构建图数据结构
      return {
        nodes: Array.from(nodes.values()),
        edges: Array.from(edges.values()),
      }
    } catch (error) {
      console.error(`Error getting entity graph for ${entityId}:`, error)
      return { nodes: [], edges: [] }
    }
  }

  /**
   * 递归获取实体关系
   */
  private async fetchEntityRelations(
    entityId: string,
    currentDepth: number,
    options: { depth: number; includeReverse: boolean },
    nodes: Map<string, Entity>,
    edges: Map<string, Relationship>,
    visited: Set<string>
  ): Promise<void> {
    // 如果达到最大深度或已访问，停止递归
    if (currentDepth > options.depth || visited.has(entityId)) {
      return
    }

    visited.add(entityId)

    try {
      // 获取实体信息
      const entity = await this.dbManager.getEntity(entityId)
      if (!entity) return

      nodes.set(entityId, entity)

      // 获取出边关系
      const outgoingRels = await this.dbManager.getRelationships({
        sourceEntityId: entityId,
      })

      for (const rel of outgoingRels) {
        const edgeKey = `${rel.sourceEntityId}-${rel.targetEntityId}-${rel.type}`
        if (!edges.has(edgeKey)) {
          edges.set(edgeKey, rel)
        }

        // 递归获取目标实体的关系
        if (currentDepth < options.depth) {
          await this.fetchEntityRelations(rel.targetEntityId, currentDepth + 1, options, nodes, edges, visited)
        }
      }

      // 获取入边关系（如果需要）
      if (options.includeReverse) {
        const incomingRels = await this.dbManager.getRelationships({
          targetEntityId: entityId,
        })

        for (const rel of incomingRels) {
          const edgeKey = `${rel.sourceEntityId}-${rel.targetEntityId}-${rel.type}`
          if (!edges.has(edgeKey)) {
            edges.set(edgeKey, rel)
          }

          // 递归获取源实体的关系
          if (currentDepth < options.depth) {
            await this.fetchEntityRelations(rel.sourceEntityId, currentDepth + 1, options, nodes, edges, visited)
          }
        }
      }
    } catch (error) {
      console.error(`Error fetching entity relations for ${entityId}:`, error)
    }
  }

  /**
   * 获取两个实体之间的路径
   */
  async findEntityPath(sourceEntityId: string, targetEntityId: string, maxDepth: number = 3): Promise<Relationship[]> {
    try {
      // BFS查找最短路径
      const queue: Array<{ entityId: string; path: Relationship[] }> = [
        {
          entityId: sourceEntityId,
          path: [],
        },
      ]

      const visited = new Set<string>([sourceEntityId])

      while (queue.length > 0) {
        const { entityId, path } = queue.shift()!

        // 找到目标实体
        if (entityId === targetEntityId) {
          return path
        }

        // 如果超过最大深度，停止搜索
        if (path.length >= maxDepth) {
          continue
        }

        try {
          // 获取所有相关关系
          const outgoingRels = await this.dbManager.getRelationships({
            sourceEntityId: entityId,
          })

          const incomingRels = await this.dbManager.getRelationships({
            targetEntityId: entityId,
          })

          const allRels = [...outgoingRels, ...incomingRels]

          // 探索下一层
          for (const rel of allRels) {
            let nextEntityId: string
            let newPath: Relationship[]

            if (rel.sourceEntityId === entityId) {
              // 出边
              nextEntityId = rel.targetEntityId
              newPath = [...path, rel]
            } else {
              // 入边
              nextEntityId = rel.sourceEntityId
              newPath = [
                ...path,
                {
                  ...rel,
                  // 标记为反向关系
                  type: `${rel.type}_reverse`,
                },
              ]
            }

            if (!visited.has(nextEntityId)) {
              visited.add(nextEntityId)
              queue.push({ entityId: nextEntityId, path: newPath })
            }
          }
        } catch (error) {
          console.error(`Error finding path from ${entityId}:`, error)
        }
      }
    } catch (error) {
      console.error(`Error in findEntityPath between ${sourceEntityId} and ${targetEntityId}:`, error)
    }

    // 没有找到路径
    return []
  }

  /**
   * 高级搜索（支持复合条件）
   */
  async advancedSearch(
    query: {
      text?: string
      entityTypes?: string[]
      dateRange?: { from?: number; to?: number }
      tags?: string[]
    },
    options: SearchOptions = {}
  ): Promise<SearchResult<Document>[]> {
    try {
      // 基础文本搜索
      let results: SearchResult<Document>[] = []

      if (query.text) {
        results = await this.searchDocuments(query.text, options)
      } else {
        // 如果没有文本查询，获取所有文档
        // 注意：这里简化处理，实际应该通过DatabaseManager的适当方法获取
        results = []
      }

      // 应用过滤条件
      results = results.filter((result) => {
        const doc = result.item

        // 日期范围过滤
        if (query.dateRange) {
          const { from, to } = query.dateRange
          if (from && (doc.createdAt || 0) < from) return false
          if (to && (doc.createdAt || 0) > to) return false
        }

        // 标签过滤
        if (query.tags && query.tags.length > 0) {
          if (!doc.tags || !query.tags.some((tag) => doc.tags.includes(tag))) {
            return false
          }
        }

        return true
      })

      // 排序和分页
      return this.sortAndPaginate(results, options)
    } catch (error) {
      console.error("Error in advancedSearch:", error)
      return []
    }
  }
}
