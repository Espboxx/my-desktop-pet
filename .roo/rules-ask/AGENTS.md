# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## 项目文档规则（仅非显而易见的内容）

### 文档结构和组织
- **双窗口系统**：应用包含两个不同类型的窗口，每个窗口有不同的功能和渲染逻辑
- **状态管理**：使用 Context API 而不是 Redux 或其他状态管理库，这是项目的特殊选择
- **文件组织**：钩子函数按功能分组（interaction、pet、core），而不是按组件分组

### 非直观的命名约定
- **宠物窗口**：虽然是全屏透明窗口，但实际宠物只在屏幕一角显示，通过内部 CSS 定位
- **设置窗口**：标准窗口类型，但通过 URL 参数 `?window=settings` 区分
- **状态文件**：使用三重文件系统（主文件、备份文件、临时文件）确保数据完整性

### 关键概念解释
- **原子写入**：状态保存时先写入临时文件，然后重命名为主文件，避免数据损坏
- **鼠标穿透**：根据交互状态动态设置，使用 `setIgnoreMouseEvents(enable, { forward: true })`
- **丝滑置顶**：特殊的窗口管理技术，避免窗口闪烁和置顶冲突

### 特殊文件路径说明
- **electron/windowEffects.ts**：管理窗口特效，需要在应用退出时清理资源
- **src/hooks/interaction/**：所有交互逻辑的钩子函数，包括鼠标追踪、点击处理等
- **src/services/userActivation/**：处理用户激活状态，影响触觉反馈等功能

### 配置文件位置
- **性能配置**：`src/config/performanceConfig.ts`，区分开发和生产环境
- **宠物类型定义**：`src/constants/petConstants.ts`，包含所有宠物类型和表情定义
- **交互常量**：`src/hooks/interaction/constants.ts`，定义交互相关的阈值和参数

### 反直觉的实现细节
- **宠物移动**：使用 CSS transform 而不是窗口位置，避免窗口闪烁
- **窗口大小**：宠物窗口实际上是全屏的，但通过 CSS 控制显示区域
- **状态保存**：主进程和渲染进程都可以触发状态保存，但实际写入操作在主进程