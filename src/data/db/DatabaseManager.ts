import type { Document, Entity, Relationship, Token, EntityAlias, EntitySimilarity } from "../types"

/**
 * 数据库管理器，负责与SQLite数据库交互
 */
export class DatabaseManager {
  private db: any
  private dbPath: string

  constructor(dbPath: string) {
    this.dbPath = dbPath
    this.db = null
    this.connect()
    this.initDatabase()
  }

  /**
   * 连接数据库
   */
  private connect(): void {
    try {
      const sqlite3 = require("better-sqlite3")
      this.db = new sqlite3(this.dbPath, {
        fileMustExist: false,
        verbose: console.log,
      })

      // 启用外键约束
      this.db.pragma("foreign_keys = ON")
    } catch (error) {
      console.error("Failed to connect to database:", error)
      throw error
    }
  }

  /**
   * 初始化数据库表结构
   */
  private initDatabase(): void {
    if (!this.db) {
      throw new Error("Database not connected")
    }

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
        source TEXT DEFAULT 'rule',
        confidence REAL DEFAULT 1.0,
        properties TEXT,
        FOREIGN KEY (doc_id) REFERENCES documents(doc_id) ON DELETE CASCADE
      );
      
      -- 创建关系表
      CREATE TABLE IF NOT EXISTS relationships (
        rel_id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_entity_id INTEGER,
        target_entity_id INTEGER,
        rel_type TEXT NOT NULL,
        doc_id TEXT,
        confidence REAL DEFAULT 1.0,
        source TEXT DEFAULT 'rule',
        evidence_text TEXT,
        properties TEXT,
        FOREIGN KEY (source_entity_id) REFERENCES entities(entity_id) ON DELETE CASCADE,
        FOREIGN KEY (target_entity_id) REFERENCES entities(entity_id) ON DELETE CASCADE,
        FOREIGN KEY (doc_id) REFERENCES documents(doc_id) ON DELETE CASCADE
      );
      
      -- 创建倒排索引表
      CREATE TABLE IF NOT EXISTS inverted_index (
        term_id INTEGER PRIMARY KEY AUTOINCREMENT,
        term TEXT NOT NULL UNIQUE
      );
      
      -- 创建倒排索引条目表
      CREATE INDEX IF NOT EXISTS idx_inverted_index_term ON inverted_index(term);
      
      -- 创建倒排索引条目表
      CREATE TABLE IF NOT EXISTS index_entries (
        entry_id INTEGER PRIMARY KEY AUTOINCREMENT,
        term_id INTEGER,
        doc_id TEXT,
        frequency INTEGER DEFAULT 1,
        positions TEXT,
        FOREIGN KEY (term_id) REFERENCES inverted_index(term_id) ON DELETE CASCADE,
        FOREIGN KEY (doc_id) REFERENCES documents(doc_id) ON DELETE CASCADE
      );
      
      -- 创建索引以提高查询性能
      CREATE INDEX IF NOT EXISTS idx_entities_doc_id ON entities(doc_id);
      CREATE INDEX IF NOT EXISTS idx_entities_name ON entities(entity_name);
      CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(entity_type);
      CREATE INDEX IF NOT EXISTS idx_relationships_doc_id ON relationships(doc_id);
      CREATE INDEX IF NOT EXISTS idx_relationships_source ON relationships(source_entity_id);
      CREATE INDEX IF NOT EXISTS idx_relationships_target ON relationships(target_entity_id);
      CREATE INDEX IF NOT EXISTS idx_index_entries_term_id ON index_entries(term_id);
      CREATE INDEX IF NOT EXISTS idx_index_entries_doc_id ON index_entries(doc_id);
      
      -- 创建实体别名表
      CREATE TABLE IF NOT EXISTS entity_aliases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_id INTEGER NOT NULL,
        alias TEXT NOT NULL,
        created_at INTEGER DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (entity_id) REFERENCES entities(entity_id) ON DELETE CASCADE,
        UNIQUE(entity_id, alias)
      );
      
      -- 创建实体相似度表
      CREATE TABLE IF NOT EXISTS entity_similarity (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_id1 INTEGER NOT NULL,
        entity_id2 INTEGER NOT NULL,
        similarity_score REAL NOT NULL,
        calculation_method TEXT NOT NULL,
        calculated_at INTEGER DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (entity_id1) REFERENCES entities(entity_id) ON DELETE CASCADE,
        FOREIGN KEY (entity_id2) REFERENCES entities(entity_id) ON DELETE CASCADE,
        UNIQUE(entity_id1, entity_id2)
      );
      
      -- 创建实体别名表索引
      CREATE INDEX IF NOT EXISTS idx_entity_aliases_alias ON entity_aliases(alias);
      CREATE INDEX IF NOT EXISTS idx_entity_similarity_score ON entity_similarity(similarity_score);
    `

    try {
      this.db.exec(createTablesSQL)
      console.log("Database initialized successfully")
    } catch (error) {
      console.error("Failed to initialize database:", error)
      throw error
    }
  }

  /**
   * 开始事务
   */
  beginTransaction(): void {
    if (this.db) {
      this.db.exec("BEGIN TRANSACTION")
    }
  }

  /**
   * 提交事务
   */
  commitTransaction(): void {
    if (this.db) {
      this.db.exec("COMMIT")
    }
  }

  /**
   * 回滚事务
   */
  rollbackTransaction(): void {
    if (this.db) {
      this.db.exec("ROLLBACK")
    }
  }

  // 文档相关操作
  async saveDocument(doc: Document): Promise<void> {
    if (!this.db) return

    const now = Date.now()
    const insertDoc = {
      ...doc,
      createdAt: doc.createdAt || now,
      updatedAt: now,
    }

    try {
      // 先尝试更新
      const updateStmt = this.db.prepare(
        `UPDATE documents SET title = @title, content = @content, updated_at = @updatedAt 
         WHERE doc_id = @docId`
      )
      const updateResult = updateStmt.run({
        docId: insertDoc.docId,
        title: insertDoc.title,
        content: insertDoc.content,
        updatedAt: insertDoc.updatedAt,
      })

      // 如果没有更新成功，则插入
      if (updateResult.changes === 0) {
        const insertStmt = this.db.prepare(
          `INSERT INTO documents (doc_id, title, content, created_at, updated_at) 
           VALUES (@docId, @title, @content, @createdAt, @updatedAt)`
        )
        insertStmt.run({
          docId: insertDoc.docId,
          title: insertDoc.title,
          content: insertDoc.content,
          createdAt: insertDoc.createdAt,
          updatedAt: insertDoc.updatedAt,
        })
      }
    } catch (error) {
      console.error("Failed to save document:", error)
      throw error
    }
  }

  async getDocument(docId: string): Promise<Document | null> {
    if (!this.db) return null

    try {
      const stmt = this.db.prepare(
        `SELECT doc_id as docId, title, content, created_at as createdAt, updated_at as updatedAt 
         FROM documents WHERE doc_id = ?`
      )
      return stmt.get(docId) || null
    } catch (error) {
      console.error("Failed to get document:", error)
      return null
    }
  }

  async deleteDocument(docId: string): Promise<void> {
    if (!this.db) return

    try {
      // 删除文档会级联删除相关的实体、关系和索引条目
      const stmt = this.db.prepare(`DELETE FROM documents WHERE doc_id = ?`)
      stmt.run(docId)
    } catch (error) {
      console.error("Failed to delete document:", error)
      throw error
    }
  }

  // 实体相关操作
  async saveEntities(entities: Entity[]): Promise<void> {
    if (!this.db || entities.length === 0) return

    try {
      this.beginTransaction()

      const insertStmt = this.db.prepare(
        `INSERT INTO entities (entity_name, entity_type, doc_id, start_pos, end_pos, source, confidence, properties)
         VALUES (@entityName, @entityType, @docId, @startPos, @endPos, @source, @confidence, @properties)
         ON CONFLICT(entity_name, doc_id, start_pos, end_pos) DO UPDATE SET
         entity_type = @entityType, source = @source, confidence = @confidence, properties = @properties`
      )

      entities.forEach((entity) => {
        insertStmt.run({
          entityName: entity.name,
          entityType: entity.type,
          docId: entity.docId,
          startPos: entity.startPos,
          endPos: entity.endPos,
          source: entity.source || "rule",
          confidence: entity.confidence || 1.0,
          properties: entity.properties ? JSON.stringify(entity.properties) : null,
        })
      })

      this.commitTransaction()
    } catch (error) {
      this.rollbackTransaction()
      console.error("Failed to save entities:", error)
      throw error
    }
  }

  async getEntities(docId?: string, entityType?: string): Promise<Entity[]> {
    if (!this.db) return []

    try {
      let query = `SELECT entity_id as id, entity_name as name, entity_type as type, doc_id as docId, 
                  start_pos as startPos, end_pos as endPos, source, confidence, properties
                  FROM entities`

      const params: any[] = []
      const conditions: string[] = []

      if (docId) {
        conditions.push("doc_id = ?")
        params.push(docId)
      }

      if (entityType) {
        conditions.push("entity_type = ?")
        params.push(entityType)
      }

      if (conditions.length > 0) {
        query += " WHERE " + conditions.join(" AND ")
      }

      const stmt = this.db.prepare(query)
      const result = stmt.all(...params)

      // 解析properties
      return result.map((row: any) => ({
        ...row,
        properties: row.properties ? JSON.parse(row.properties) : undefined,
      }))
    } catch (error) {
      console.error("Failed to get entities:", error)
      return []
    }
  }

  // 关系相关操作
  async saveRelationships(relationships: Relationship[]): Promise<void> {
    if (!this.db || relationships.length === 0) return

    try {
      this.beginTransaction()

      const insertStmt = this.db.prepare(
        `INSERT INTO relationships (source_entity_id, target_entity_id, rel_type, doc_id, 
         confidence, source, evidence_text, properties)
         VALUES (@sourceEntityId, @targetEntityId, @relType, @docId, @confidence, 
         @source, @evidenceText, @properties)`
      )

      relationships.forEach((rel) => {
        insertStmt.run({
          sourceEntityId: rel.sourceEntityId,
          targetEntityId: rel.targetEntityId,
          relType: rel.type,
          docId: rel.docId,
          confidence: rel.confidence,
          source: rel.source || "rule",
          evidenceText: rel.evidenceText,
          properties: rel.properties ? JSON.stringify(rel.properties) : null,
        })
      })

      this.commitTransaction()
    } catch (error) {
      this.rollbackTransaction()
      console.error("Failed to save relationships:", error)
      throw error
    }
  }

  // 倒排索引相关操作
  async buildInvertedIndex(docId: string, tokens: Token[]): Promise<void> {
    if (!this.db || tokens.length === 0) return

    try {
      this.beginTransaction()

      // 先删除该文档的旧索引
      const deleteIndexEntries = this.db.prepare(`DELETE FROM index_entries WHERE doc_id = ?`)
      deleteIndexEntries.run(docId)

      // 构建词项到位置的映射
      const termPositions = new Map<string, number[]>()
      tokens.forEach((token) => {
        if (!termPositions.has(token.text)) {
          termPositions.set(token.text, [])
        }
        termPositions.get(token.text)!.push(token.start)
      })

      const insertTermStmt = this.db.prepare(
        `INSERT INTO inverted_index (term) VALUES (?) ON CONFLICT(term) DO NOTHING`
      )

      const getTermIdStmt = this.db.prepare(`SELECT term_id FROM inverted_index WHERE term = ?`)

      const insertEntryStmt = this.db.prepare(
        `INSERT INTO index_entries (term_id, doc_id, frequency, positions)
         VALUES (?, ?, ?, ?)`
      )

      // 插入词项和索引条目
      for (const [term, positions] of termPositions.entries()) {
        insertTermStmt.run(term)
        const termResult = getTermIdStmt.get(term)

        if (termResult) {
          insertEntryStmt.run(termResult.term_id, docId, positions.length, JSON.stringify(positions))
        }
      }

      this.commitTransaction()
    } catch (error) {
      this.rollbackTransaction()
      console.error("Failed to build inverted index:", error)
      throw error
    }
  }

  // 实体别名相关操作
  async addEntityAlias(entityId: number, alias: string): Promise<void> {
    if (!this.db) return

    try {
      const stmt = this.db.prepare(`INSERT OR IGNORE INTO entity_aliases (entity_id, alias) VALUES (?, ?)`)
      stmt.run(entityId, alias)
    } catch (error) {
      console.error("Failed to add entity alias:", error)
      throw error
    }
  }

  // 实体相似度相关操作
  async addEntitySimilarity(
    entityId1: number,
    entityId2: number,
    similarityScore: number,
    calculationMethod: string
  ): Promise<void> {
    if (!this.db) return

    try {
      // 确保entityId1 < entityId2，避免重复记录
      const [minId, maxId] = entityId1 < entityId2 ? [entityId1, entityId2] : [entityId2, entityId1]

      const stmt = this.db.prepare(
        `INSERT OR REPLACE INTO entity_similarity (entity_id1, entity_id2, similarity_score, calculation_method)
         VALUES (?, ?, ?, ?)`
      )
      stmt.run(minId, maxId, similarityScore, calculationMethod)
    } catch (error) {
      console.error("Failed to add entity similarity:", error)
      throw error
    }
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}
