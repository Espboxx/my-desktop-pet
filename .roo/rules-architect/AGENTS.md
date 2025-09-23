# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## 项目架构规则（仅非显而易见的内容）

### 核心架构决策
- **双窗口系统**：使用一个全屏透明窗口（宠物）和一个标准窗口（设置），通过 URL 参数区分
- **内部定位**：宠物在窗口内部使用 CSS transform 定位，而不是移动窗口本身，避免闪烁
- **状态管理**：选择 Context API 而非 Redux，简化架构并减少依赖

### 关键架构模式
- **钩子分层**：钩子函数按功能分组（interaction、pet、core），每个组负责特定领域
- **IPC 通信**：主进程和渲染进程通过预定义的 IPC 处理器通信，确保类型安全
- **原子写入**：状态保存使用三重文件系统（主文件、备份文件、临时文件），确保数据完整性

### 隐藏的依赖关系
- **窗口特效管理器**：`electron/windowEffects.ts` 需要在应用退出时清理资源，避免内存泄漏
- **用户激活管理器**：`src/services/userActivation/` 管理用户激活状态，影响触觉反馈等功能
- **性能监控**：`src/config/performanceConfig.ts` 在开发和生产环境有不同的配置

### 非标准的性能优化
- **鼠标穿透**：根据交互状态动态设置，使用 `setIgnoreMouseEvents(enable, { forward: true })`
- **丝滑置顶**：特殊的窗口管理技术，避免窗口闪烁和置顶冲突
- **CSS transform**：宠物移动使用 CSS transform 而不是窗口位置，提高性能

### 架构约束和限制
- **状态持久化**：所有状态必须通过主进程保存，渲染进程只能通过 IPC 请求保存
- **窗口通信**：所有跨窗口通信必须通过主进程转发，不能直接通信
- **钩子使用**：必须使用预定义的钩子函数，不能直接实现交互逻辑

### 扩展性考虑
- **宠物类型**：通过 `src/constants/petConstants.ts` 定义，支持多种模型类型（emoji、image、spritesheet、svg）
- **表情系统**：支持解锁机制，通过等级解锁新表情
- **成就系统**：基于条件触发，支持多种条件类型（互动次数、状态阈值、等级等）