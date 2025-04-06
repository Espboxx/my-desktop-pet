import { PetType, Achievement } from '../types/petTypes'; // Import Achievement type

export const PET_TYPES: Record<string, PetType> = {
  default: {
    id: 'default', // Added ID
    modelType: 'emoji', // Added modelType
    name: '默认宠物',
    color: '#ffcc80',
    borderColor: '#e65100',
    expressions: {
      normal: { name: '正常', emoji: '😊' },
      happy: { name: '开心', emoji: '😄' },
      hungry: { name: '饿了', emoji: '🍕' },
      sleepy: { name: '困了', emoji: '😴' },
      sick: { name: '生病了', emoji: '🤢' },
      level5: { name: '骄傲', emoji: '😎', unlockLevel: 5 },
      level10: { name: '酷炫', emoji: '🤩', unlockLevel: 10 },
      level15: { name: '大佬', emoji: '🦸', unlockLevel: 15 },
      // 注视方向表情
      look_left: { name: '看左', emoji: '👀⬅️' },
      look_right: { name: '看右', emoji: '👀➡️' },
      look_up: { name: '看上', emoji: '👀⬆️' },
      look_down: { name: '看下', emoji: '👀⬇️' },
      look_up_left: { name: '看左上', emoji: '👀↖️' },
      look_up_right: { name: '看右上', emoji: '👀↗️' },
      look_down_left: { name: '看左下', emoji: '👀↙️' },
      look_down_right: { name: '看右下', emoji: '👀↘️' },
      // 新增：特殊待机动画表情
      idleSpecial: { name: '特殊待机', emoji: '✨' } // 假设这是玩乐大师解锁的
    }
  },
  leafy: {
    id: 'leafy', // Added ID
    modelType: 'emoji', // Added modelType
    name: '小叶子',
    color: '#a5d6a7',
    borderColor: '#2e7d32',
    expressions: {
      normal: { name: '正常', emoji: '🌱' },
      happy: { name: '开心', emoji: '🌿' },
      hungry: { name: '饿了', emoji: '☀️' },
      sleepy: { name: '困了', emoji: '🌙' },
      level5: { name: '开花', emoji: '🌸', unlockLevel: 5 },
      level10: { name: '茂盛', emoji: '🌳', unlockLevel: 10 },
      // 添加注视方向表情
      look_left: { name: '看左', emoji: '🌱👀⬅️' },
      look_right: { name: '看右', emoji: '🌱👀➡️' },
      look_up: { name: '看上', emoji: '🌱👀⬆️' },
      look_down: { name: '看下', emoji: '🌱👀⬇️' },
      look_up_left: { name: '看左上', emoji: '🌱👀↖️' },
      look_up_right: { name: '看右上', emoji: '🌱👀↗️' },
      look_down_left: { name: '看左下', emoji: '🌱👀↙️' },
      look_down_right: { name: '看右下', emoji: '🌱👀↘️' }
    }
  },
  droplet: {
    id: 'droplet', // Added ID
    modelType: 'emoji', // Added modelType
    name: '水滴滴',
    color: '#90caf9',
    borderColor: '#1565c0',
    expressions: {
      normal: { name: '正常', emoji: '💧' },
      happy: { name: '开心', emoji: '🌊' },
      hungry: { name: '饿了', emoji: '🥤' },
      sleepy: { name: '困了', emoji: '❄️' },
      level5: { name: '彩虹', emoji: '🌈', unlockLevel: 5 },
      level10: { name: '浪花', emoji: '🌊🌊', unlockLevel: 10 },
      // 添加注视方向表情
      look_left: { name: '看左', emoji: '💧👀⬅️' },
      look_right: { name: '看右', emoji: '💧👀➡️' },
      look_up: { name: '看上', emoji: '💧👀⬆️' },
      look_down: { name: '看下', emoji: '💧👀⬇️' },
      look_up_left: { name: '看左上', emoji: '💧👀↖️' },
      look_up_right: { name: '看右上', emoji: '💧👀↗️' },
      look_down_left: { name: '看左下', emoji: '💧👀↙️' },
      look_down_right: { name: '看右下', emoji: '💧👀↘️' }
    }
  }
};

export const LEVEL_UNLOCKS = {
  3: ['train'],
  5: ['learn'],
  8: ['special']
};

// Removed the local Achievement interface definition, using the imported one.
// Updated ACHIEVEMENTS to use the detailed Achievement type
export const ACHIEVEMENTS: Record<string, Achievement> = {
  firstInteraction: {
    id: 'firstInteraction',
    name: '初次见面',
    description: '第一次与宠物互动。',
    conditions: [
      { type: 'interactionCount', interactionType: 'any', count: 1 } // Example: any interaction counts
    ],
    reward: { exp: 10 }
  },
  feed10: {
    id: 'feed10',
    name: '小小美食家',
    description: '累计喂食10次。',
    conditions: [
      { type: 'interactionCount', interactionType: 'feed', count: 10 }
    ],
    reward: { exp: 50 }
  },
  clean5: {
    id: 'clean5',
    name: '爱干净',
    description: '累计清洁5次。',
    conditions: [
      { type: 'interactionCount', interactionType: 'clean', count: 5 }
    ],
    reward: { exp: 30 }
  },
  play20: {
    id: 'play20',
    name: '玩乐大师',
    description: '累计玩耍20次。',
    conditions: [
      { type: 'interactionCount', interactionType: 'play', count: 20 }
    ],
    reward: { exp: 100, idleAnimation: 'idleSpecial' } // 添加待机动画奖励
  },
  maxMood: {
    id: 'maxMood',
    name: '心情爆棚',
    description: '心情值达到当前上限。',
    conditions: [
      { type: 'statusThreshold', status: 'mood', threshold: 100 } // 基础判定值，实际验证将基于maxMood
    ],
    reward: { exp: 80 }
  },
  maxClean: {
    id: 'maxClean',
    name: '一尘不染',
    description: '清洁度达到当前上限。',
    conditions: [
      { type: 'statusThreshold', status: 'cleanliness', threshold: 100 } // 基础判定值，实际验证将基于maxCleanliness
    ],
    reward: { exp: 80 }
  },
  level5Reached: {
    id: 'level5Reached',
    name: '新的开始',
    description: '宠物达到 5 级。',
    conditions: [
      { type: 'levelReached', level: 5 }
    ],
    reward: { exp: 150 }
  },
  interactionNovice: {
    id: 'interactionNovice',
    name: '互动新手',
    description: '累计与宠物互动10次。',
    conditions: [
      { type: 'interactionCount', interactionType: 'any', count: 10 }
    ],
    reward: { exp: 20 }
  }
  // 可以根据需要添加更多成就
};