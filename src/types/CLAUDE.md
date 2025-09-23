[根目录](../../CLAUDE.md) > [src](../) > **types**

# TypeScript 类型定义模块

## 模块职责

提供完整的 TypeScript 类型定义，确保代码的类型安全和开发体验。

## 入口与启动

- **主类型文件**: `petTypes.ts` - 宠物相关的核心类型定义
- **窗口特效**: `windowEffects.ts` - 窗口特效相关类型

## 核心类型定义

### 宠物基础类型
```typescript
// 宠物模型类型
export type PetModelType = 'emoji' | 'image' | 'spritesheet' | 'svg';

// 宠物表情
export interface PetExpression {
  name: string;
  emoji?: string;
  imageUrl?: string;
  spriteFrame?: number | { x: number; y: number };
  svgData?: string;
  unlockLevel?: number;
}

// 宠物类型
export interface PetType {
  id: string;
  name: string;
  modelType: PetModelType;
  color?: string;
  borderColor?: string;
  baseImageUrl?: string;
  spritesheetUrl?: string;
  spriteWidth?: number;
  spriteHeight?: number;
  baseSvgData?: string;
  expressions: Record<string, PetExpression>;
}
```

### 状态管理类型
```typescript
// 宠物状态
export interface PetStatus {
  mood: number;
  cleanliness: number;
  hunger: number;
  energy: number;
  exp: number;
  level: number;
  maxMood: number;
  maxCleanliness: number;
  maxHunger: number;
  maxEnergy: number;
  interactionCounts: Record<InteractionType | string, number>;
  unlockedAchievements: string[];
  activeTasks: string[];
  completedTasks: string[];
  unlockedIdleAnimations: string[];
  bubble: PetBubbleState;
  inventory: Inventory;
}
```

### 游戏系统类型
```typescript
// 互动类型
export type InteractionType = 'feed' | 'clean' | 'play' | 'train' | 'learn' | 'petting' | 'sleep' | 'massage' | 'special';

// 待机动画
export type IdleAnimation = 'blink-animation' | 'stretch-animation' | 'idle-wiggle-animation' | 'idleSpecial';

// 成就系统
export interface Achievement {
  id: string;
  name: string;
  description: string;
  conditions: AchievementCondition[];
  reward?: {
    exp?: number;
    unlocks?: string[];
    idleAnimation?: string;
  };
  hidden?: boolean;
}

// 任务系统
export interface Task {
  id: string;
  name: string;
  description: string;
  goals: TaskGoal[];
  prerequisites?: {
    level?: number;
    completedTasks?: string[];
    unlockedAchievements?: string[];
  };
  reward: {
    exp: number;
    items?: string[];
    unlocks?: string[];
  };
  repeatable?: boolean;
  expiryTime?: number;
}
```

### 数据存储类型
```typescript
// 保存的宠物数据
export interface SavedPetData {
  status: PetStatus;
  petTypeId: string;
  position?: PetPosition;
}

// 道具系统
export type ItemType = 'food' | 'cleaning_supply' | 'toy';

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  description: string;
}

export type Inventory = Record<string, number>;
```

## 窗口特效类型

```typescript
// 窗口特效配置
export interface SmoothTopMostConfig {
  duration: number;
  steps: number;
  easing: 'linear' | 'easeInOut' | 'easeIn' | 'easeOut';
  enabled: boolean;
}
```

## 对外接口

### 类型导出
```typescript
// 主要类型
export type {
  PetModelType,
  PetExpression,
  PetType,
  PetStatus,
  InteractionType,
  IdleAnimation,
  Achievement,
  Task,
  SavedPetData,
  Inventory
};
```

## 关键依赖与配置

- **TypeScript 5.2.2** - 类型系统
- **Electron API** - 系统类型
- **React** - UI 组件类型
- **Vite** - 构建工具类型

## 技术特性

- **类型安全**: 完整的 TypeScript 类型覆盖
- **可扩展**: 支持新的宠物类型和功能
- **向前兼容**: 考虑未来功能的扩展性
- **精确控制**: 严格的数据约束和验证
- **开发体验**: 智能提示和类型检查

## 相关文件清单

- `petTypes.ts` - 宠物相关核心类型
- `windowEffects.ts` - 窗口特效类型

## 常见问题 (FAQ)

### Q: 如何添加新的宠物类型？
A: 在 `PetType` 接口中扩展，并在 `PetModelType` 中添加新的模型类型

### Q: 如何扩展状态属性？
A: 在 `PetStatus` 接口中添加新属性，确保更新相关的状态管理逻辑

### Q: 类型定义如何保持同步？
A: 定期审查类型定义，确保与实际使用保持一致，添加必要的文档

### Q: 如何处理版本兼容性？
A: 使用可选属性和版本标记，确保向后兼容性

---

## 变更记录 (Changelog)

### 2025-09-23 22:28
- 类型文档初始化
- 完善宠物系统类型定义
- 添加游戏系统类型（成就、任务、道具）
- 优化类型结构和组织