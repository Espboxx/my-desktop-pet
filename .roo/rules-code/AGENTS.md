# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## 项目编码规则（仅非显而易见的内容）

### 核心架构模式
- **双窗口系统**：宠物窗口（全屏透明）和设置窗口（标准窗口），通过 URL 参数 `?window=pet` 或 `?window=settings` 区分
- **状态管理**：必须使用 Context API（PetStatusContext 和 BubbleContext），不要使用其他状态管理库
- **窗口通信**：所有主进程和渲染进程通信必须通过 Electron IPC，使用预定义的 IPC 处理器

### 关键技术实现细节
- **宠物位置**：必须使用 CSS transform 而不是窗口位置，通过内部定位实现移动（避免窗口闪烁）
- **状态持久化**：必须使用原子写入 + 备份机制（主文件、备份文件、临时文件），确保数据完整性
- **鼠标穿透**：必须根据交互状态动态设置窗口的鼠标穿透属性，使用 `setIgnoreMouseEvents(enable, { forward: true })`

### 钩子函数使用规则
- **交互钩子**：所有交互逻辑必须使用 `src/hooks/interaction/` 中的钩子，不要直接实现交互逻辑
- **宠物状态钩子**：必须使用 `src/hooks/pet/` 中的钩子管理宠物状态
- **性能监控**：必须使用 `src/config/performanceConfig.ts` 中的配置，区分开发和生产环境

### 特殊文件路径
- 状态文件：`userData/pet-state.json`（带备份机制）
- 窗口特效管理器：`electron/windowEffects.ts`（需要在应用退出时清理资源）
- 宠物类型定义：`src/constants/petConstants.ts`（包含所有宠物类型和表情定义）

### 开发注意事项
- 开发模式下宠物窗口会自动打开开发者工具
- 使用 Alt+P 全局快捷键显示/隐藏宠物窗口
- 宠物窗口默认是全屏透明的，通过内部 CSS 控制宠物显示位置
- 状态保存使用原子写入，确保数据完整性