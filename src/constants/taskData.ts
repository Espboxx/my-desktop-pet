import { Task, GameData } from '../types/petTypes';

// 示例任务定义
const tasks: Record<string, Task> = {
  'task_feed_1': {
    id: 'task_feed_1',
    name: '第一次喂食',
    description: '给你的宠物喂点好吃的吧！',
    goals: [
      {
        type: 'performInteraction',
        description: '进行一次喂食互动',
        interactionType: 'feed',
        count: 1,
        completed: false,
        progress: 0,
      },
    ],
    reward: {
      exp: 10,
    },
    repeatable: false,
  },
  'task_clean_1': {
    id: 'task_clean_1',
    name: '保持清洁',
    description: '帮助你的宠物保持干净整洁。',
    goals: [
      {
        type: 'performInteraction',
        description: '进行一次清洁互动',
        interactionType: 'clean',
        count: 1,
        completed: false,
        progress: 0,
      },
    ],
    reward: {
      exp: 10,
    },
    repeatable: false,
  },
  'task_play_3': {
    id: 'task_play_3',
    name: '玩乐时光',
    description: '和你的宠物一起玩耍 3 次。',
    goals: [
      {
        type: 'performInteraction',
        description: '进行 3 次玩耍互动',
        interactionType: 'play',
        count: 3,
        completed: false,
        progress: 0,
      },
    ],
    reward: {
      exp: 25,
    },
    repeatable: true, // 可以重复完成
  },
  'task_reach_mood_high': {
    id: 'task_reach_mood_high',
    name: '心情愉悦',
    description: '让宠物的心情达到 80 或更高。',
    goals: [
      {
        type: 'reachStatus',
        description: '心情达到 80',
        status: 'mood',
        targetValue: 80,
        completed: false,
      },
    ],
    reward: {
      exp: 50,
    },
    repeatable: false,
  },
   'task_reach_level_2': {
    id: 'task_reach_level_2',
    name: '初级训练师',
    description: '将你的宠物提升到 2 级。',
    goals: [
      {
        type: 'reachStatus', // 使用 reachStatus 来检查等级
        description: '等级达到 2',
        status: 'level', // 检查 level 状态
        targetValue: 2,
        completed: false,
      },
    ],
    prerequisites: {
        level: 1, // 假设需要先达到1级才能接这个任务
    },
    reward: {
      exp: 100,
      unlocks: ['expression_happy_lvl2'], // 假设解锁一个新表情
    },
    repeatable: false,
  },
  'task_foodie_5': {
    id: 'task_foodie_5',
    name: '美食家',
    description: '你的宠物似乎很喜欢吃东西，喂它 5 次吧！',
    goals: [
      {
        type: 'performInteraction',
        description: '进行 5 次喂食互动',
        interactionType: 'feed',
        count: 5,
        completed: false,
        progress: 0,
      },
    ],
    reward: {
      exp: 20,
      items: ['tasty_snack'], // 奖励一个美味零食
    },
    repeatable: true,
  },
  'task_playtime_10': {
    id: 'task_playtime_10',
    name: '玩具收藏家',
    description: '多多陪伴你的宠物，和它玩耍 10 次。',
    goals: [
      {
        type: 'performInteraction',
        description: '进行 10 次玩耍互动',
        interactionType: 'play',
        count: 10,
        completed: false,
        progress: 0,
      },
    ],
    reward: {
      exp: 30,
      items: ['ball', 'feather_wand'], // 奖励一个小球和逗猫棒
    },
    repeatable: true,
  },
  'task_reach_level_3': {
    id: 'task_reach_level_3',
    name: '进阶训练师',
    description: '继续努力，将你的宠物提升到 3 级。',
    goals: [
      {
        type: 'reachStatus',
        description: '等级达到 3',
        status: 'level',
        targetValue: 3,
        completed: false,
      },
    ],
    prerequisites: {
        level: 2, // 需要先达到 2 级
    },
    reward: {
      exp: 150,
      items: ['tasty_snack', 'tasty_snack'], // 奖励两个美味零食
    },
    repeatable: false,
  },
};

// 可以在这里添加成就数据，但目前只关注任务
const achievements: Record<string, any> = {}; // 暂时为空

export const gameData: GameData = {
  tasks,
  achievements,
};

// 函数：获取可接取的任务 (基于前置条件)
export const getAvailableTasks = (currentLevel: number, completedTasks: string[]): Task[] => {
    return Object.values(tasks).filter(task => {
        // 检查是否已在进行或已完成
        // (注意：实际应用中需要检查 activeTasks 状态，这里简化)
        if (completedTasks.includes(task.id)) {
            return false;
        }

        // 检查前置条件
        const meetsLevel = !task.prerequisites?.level || currentLevel >= task.prerequisites.level;
        const meetsTasks = !task.prerequisites?.completedTasks || task.prerequisites.completedTasks.every(reqId => completedTasks.includes(reqId));
        // const meetsAchievements = !task.prerequisites?.unlockedAchievements || task.prerequisites.unlockedAchievements.every(reqId => unlockedAchievements.includes(reqId)); // 需要传入 unlockedAchievements

        return meetsLevel && meetsTasks; // && meetsAchievements;
    });
};