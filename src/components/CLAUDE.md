[根目录](../../CLAUDE.md) > [src](../) > **components**

# React 组件模块

## 模块职责

负责应用的 UI 组件实现，包括宠物展示、设置界面、交互面板和用户界面元素。

## 入口与启动

- **主组件**: `App.tsx` - 应用根组件，提供 Context Provider 和窗口类型管理
- **宠物窗口**: `PetWindow.tsx` - 宠物主要展示窗口，包含所有宠物相关 UI
- **设置窗口**: `SettingsWindow.tsx` - 设置界面，标签页管理

## 核心组件结构

### 宠物相关组件
- `Pet/PetModel.tsx` - 宠物模型渲染 (emoji/image/spritesheet/svg)
- `Pet/PetBubble.tsx` - 宠物气泡显示
- `Pet/PetStatusBar.tsx` - 宠物状态栏
- `Pet/PetContextMenu.tsx` - 宠物右键菜单

### 设置界面组件
- `SettingsTabs/` - 设置标签页组件集合
  - `GeneralTab.tsx` - 常规设置
  - `AppearanceTab.tsx` - 外观设置
  - `PetSelectionTab.tsx` - 宠物选择
  - `AccessoriesTab.tsx` - 饰品设置
  - `TasksAchievementsTab.tsx` - 任务和成就
  - `InventoryTab.tsx` - 库存管理
  - `ImageManagementTab.tsx` - 图像管理
  - `WindowEffectsTab.tsx` - 窗口特效设置

### 交互组件
- `InteractionPanel.tsx` - 交互面板
- `UserInteractionInitializer.tsx` - 用户交互初始化器
- `ErrorBoundary.tsx` - 错误边界组件
- `UI/OptimizedMenuLayout.tsx` - 优化菜单布局

### 测试和调试组件
- `InteractionTest.tsx` - 交互测试
- `HapticFeedbackTest.tsx` - 触觉反馈测试
- `ImageSystemTest.tsx` - 图像系统测试
- `CompatibilityStatus/CompatibilityStatus.tsx` - 兼容性状态

## 对外接口

### Props 接口
- 所有组件都使用 TypeScript 接口定义 props
- 支持可选属性和默认值
- 使用 React.FC 类型声明

### 事件处理
- 标准化的鼠标事件处理
- 自定义事件回调函数
- Context API 状态共享

## 关键依赖与配置

- **React 18.2.0** - UI 框架
- **React Icons 5.5.0** - 图标库
- **样式系统**: CSS Modules + 全局样式
- **类型安全**: 完整的 TypeScript 类型定义

## 技术特性

- **组件化**: 模块化设计，单一职责原则
- **性能优化**: 使用 React.memo、useMemo、useCallback
- **交互体验**: 触觉反馈、动画效果、状态反馈
- **响应式设计**: 适配不同屏幕尺寸
- **错误处理**: ErrorBoundary 错误边界
- **开发工具**: 调试组件和测试工具

## 相关文件清单

### 主要组件
- `App.tsx` - 应用根组件
- `PetWindow.tsx` - 宠物主窗口
- `SettingsWindow.tsx` - 设置窗口
- `Pet/PetModel.tsx` - 宠物模型
- `Pet/PetBubble.tsx` - 宠物气泡
- `Pet/PetStatusBar.tsx` - 状态栏
- `Pet/PetContextMenu.tsx` - 右键菜单

### 设置标签页
- `SettingsTabs/GeneralTab.tsx`
- `SettingsTabs/AppearanceTab.tsx`
- `SettingsTabs/PetSelectionTab.tsx`
- `SettingsTabs/AccessoriesTab.tsx`
- `SettingsTabs/TasksAchievementsTab.tsx`
- `SettingsTabs/InventoryTab.tsx`
- `SettingsTabs/ImageManagementTab.tsx`
- `SettingsTabs/WindowEffectsTab.tsx`

### 交互和辅助组件
- `InteractionPanel.tsx`
- `UserInteractionInitializer.tsx`
- `ErrorBoundary.tsx`
- `UI/OptimizedMenuLayout.tsx`

## 常见问题 (FAQ)

### Q: 如何添加新的宠物类型？
A: 在 `PetSelectionTab.tsx` 中添加选择选项，并在 `petConstants.ts` 中定义新的宠物类型

### Q: 如何自定义宠物外观？
A: 通过 `PetModel.tsx` 组件的 props 传入自定义配置，支持 emoji、图片、精灵图、SVG 等格式

### Q: 组件性能如何优化？
A: 使用 React.memo、useMemo、useCallback，避免不必要的重渲染

---

## 变更记录 (Changelog)

### 2025-09-23 22:28
- 组件文档初始化
- 完善组件结构分类
- 添加新组件说明（任务、成就、库存、图像管理）
- 优化性能和交互体验