import { createApp } from "vue"
import AiGraphApp from "./components/AiGraphApp.vue"
import { Dialog } from "siyuan"
import { icons } from "./utils/svg"
import pkg from "../package.json"

/**
 * 顶栏管理类
 * 负责初始化顶栏按钮和处理 Vue 组件的挂载
 *
 * @author terwer
 * @version 0.0.1
 * @since 0.0.1
 */
class Topbar {
  protected pluginInstance: any

  /**
   * 构造函数
   * @param pluginInstance 插件实例
   */
  constructor(pluginInstance: any) {
    this.pluginInstance = pluginInstance
  }

  /**
   * 初始化顶栏按钮
   *
   * @author terwer
   * @version 0.0.1
   * @since 0.0.1
   */
  public async initTopbar() {
    try {
      const topBarElement = this.pluginInstance.addTopBar({
        icon: icons.iconAiGraph,
        title: this.pluginInstance.i18n.aiGraph,
        position: "right",
        callback: () => {},
      })

      topBarElement.addEventListener("click", (event: MouseEvent) => {
        this.handleTopbarClick(event)
      })

      console.log("Topbar initialized successfully")
    } catch (error) {
      console.error("Failed to initialize topbar:", error)
    }
  }

  /**
   * 处理顶栏按钮点击事件
   * @param event 鼠标事件
   */
  private handleTopbarClick(event: MouseEvent) {
    const containerId = "ai-graph-dialog"

    // 创建对话框
    const d = new Dialog({
      // title: `${this.pluginInstance.i18n.aiGraph} - v${pkg.version}`,
      content: `<div id="${containerId}"></div>`,
      width: this.pluginInstance.isMobile ? "92vw" : "61.8vw",
    })

    // 严格按照思源笔记插件方式挂载 Vue 组件
    setTimeout(() => {
      const container = document.getElementById(containerId)
      if (container) {
        // 创建 Vue 应用实例并传递插件上下文
        const app = createApp(AiGraphApp, {
          pluginInstance: this.pluginInstance,
          dialog: d,
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
    }, 100)
  }
}

export { Topbar }
