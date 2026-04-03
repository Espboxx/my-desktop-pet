# 测试框架

## 概述

本项目采用模块化的测试框架，提供统一的测试工具和组件，确保代码质量和功能稳定性。

## 目录结构

```
tests/
├── components/          # 测试组件
│   ├── HapticFeedbackTest.tsx    # 触觉反馈测试
│   ├── ImageSystemTest.tsx       # 图像系统测试
│   └── InteractionTest.tsx       # 交互测试
├── database/           # 数据库测试
│   └── performance.test.ts       # 性能测试
├── utils/              # 测试工具
│   └── unifiedTestHelpers.ts     # 统一测试助手
└── index.ts            # 测试框架入口
```

## 使用方法

### 导入测试工具

```typescript
// 导入统一测试框架
import { UnifiedTester, runAllTests } from '@/tests';

// 导入特定测试组件
import { HapticFeedbackTest } from '@/tests';

// 运行所有测试
const results = await runAllTests();
```

### 开发环境使用

在开发环境中，测试工具会自动加载：

```typescript
// 开发环境自动导入测试工具
if (process.env.NODE_ENV === 'development') {
  import('@/tests/utils/unifiedTestHelpers');
}
```

## 测试组件

### HapticFeedbackTest
- **功能**: 测试触觉反馈和用户激活管理器
- **位置**: `tests/components/HapticFeedbackTest.tsx`
- **用途**: 验证振动API和用户交互检测

### ImageSystemTest
- **功能**: 测试图像资源管理系统
- **位置**: `tests/components/ImageSystemTest.tsx`
- **用途**: 验证图像加载、兼容性和缓存

### InteractionTest
- **功能**: 测试交互反馈系统
- **位置**: `tests/components/InteractionTest.tsx`
- **用途**: 验证用户交互和反馈机制

## 测试工具

### UnifiedTester
统一的测试工具类，提供：
- 拖拽测试 (DragTester)
- 首次点击测试 (FirstClickTester)
- 窗口特效测试 (WindowEffectsTester)

### 性能测试
数据库性能和操作效率测试：
- 数据库读写性能
- 索引效率
- 并发操作测试

## 配置

测试框架会根据环境变量自动调整：
- `NODE_ENV === 'development'`: 启用调试模式
- `NODE_ENV === 'test'`: 启用测试模式

## 最佳实践

1. **测试隔离**: 每个测试组件应该独立运行
2. **环境清理**: 测试后清理临时数据和状态
3. **错误处理**: 测试应该包含适当的错误处理
4. **性能考虑**: 避免测试对生产环境性能产生影响

## 扩展测试

添加新测试的步骤：

1. 在对应目录创建测试文件
2. 实现测试逻辑
3. 在 `tests/index.ts` 中导出
4. 更新文档

---

## 变更记录

### 2025-09-23
- 重构测试框架，统一目录结构
- 移动测试组件到 `tests/components/`
- 创建统一的测试入口和工具
- 更新导入路径使用 `@/` 别名