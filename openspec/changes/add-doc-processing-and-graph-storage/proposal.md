# Change: 添加文档分词、索引和图数据存储功能

## Why
为了实现智能知识图谱功能，需要引入文档分词、倒排索引、实体抽取、关系抽取和图数据存储能力，以便更好地组织和查询笔记内容中的知识点和它们之间的关联关系。

## What Changes
- 添加文档分词处理功能，支持中英文分词
- 实现倒排索引存储，提高文本检索效率
- 集成实体抽取功能，识别文档中的关键实体
- 实现关系抽取功能，识别实体间的关联关系
- 引入SQLite作为图数据存储引擎
- 创建数据模型和存储接口
- 实现数据同步和更新机制

## 技术选型

### 文档分词
- 使用`nodejieba`库进行中文分词
- 使用内置正则表达式进行英文分词
- 实现自定义词典支持

### 倒排索引存储
- 实现基于SQLite的倒排索引表结构
- 支持词项到文档ID的映射
- 支持词频统计和位置信息存储

### 实体抽取
- 基于规则的实体识别
- 支持自定义实体类型
- 预留接口支持接入第三方NER模型

### 关系抽取
- 基于规则的关系识别
- 支持自定义关系类型
- 预留接口支持接入第三方关系抽取模型

### 图数据存储
- 选择SQLite作为存储引擎，理由：
  1. 轻量级，无需独立服务器
  2. 纯JavaScript支持，通过`better-sqlite3`包
  3. 支持事务，保证数据一致性
  4. 查询性能优秀，适合中小型数据集
  5. 跨平台支持良好

## 数据模型设计

### 核心表结构

```sql
-- 文档表
CREATE TABLE documents (
  doc_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  created_at INTEGER,
  updated_at INTEGER
);

-- 实体表
CREATE TABLE entities (
  entity_id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_name TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  doc_id TEXT,
  start_pos INTEGER,
  end_pos INTEGER,
  FOREIGN KEY (doc_id) REFERENCES documents(doc_id)
);

-- 关系表
CREATE TABLE relationships (
  rel_id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_entity_id INTEGER,
  target_entity_id INTEGER,
  rel_type TEXT NOT NULL,
  doc_id TEXT,
  confidence REAL DEFAULT 1.0,
  FOREIGN KEY (source_entity_id) REFERENCES entities(entity_id),
  FOREIGN KEY (target_entity_id) REFERENCES entities(entity_id),
  FOREIGN KEY (doc_id) REFERENCES documents(doc_id)
);

-- 倒排索引表
CREATE TABLE inverted_index (
  term_id INTEGER PRIMARY KEY AUTOINCREMENT,
  term TEXT NOT NULL UNIQUE
);

-- 倒排索引条目表
CREATE TABLE index_entries (
  entry_id INTEGER PRIMARY KEY AUTOINCREMENT,
  term_id INTEGER,
  doc_id TEXT,
  frequency INTEGER DEFAULT 1,
  positions TEXT,
  FOREIGN KEY (term_id) REFERENCES inverted_index(term_id),
  FOREIGN KEY (doc_id) REFERENCES documents(doc_id)
);
```

## 核心代码结构

### 1. 文档处理器

```typescript
/**
 * 文档处理器，负责文档的分词、索引和特征提取
 */
class DocumentProcessor {
  private tokenizer: Tokenizer;
  private entityExtractor: EntityExtractor;
  private relationExtractor: RelationExtractor;
  private dbManager: DatabaseManager;

  constructor(dbPath: string) {
    this.tokenizer = new Tokenizer();
    this.entityExtractor = new EntityExtractor();
    this.relationExtractor = new RelationExtractor();
    this.dbManager = new DatabaseManager(dbPath);
  }

  /**
   * 处理文档，包括分词、索引、实体抽取和关系抽取
   */
  async processDocument(doc: Document): Promise<void> {
    // 存储文档
    await this.dbManager.saveDocument(doc);
    
    // 分词处理
    const tokens = await this.tokenizer.tokenize(doc.content);
    
    // 建立倒排索引
    await this.dbManager.buildInvertedIndex(doc.docId, tokens);
    
    // 实体抽取
    const entities = await this.entityExtractor.extract(doc.content, doc.docId);
    await this.dbManager.saveEntities(entities);
    
    // 关系抽取
    const relationships = await this.relationExtractor.extract(entities, doc.content, doc.docId);
    await this.dbManager.saveRelationships(relationships);
  }
}
```

### 2. 数据库管理器

```typescript
/**
 * 数据库管理器，负责与SQLite数据库交互
 */
class DatabaseManager {
  private db: any;

  constructor(dbPath: string) {
    const sqlite3 = require('better-sqlite3');
    this.db = new sqlite3(dbPath);
    this.initDatabase();
  }

  /**
   * 初始化数据库表结构
   */
  private initDatabase(): void {
    // 创建表结构的SQL语句
    const createTablesSQL = `
      -- 创建文档表
      CREATE TABLE IF NOT EXISTS documents (
        doc_id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT,
        created_at INTEGER,
        updated_at INTEGER
      );
      
      -- 创建实体表
      CREATE TABLE IF NOT EXISTS entities (
        entity_id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_name TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        doc_id TEXT,
        start_pos INTEGER,
        end_pos INTEGER,
        FOREIGN KEY (doc_id) REFERENCES documents(doc_id)
      );
      
      -- 创建关系表
      CREATE TABLE IF NOT EXISTS relationships (
        rel_id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_entity_id INTEGER,
        target_entity_id INTEGER,
        rel_type TEXT NOT NULL,
        doc_id TEXT,
        confidence REAL DEFAULT 1.0,
        FOREIGN KEY (source_entity_id) REFERENCES entities(entity_id),
        FOREIGN KEY (target_entity_id) REFERENCES entities(entity_id),
        FOREIGN KEY (doc_id) REFERENCES documents(doc_id)
      );
      
      -- 创建倒排索引表
      CREATE TABLE IF NOT EXISTS inverted_index (
        term_id INTEGER PRIMARY KEY AUTOINCREMENT,
        term TEXT NOT NULL UNIQUE
      );
      
      -- 创建倒排索引条目表
      CREATE TABLE IF NOT EXISTS index_entries (
        entry_id INTEGER PRIMARY KEY AUTOINCREMENT,
        term_id INTEGER,
        doc_id TEXT,
        frequency INTEGER DEFAULT 1,
        positions TEXT,
        FOREIGN KEY (term_id) REFERENCES inverted_index(term_id),
        FOREIGN KEY (doc_id) REFERENCES documents(doc_id)
      );
      
      -- 创建索引以提高查询性能
      CREATE INDEX IF NOT EXISTS idx_entities_doc_id ON entities(doc_id);
      CREATE INDEX IF NOT EXISTS idx_entities_name ON entities(entity_name);
      CREATE INDEX IF NOT EXISTS idx_relationships_doc_id ON relationships(doc_id);
      CREATE INDEX IF NOT EXISTS idx_inverted_index_term ON inverted_index(term);
      CREATE INDEX IF NOT EXISTS idx_index_entries_term_id ON index_entries(term_id);
      CREATE INDEX IF NOT EXISTS idx_index_entries_doc_id ON index_entries(doc_id);
    `;
    
    this.db.exec(createTablesSQL);
  }

  // 其他数据库操作方法...
}
```

## Impact
- Affected specs: 数据处理、存储层实现
- Affected code: 主要涉及新增文档处理模块、存储模块和相关API
- 需要添加的依赖：better-sqlite3、nodejieba等
- 对现有代码的影响较小，主要是新增功能模块