# Project Context

## Purpose
一个思源笔记插件项目，用于将思源笔记的非结构化文章基于语义分词，生成倒排索引，用于支持基于语义的文章检索。同时生成知识图谱，用于可视化展示文章之间的关系。

## Tech Stack
- TypeScript - 主要开发语言
- Vite - 构建工具
- Vue.js - UI component framework
- Stylus - CSS 预处理器
- siyuan - 思源笔记插件 API
- zhi-lib-base - 基础工具库
- g6 - 知识图谱可视化库
- Vitest - 测试框架
- MongoDB/轻量级回退方案如 SQLite、H2等，默认优先选择轻量级 - 索引和图数据存储

## Project Conventions

### Code Style
- 采用 TypeScript 类型系统
- 采用 Vue.js 官方推荐的代码风格script setup 语法糖
- 变量命名采用 camelCase 格式
- 常量命名采用 UPPER_SNAKE_CASE 格式
- 使用 ESLint 和 Prettier 确保代码质量和一致性

### Architecture Patterns
- 严格遵守思源笔记插件规范，目录结构如下：
  - .github/ - GitHub 配置目录
    - workflows/ - GitHub Actions 工作流配置
  - scripts/ - 项目脚本目录（包含开发、构建和发布相关脚本）
  - src/
    - api/ - API 接口封装
    - i18n/ - 国际化配置
    - utils/ - 工具函数
    - Constants.ts - 常量定义
    - index.ts - 插件入口文件
  - index.styl - 插件样式文件
  - plugin.json - 插件配置文件
  - icon.png - 插件图标
  - package.json - 项目依赖配置文件
  - vite.config.ts - Vite 配置文件
  - README.md - 项目说明文档
  - README_zh_CN.md - 项目说明文档（中文）
  - DEVELOPMENT.md - 开发指南文档

### Testing Strategy
- 单元测试：使用 Vitest 框架测试核心功能模块
- 持续集成：通过 GitHub Actions 自动运行测试套件和构建流程

### Git Workflow
- main 分支：保持稳定可发布的代码
- develop 分支：开发的主要分支，包含最新功能
- feature 分支：新功能开发（格式：feature/功能名称）
- bugfix 分支：修复问题（格式：bugfix/问题描述）
- hotfix 分支：紧急修复生产环境问题（格式：hotfix/问题描述）
- 提交规范：遵循 Conventional Commits 规范（feat:, fix:, docs:, style:, refactor:, test:, chore:）
- 代码审查：合并前必须经过至少一位团队成员的代码审查

## Domain Context
- 思源笔记是一个本地优先的知识管理系统，采用块级别的内容模型
- 非结构化文章是指没有固定格式或模式的文本内容
- 语义分词是将文本切分为有意义的词语或短语的过程
- 倒排索引是一种反向索引，用于快速查找包含特定词语的文档
- 知识图谱是一种表示实体之间关系的结构化图数据模型
- 语义检索是基于文本的实际含义而非关键词匹配的检索方式

## Important Constraints
- 必须严格遵守思源笔记插件API和安全要求
- 所有API调用必须严格遵循siyuan包的TypeScript类型定义(d.ts)，特别是Dialog等UI组件的正确方法使用
- 保护用户隐私，本地处理敏感数据，避免不必要的数据上传
- 性能优化：处理大量笔记数据时保持响应速度
- 内存使用限制：插件运行不应显著增加思源笔记的内存占用
- 保持与思源笔记核心功能的兼容性
- 遵循思源笔记的UI/UX设计风格，保持一致的用户体验
- 支持离线工作环境，不依赖于持续的网络连接

## External Dependencies
- siyuan：思源笔记插件API，用于访问和操作思源笔记数据
- TypeScript：提供类型安全和开发体验
- Vite：快速开发和构建工具
- Stylus：CSS预处理器
- zhi-lib-base：提供基础工具函数
- Vitest：JavaScript测试框架
- @vitejs/plugin-vue：Vue.js插件（未来UI开发预留）
- g6：知识图谱可视化库
- SQLite/H2：轻量级本地数据库，用于存储索引和图谱数据
- jieba分词/THULAC：中文语义分词库
