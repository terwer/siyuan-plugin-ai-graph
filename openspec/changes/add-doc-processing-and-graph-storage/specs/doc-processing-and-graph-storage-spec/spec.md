# 文档分词、索引和图数据存储技术规范

## ADDED Requirements

### Requirement: 文档分词功能
系统 SHALL 实现多语言文本分词功能，包括中文分词、英文词元化和混合文本处理，以支持后续的索引构建和实体提取。

#### Scenario: 中文文本分词
- **WHEN** 处理包含中文的文档时
- **THEN** 应使用 nodejieba 库正确分词
- **THEN** 应保留词语在原文本中的位置信息

#### Scenario: 英文文本分词
- **WHEN** 处理包含英文的文档时
- **THEN** 应使用正则表达式进行词元化
- **THEN** 应保留字母、数字组合和特殊符号

### 技术实现
- **中文分词引擎**: nodejieba，支持精确模式和全模式
- **英文分词**: 基于正则表达式的分词，保留字母、数字组合
- **数据结构**:
```typescript
interface Token {
  text: string;        // 分词后的文本
  start: number;       // 在原文本中的起始位置
  end: number;         // 在原文本中的结束位置
  type?: string;       // 词类型（可选）
  weight?: number;     // 权重（可选）
}
```

### Requirement: 倒排索引存储
系统 SHALL 实现倒排索引存储机制，以支持高效的文档检索和关键词查询功能。

#### Scenario: 索引构建
- **WHEN** 处理文档集时
- **THEN** 应构建包含词频和位置信息的倒排索引
- **THEN** 应支持增量和批量构建模式

#### Scenario: 索引更新
- **WHEN** 添加新文档时
- **THEN** 应增量更新索引而无需重建
- **THEN** 应正确维护词频和文档频率

### 技术实现
- **索引结构**: 词项到文档ID的映射，包含TF-IDF和位置信息
- **索引操作**: 支持增量索引、批量索引、更新和删除
- **性能优化**: 前缀压缩、差值编码和查询结果缓存

### Requirement: 实体抽取功能
系统 SHALL 实现实体抽取功能，以识别文档中的关键实体并为知识图谱构建提供基础数据，同时预留大模型接口以支持高级实体识别。

#### Scenario: 内置实体识别
- **WHEN** 处理包含人名、地名、组织名的文档时
- **THEN** 应正确识别这些实体及其类型
- **THEN** 应记录实体在文档中的位置信息

#### Scenario: 自定义实体类型
- **WHEN** 配置了自定义实体类型时
- **THEN** 应能识别文档中的自定义实体
- **THEN** 应正确分类并存储这些实体

#### Scenario: 大模型实体识别
- **WHEN** 启用大模型实体识别功能时
- **THEN** 应调用配置的大模型API进行实体抽取
- **THEN** 应将大模型返回的实体标准化并存储

### 技术实现
- **实体类型**: 内置类型（人名、地名、组织名、时间、日期、数字）和自定义类型
- **抽取方法**: 
  - 基于规则（正则、关键词、上下文）
  - 基于词典
  - 第三方NER模型支持
  - 大模型API接口（预留）
- **数据结构**:
```typescript
interface Entity {
  id?: number;         // 实体ID
  name: string;        // 实体名称
  type: string;        // 实体类型
  docId: string;       // 所属文档ID
  startPos: number;    // 在文档中的起始位置
  endPos: number;      // 在文档中的结束位置
  properties?: Record<string, any>; // 额外属性
  source?: string;     // 实体来源（如'rule', 'dict', 'llm'）
  confidence?: number; // 置信度
}

// 大模型接口定义
interface EntityExtractor {
  // 基于规则的实体抽取
  extractByRules(text: string): Promise<Entity[]>;
  
  // 基于词典的实体抽取
  extractByDictionary(text: string): Promise<Entity[]>;
  
  // 大模型实体抽取（预留接口）
  extractByLLM(text: string): Promise<Entity[]>;
  
  // 配置大模型参数
  configureLLM(options: LLMConfig): void;
}

interface LLMConfig {
  apiKey?: string;
  endpoint?: string;
  model?: string;
  temperature?: number;
  promptTemplate?: string;
}
```

### Requirement: 关系抽取功能
系统 SHALL 实现实体关系抽取功能，以识别实体之间的关联关系并构建知识图谱的边连接，同时预留大模型接口以支持高级关系识别。

#### Scenario: 实体关系识别
- **WHEN** 文档中包含多个相关实体时
- **THEN** 应识别实体之间的关系类型
- **THEN** 应计算并存储关系的置信度

#### Scenario: 自定义关系类型
- **WHEN** 配置了自定义关系类型时
- **THEN** 应能识别文档中的自定义关系
- **THEN** 应正确分类并存储这些关系

#### Scenario: 大模型关系识别
- **WHEN** 启用大模型关系识别功能时
- **THEN** 应调用配置的大模型API进行关系抽取
- **THEN** 应将大模型返回的关系标准化并存储

### 技术实现
- **关系类型**: 内置类型（关联、属于、包含、描述、引用）和自定义类型
- **抽取方法**: 
  - 基于规则的模式匹配
  - 实体共现分析
  - 第三方关系抽取模型支持
  - 大模型API接口（预留）
- **数据结构**:
```typescript
interface Relationship {
  id?: number;                 // 关系ID
  sourceEntityId: number;      // 源实体ID
  targetEntityId: number;      // 目标实体ID
  type: string;                // 关系类型
  docId: string;               // 所属文档ID
  confidence: number;          // 置信度
  properties?: Record<string, any>; // 额外属性
  source?: string;             // 关系来源（如'rule', 'cooccur', 'llm'）
  evidenceText?: string;       // 支持该关系的文本证据
}

// 关系抽取器接口定义
interface RelationshipExtractor {
  // 基于规则的关系抽取
  extractByRules(entities: Entity[], text: string): Promise<Relationship[]>;
  
  // 基于实体共现的关系抽取
  extractByCooccurrence(entities: Entity[], text: string): Promise<Relationship[]>;
  
  // 大模型关系抽取（预留接口）
  extractByLLM(entities: Entity[], text: string): Promise<Relationship[]>;
  
  // 配置大模型参数
  configureLLM(options: LLMConfig): void;
}
```

### Requirement: 图数据存储
系统 SHALL 实现基于SQLite的图数据存储机制，以持久化存储实体和关系数据，并支持高效的图查询操作。

#### Scenario: 数据持久化
- **WHEN** 抽取实体和关系后
- **THEN** 应将数据存储到SQLite数据库
- **THEN** 应维护表间的外键关系

#### Scenario: 高效查询
- **WHEN** 查询大规模文档集合时
- **THEN** 应使用索引提高查询性能
- **THEN** 复杂查询应在可接受的时间内完成

### 技术实现
- **数据库选择**: SQLite via better-sqlite3包
- **表结构设计**:
  - documents表（doc_id作为主键）
  - entities表（与documents的外键关系）
  - relationships表（与entities的外键关系）
  - inverted_index和index_entries表（搜索功能）
  - entity_aliases表（实体别名，用于实体融合）
  - entity_similarity表（实体相似度，用于实体融合）
- **索引优化**: 全面的索引策略
- **数据完整性**: 事务支持和外键约束

### Requirement: 实体融合功能
系统 SHALL 实现实体融合功能，以识别并合并相似或相同的实体，确保知识图谱中实体的唯一性和完整性。

#### Scenario: 相似实体识别
- **WHEN** 处理新文档并提取实体时
- **THEN** 应与已有实体进行相似度比较
- **THEN** 应识别潜在的相似实体对

#### Scenario: 实体合并
- **WHEN** 确定两个实体表示同一概念时
- **THEN** 应合并实体信息
- **THEN** 应更新相关的关系引用

#### Scenario: 别名管理
- **WHEN** 发现实体的新别名时
- **THEN** 应记录别名关系
- **THEN** 查询时应能识别别名关联

### 技术实现
- **实体相似度算法**:
  - 基于字符串相似度（Levenshtein、Jaro-Winkler）
  - 基于语义相似度（TF-IDF、Word2Vec）
  - 支持大模型语义相似度计算（预留接口）
- **实体融合策略**:
  - 自动融合（基于阈值）
  - 人工确认融合
  - 批量融合操作
- **数据结构**:
```typescript
interface EntityFusionService {
  // 查找相似实体
  findSimilarEntities(entity: Entity, threshold?: number): Promise<SimilarEntity[]>;
  
  // 合并实体
  mergeEntities(sourceEntityId: number, targetEntityId: number): Promise<void>;
  
  // 添加实体别名
  addEntityAlias(entityId: number, alias: string): Promise<void>;
  
  // 基于大模型计算语义相似度（预留接口）
  calculateSemanticSimilarity(entity1: Entity, entity2: Entity): Promise<number>;
  
  // 配置大模型参数
  configureLLM(options: LLMConfig): void;
}

interface SimilarEntity {
  entityId: number;
  name: string;
  similarityScore: number;
  type: string;
}
```

- **表结构设计**:
```sql
-- 实体别名表
CREATE TABLE entity_aliases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_id INTEGER NOT NULL,
  alias TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE,
  UNIQUE(entity_id, alias)
);

-- 实体相似度表
CREATE TABLE entity_similarity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_id1 INTEGER NOT NULL,
  entity_id2 INTEGER NOT NULL,
  similarity_score REAL NOT NULL,
  calculation_method TEXT NOT NULL,
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (entity_id1) REFERENCES entities(id) ON DELETE CASCADE,
  FOREIGN KEY (entity_id2) REFERENCES entities(id) ON DELETE CASCADE,
  UNIQUE(entity_id1, entity_id2)
);
```

### Requirement: 文档处理API
系统 SHALL 提供完整的文档处理API，以支持文档的添加、更新、删除和批量处理操作。

#### Scenario: 单文档处理
- **WHEN** 调用processDocument方法时
- **THEN** 应完成文档的分词、索引、实体和关系抽取
- **THEN** 应将处理结果持久化存储

### 技术实现
```typescript
interface DocumentProcessorAPI {
  // 处理单个文档
  processDocument(doc: Document): Promise<void>;
  
  // 批量处理文档
  processDocuments(docs: Document[]): Promise<void>;
  
  // 更新文档
  updateDocument(doc: Document): Promise<void>;
  
  // 删除文档索引
  deleteDocument(docId: string): Promise<void>;
}
```

### Requirement: 检索API
系统 SHALL 提供全面的检索API，以支持文档搜索、实体查询、关系查询和实体网络分析功能。

#### Scenario: 关键词搜索
- **WHEN** 执行搜索查询时
- **THEN** 应基于查询词返回相关文档
- **THEN** 应支持搜索选项配置

#### Scenario: 实体查询
- **WHEN** 调用findEntities方法并指定实体类型
- **THEN** 应只返回指定类型的实体
- **THEN** 应支持结果数量限制

### 技术实现
```typescript
interface SearchAPI {
  // 关键词搜索
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
  
  // 实体查询
  findEntities(entityType?: string, limit?: number): Promise<Entity[]>;
  
  // 关系查询
  findRelationships(sourceEntityId?: number, targetEntityId?: number, relType?: string): Promise<Relationship[]>;
  
  // 获取实体的关系网络
  getEntityNetwork(entityId: number, depth?: number): Promise<NetworkGraph>;
}
```

### Requirement: 性能要求
系统 SHALL 满足规定的性能指标，包括分词速度、索引构建时间、查询响应时间和存储效率。

#### Scenario: 文档处理性能
- **WHEN** 处理500KB大小的文档时
- **THEN** 完整处理应在5秒内完成
- **THEN** 应保持稳定的处理速度

#### Scenario: 搜索性能
- **WHEN** 对1000个索引文档执行关键词搜索时
- **THEN** 搜索应在100毫秒内返回结果
- **THEN** 复杂查询应优化执行计划

### 技术指标
- **分词性能**: 中文 > 100KB/s，英文 > 200KB/s
- **索引性能**: 单文档 < 1秒（文档大小 < 1MB）
- **存储效率**: 索引大小 < 3倍原始文档，支持 > 10,000个文档

### Requirement: 扩展性设计
系统 SHALL 实现灵活的插件架构和配置系统，以支持功能扩展和自定义组件集成。

#### Scenario: 自定义实体抽取器
- **WHEN** 实现自定义实体抽取器时
- **THEN** 应能注册并使用该抽取器
- **THEN** 系统应与自定义组件正确交互

#### Scenario: 配置自定义类型
- **WHEN** 配置实体和关系类型时
- **THEN** 系统应在处理过程中使用这些自定义类型
- **THEN** 应保持配置的一致性和有效性

### 技术实现
- **插件架构**: 分词器、实体抽取器、关系抽取器和存储后端接口
- **配置系统**: 支持自定义分词选项、实体/关系类型和存储参数

### Requirement: 安全与兼容性
系统 SHALL 确保数据安全并支持跨平台运行，与思源笔记插件系统保持良好兼容。

#### Scenario: 输入安全
- **WHEN** 处理包含潜在SQL注入尝试的用户输入时
- **THEN** 应正确清理输入以防止SQL注入
- **THEN** 应验证输入数据的有效性

#### Scenario: 跨平台兼容性
- **WHEN** 在不同操作系统上安装和执行插件时
- **THEN** 应在Windows、macOS和Linux上正常运行
- **THEN** 应与Node.js 14.x及以上版本兼容

### 技术实现
- **安全措施**: 数据库文件权限控制、输入验证、SQL注入防护
- **兼容性**: 支持Windows/macOS/Linux、Node.js 14.x+和思源笔记插件系统