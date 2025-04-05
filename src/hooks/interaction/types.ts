// src/hooks/interaction/types.ts
import { PetStatus, InteractionType } from '../../types/petTypes';

// 定义宠物位置类型
export interface PetPosition {
  x: number;
  y: number;
}

// 定义鼠标历史点类型
export interface MouseHistoryPoint {
  x: number;
  y: number;
  time: number;
}
// 定义传递给子 Hooks 的核心状态和 Setter
export interface CoreInteractionProps {
  status: PetStatus;
  setStatus: React.Dispatch<React.SetStateAction<PetStatus>>;
  setCurrentAnimation: (animation: string | null) => void;
  petRef: React.RefObject<HTMLDivElement>;
  isMouseOverPet: React.RefObject<boolean>;
  // 可能需要添加 setNewlyUnlocked 用于通知
  // setNewlyUnlocked?: React.Dispatch<React.SetStateAction<string[]>>;
}

// 定义鼠标方向类型
export type MouseDirection = 'center' | 'left' | 'right' | 'up' | 'down' | 'up-left' | 'up-right' | 'down-left' | 'down-right';

// 定义交互检测结果
export interface InteractionDetectionResult {
  isHovering: boolean;
  isFastMoving: boolean;
  isDoubleClick: boolean;
  isLongPress: boolean;
  isCircling: { detected: boolean; clockwise: boolean };
  isPetting: boolean;
}

// 定义拖拽状态
export interface DragState {
  isDragging: boolean;
  petPosition: PetPosition; // 使用 PetPosition 类型
}

// 定义右键菜单状态
export interface ContextMenuState {
  showMenu: boolean;
  menuPosition: { top: number; left: number } | null;
  menuRef: React.RefObject<HTMLDivElement>;
}

// 定义眼睛跟踪状态
export interface EyeTrackingState {
  mouseDirection: MouseDirection;
  enableGlobalEyeTracking: boolean;
  lastMousePosition: React.RefObject<{ x: number, y: number } | null>;
}

// 定义反应动画状态
export interface ReactionAnimationState {
  reactionAnimation: string | null;
}

// 定义闲置状态
export interface IdleState {
  isIdle: boolean; // 可以用来指示是否触发了闲置动画
}

// 定义所有交互处理函数的集合
export interface InteractionHandlers {
  handleMouseDown: (e: React.MouseEvent) => void;
  handleMouseEnter: (e: React.MouseEvent) => void;
  handleMouseLeave: (e: React.MouseEvent) => void;
  handleContextMenu: (e: React.MouseEvent) => void;
  handleAction: (action: InteractionType | string) => void;
  toggleGlobalEyeTracking: (enabled: boolean) => void;
  setShowMenu: (show: boolean) => void; // 从 ContextMenuState 移到这里，因为主 Hook 需要控制
}

// 定义 usePetInteraction 返回的总状态和处理函数
export interface UsePetInteractionReturn extends InteractionHandlers, DragState, ContextMenuState, EyeTrackingState, ReactionAnimationState {
  petRef: React.RefObject<HTMLDivElement>;
  isMouseOverPet: React.MutableRefObject<boolean>; // Add isMouseOverPet back (needs to be mutable)
  setPetPosition: React.Dispatch<React.SetStateAction<PetPosition>>; // Add the position setter
  // isDragging is already included via DragState
  // 其他可能需要暴露的状态...
}

// 移除 INTERACTION_CONSTANTS，将移至 constants.ts