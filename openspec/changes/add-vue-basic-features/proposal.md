# Change: 添加 Vue 基本功能

## Why
为了实现知识图谱可视化和用户交互界面，需要引入 Vue.js 作为 UI 组件框架，以提供更好的用户体验和开发效率。

## What Changes
- 添加 Vue.js 作为前端框架
- 配置 Vue.js 的开发环境和构建流程
- 实现基本的 Vue 组件结构
- 与项目现有的 TypeScript 和 Vite 构建工具集成
- 添加 script setup 语法糖支持
- 严格按照思源笔记插件形式集成，通过对话框方式挂载 Vue 组件
- 创建 src/topbar.ts 管理顶栏按钮和 Vue 组件的初始化

```
// 直接导入所需模块
import Vue from "vue"
import AiGraphApp from "./components/AiGraphApp.vue"
import { Dialog } from "siyuan"

class Topbar {
  protected pluginInstance: AiGraphPlugin

  constructor(pluginInstance: AiGraphPlugin) {
    this.pluginInstance = pluginInstance
  }

  /**
   * 顶栏按钮
   *
   * @author terwer
   * @version 0.0.1
   * @since 0.0.1
   */
  public async initTopbar() {
    const topBarElement = this.pluginInstance.addTopBar({
      icon: icons.iconAiGraph,
      title: this.pluginInstance.i18n.exportMd,
      position: "right",
      callback: () => {},
    })

    topBarElement.addEventListener("click", (event) => {
      const containerId = "ai-graph-dialog"
      const d = new Dialog({
        title: `${this.pluginInstance.i18n.aiGraph} - v${pkg.version}`,
        content: `<div id="${containerId}"></div>`,
        width: this.pluginInstance.isMobile ? "92vw" : "61.8vw",
      })
      
      // 严格按照思源笔记插件方式挂载 Vue 组件
        const container = document.getElementById(containerId)
        if (container) {
          // 创建 Vue 应用实例并传递插件上下文
          const app = Vue.createApp(AiGraphApp, {
          pluginInstance: this.pluginInstance,
          dialog: d
        })
        
        // 挂载 Vue 应用到 dialog 的容器中
        app.mount(container)
        
        // 确保 dialog 关闭时正确销毁 Vue 应用
        // 使用 destroyCallback 来确保资源释放
        const originalDestroy = d.destroy.bind(d)
        // 重新定义 destroy 方法
        d.destroy = () => {
          // 销毁 Vue 应用实例，释放资源
          if (app && container) {
            app.unmount()
          }
          // 调用原始的 destroy 方法
          originalDestroy()
        }
      }
  }
}

export { Topbar }
```

然后在 src/index.ts 初始化

```
await this.topbar.initTopbar()
```

## Impact
- Affected specs: 前端界面、用户交互
- Affected code: 主要涉及 UI 层实现，将新增 Vue 组件文件和相关配置