[根目录](../../CLAUDE.md) > [src](../) > **hooks**

# React Hooks 模块

## 模块职责

提供可复用的业务逻辑和状态管理功能，按功能领域组织成不同的子模块。

## 入口与启动

- **主入口**: `index.ts` - 统一导出所有 hooks
- **按功能分组**: `animation/`、`core/`、`interaction/`、`pet/`、`settings/`

## Hook 结构分类

### 动画相关 (`animation/`)
- `useSmoothMovement.ts` - 平滑移动算法
- `usePetAnimation.ts` - 宠物动画状态管理

### 核心功能 (`core/`)
- `usePetStatus.ts` - 宠物状态管理主 hook
- `useEventManager.ts` - 事件管理器
- `useOptimizedState.ts` - 优化状态管理
- `usePerformanceMonitor.ts` - 性能监控
- `useDebounce.ts` - 防抖功能
- `useWindowEffects.ts` - 窗口特效管理

### 交互功能 (`interaction/`)
- `index.ts` - 交互相关 hooks 导出
- `usePetInteraction.ts` - 宠物交互主逻辑
- `useMouseHandling.ts` - 鼠标事件处理
- `useDragHandling.ts` - 拖拽处理
- `useMenuHandling.ts` - 菜单处理
- `useMouseChasing.ts` - 鼠标追逐
- `useReactionAnimations.ts` - 反应动画
- `useEyeTracking.ts` - 眼球追踪
- `useHapticFeedback.ts` - 触觉反馈
- `useIdleHandling.ts` - 空闲状态处理
- `useContextMenuHandling.ts` - 右键菜单
- `useInteractionDetection.ts` - 交互检测
- `useInteractionFeedback.ts` - 交互反馈
- `useActionHandling.ts` - 动作处理
- `types.ts` - 交互相关类型定义
- `constants.ts` - 交互相关常量

### 宠物功能 (`pet/`)
- `index.ts` - 宠物相关 hooks 导出
- `useStateLoader.ts` - 状态加载器
- `usePetAnimation.ts` - 宠物动画
- `useInventory.ts` - 库存管理
- `useInteraction.ts` - 宠物交互
- `useStatusWarnings.ts` - 状态警告
- `useAnimations.ts` - 动画管理
- `useStatusDecay.ts` - 状态衰减
- `useLevelingSystem.ts` - 等级系统
- `useTaskManager.ts` - 任务管理
- `useAchievementManager.ts` - 成就管理
- `useSpecialEvents.ts` - 特殊事件
- `useProactiveNeeds.ts` - 主动需求
- `useAutonomousMovement.ts` - 自主移动
- `useStatusDecay.ts` - 状态衰减
- `constants.ts` - 宠物相关常量

### 设置功能 (`settings/`)
- `useSettings.ts` - 设置管理

### 工具函数
- `useImageResource.ts` - 图像资源管理
- `useImagePreloader.ts` - 图像预加载
- `useCompatibility.ts` - 兼容性检查

## 对外接口

### 状态管理接口
```typescript
// 主要状态管理 hook
const {
  status,
  setStatus,
  interact,
  isLoaded,
  currentPetTypeId,
  // ... 其他状态和函数
} = usePetStatus();
```

### 交互接口
```typescript
// 宠物交互
const {
  handleMouseDown,
  handleMouseEnter,
  handleMouseLeave,
  petPosition,
  isDragging,
  // ... 其他交互函数
} = usePetInteraction();
```

### 设置接口
```typescript
// 设置管理
const { settings, updateSettings } = useSettings();
```

## 关键依赖与配置

- **React Hooks** - 原生 React hooks
- **TypeScript** - 完整的类型安全
- **性能优化**: useMemo、useCallback、useRef
- **状态管理**: Context API + 自定义 hooks

## 技术特性

- **模块化**: 按功能领域组织，便于维护
- **可复用**: 单一职责，高度可复用
- **性能优化**: 使用 React 优化技巧
- **类型安全**: 完整的 TypeScript 类型定义
- **状态管理**: 统一的状态管理模式
- **事件处理**: 标准化的事件处理流程

## 相关文件清单

### 核心文件
- `index.ts` - 统一导出
- `core/usePetStatus.ts` - 主要状态管理
- `pet/index.ts` - 宠物功能导出

### 动画相关
- `animation/useSmoothMovement.ts`
- `animation/usePetAnimation.ts`

### 交互相关
- `interaction/index.ts`
- `interaction/usePetInteraction.ts`
- `interaction/useMouseHandling.ts`
- `interaction/useDragHandling.ts`
- `interaction/useMouseChasing.ts`
- `interaction/useHapticFeedback.ts`
- `interaction/types.ts`
- `interaction/constants.ts`

### 宠物相关
- `pet/index.ts`
- `pet/useStateLoader.ts`
- `pet/useAnimations.ts`
- `pet/useLevelingSystem.ts`
- `pet/useTaskManager.ts`
- `pet/useAchievementManager.ts`

### 设置相关
- `settings/useSettings.ts`

## 常见问题 (FAQ)

### Q: 如何创建新的 hook？
A: 在对应的功能目录下创建文件，遵循命名规范 `useXxx.ts`

### Q: hooks 之间如何共享状态？
A: 使用 Context API 或通过 props 传递，避免循环依赖

### Q: 性能如何优化？
A: 使用 useMemo、useCallback，避免不必要的重渲染，合理使用 useRef

---

## 变更记录 (Changelog)

### 2025-09-23 22:28
- Hooks 文档初始化
- 完善功能分类和组织结构
- 添加新 hooks 说明（任务、成就、等级系统）
- 优化性能和类型安全