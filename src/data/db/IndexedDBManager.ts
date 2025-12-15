import type { Document, Entity, Relationship, Token } from "../types"

/**
 * IndexedDB 数据库管理器，负责与浏览器的 IndexedDB 数据库交互
 */
export class IndexedDBManager {
  private dbName: string = "AiGraphDB"
  private dbVersion: number = 1
  private db: IDBDatabase | null = null

  constructor() {
    this.initDatabase()
  }

  /**
   * 初始化数据库
   */
  private async initDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)

      request.onerror = (event) => {
        console.error("Failed to open IndexedDB:", event)
        reject(new Error("Failed to open IndexedDB"))
      }

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result
        console.log("IndexedDB initialized successfully")
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // 创建文档对象存储
        if (!db.objectStoreNames.contains("documents")) {
          const docStore = db.createObjectStore("documents", { keyPath: "docId" })
          docStore.createIndex("title", "title", { unique: false })
          docStore.createIndex("createdAt", "createdAt", { unique: false })
        }

        // 创建实体对象存储
        if (!db.objectStoreNames.contains("entities")) {
          const entityStore = db.createObjectStore("entities", { keyPath: "id", autoIncrement: true })
          entityStore.createIndex("docId", "docId", { unique: false })
          entityStore.createIndex("name", "name", { unique: false })
          entityStore.createIndex("type", "type", { unique: false })
        }

        // 创建关系对象存储
        if (!db.objectStoreNames.contains("relationships")) {
          const relStore = db.createObjectStore("relationships", { keyPath: "id", autoIncrement: true })
          relStore.createIndex("docId", "docId", { unique: false })
          relStore.createIndex("sourceEntityId", "sourceEntityId", { unique: false })
          relStore.createIndex("targetEntityId", "targetEntityId", { unique: false })
        }

        // 创建倒排索引对象存储
        if (!db.objectStoreNames.contains("invertedIndex")) {
          const indexStore = db.createObjectStore("invertedIndex", { keyPath: "term" })
          indexStore.createIndex("term", "term", { unique: true })
        }

        // 创建索引条目对象存储
        if (!db.objectStoreNames.contains("indexEntries")) {
          const entryStore = db.createObjectStore("indexEntries", { keyPath: "id", autoIncrement: true })
          entryStore.createIndex("term", "term", { unique: false })
          entryStore.createIndex("docId", "docId", { unique: false })
        }

        // 创建实体别名对象存储
        if (!db.objectStoreNames.contains("entityAliases")) {
          const aliasStore = db.createObjectStore("entityAliases", { keyPath: "id", autoIncrement: true })
          aliasStore.createIndex("entityId", "entityId", { unique: false })
          aliasStore.createIndex("alias", "alias", { unique: false })
        }

        // 创建实体相似度对象存储
        if (!db.objectStoreNames.contains("entitySimilarity")) {
          const similarityStore = db.createObjectStore("entitySimilarity", { keyPath: "id", autoIncrement: true })
          similarityStore.createIndex("entityId1", "entityId1", { unique: false })
          similarityStore.createIndex("entityId2", "entityId2", { unique: false })
        }

        console.log("IndexedDB schema created successfully")
      }
    })
  }

  /**
   * 获取数据库实例
   */
  private async getDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.initDatabase()
    }
    return this.db!
  }

  /**
   * 保存文档
   */
  async saveDocument(doc: Document): Promise<void> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["documents"], "readwrite")
      const store = transaction.objectStore("documents")

      const now = Date.now()
      const docToSave = {
        ...doc,
        createdAt: doc.createdAt || now,
        updatedAt: now,
      }

      const request = store.put(docToSave)

      request.onsuccess = () => {
        console.log("Document saved successfully")
        resolve()
      }

      request.onerror = (event) => {
        console.error("Failed to save document:", event)
        reject(new Error("Failed to save document"))
      }
    })
  }

  /**
   * 获取文档
   */
  async getDocument(docId: string): Promise<Document | null> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["documents"], "readonly")
      const store = transaction.objectStore("documents")

      const request = store.get(docId)

      request.onsuccess = (event) => {
        const result = (event.target as IDBRequest).result
        resolve(result || null)
      }

      request.onerror = (event) => {
        console.error("Failed to get document:", event)
        reject(new Error("Failed to get document"))
      }
    })
  }

  /**
   * 删除文档
   */
  async deleteDocument(docId: string): Promise<void> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["documents"], "readwrite")
      const store = transaction.objectStore("documents")

      const request = store.delete(docId)

      request.onsuccess = () => {
        console.log("Document deleted successfully")
        resolve()
      }

      request.onerror = (event) => {
        console.error("Failed to delete document:", event)
        reject(new Error("Failed to delete document"))
      }
    })
  }

  /**
   * 保存实体
   */
  async saveEntities(entities: Entity[]): Promise<void> {
    if (entities.length === 0) return

    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["entities"], "readwrite")
      const store = transaction.objectStore("entities")

      let savedCount = 0
      let hasError = false

      entities.forEach((entity) => {
        // 检查是否已存在相同的实体
        const getRequest = store.index("name").get(entity.name)

        getRequest.onsuccess = () => {
          const existingEntity = getRequest.result

          // 如果不存在或不是同一个文档中的相同实体，则保存
          if (
            !existingEntity ||
            existingEntity.docId !== entity.docId ||
            existingEntity.startPos !== entity.startPos ||
            existingEntity.endPos !== entity.endPos
          ) {
            const request = store.add(entity)

            request.onsuccess = () => {
              savedCount++
              if (savedCount === entities.length && !hasError) {
                console.log("Entities saved successfully")
                resolve()
              }
            }

            request.onerror = (event) => {
              if (!hasError) {
                hasError = true
                console.error("Failed to save entity:", event)
                reject(new Error("Failed to save entity"))
              }
            }
          } else {
            // 更新现有实体
            const updateRequest = store.put({
              ...existingEntity,
              ...entity,
              id: existingEntity.id,
            })

            updateRequest.onsuccess = () => {
              savedCount++
              if (savedCount === entities.length && !hasError) {
                console.log("Entities saved successfully")
                resolve()
              }
            }

            updateRequest.onerror = (event) => {
              if (!hasError) {
                hasError = true
                console.error("Failed to update entity:", event)
                reject(new Error("Failed to update entity"))
              }
            }
          }
        }

        getRequest.onerror = (event) => {
          if (!hasError) {
            hasError = true
            console.error("Failed to check existing entity:", event)
            reject(new Error("Failed to check existing entity"))
          }
        }
      })
    })
  }

  /**
   * 获取实体
   */
  async getEntities(docId?: string, entityType?: string): Promise<Entity[]> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["entities"], "readonly")
      const store = transaction.objectStore("entities")

      // 构建查询条件
      let request: IDBRequest

      if (docId && entityType) {
        // 同时按文档ID和实体类型查询
        const index = store.index("docId")
        request = index.getAll(IDBKeyRange.only(docId))
      } else if (docId) {
        // 按文档ID查询
        const index = store.index("docId")
        request = index.getAll(IDBKeyRange.only(docId))
      } else if (entityType) {
        // 按实体类型查询
        const index = store.index("type")
        request = index.getAll(IDBKeyRange.only(entityType))
      } else {
        // 获取所有实体
        request = store.getAll()
      }

      request.onsuccess = (event) => {
        let result = (event.target as IDBRequest).result as Entity[]

        // 如果指定了实体类型，进一步过滤
        if (entityType && !docId) {
          result = result.filter((entity) => entity.type === entityType)
        }

        resolve(result)
      }

      request.onerror = (event) => {
        console.error("Failed to get entities:", event)
        reject(new Error("Failed to get entities"))
      }
    })
  }

  /**
   * 获取所有实体
   */
  async getAllEntities(): Promise<Entity[]> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["entities"], "readonly")
      const store = transaction.objectStore("entities")

      const request = store.getAll()

      request.onsuccess = (event) => {
        const result = (event.target as IDBRequest).result as Entity[]
        resolve(result)
      }

      request.onerror = (event) => {
        console.error("Failed to get all entities:", event)
        reject(new Error("Failed to get all entities"))
      }
    })
  }

  /**
   * 保存关系
   */
  async saveRelationships(relationships: Relationship[]): Promise<void> {
    if (relationships.length === 0) return

    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["relationships"], "readwrite")
      const store = transaction.objectStore("relationships")

      let savedCount = 0
      relationships.forEach((rel) => {
        const request = store.add(rel)

        request.onsuccess = () => {
          savedCount++
          if (savedCount === relationships.length) {
            console.log("Relationships saved successfully")
            resolve()
          }
        }

        request.onerror = (event) => {
          console.error("Failed to save relationship:", event)
          reject(new Error("Failed to save relationship"))
        }
      })
    })
  }

  /**
   * 获取所有关系
   */
  async getAllRelationships(): Promise<Relationship[]> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["relationships"], "readonly")
      const store = transaction.objectStore("relationships")

      const request = store.getAll()

      request.onsuccess = (event) => {
        const result = (event.target as IDBRequest).result as Relationship[]
        resolve(result)
      }

      request.onerror = (event) => {
        console.error("Failed to get all relationships:", event)
        reject(new Error("Failed to get all relationships"))
      }
    })
  }

  /**
   * 构建倒排索引
   */
  async buildInvertedIndex(docId: string, tokens: Token[]): Promise<void> {
    if (tokens.length === 0) return

    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["indexEntries"], "readwrite")
      const store = transaction.objectStore("indexEntries")

      // 先删除该文档的旧索引
      const deleteRequest = store.index("docId").openCursor(IDBKeyRange.only(docId))

      deleteRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        } else {
          // 删除完成后，插入新的索引条目
          const termPositions = new Map<string, number[]>()
          tokens.forEach((token) => {
            if (!termPositions.has(token.text)) {
              termPositions.set(token.text, [])
            }
            termPositions.get(token.text)!.push(token.start)
          })

          let savedCount = 0
          const totalCount = termPositions.size

          if (totalCount === 0) {
            resolve()
            return
          }

          termPositions.forEach((positions, term) => {
            const entry = {
              term,
              docId,
              frequency: positions.length,
              positions: JSON.stringify(positions),
            }

            const request = store.add(entry)

            request.onsuccess = () => {
              savedCount++
              if (savedCount === totalCount) {
                console.log("Inverted index built successfully")
                resolve()
              }
            }

            request.onerror = (event) => {
              console.error("Failed to build inverted index:", event)
              reject(new Error("Failed to build inverted index"))
            }
          })
        }
      }

      deleteRequest.onerror = (event) => {
        console.error("Failed to delete old index entries:", event)
        reject(new Error("Failed to delete old index entries"))
      }
    })
  }

  /**
   * 添加实体别名
   */
  async addEntityAlias(entityId: number, alias: string): Promise<void> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["entityAliases"], "readwrite")
      const store = transaction.objectStore("entityAliases")

      const aliasEntry = {
        entityId,
        alias,
        createdAt: Date.now(),
      }

      const request = store.add(aliasEntry)

      request.onsuccess = () => {
        console.log("Entity alias added successfully")
        resolve()
      }

      request.onerror = (event) => {
        console.error("Failed to add entity alias:", event)
        reject(new Error("Failed to add entity alias"))
      }
    })
  }

  /**
   * 添加实体相似度
   */
  async addEntitySimilarity(
    entityId1: number,
    entityId2: number,
    similarityScore: number,
    calculationMethod: string
  ): Promise<void> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["entitySimilarity"], "readwrite")
      const store = transaction.objectStore("entitySimilarity")

      // 确保entityId1 < entityId2，避免重复记录
      const [minId, maxId] = entityId1 < entityId2 ? [entityId1, entityId2] : [entityId2, entityId1]

      const similarityEntry = {
        entityId1: minId,
        entityId2: maxId,
        similarityScore,
        calculationMethod,
        calculatedAt: Date.now(),
      }

      const request = store.put(similarityEntry) // 使用put来覆盖可能存在的记录

      request.onsuccess = () => {
        console.log("Entity similarity added successfully")
        resolve()
      }

      request.onerror = (event) => {
        console.error("Failed to add entity similarity:", event)
        reject(new Error("Failed to add entity similarity"))
      }
    })
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
