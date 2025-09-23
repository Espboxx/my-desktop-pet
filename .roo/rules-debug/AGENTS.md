# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## 项目调试规则（仅非显而易见的内容）

### 调试工具和技巧
- **开发者工具**：开发模式下宠物窗口会自动打开开发者工具，设置窗口需要手动打开
- **全局快捷键**：使用 Alt+P 显示/隐藏宠物窗口，便于调试
- **性能监控**：使用 `src/config/performanceConfig.ts` 中的配置，开发环境默认启用性能监控

### 调试特定功能
- **窗口特效**：使用 `electron/windowEffects.ts` 中的 `windowEffectsManager` 调试丝滑置顶效果
- **鼠标穿透**：通过 IPC 调用 `set-mouse-passthrough` 调试鼠标穿透状态
- **状态持久化**：检查 `userData/pet-state.json`、`userData/pet-state.json.bak` 和 `userData/pet-state.json.tmp` 文件

### 常见调试问题
- **窗口闪烁**：确保使用 CSS transform 而不是窗口位置来移动宠物
- **状态丢失**：检查原子写入机制是否正常工作，查看备份文件
- **交互不响应**：检查鼠标穿透状态和交互钩子的配置
- **性能问题**：使用性能监控配置检查渲染时间和内存使用

### 日志和输出
- **主进程日志**：查看控制台输出，关注窗口创建和 IPC 通信
- **渲染进程日志**：在开发者工具中查看，关注状态更新和交互事件
- **性能警告**：开发环境下会显示性能警告，生产环境下关闭

### 调试工具位置
- **交互调试**：`src/components/InteractionTest.tsx`
- **图像系统测试**：`src/components/ImageSystemTest.tsx`
- **触觉反馈测试**：`src/components/HapticFeedbackTest.tsx`
- **拖拽测试**：`src/utils/dragTestHelper.ts`