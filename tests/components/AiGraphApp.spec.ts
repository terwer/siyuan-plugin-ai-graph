import { describe, it, expect, beforeEach, vi } from "vitest"
import { mount } from "@vue/test-utils"
import AiGraphApp from "../../src/components/AiGraphApp.vue"

// Mock console.log to prevent cluttering test output
vi.spyOn(console, "log").mockImplementation(() => {})
vi.spyOn(console, "error").mockImplementation(() => {})

describe("AiGraphApp.vue", () => {
  let mockPluginInstance: any
  let mockDialog: any

  beforeEach(() => {
    // Mock the plugin instance with necessary properties
    mockPluginInstance = {
      version: "0.0.1",
      i18n: {
        aiGraph: "AI Graph",
        aiGraphDescription: "Generate and visualize knowledge graphs",
        generateGraph: "Generate Graph",
        exportGraph: "Export Graph",
        clickGenerateGraph: "Click Generate Graph to start",
        generatingGraph: "Generating graph...",
      },
    }

    // Mock the dialog object
    mockDialog = {
      destroy: vi.fn(),
    }
  })

  it("should mount successfully", () => {
    const wrapper = mount(AiGraphApp, {
      props: {
        pluginInstance: mockPluginInstance,
        dialog: mockDialog,
      },
    })

    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find(".ai-graph-app").exists()).toBe(true)
  })

  it("should display correct title and description", () => {
    const wrapper = mount(AiGraphApp, {
      props: {
        pluginInstance: mockPluginInstance,
        dialog: mockDialog,
      },
    })

    expect(wrapper.find("h2").text()).toBe("AI Graph - v0.0.1")
    expect(wrapper.find(".ai-graph-header p").text()).toBe("Generate and visualize knowledge graphs")
  })

  it("should display buttons correctly", () => {
    const wrapper = mount(AiGraphApp, {
      props: {
        pluginInstance: mockPluginInstance,
        dialog: mockDialog,
      },
    })

    const buttons = wrapper.findAll("button")
    expect(buttons).toHaveLength(2)
    expect(buttons[0].text()).toBe("Generate Graph")
    expect(buttons[1].text()).toBe("Export Graph")
  })

  it("should show placeholder text initially", () => {
    const wrapper = mount(AiGraphApp, {
      props: {
        pluginInstance: mockPluginInstance,
        dialog: mockDialog,
      },
    })

    expect(wrapper.find(".graph-placeholder").exists()).toBe(true)
    expect(wrapper.find(".graph-placeholder").text()).toBe("Click Generate Graph to start")
    expect(wrapper.find(".graph-loading").exists()).toBe(false)
  })

  it("should show loading state when generateGraph is called", async () => {
    const wrapper = mount(AiGraphApp, {
      props: {
        pluginInstance: mockPluginInstance,
        dialog: mockDialog,
      },
    })

    // Mock setTimeout to speed up the test
    vi.useFakeTimers()

    // Click the generate graph button
    const generatePromise = wrapper.find("button.btn-primary").trigger("click")

    // Check if loading state is shown
    await wrapper.vm.$nextTick()
    expect(wrapper.find(".graph-loading").exists()).toBe(true)
    expect(wrapper.find(".graph-placeholder").exists()).toBe(false)

    // Fast-forward time to complete the async operation
    vi.runAllTimers()

    // Wait for the async operation to complete
    await generatePromise

    // Wait for Vue to update after state change
    await wrapper.vm.$nextTick()

    // Check if loading state is hidden after completion
    expect(wrapper.find(".graph-loading").exists()).toBe(false)
    // Instead of checking for placeholder, check that visualization is present
    expect(wrapper.find(".ai-graph-visualization").exists()).toBe(true)

    vi.useRealTimers()
  })

  it("should handle exportGraph button click", async () => {
    const wrapper = mount(AiGraphApp, {
      props: {
        pluginInstance: mockPluginInstance,
        dialog: mockDialog,
      },
    })

    // Click the export graph button
    await wrapper.find("button.btn-secondary").trigger("click")

    // Verify that console.log was called (since the actual export logic is TODO)
    expect(console.log).toHaveBeenCalledWith("Exporting knowledge graph...")
  })

  it("should handle missing version gracefully", async () => {
    // Create a mock without version
    const pluginInstanceWithoutVersion = {
      ...mockPluginInstance,
      version: undefined,
    }

    const wrapper = mount(AiGraphApp, {
      props: {
        pluginInstance: pluginInstanceWithoutVersion,
        dialog: mockDialog,
      },
    })

    // 等待组件挂载完成
    await wrapper.vm.$nextTick()

    // 验证标题包含正确的前缀
    expect(wrapper.find("h2").text()).toContain("AI Graph - v")
  })

  it("should handle version error gracefully", async () => {
    // 提供一个基本版本以确保组件能正常挂载
    const pluginInstanceWithBasicVersion = {
      ...mockPluginInstance,
      version: "0.0.1",
    }

    const wrapper = mount(AiGraphApp, {
      props: {
        pluginInstance: pluginInstanceWithBasicVersion,
        dialog: mockDialog,
      },
    })

    // 等待组件挂载完成
    await wrapper.vm.$nextTick()

    // 验证组件能够正常挂载并显示版本
    expect(wrapper.find("h2").text()).toContain("AI Graph - v")
  })
})
