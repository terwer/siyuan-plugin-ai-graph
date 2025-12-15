import type { Entity, LLMConfig } from "../types"
import { RequestUtil } from "../utils/RequestUtil"

/**
 * 实体抽取器，负责从文本中识别实体
 */
export class EntityExtractor {
  private customEntityTypes: Map<string, RegExp[]>
  private entityRules: Map<string, RegExp[]>
  private llmConfig?: LLMConfig
  private requestUtil?: RequestUtil

  constructor() {
    this.customEntityTypes = new Map()
    this.entityRules = new Map()
    this.initDefaultRules()
  }

  /**
   * 初始化默认实体识别规则
   */
  private initDefaultRules(): void {
    // 人名识别规则（简化版）
    const personRules = [
      /[\u4e00-\u9fa5]{2,4}/g, // 2-4个中文字符，可能是人名
    ]

    // 地名识别规则（简化版）
    const locationRules = [
      /[\u4e00-\u9fa5]+[省市县区乡镇村]/g, // 包含行政区划后缀的地名
    ]

    // 组织名识别规则（简化版）
    const organizationRules = [
      /[\u4e00-\u9fa5]+[公司企业集团大学学院医院]/g, // 包含组织类型后缀
    ]

    // 数字识别规则
    const numberRules = [
      /\d+(\.\d+)?/g, // 整数或小数
    ]

    // 时间识别规则
    const timeRules = [
      /\d{4}[-/年]\d{1,2}[-/月]\d{1,2}([日号])?/g, // 日期格式
      /\d{1,2}:\d{2}(:\d{2})?/g, // 时间格式
    ]

    this.entityRules.set("person", personRules)
    this.entityRules.set("location", locationRules)
    this.entityRules.set("organization", organizationRules)
    this.entityRules.set("number", numberRules)
    this.entityRules.set("time", timeRules)
  }

  /**
   * 添加自定义实体类型和识别规则
   */
  addCustomEntityType(typeName: string, rules: RegExp[]): void {
    this.customEntityTypes.set(typeName, rules)
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
   * 从文本中提取实体
   */
  async extract(text: string, docId: string): Promise<Entity[]> {
    if (!text) return []

    // 如果配置了大模型，使用大模型抽取
    if (this.llmConfig && this.requestUtil) {
      try {
        const llmEntities = await this.extractByLLM(text, docId)
        return llmEntities
      } catch (error) {
        console.warn("LLM entity extraction failed, falling back to rules:", error)
      }
    }

    // 合并所有实体类型的规则
    const allEntityRules = new Map([...this.entityRules, ...this.customEntityTypes])

    // 基于规则的实体抽取
    const ruleEntities = await this.extractByRules(text, allEntityRules, docId)
    return ruleEntities
  }

  /**
   * 基于规则的实体抽取
   */
  private async extractByRules(text: string, entityRules: Map<string, RegExp[]>, docId: string): Promise<Entity[]> {
    const entities: Entity[] = []

    // 用于记录已提取的实体位置，避免重复
    const extractedPositions = new Set<string>()

    entityRules.forEach((rules, entityType) => {
      rules.forEach((rule) => {
        let match
        const regex = new RegExp(rule)

        while ((match = regex.exec(text)) !== null) {
          const entityName = match[0]
          const startPos = match.index
          const endPos = startPos + entityName.length

          // 检查是否已提取（基于位置）
          const positionKey = `${startPos}-${endPos}`
          if (!extractedPositions.has(positionKey)) {
            extractedPositions.add(positionKey)

            entities.push({
              name: entityName,
              type: entityType,
              docId: docId,
              startPos: startPos,
              endPos: endPos,
              source: "rule",
              confidence: 0.7, // 规则提取的置信度
            })
          }

          // 防止无限循环
          if (match.index === regex.lastIndex) {
            regex.lastIndex++
          }
        }
      })
    })

    return entities
  }

  /**
   * 基于词典的实体抽取（预留接口）
   */
  async extractByDictionary(text: string, docId: string): Promise<Entity[]> {
    // 这里可以实现基于词典的实体抽取
    // 目前返回空数组
    return []
  }

  /**
   * 基于大模型的实体抽取
   */
  private async extractByLLM(text: string, docId: string): Promise<Entity[]> {
    if (!this.llmConfig || !this.requestUtil || !this.llmConfig.endpoint) {
      return []
    }

    // 构建提示词
    const prompt =
      this.llmConfig.promptTemplate ||
      `
      请从以下文本中提取所有实体，并按照指定格式输出：
      
      文本：${text}
      
      请提取的实体类型包括：人名、地名、组织名、时间、数字等。
      
      输出格式：JSON数组，每个对象包含name(实体名称)、type(实体类型)、start(起始位置)、end(结束位置)
    `

    // 调用大模型API
    const response = await this.requestUtil.post(this.llmConfig.endpoint, {
      model: this.llmConfig.model || "gpt-3.5-turbo",
      temperature: this.llmConfig.temperature || 0.0,
      messages: [
        { role: "system", content: "你是一个实体抽取助手，只返回JSON格式的实体列表。" },
        { role: "user", content: prompt },
      ],
    })

    // 解析响应
    let llmEntities: Entity[] = []
    try {
      // 假设大模型返回的格式是标准的
      const content = response.choices?.[0]?.message?.content || ""
      const parsedEntities = JSON.parse(content)

      llmEntities = parsedEntities.map((entity: any) => ({
        name: entity.name,
        type: entity.type,
        docId: docId,
        startPos: entity.start,
        endPos: entity.end,
        source: "llm",
        confidence: 0.9, // 大模型提取的置信度
      }))
    } catch (error) {
      console.error("Failed to parse LLM response:", error)
    }

    return llmEntities
  }

  /**
   * 合并实体（去重）
   */
  private mergeEntities(entities: Entity[]): Entity[] {
    const uniqueEntities = new Map<string, Entity>()

    entities.forEach((entity) => {
      // 基于位置和名称的唯一键
      const key = `${entity.docId}-${entity.startPos}-${entity.endPos}-${entity.name}`

      if (!uniqueEntities.has(key) || (uniqueEntities.get(key)?.confidence || 0) < (entity.confidence || 0)) {
        uniqueEntities.set(key, entity)
      }
    })

    return Array.from(uniqueEntities.values())
  }
}
