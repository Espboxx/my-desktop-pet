// 宠物状态常量文件
import { IdleAnimation } from '../../types/petTypes';

// 定义动画持续时间 (ms) - 要与CSS持续时间匹配
export const IDLE_ANIMATION_DURATIONS: Record<IdleAnimation | string, number> = {
  'blink-animation': 300, // 现有的眨眼持续时间
  'stretch-animation': 800,
  'idle-wiggle-animation': 600,
  'idleSpecial': 1000, // 解锁动画的示例持续时间
  // 在此处添加其他解锁的动画及其持续时间
};

// 默认可用的空闲动画
export const BASE_IDLE_ANIMATIONS: IdleAnimation[] = ['stretch-animation', 'idle-wiggle-animation'];

// 定义默认初始状态，当加载失败时使用
export const defaultInitialStatus = {
  mood: 80,
  cleanliness: 80,
  hunger: 20, // 开始时较少饥饿
  energy: 80,
  exp: 0,
  level: 1,
  // 添加状态值上限
  maxMood: 100,
  maxCleanliness: 100,
  maxHunger: 100,
  maxEnergy: 100,
  interactionCounts: {}, // 初始化新字段
  unlockedAchievements: [], // 初始化新字段
  activeTasks: [], // 初始化新字段
  completedTasks: [], // 初始化新字段
  unlockedIdleAnimations: [], // 初始化新的动画解锁字段
  bubble: {
    active: false,
    text: '',
    type: 'thought' as 'thought' | 'speech',
    timeout: null
  },
  inventory: {} // 初始化库存
};

// 状态阈值常量
export const STATUS_THRESHOLDS = {
  HUNGER_NEED: 60, // 开始感到饥饿
  ENERGY_NEED: 40, // 开始感到疲倦
  MOOD_NEED: 50,   // 开始感到无聊/孤独
  SICKNESS_THRESHOLD: 15, // 生病阈值
  HAPPY_THRESHOLD: 70, // 高兴阈值
  TIRED_THRESHOLD: 30, // 疲倦阈值
};

// 特殊事件概率
export const EVENT_CHANCES = {
  PROACTIVE_BUBBLE: 0.15, // 主动气泡几率（每分钟）
  MOOD_BOOST: 0.01, // 心情提升事件几率
  SELF_LEARNING: 0.02, // 自学习事件几率
  EXERCISE: 0.015, // 健身事件几率
  TREASURE: 0.01, // 发现宝藏事件几率
  INTERACTION: 0.015, // 与其他宠物互动事件几率
  INSPIRATION: 0.02, // 灵感迸发事件几率
  SICKNESS: 0.05, // 生病事件几率
};

// 状态衰减率
export const DECAY_RATES = {
  MOOD: 0.8,
  CLEANLINESS: 0.3,
  HUNGER: 1.0, // 饥饿增加率
  ENERGY: 0.5,
};