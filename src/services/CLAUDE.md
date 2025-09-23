[根目录](../../CLAUDE.md) > [src](../) > **services**

# 业务服务模块

## 模块职责

提供核心业务逻辑和服务，包括状态管理、用户交互、图像资源、兼容性检查等功能。

## 入口与启动

### 服务入口
- `bubble/BubbleContext.tsx` - 气泡显示服务
- `userActivation/UserActivationManager.ts` - 用户激活管理
- `userActivation/ElectronUserActivationHelper.ts` - Electron 用户激活助手
- `customImageStorage.ts` - 自定义图像存储
- `imageResourceManager.ts` - 图像资源管理
- `compatibilityChecker.ts` - 兼容性检查

## 服务功能分类

### 气泡服务 (`bubble/`)
- **BubbleContext.tsx** - 气泡显示的 Context Provider
- 功能：宠物思考和对话气泡的显示管理
- 支持：显示时长控制、气泡类型、自动消失

### 用户激活管理 (`userActivation/`)
- **UserActivationManager.ts** - 用户激活状态管理
- **ElectronUserActivationHelper.ts** - Electron 环境下的用户激活助手
- 功能：首次交互检测、权限管理、用户激活状态持久化

### 图像管理
- **customImageStorage.ts** - 自定义图像存储系统
- **imageResourceManager.ts** - 图像资源管理器
- 功能：图像缓存、资源管理、格式转换

### 兼容性检查
- **compatibilityChecker.ts** - 系统兼容性检查
- 功能：环境检测、功能支持检查、降级方案

## 对外接口

### 气泡服务接口
```typescript
const { showBubble, hideBubble } = useBubbleService();

// 显示气泡
showBubble('你好！', 'thought', 3000);
showBubble('我饿了！', 'speech', 5000);
```

### 用户激活接口
```typescript
const manager = getUserActivationManager({
  debugMode: true,
  persistToStorage: true
});

// 检查激活状态
const isActivated = manager.isActivated();

// 记录用户交互
manager.recordInteraction();
```

### 图像管理接口
```typescript
// 存储自定义图像
await storeCustomImage(imageData, metadata);

// 获取图像资源
const imageResource = getImageResource(imageId);
```

### 兼容性检查接口
```typescript
// 检查功能支持
const compatibility = checkCompatibility();

if (compatibility.isHapticFeedbackSupported) {
  // 启用触觉反馈
}
```

## 关键依赖与配置

- **React Context API** - 状态共享
- **Electron API** - 系统集成
- **TypeScript** - 类型安全
- **文件系统** - 本地存储和缓存

## 技术特性

- **状态管理**: Context API + 自定义 hooks
- **持久化**: 本地存储、文件系统
- **性能优化**: 缓存机制、懒加载
- **兼容性**: 渐进增强、优雅降级
- **类型安全**: 完整的 TypeScript 类型定义

## 相关文件清单

### 核心服务
- `bubble/BubbleContext.tsx` - 气泡显示服务
- `userActivation/UserActivationManager.ts` - 用户激活管理
- `userActivation/ElectronUserActivationHelper.ts` - Electron 用户激活助手

### 图像服务
- `customImageStorage.ts` - 自定义图像存储
- `imageResourceManager.ts` - 图像资源管理

### 工具服务
- `compatibilityChecker.ts` - 兼容性检查

## 常见问题 (FAQ)

### Q: 如何添加新的服务？
A: 在对应的功能目录下创建服务文件，遵循命名规范，提供清晰的接口

### Q: 服务之间如何通信？
A: 使用 Context API、事件总线或直接的函数调用，避免循环依赖

### Q: 如何优化服务性能？
A: 使用缓存、懒加载、防抖节流等技术，避免不必要的计算

### Q: 用户激活有什么作用？
A: 用于管理首次交互检测、权限请求、功能启用等，提升用户体验

---

## 变更记录 (Changelog)

### 2025-09-23 22:28
- 服务文档初始化
- 添加用户激活管理服务
- 完善图像管理系统
- 增强兼容性检查功能