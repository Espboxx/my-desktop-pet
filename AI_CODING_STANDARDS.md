# 桌面宠物项目 AI 代码生成规范体系

## 📋 概述

本文档基于桌面宠物项目（Electron + React + TypeScript）的现有代码库结构和实现模式，制定了一套完整的AI代码生成规范体系，确保所有AI生成的代码都能完美融入现有架构。

## 🏗️ 1. 项目开发规范

### 1.1 目录结构规范

基于现有的文件组织结构：

```
src/
├── components/           # React组件
│   ├── SettingsTabs/    # 设置标签页组件
│   ├── Pet/             # 宠物相关组件
│   └── UI/              # 通用UI组件
├── hooks/               # 自定义Hook
│   ├── animation/       # 动画相关Hook
│   ├── core/           # 核心功能Hook
│   ├── interaction/    # 交互处理Hook
│   ├── pet/            # 宠物业务Hook
│   └── settings/       # 设置相关Hook
├── types/              # TypeScript类型定义
├── context/            # React Context
├── styles/             # CSS样式文件
├── constants/          # 常量定义
├── services/           # 服务层
└── utils/              # 工具函数
```

**规范要求：**
- Hook必须放在对应的功能分类目录下
- 组件必须有对应的CSS样式文件
- 类型定义集中在`src/types/petTypes.ts`
- 常量定义在各功能目录的`constants.ts`文件中

### 1.2 Electron双进程架构约束

**主进程职责（electron/main.ts）：**
- 窗口管理和系统集成
- 文件系统操作
- IPC通信处理
- 系统托盘和菜单

**渲染进程职责（src/）：**
- UI组件和用户交互
- 状态管理和业务逻辑
- 动画和视觉效果

**严格分离原则：**
- 主进程不处理UI逻辑
- 渲染进程不直接访问系统API
- 通过标准IPC机制通信

### 1.3 React Hook使用规范

**Hook分层架构：**
```
core层（基础功能）
├── usePetStatus（主Hook，聚合所有功能）
├── useOptimizedState（优化状态管理）
└── useEventManager（事件管理）

pet层（业务逻辑）
├── useStateLoader（状态加载）
├── useStatusDecay（状态衰减）
├── useLevelingSystem（等级系统）
└── useTaskManager（任务管理）

interaction层（交互处理）
├── usePetInteraction（宠物交互）
├── useDragHandling（拖拽处理）
└── useMouseChasing（鼠标追逐）
```

**Hook集成模式：**
- `usePetStatus`作为主Hook，聚合所有子功能Hook
- 子Hook通过参数接收状态和回调函数
- 避免Hook间的直接依赖和循环依赖

### 1.4 状态管理模式

**Context模式：**
```typescript
// 状态提供者
<PetStatusProvider>
  <App />
</PetStatusProvider>

// 状态消费者
const { status, setStatus } = useSharedPetStatus();
```

**状态更新原则：**
- 全局状态通过`PetStatusContext`管理
- 使用`setStatus`统一更新状态
- 避免直接修改状态对象
- 使用`useRef`保存状态引用避免闭包陷阱

### 1.5 TypeScript类型定义标准

**类型集中管理：**
- 所有接口定义在`src/types/petTypes.ts`
- 避免内联类型定义
- 使用明确的类型，避免`any`

**接口设计原则：**
```typescript
// 良好的接口设计示例
export interface PetStatus {
  mood: number;
  cleanliness: number;
  hunger: number;
  energy: number;
  // ... 其他属性
}

export type InteractionType = 'feed' | 'clean' | 'play' | 'train' | 'learn';
```

## 🎨 2. 代码编写规范

### 2.1 命名约定

基于项目现有代码风格：

**组件命名：**
- 使用PascalCase：`SettingsWindow`、`PetWindow`
- 文件名与组件名一致：`SettingsWindow.tsx`

**Hook命名：**
- 使用`use`前缀：`usePetStatus`、`useInteraction`
- 文件名与Hook名一致：`usePetStatus.ts`

**常量命名：**
- 使用UPPER_SNAKE_CASE：`DEFAULT_PET_HEIGHT`、`EXPANDED_PET_HEIGHT`

**变量和函数命名：**
- 使用camelCase：`activeTab`、`handleTabChange`

### 2.2 导入顺序规范

严格按照以下顺序导入，各组间用空行分隔：

```typescript
// 1. React相关导入
import React, { useState, useCallback } from 'react';

// 2. 第三方库导入
import { FaCog, FaPalette } from 'react-icons/fa';

// 3. 项目内部导入
import '../styles/SettingsWindow.css';
import GeneralTab from './SettingsTabs/GeneralTab';

// 4. 类型定义导入
import { PetStatus, InteractionType } from '../types/petTypes';
```

### 2.3 代码注释和文档标准

**中文注释：**
```typescript
/**
 * 宠物状态管理的主Hook
 * 整合了各个功能模块，提供统一的接口
 */
export default function usePetStatus() {
  // 创建状态引用，用于在回调函数中访问最新状态
  const statusRef = useRef(status);
  
  // 更新引用，确保始终持有最新状态
  useEffect(() => {
    statusRef.current = status;
  }, [status]);
}
```

**JSDoc格式：**
- 函数和Hook必须有完整的JSDoc注释
- 复杂逻辑必须有行内注释说明
- 关键算法和业务逻辑必须有详细说明

### 2.4 错误处理和边界情况

**异步操作错误处理：**
```typescript
try {
  const result = await someAsyncOperation();
  // 处理成功结果
} catch (error) {
  console.error('操作失败:', error);
  // 提供降级方案
}
```

**Context使用安全检查：**
```typescript
export const useSharedPetStatus = (): PetStatusContextType => {
  const context = useContext(PetStatusContext);
  if (context === undefined) {
    throw new Error('useSharedPetStatus must be used within a PetStatusProvider');
  }
  return context;
};
```

### 2.5 性能优化编码准则

**组件优化：**
```typescript
// 使用React.memo包装纯组件
const OptimizedComponent = React.memo(({ data }) => {
  // 使用useMemo缓存计算结果
  const computedValue = useMemo(() => {
    return expensiveComputation(data);
  }, [data]);

  // 使用useCallback缓存事件处理函数
  const handleClick = useCallback(() => {
    // 处理点击事件
  }, []);

  return <div onClick={handleClick}>{computedValue}</div>;
});
```

**事件处理优化：**
```typescript
// 高频事件使用防抖处理
const debouncedHandler = useDebounce(handleMouseMove, 16); // 60fps
```

## 🤖 3. AI编码行为规则

### 3.1 架构一致性规则

**强制要求：**
- 新代码必须符合现有的Hook分层架构
- 组件设计必须遵循容器/展示组件模式
- 状态管理必须通过PetStatusContext
- 文件组织必须符合现有目录结构

**检查清单：**
- [ ] Hook放在正确的分类目录下
- [ ] 组件有对应的CSS样式文件
- [ ] 类型定义在petTypes.ts中
- [ ] 遵循现有的命名约定

### 3.2 功能集成规范

**状态集成：**
- 新功能必须通过`usePetStatus`集成到现有状态系统
- 状态更新通过`setStatus`统一处理
- 避免绕过Context的直接状态操作

**事件集成：**
- 交互功能必须使用现有的`useInteraction`系列Hook
- 事件处理必须通过`useEventManager`统一管理
- 高频事件必须使用防抖或节流处理

**动画集成：**
- 动画效果必须遵循现有的CSS类名模式
- 动画状态通过现有的动画管理系统
- 使用硬件加速和`will-change`属性优化性能

### 3.3 代码质量检查清单

**TypeScript类型安全：**
- [ ] 所有接口在petTypes.ts中定义
- [ ] 避免使用any类型
- [ ] 函数参数和返回值有明确类型
- [ ] 组件Props有完整的接口定义

**React最佳实践：**
- [ ] Hook只在函数组件顶层调用
- [ ] Hook依赖数组正确设置
- [ ] 使用React.memo优化纯组件
- [ ] 使用useMemo和useCallback优化性能

**性能优化：**
- [ ] 组件渲染时间<16ms
- [ ] 内存增长<10MB
- [ ] 用户交互响应<100ms
- [ ] 高频事件使用防抖节流

### 3.4 测试和验证要求

**功能测试：**
- 新功能必须通过基本功能测试
- 不能影响现有功能的正常运行
- 跨平台兼容性验证

**性能测试：**
- 渲染性能基准测试
- 内存使用监控
- 用户交互响应时间测试

## 🧠 4. 项目记忆与上下文规则

### 4.1 核心架构决策记录

已记录的关键架构模式：
- Hook分层架构设计
- 组件设计模式
- 状态管理模式
- 文件组织约定

### 4.2 技术约束和限制

已记录的技术约束：
- Electron双进程架构限制
- React Hook使用规则
- 性能基线要求
- 跨平台兼容性要求

### 4.3 编码规范要求

已记录的编码标准：
- 命名约定规范
- 导入顺序要求
- TypeScript严格模式
- 性能优化实践

### 4.4 代码模式示例

已记录的关键模式：
- Hook集成模式
- 组件标签页模式
- Context消费模式
- 状态引用模式

## 🔄 5. 持续改进机制

### 5.1 规范更新流程

1. **问题识别**：发现现有规范的不足或新的需求
2. **规范调整**：基于项目演进调整规范内容
3. **记忆更新**：更新AI记忆系统中的规范信息
4. **验证测试**：通过实际代码生成验证规范效果

### 5.2 质量监控

- 定期检查生成代码的质量
- 收集开发过程中的问题和反馈
- 持续优化规范和工具

### 5.3 知识传承

- 维护完整的规范文档
- 记录重要的设计决策和经验
- 建立最佳实践案例库

---

## 📞 使用方式

要使用这套AI编码规范体系，请：

1. **激活规范角色**：
   ```
   切换到desktop-pet-coding-standards
   ```

2. **在代码生成前**：
   - 明确说明要实现的功能
   - 指出需要集成的现有系统
   - 提及性能和质量要求

3. **代码生成后**：
   - 检查是否符合规范要求
   - 验证功能集成是否正确
   - 测试性能和用户体验

这套规范体系将确保所有AI生成的代码都能完美融入你的桌面宠物项目！
