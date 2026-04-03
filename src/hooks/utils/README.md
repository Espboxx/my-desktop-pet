# 工具类 Hooks

## 概述

这个目录包含通用的工具类 hooks，提供各种辅助功能和实用工具。

## Hooks 列表

### useCompatibility
- **文件**: `useCompatibility.ts`
- **功能**: 系统兼容性检查
- **用途**: 检测环境兼容性并提供降级方案

### useImagePreloader
- **文件**: `useImagePreloader.ts`
- **功能**: 图像预加载管理
- **用途**: 优化图像加载性能，提供缓存机制

### useImageResource
- **文件**: `useImageResource.ts`
- **功能**: 图像资源管理
- **用途**: 管理图像资源的加载和状态

## 使用方法

```typescript
import {
  useCompatibility,
  useImagePreloader,
  useImageResource
} from '@/hooks/utils';

// 使用兼容性检查
const compatibility = useCompatibility();

// 使用图像预加载
const preloader = useImagePreloader();

// 使用图像资源管理
const imageResource = useImageResource();
```

## 特点

- **通用性**: 这些 hooks 可以在项目的任何地方使用
- **独立性**: 不依赖特定的业务逻辑
- **可复用**: 提供通用的功能抽象

---

## 变更记录

### 2025-09-23
- 创建 utils 目录
- 从根 hooks 目录移动三个工具类 hooks
- 添加统一导出和文档