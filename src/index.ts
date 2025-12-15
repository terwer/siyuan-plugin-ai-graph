/*
 * Copyright (c) 2023, Terwer . All rights reserved.
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 * This code is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 2 only, as
 * published by the Free Software Foundation.  Terwer designates this
 * particular file as subject to the "Classpath" exception as provided
 * by Terwer in the LICENSE file that accompanied this code.
 *
 * This code is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
 * version 2 for more details (a copy is included in the LICENSE file that
 * accompanied this code).
 *
 * You should have received a copy of the GNU General Public License version
 * 2 along with this work; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 *
 * Please contact Terwer, Shenzhen, Guangdong, China, youweics@163.com
 * or visit www.terwer.space if you need additional information or have any
 * questions.
 */

import { App, IObject, Plugin } from "siyuan"
import { ILogger, simpleLogger } from "zhi-lib-base"
import { Topbar } from "./topbar"
import { dataDir, isDev } from "./Constants"
import pkg from "../package.json"

import "../index.styl"

export default class AiGraphPlugin extends Plugin {
  private logger: ILogger
  private topbar: Topbar

  constructor(options: { app: App; id: string; name: string; i18n: IObject }) {
    super(options)

    this.logger = simpleLogger("index", "ai-graph", isDev)
    this.topbar = new Topbar(this)
  }

  async onload() {
    this.logger.info("智能图谱插件已加载")

    try {
      // 初始化顶栏
      await this.topbar.initTopbar()
      this.logger.info("顶栏初始化完成")
      // 初始化 Zhi Infra
      await this.initZhiInfra()
    } catch (error) {
      this.logger.error("智能图谱插件初始化失败:", error)
    }
  }

  onunload() {
    this.logger.info("智能图谱插件已卸载")
  }

  //================================================================
  // private function
  //================================================================

  public async initZhiInfra() {
    this.logger.info("开始初始化 Zhi Infra...")
    try {
      const pluginDir = `${dataDir}/plugins/${pkg.name}`
      const win = window as any
      const zhiInfraActivator = win.require(`${pluginDir}/libs/zhi-infra/index.cjs`).default
      const zhiNpmPath = `${pluginDir}/libs/deps/npm`
      await zhiInfraActivator(zhiNpmPath, true)
      const zhi = win.zhi
      zhi.npm.depsJsonPath = `${pluginDir}`
      this.logger.info("Zhi Infra 初始化完成")
    } catch (e) {
      this.logger.error("Zhi Infra 初始化出错", e)
    }
  }
}
