[根目录](../CLAUDE.md) > **electron**

# Electron 主进程模块

## 模块职责

负责 Electron 应用的主进程逻辑，包括窗口管理、进程间通信、系统集成和系统服务。

## 入口与启动

- **主入口**: `main.ts` - 应用启动、窗口创建、生命周期管理
- **预加载**: `preload.ts` - 主进程与渲染进程的安全通信桥接
- **窗口特效**: `windowEffects.ts` - 丝滑置顶效果和窗口动画管理

## 对外接口

### IPC 处理器
- `get-pet-state` - 获取宠物状态
- `save-pet-state` - 保存宠物状态
- `open-settings` - 打开设置窗口
- `set-mouse-passthrough` - 设置鼠标穿透
- `adjust-pet-window-size` - 调整宠物窗口大小
- `smooth-bring-to-top` - 丝滑置顶效果
- `cancel-top-most` - 取消置顶

### 系统服务
- 托盘图标管理
- 全局快捷键 (Alt+P)
- 状态持久化 (原子写入 + 备份机制)

## 关键依赖与配置

- **Electron 30.0.1** - 桌面应用框架
- **Node.js API** - 文件系统、进程管理
- **类型安全**: `electron-env.d.ts` 提供 Electron API 类型定义

## 数据模型

- `SavedPetData` - 宠物状态数据结构
- `SmoothTopMostConfig` - 窗口特效配置
- 状态文件: `userData/pet-state.json` (主 + 备份 + 临时)

## 技术特性

- **窗口管理**: 双窗口系统 (宠物窗口 + 设置窗口)
- **状态持久化**: 原子写入 + 备份恢复机制
- **性能优化**: 窗口特效管理器，避免闪烁
- **系统集成**: 托盘图标、全局快捷键、系统通知

## 相关文件清单

- `main.ts` - 主进程入口，包含所有 IPC 处理器
- `preload.ts` - 预加载脚本，安全暴露 API
- `windowEffects.ts` - 窗口特效管理器
- `electron-env.d.ts` - Electron API 类型定义

## 常见问题 (FAQ)

### Q: 如何添加新的 IPC 处理器？
A: 在 `main.ts` 中添加 `ipcMain.handle()` 或 `ipcMain.on()` 监听器

### Q: 窗口特效不工作怎么办？
A: 检查 `windowEffects.ts` 中的配置是否启用，确保窗口实例有效

### Q: 状态保存失败如何处理？
A: 系统会自动尝试从备份文件恢复，检查文件权限和磁盘空间

---

## 变更记录 (Changelog)

### 2025-09-23 22:28
- 模块文档初始化
- 添加丝滑置顶效果和窗口特效管理器
- 完善状态持久化机制