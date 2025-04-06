// src/hooks/interaction/constants.ts

export const INTERACTION_CONSTANTS = {
  FAST_MOVE_THRESHOLD: 800, // 像素/秒
  HOVER_DETECT_DURATION: 300, // ms
  REACTION_ANIMATION_DURATION: 600, // ms
  FAST_REACTION_ANIMATION_DURATION: 400, // ms
  DOUBLE_CLICK_THRESHOLD: 300, // ms
  LONG_PRESS_THRESHOLD: 600, // ms
  CIRCLE_DETECTION_DURATION: 1000, // ms
  PET_DETECTION_DURATION: 800, // ms
  IDLE_ANIMATION_DELAY: 20000, // ms
  CLICK_THRESHOLD: 2, // px
  EYE_VIEW_ANGLE: 180, // degrees
  NEAR_DISTANCE_MULTIPLIER: 1.5, // 倍数于宠物宽度
  EYE_DIRECTION_THRESHOLD_MULTIPLIER: 0.15, // 倍数于宠物宽度
  MOUSE_HISTORY_DURATION: 100, // ms
  PETTING_MIN_POINTS: 5,
  PETTING_MIN_DISTANCE: 50,
  PETTING_MAX_DISTANCE: 300,
  CIRCLING_MIN_POINTS: 8,
};

// 可以在这里添加其他交互相关的常量，例如动画名称组
export const ANIMATION_GROUPS = {
  HAPPY: ['happy-animation', 'pulse-animation', 'wiggle-animation'],
  NORMAL_HAPPY: ['pulse-animation'],
  ENERGETIC_PLAY: ['play-animation', 'fast-shake-animation'],
  TIRED_PLAY: ['shake-animation'],
  EAT: ['eat-animation', 'shake-animation', 'fast-shake-animation'],
  VERY_HUNGRY_EAT: ['fast-shake-animation'],
  IDLE: ['idle-yawn', 'idle-stretch', 'idle-lookAround', 'idle-scratch'],
  // ... 其他动画组
};