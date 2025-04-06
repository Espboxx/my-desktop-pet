import { Item } from '../types/petTypes';

// 定义基础道具
export const ITEMS: Record<string, Item> = {
  basic_food: {
    id: 'basic_food',
    name: '普通食物',
    type: 'food',
    description: '一碗简单的食物，可以缓解饥饿。',
  },
  tasty_snack: {
    id: 'tasty_snack',
    name: '美味零食',
    type: 'food',
    description: '特别好吃的零食，能大幅提升心情！',
  },
  soap: {
    id: 'soap',
    name: '肥皂',
    type: 'cleaning_supply',
    description: '基础的清洁用品，保持宠物干净。',
  },
  bubble_bath: {
    id: 'bubble_bath',
    name: '泡泡浴液',
    type: 'cleaning_supply',
    description: '让洗澡变得更有趣，清洁效果更好。',
  },
  ball: {
    id: 'ball',
    name: '小球',
    type: 'toy',
    description: '一个简单的球，可以和宠物玩耍。',
  },
  feather_wand: {
    id: 'feather_wand',
    name: '逗猫棒',
    type: 'toy',
    description: '能让宠物兴奋地扑来扑去。',
  },
};

// 可以根据需要添加更多道具