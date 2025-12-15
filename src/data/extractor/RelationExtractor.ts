import type { Entity, Relationship, LLMConfig } from "../types"
import { RequestUtil } from "../utils/RequestUtil"

/**
 * 关系抽取器，负责从文本中识别实体之间的关系
 */
export class RelationExtractor {
  private relationPatterns: Map<string, RegExp[]>
  private customRelations: Map<string, RegExp[]>
  private llmConfig?: LLMConfig
  private requestUtil?: RequestUtil

  constructor() {
    this.relationPatterns = new Map()
    this.customRelations = new Map()
    this.initDefaultRelations()
  }

  /**
   * 初始化默认关系模式
   */
  private initDefaultRelations(): void {
    // 关联关系模式
    const associatePatterns = [/([^，。；；\s]+)与([^，。；；\s]+)相关/g, /([^，。；；\s]+)和([^，。；；\s]+)有关/g]

    // 属于关系模式
    const belongToPatterns = [/([^，。；；\s]+)属于([^，。；；\s]+)/g, /([^，。；；\s]+)是([^，。；；\s]+)的一部分/g]

    // 包含关系模式
    const containPatterns = [/([^，。；；\s]+)包含([^，。；；\s]+)/g, /([^，。；；\s]+)包括([^，。；；\s]+)/g]

    // 描述关系模式
    const describePatterns = [/([^，。；；\s]+)是([^，。；；\s]+)/g, /([^，。；；\s]+)被描述为([^，。；；\s]+)/g]

    // 引用关系模式
    const referencePatterns = [/([^，。；；\s]+)引用了([^，。；；\s]+)/g, /([^，。；；\s]+)参考了([^，。；；\s]+)/g]

    this.relationPatterns.set("associate", associatePatterns)
    this.relationPatterns.set("belong_to", belongToPatterns)
    this.relationPatterns.set("contain", containPatterns)
    this.relationPatterns.set("describe", describePatterns)
    this.relationPatterns.set("reference", referencePatterns)
  }

  /**
   * 添加自定义关系类型和模式
   */
  addCustomRelation(relationType: string, patterns: RegExp[]): void {
    this.customRelations.set(relationType, patterns)
  }

  /**
   * 配置大模型参数
   */
  configureLLM(config: LLMConfig, requestUtil?: RequestUtil): void {
    this.llmConfig = config

    // 如果没有提供RequestUtil，则创建一个新的
    if (requestUtil) {
      this.requestUtil = requestUtil
    } else if (config) {
      this.requestUtil = new RequestUtil({
        headers: {
          Authorization: config.apiKey ? `Bearer ${config.apiKey}` : "",
          ...config.headers,
        },
      })

      // 添加请求过滤器
      if (config.filters && config.filters.length > 0) {
        config.filters.forEach((filter) => {
          this.requestUtil!.addFilter(filter)
        })
      }
    }
  }

  /**
   * 从文本中提取实体之间的关系
   */
  async extract(entities: Entity[], text: string, docId: string): Promise<Relationship[]> {
    if (!entities || entities.length < 2) return []

    // 合并所有关系模式
    const allRelationPatterns = new Map([...this.relationPatterns, ...this.customRelations])

    // 基于规则的关系抽取
    const ruleRelationships = await this.extractByRules(entities, text, allRelationPatterns, docId)

    // 基于实体共现的关系抽取
    const cooccurrenceRelationships = await this.extractByCooccurrence(entities, text, docId)

    // 如果配置了大模型，使用大模型抽取
    let llmRelationships: Relationship[] = []
    if (this.llmConfig && this.requestUtil) {
      try {
        llmRelationships = await this.extractByLLM(entities, text, docId)
      } catch (error) {
        console.warn("LLM relationship extraction failed, falling back to rules:", error)
      }
    }

    // 合并关系（去重）
    return this.mergeRelationships([...ruleRelationships, ...cooccurrenceRelationships, ...llmRelationships])
  }

  /**
   * 基于规则的关系抽取
   */
  private async extractByRules(
    entities: Entity[],
    text: string,
    relationPatterns: Map<string, RegExp[]>,
    docId: string
  ): Promise<Relationship[]> {
    const relationships: Relationship[] = []
    const entityMap = this.buildEntityMap(entities)

    relationPatterns.forEach((patterns, relationType) => {
      patterns.forEach((pattern) => {
        let match
        const regex = new RegExp(pattern)

        while ((match = regex.exec(text)) !== null) {
          // 确保有捕获组
          if (match.length > 2) {
            const sourceEntityName = match[1]
            const targetEntityName = match[2]

            // 查找对应的实体
            const sourceEntities = entityMap.get(sourceEntityName) || []
            const targetEntities = entityMap.get(targetEntityName) || []

            // 创建关系
            for (const sourceEntity of sourceEntities) {
              for (const targetEntity of targetEntities) {
                // 确保在同一个文档中
                if (sourceEntity.docId === docId && targetEntity.docId === docId) {
                  relationships.push({
                    sourceEntityId: sourceEntity.id!,
                    targetEntityId: targetEntity.id!,
                    type: relationType,
                    docId: docId,
                    confidence: 0.8,
                    source: "rule",
                    evidenceText: match[0],
                  })
                }
              }
            }
          }

          // 防止无限循环
          if (match.index === regex.lastIndex) {
            regex.lastIndex++
          }
        }
      })
    })

    return relationships
  }

  /**
   * 基于实体共现的关系抽取
   */
  private async extractByCooccurrence(entities: Entity[], text: string, docId: string): Promise<Relationship[]> {
    const relationships: Relationship[] = []

    // 将文本分割为句子
    const sentences = text.split(/[。；！？\n]+/)

    sentences.forEach((sentence) => {
      // 查找句子中的实体
      const sentenceEntities = entities.filter((entity) => {
        return entity.docId === docId && sentence.includes(entity.name) && entity.id !== undefined
      })

      // 如果句子中有多个实体，创建共现关系
      if (sentenceEntities.length > 1) {
        for (let i = 0; i < sentenceEntities.length - 1; i++) {
          for (let j = i + 1; j < sentenceEntities.length; j++) {
            relationships.push({
              sourceEntityId: sentenceEntities[i].id!,
              targetEntityId: sentenceEntities[j].id!,
              type: "cooccur",
              docId: docId,
              confidence: 0.5, // 共现关系的置信度较低
              source: "cooccur",
              evidenceText: sentence,
            })
          }
        }
      }
    })

    return relationships
  }

  /**
   * 基于大模型的关系抽取
   */
  private async extractByLLM(entities: Entity[], text: string, docId: string): Promise<Relationship[]> {
    if (!this.llmConfig || !this.requestUtil || !this.llmConfig.endpoint) {
      return []
    }

    // 构建实体列表字符串
    const entityList = entities
      .filter((e) => e.id !== undefined)
      .map((e) => `${e.name}(${e.id})`)
      .join(", ")

    // 构建提示词
    const prompt =
      this.llmConfig.promptTemplate ||
      `
      请从以下文本中识别列出的实体之间的关系，并按照指定格式输出：
      
      文本：${text}
      
      实体列表：${entityList}
      
      请识别的关系类型包括：关联(associate)、属于(belong_to)、包含(contain)、描述(describe)、引用(reference)等。
      
      输出格式：JSON数组，每个对象包含sourceEntityId(源实体ID)、targetEntityId(目标实体ID)、type(关系类型)、evidenceText(证据文本)
    `

    // 调用大模型API
    const response = await this.requestUtil.post(this.llmConfig.endpoint, {
      model: this.llmConfig.model || "gpt-3.5-turbo",
      temperature: this.llmConfig.temperature || 0.0,
      messages: [
        { role: "system", content: "你是一个关系抽取助手，只返回JSON格式的关系列表。" },
        { role: "user", content: prompt },
      ],
    })

    // 解析响应
    let relationships: Relationship[] = []
    try {
      const content = response.choices?.[0]?.message?.content || ""
      const parsedRelationships = JSON.parse(content)

      relationships = parsedRelationships.map((rel: any) => ({
        sourceEntityId: parseInt(rel.sourceEntityId, 10),
        targetEntityId: parseInt(rel.targetEntityId, 10),
        type: rel.type,
        docId: docId,
        confidence: 0.9, // 大模型提取的置信度
        source: "llm",
        evidenceText: rel.evidenceText,
      }))
    } catch (error) {
      console.error("Failed to parse LLM response:", error)
    }

    return relationships
  }

  /**
   * 构建实体映射，用于快速查找
   */
  private buildEntityMap(entities: Entity[]): Map<string, Entity[]> {
    const entityMap = new Map<string, Entity[]>()

    entities.forEach((entity) => {
      if (!entityMap.has(entity.name)) {
        entityMap.set(entity.name, [])
      }
      entityMap.get(entity.name)!.push(entity)
    })

    return entityMap
  }

  /**
   * 合并关系（去重）
   */
  private mergeRelationships(relationships: Relationship[]): Relationship[] {
    const uniqueRelationships = new Map<string, Relationship>()

    relationships.forEach((rel) => {
      // 基于源实体、目标实体和关系类型的唯一键
      const key = `${rel.sourceEntityId}-${rel.targetEntityId}-${rel.type}`

      if (!uniqueRelationships.has(key) || (uniqueRelationships.get(key)?.confidence || 0) < (rel.confidence || 0)) {
        uniqueRelationships.set(key, rel)
      }
    })

    return Array.from(uniqueRelationships.values())
  }
}
