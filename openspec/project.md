# Project Context

## Purpose
一个思源笔记插件项目，用于将思源笔记的非结构化文章基于语义分词，生成倒排索引，用于支持基于语义的文章检索。同时生成知识图谱，用于可视化展示文章之间的关系。

## Tech Stack
- TypeScript - Primary development language
- Vue.js - UI component framework
- g6 - Graph visualization library
- Node.js - Backend server environment
- MongoDB/轻量级回退方案如 SQLite、H2等，默认优先选择轻量级 - Database for storing article data and knowledge graph

## Project Conventions

### Code Style
- 采用 Vue.js 官方推荐的代码风格script setup 语法糖
- 采用 TypeScript 类型
- 组件命名采用 PascalCase 格式
- 变量命名采用 camelCase 格式
- 常量命名采用 UPPER_SNAKE_CASE 格式
- 使用最新版本的 Vue.js、g6、Node.js 等相关库

### Architecture Patterns
- 采用 zhi-cli init 初始化项目，严格遵守思源笔记插件规范，目录结构如下：
  - src/
    - components/ - Vue.js 组件
    - i18n/ - 国际化配置
    - utils/ - 工具函数
    - service/ - 服务层，用于处理业务逻辑
    - App.vue - 主应用组件
    - main.ts - 应用入口文件
    - index.ts - 插件入口文件
  - public/ - 静态资源目录
  - plugin.json - 插件配置文件
  - icon.png - 插件图标
  - package.json - 项目依赖配置文件
  - vite.config.ts - Vite 配置文件
- 采用 g6 可视化展示知识图谱

### Testing Strategy
[Explain your testing approach and requirements]

### Git Workflow
[Describe your branching strategy and commit conventions]

## Domain Context
[Add domain-specific knowledge that AI assistants need to understand]

## Important Constraints
[List any technical, business, or regulatory constraints]

## External Dependencies
[Document key external services, APIs, or systems]
