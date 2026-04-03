/**
 * Hooks 统一导出文件
 * 提供所有 hooks 的集中访问点
 */

// 动画相关 hooks
export { useSmoothMovement } from "./animation/useSmoothMovement";
export { default as usePetAnimation } from "./pet/usePetAnimation";

// 核心功能 hooks
export { default as usePetStatus } from "./core/usePetStatus";
export { useEventManager } from "./core/useEventManager";
export { useOptimizedState } from "./core/useOptimizedState";
export { usePerformanceMonitor } from "./core/usePerformanceMonitor";
export { useDebounce } from "./core/useDebounce";
export { useWindowEffects } from "./core/useWindowEffects";

// 交互功能 hooks
export {
  usePetInteraction,
} from "./interaction/usePetInteraction";

export {
  type UsePetInteractionReturn,
  type PetPosition,
  type InteractionHandlers,
} from "./interaction/types";

export { default as useMouseHandling } from "./interaction/useMouseHandling";
export { useDragHandling } from "./interaction/useDragHandling";
export { default as useMenuHandling } from "./interaction/useMenuHandling";
export { default as useMouseChasing } from "./interaction/useMouseChasing";
export { default as useReactionAnimations } from "./interaction/useReactionAnimations";
export { useEyeTracking } from "./interaction/useEyeTracking";
export { useHapticFeedback } from "./interaction/useHapticFeedback";
export { useIdleHandling } from "./interaction/useIdleHandling";
export { useContextMenuHandling } from "./interaction/useContextMenuHandling";
export { useInteractionDetection } from "./interaction/useInteractionDetection";
export { useInteractionFeedback } from "./interaction/useInteractionFeedback";
export { useActionHandling } from "./interaction/useActionHandling";

// 宠物功能 hooks
export {
  useStateLoader,
  useInventory,
  useInteraction as usePetInteractionHook,
  useStatusWarnings,
  useAnimations,
  useStatusDecay,
  useLevelingSystem,
  useTaskManager,
  useAchievementManager,
  useSpecialEvents,
  useProactiveNeeds,
  useAutonomousMovement,
  usePetAnimation as usePetAnimationsHook,
} from "./pet";

// 设置功能 hooks
export { default as useSettings } from "./settings/useSettings";

// 工具类 hooks
export * from "./utils";

// 交互相关类型和常量
export { INTERACTION_CONSTANTS } from "./interaction/constants";

// 宠物相关常量
export {
  IDLE_ANIMATION_DURATIONS,
  BASE_IDLE_ANIMATIONS,
  defaultInitialStatus,
  STATUS_THRESHOLDS,
  EVENT_CHANCES,
  DECAY_RATES,
} from "./pet/constants";
