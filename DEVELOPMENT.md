# 开发指南

## 环境要求
- Node.js 22.x 或以上版本
- pnpm 10.x 或以上版本

## 安装依赖

在项目根目录下执行以下命令安装依赖：

```bash
pnpm install
```

## 启动调试

在项目根目录下执行以下命令启动调试：

```bash
pnpm dev
```

创建思源笔记软连接

在项目根目录下执行以下命令创建软连接：

```bash
pnpm makeLink
```

打开思源笔记，在插件管理中启用该插件。保持服务器不停止，可以热重载。

## 使用siyuan包类型定义

在开发过程中，请严格遵循siyuan包的TypeScript类型定义(d.ts)：

1. **查看类型定义**：您可以通过以下命令查看siyuan包的类型定义文件：
   ```bash
   cat node_modules/.pnpm/siyuan@1.1.5/node_modules/siyuan/siyuan.d.ts
   ```

2. **重要API使用规范**：
   - Dialog组件：必须使用destroy()方法进行销毁，不要使用close()方法
   - 其他UI组件：请参考对应的类型定义，确保方法名和参数正确
   
3. **IDE支持**：推荐使用VSCode等支持TypeScript的IDE，可以获得自动补全和类型检查支持

4. **编译检查**：运行TypeScript编译检查以验证API使用的正确性：
   ```bash
   npx tsc --noEmit
   ```