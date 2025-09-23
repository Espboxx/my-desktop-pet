# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## 项目概述
这是一个基于 Electron + React + TypeScript 的桌面宠物应用，使用 Vite 作为构建工具。应用包含两个主要窗口：宠物窗口（全屏透明）和设置窗口。

## 构建和运行命令
- `npm run dev` - 启动开发模式（自动打开开发者工具）
- `npm run build` - 构建应用并打包（先执行 TypeScript 编译，然后 Vite 构建，最后 electron-builder 打包）
- `npm run lint` - 运行 ESLint 检查（使用 TypeScript 和 React Hooks 规则）
- `npm run preview` - 预览构建后的应用

## 代码风格指南
- 使用 TypeScript 严格模式（strict: true）
- 使用 ESLint 检查，包括 TypeScript 规则和 React Hooks 规则
- 使用 React 18 + TypeScript，函数组件和 Hooks
- 使用绝对导入（src/ 和 electron/ 都在 TypeScript 路径中）
- 遵循 React Refresh 规则（仅导出组件，允许常量导出）

## 项目特定架构
- **双窗口系统**：宠物窗口（全屏透明）和设置窗口（标准窗口）
- **状态管理**：使用 Context API（PetStatusContext 和 BubbleContext）
- **窗口通信**：通过 Electron IPC 进行主进程和渲染进程通信
- **文件结构**：
  - `electron/` - Electron 主进程代码
  - `src/` - React 渲染进程代码
  - `src/hooks/` - 自定义 Hooks，按功能分组（interaction、pet、core）
  - `src/components/` - React 组件
  - `src/types/` - TypeScript 类型定义

## 关键技术细节
- **宠物位置**：使用 CSS transform 而不是窗口位置，通过内部定位实现移动
- **状态持久化**：使用原子写入 + 备份机制（主文件、备份文件、临时文件）
- **性能优化**：使用性能监控配置，区分开发和生产环境
- **窗口特效**：实现了丝滑置顶效果，避免窗口闪烁
- **鼠标穿透**：根据交互状态动态设置窗口的鼠标穿透属性

## 重要文件路径
- 状态文件：`userData/pet-state.json`（带备份机制）
- 主进程入口：`electron/main.ts`
- 渲染进程入口：`src/main.tsx`
- 宠物类型定义：`src/constants/petConstants.ts`
- 性能配置：`src/config/performanceConfig.ts`

## 开发注意事项
- 开发模式下宠物窗口会自动打开开发者工具
- 使用 Alt+P 全局快捷键显示/隐藏宠物窗口
- 宠物窗口默认是全屏透明的，通过内部 CSS 控制宠物显示位置
- 状态保存使用原子写入，确保数据完整性
- 窗口特效管理器需要在应用退出时清理资源