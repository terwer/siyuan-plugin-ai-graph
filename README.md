[中文](README_zh_CN.md)

# siyuan-plugin-ai-graph

A SiYuan note plugin that generates an inverted index based on semantic segmentation of non-structured articles in SiYuan notes, and visualizes the relationships between articles using a knowledge graph.

## AI Graph Module Features

- **Document Segmentation**: Supports Chinese and English text segmentation using nodejieba
- **Inverted Indexing**: Builds efficient text search indexes
- **Entity Extraction**: Supports rule-based and LLM-based entity extraction
- **Relationship Extraction**: Identifies connections between entities
- **Entity Fusion**: Intelligently merges similar entities to resolve entity disambiguation
- **Knowledge Graph**: Builds and queries entity relationship networks
- **Advanced Search**: Supports full-text search, entity search, and relationship queries

## Installation

```bash
# Install dependencies
npm install

# Build	npm run build
```

## Core Components

- **DatabaseManager**: Handles data storage and retrieval based on SQLite
- **DocumentProcessor**: Core document processing class
- **SearchAPI**: Provides search functionality
- **EntityFusion**: Offers entity fusion capabilities

## Usage

See `examples/usage-example.ts` for detailed usage examples of all core features.

## License

MIT License