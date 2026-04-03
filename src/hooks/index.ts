/**
 * Hooks 统一导出文件
 * 提供所有 hooks 的集中访问点
 */

// 动画相关 hooks
export { default as useSmoothMovement } from "./animation/useSmoothMovement";
export { default as usePetAnimation } from "./pet/usePetAnimation";

// 核心功能 hooks
export { default as usePetStatus } from "./core/usePetStatus";
export { default as useEventManager } from "./core/useEventManager";
export { default as useOptimizedState } from "./core/useOptimizedState";
export { default as usePerformanceMonitor } from "./core/usePerformanceMonitor";
export { default as useDebounce } from "./core/useDebounce";
export { default as useWindowEffects } from "./core/useWindowEffects";

// 交互功能 hooks
export {
  default as usePetInteraction,
  type UsePetInteractionReturn,
  type PetPosition,
} from "./interaction/usePetInteraction";

export { default as useMouseHandling } from "./interaction/useMouseHandling";
export { default as useDragHandling } from "./interaction/useDragHandling";
export { default as useMenuHandling } from "./interaction/useMenuHandling";
export { default as useMouseChasing } from "./interaction/useMouseChasing";
export { default as useReactionAnimations } from "./interaction/useReactionAnimations";
export { default as useEyeTracking } from "./interaction/useEyeTracking";
export { default as useHapticFeedback } from "./interaction/useHapticFeedback";
export { default as useIdleHandling } from "./interaction/useIdleHandling";
export { default as useContextMenuHandling } from "./interaction/useContextMenuHandling";
export { default as useInteractionDetection } from "./interaction/useInteractionDetection";
export { default as useInteractionFeedback } from "./interaction/useInteractionFeedback";
export { default as useActionHandling } from "./interaction/useActionHandling";

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
export type {
  EventHandler,
  EventTypeMap,
  InteractionHandler,
  DragHandler,
  MenuHandler,
} from "./interaction/types";

export { INTERACTION_CONSTANTS } from "./interaction/constants";

// 宠物相关常量
export { PET_CONSTANTS } from "./pet/constants";
