import { PetPosition } from '../hooks/interaction/types'; // Import PetPosition

// Define Model Type
export type PetModelType = 'emoji' | 'image' | 'spritesheet' | 'svg';

// Modify PetExpression
export interface PetExpression {
  name: string;
  emoji?: string; // Make optional
  imageUrl?: string; // For image models
  spriteFrame?: number | { x: number; y: number }; // For spritesheet models (index or coordinates)
  svgData?: string; // For SVG models (inline or identifier)
  unlockLevel?: number;
}

// Modify PetType
export interface PetType {
  id: string; // Add unique ID
  name: string;
  modelType: PetModelType; // Specify model type
  color?: string; // Make optional
  borderColor?: string; // Make optional
  baseImageUrl?: string; // Base image for image models
  spritesheetUrl?: string; // URL for spritesheet models
  spriteWidth?: number; // Width of a single sprite frame
  spriteHeight?: number; // Height of a single sprite frame
  baseSvgData?: string; // Base SVG data/identifier for SVG models
  expressions: Record<string, PetExpression>;
}

// 定义互动类型
export type InteractionType = 'feed' | 'clean' | 'play' | 'train' | 'learn' | 'petting' | 'special'; // 添加 'petting'

// 新增：定义待机动画类型 (CSS 类名)
export type IdleAnimation =
  | 'blink-animation' // 基础眨眼
  | 'stretch-animation' // 伸懒腰
  | 'idle-wiggle-animation' // 待机晃动
  | 'idleSpecial'; // 示例：特殊解锁动画
// 可以根据需要添加更多动画名称

export interface PetStatus {
  mood: number;
  cleanliness: number;
  hunger: number;
  energy: number;
  exp: number;
  level: number;
  // 新增：互动计数
  interactionCounts: Record<InteractionType | string, number>; // 使用 string 以允许未来扩展
  // 新增：已解锁成就
  unlockedAchievements: string[]; // 存储已解锁成就的 ID
  // 新增：进行中的任务
  activeTasks: string[]; // 存储进行中任务的 ID
  // 新增：已完成的任务
  completedTasks: string[]; // 存储已完成任务的 ID
  // 新增：已解锁的待机动画
  unlockedIdleAnimations: string[]; // 存储已解锁的待机动画名称
  // 新增：气泡相关状态
  bubble: {
    active: boolean;
    text: string;
    type: 'thought' | 'speech';
    timeout: number | null;
  };
}

// 定义成就条件类型
export type AchievementConditionType =
  | 'interactionCount' // 互动次数
  | 'statusThreshold' // 状态阈值
  | 'levelReached' // 达到等级
  | 'taskCompleted'; // 完成特定任务

// 定义成就条件
export interface AchievementCondition {
  type: AchievementConditionType;
  interactionType?: InteractionType | string; // 互动类型 (用于 interactionCount)
  count?: number; // 次数 (用于 interactionCount)
  status?: keyof Omit<PetStatus, 'interactionCounts' | 'unlockedAchievements' | 'activeTasks' | 'completedTasks'>; // 状态名称 (用于 statusThreshold)
  threshold?: number; // 阈值 (用于 statusThreshold)
  level?: number; // 等级 (用于 levelReached)
  taskId?: string; // 任务 ID (用于 taskCompleted)
}

// 定义成就
export interface Achievement {
  id: string; // 唯一标识符
  name: string; // 成就名称
  description: string; // 成就描述
  conditions: AchievementCondition[]; // 解锁条件 (可以是多个)
  reward?: { // 可选奖励
    exp?: number; // 经验值
    unlocks?: string[]; // 解锁内容 (例如新表情、装饰等)
    idleAnimation?: string; // 解锁的待机动画名称
  };
  hidden?: boolean; // 是否隐藏成就 (直到解锁才显示)
}

// 定义任务目标类型
export type TaskGoalType =
  | 'performInteraction' // 执行特定互动
  | 'reachStatus' // 达到特定状态值
  | 'maintainStatus' // 维持特定状态一段时间
  | 'collectItem'; // 收集物品 (未来扩展)

// 定义任务目标
export interface TaskGoal {
  type: TaskGoalType;
  description: string; // 目标描述
  interactionType?: InteractionType | string; // 互动类型 (用于 performInteraction)
  count?: number; // 次数 (用于 performInteraction)
  status?: keyof Omit<PetStatus, 'interactionCounts' | 'unlockedAchievements' | 'activeTasks' | 'completedTasks'>; // 状态名称 (用于 reachStatus/maintainStatus)
  targetValue?: number; // 目标值 (用于 reachStatus)
  duration?: number; // 持续时间 (秒) (用于 maintainStatus)
  // itemType?: string; // 物品类型 (用于 collectItem)
  // itemCount?: number; // 物品数量 (用于 collectItem)
  progress?: number; // 当前进度 (用于需要计数的任务)
  completed?: boolean; // 是否已完成
}

// 定义任务
export interface Task {
  id: string; // 唯一标识符
  name: string; // 任务名称
  description: string; // 任务描述
  goals: TaskGoal[]; // 任务目标 (可以是多个)
  prerequisites?: { // 可选前置条件
    level?: number; // 等级要求
    completedTasks?: string[]; // 需要先完成的任务 ID
    unlockedAchievements?: string[]; // 需要先解锁的成就 ID
  };
  reward: { // 任务奖励
    exp: number; // 经验值
    items?: string[]; // 奖励物品 (未来扩展)
    unlocks?: string[]; // 解锁内容
  };
  repeatable?: boolean; // 是否可重复
  expiryTime?: number; // 过期时间戳 (可选)
}

// 定义所有成就和任务的集合 (用于配置)
export interface GameData {
    achievements: Record<string, Achievement>;
    tasks: Record<string, Task>;
}

// Define the structure for saved data including pet type ID
export interface SavedPetData {
  status: PetStatus;
  petTypeId: string;
  position?: PetPosition; // Add optional position field
}