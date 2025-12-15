import { DatabaseManager } from "../data/db/DatabaseManager"
import { SearchAPI } from "../data/search/SearchAPI"
import type { NetworkGraph } from "../data/types"

/**
 * 图数据API服务
 * 提供从搜索到图数据生成的完整服务流程
 */
export class GraphAPIService {
  private searchAPI: SearchAPI
  private dbManager: DatabaseManager

  constructor(dbManager: DatabaseManager) {
    this.dbManager = dbManager
    this.searchAPI = new SearchAPI(dbManager)
  }

  /**
   * 根据搜索查询生成知识图谱数据
   * @param query 搜索查询词
   * @returns G6兼容的图数据格式
   */
  async generateGraphDataFromSearch(query: string): Promise<any> {
    try {
      // 1. 搜索实体
      const entityResults = await this.searchAPI.searchEntities(query)
      
      if (entityResults.length === 0) {
        return { nodes: [], edges: [] }
      }

      // 2. 获取第一个实体的图谱数据
      const firstEntity = entityResults[0].item
      const graphData = await this.searchAPI.getEntityGraph(String(firstEntity.id), {
        depth: 2,
        includeReverse: true,
      })

      // 3. 适配为G6格式
      return this.adaptToG6Format(graphData)
    } catch (error) {
      console.error("Error generating graph data from search:", error)
      throw error
    }
  }

  /**
   * 将NetworkGraph格式适配为G6兼容格式
   * @param networkGraph 数据库查询得到的网络图数据
   * @returns G6兼容的图数据格式
   */
  private adaptToG6Format(networkGraph: NetworkGraph): any {
    try {
      // 转换节点
      const nodes = networkGraph.nodes.map((node) => ({
        id: `node_${node.id}`,
        label: node.name,
        type: node.type,
        // 添加G6需要的其他属性
        style: {
          fill: this.getNodeColorByType(node.type),
          stroke: "#5B8FF9",
        },
        size: 40,
      }))

      // 转换边
      const edges = networkGraph.edges.map((edge) => ({
        source: `node_${edge.source}`,
        target: `node_${edge.target}`,
        label: edge.type,
        // 添加G6需要的其他属性
        style: {
          stroke: "#ccc",
          endArrow: {
            path: "M 0,0 L 8,4 L 8,-4 Z",
            fill: "#ccc",
          },
        },
      }))

      return { nodes, edges }
    } catch (error) {
      console.error("Error adapting graph data to G6 format:", error)
      return { nodes: [], edges: [] }
    }
  }

  /**
   * 根据实体类型获取节点颜色
   * @param entityType 实体类型
   * @returns 颜色值
   */
  private getNodeColorByType(entityType: string): string {
    const colorMap: Record<string, string> = {
      person: "#FF6B6B",
      organization: "#4ECDC4",
      location: "#45B7D1",
      concept: "#96CEB4",
      event: "#FFEAA7",
      product: "#DDA0DD",
      technology: "#98D8C8",
      default: "#5B8FF9",
    }

    return colorMap[entityType.toLowerCase()] || colorMap["default"]
  }

  /**
   * 获取所有实体的图谱数据
   * @returns G6兼容的图数据格式
   */
  async getAllGraphData(): Promise<any> {
    try {
      // 获取所有实体
      const allEntities = await this.dbManager.getAllEntities()
      
      if (allEntities.length === 0) {
        return { nodes: [], edges: [] }
      }

      // 构建节点
      const nodes = allEntities.map((entity) => ({
        id: `node_${entity.id}`,
        label: entity.name,
        type: entity.type,
        style: {
          fill: this.getNodeColorByType(entity.type),
          stroke: "#5B8FF9",
        },
        size: 40,
      }))

      // 获取所有关系
      const allRelationships = await this.dbManager.getAllRelationships()
      
      // 构建边
      const edges = allRelationships.map((relationship) => ({
        source: `node_${relationship.sourceEntityId}`,
        target: `node_${relationship.targetEntityId}`,
        label: relationship.type,
        style: {
          stroke: "#ccc",
          endArrow: {
            path: "M 0,0 L 8,4 L 8,-4 Z",
            fill: "#ccc",
          },
        },
      }))

      return { nodes, edges }
    } catch (error) {
      console.error("Error getting all graph data:", error)
      throw error
    }
  }
}