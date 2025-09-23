[根目录](../../CLAUDE.md) > [src](../) > **constants**

# 常量配置模块

## 模块职责

提供应用中使用的各种常量配置，包括宠物类型、物品数据、任务数据、设置常量等。

## 入口与启动

- **宠物常量**: `petConstants.ts` - 宠物类型和表情定义
- **物品数据**: `itemData.ts` - 游戏物品和道具定义
- **任务数据**: `taskData.ts` - 任务和成就数据
- **设置常量**: `settingsConstants.ts` - 设置界面常量

## 常量分类

### 宠物常量 (`petConstants.ts`)
- **PET_TYPES** - 宠物类型定义对象
- **默认宠物类型** - emoji、图片、精灵图、SVG 等格式
- **表情系统** - 每个宠物类型的可用表情
- **解锁等级** - 表情和功能的解锁条件

### 物品数据 (`itemData.ts`)
- **ITEMS** - 游戏物品定义
- **物品类型** - 食物、清洁用品、玩具等
- **物品属性** - 名称、描述、效果等

### 任务数据 (`taskData.ts`)
- **TASKS** - 任务定义数组
- **ACHIEVEMENTS** - 成就定义数组
- **任务目标** - 各种任务目标和条件
- **奖励系统** - 经验值、解锁内容等

### 设置常量 (`settingsConstants.ts`)
- **设置选项** - 设置界面的各种选项
- **默认值** - 各项设置的默认值
- **范围限制** - 设置值的范围和约束

## 对外接口

### 宠物类型导出
```typescript
export const PET_TYPES: Record<string, PetType>;

// 使用示例
const defaultPet = PET_TYPES['default'];
const catPet = PET_TYPES['cat'];
```

### 物品数据导出
```typescript
export const ITEMS: Record<string, Item>;

// 使用示例
const foodItem = ITEMS['basic_food'];
const soapItem = ITEMS['soap'];
```

### 任务数据导出
```typescript
export const TASKS: Record<string, Task>;
export const ACHIEVEMENTS: Record<string, Achievement>;

// 使用示例
const feedTask = TASKS['feed_pet_5_times'];
const firstAchievement = ACHIEVEMENTS['first_interaction'];
```

## 关键依赖与配置

- **TypeScript** - 类型定义
- **模块化** - 按功能分离配置
- **可维护性** - 清晰的命名和组织结构

## 技术特性

- **集中管理** - 所有常量集中管理，便于维护
- **类型安全** - 完整的 TypeScript 类型支持
- **可扩展** - 易于添加新的常量和配置
- **国际化支持** - 支持多语言和本地化
- **版本控制** - 便于追踪配置变更

## 相关文件清单

- `petConstants.ts` - 宠物类型和表情定义
- `itemData.ts` - 游戏物品和道具定义
- `taskData.ts` - 任务和成就数据
- `settingsConstants.ts` - 设置界面常量

## 常见问题 (FAQ)

### Q: 如何添加新的宠物类型？
A: 在 `petConstants.ts` 中的 `PET_TYPES` 对象中添加新的宠物类型定义

### Q: 如何添加新的物品？
A: 在 `itemData.ts` 中的 `ITEMS` 对象中添加新的物品定义

### Q: 如何配置新的任务？
A: 在 `taskData.ts` 中添加任务和成就定义，确保符合类型要求

### Q: 常量如何更新？
A: 修改常量文件后，需要重新构建应用才能生效

---

## 变更记录 (Changelog)

### 2025-09-23 22:28
- 常量文档初始化
- 完善常量分类和组织结构
- 添加新常量说明（物品、任务、成就）
- 优化常量管理和维护