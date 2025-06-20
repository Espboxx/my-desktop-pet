// src/hooks/interaction/useContextMenuHandling.ts
import { useState, useRef, useCallback, useEffect } from 'react';

interface UseContextMenuHandlingProps {
  petRef: React.RefObject<HTMLDivElement>; // Needed for click outside detection
  isMouseOverPet: React.RefObject<boolean>; // To manage passthrough on close
  clearReaction: () => void; // To clear reactions when opening menu
}

interface UseContextMenuHandlingReturn {
  showMenu: boolean;
  setShowMenu: React.Dispatch<React.SetStateAction<boolean>>;
  menuPosition: { top: number; left: number } | null;
  menuRef: React.RefObject<HTMLDivElement>;
  handleContextMenu: (e: React.MouseEvent) => void;
}

export function useContextMenuHandling({
  petRef,
  isMouseOverPet,
  clearReaction,
}: UseContextMenuHandlingProps): UseContextMenuHandlingReturn {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const calculateMenuPosition = useCallback((mouseX: number, mouseY: number) => {
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;
    const menuElement = menuRef.current;
    // Provide default dimensions if menuRef isn't available yet
    const menuWidth = menuElement ? menuElement.offsetWidth : 150;
    const menuHeight = menuElement ? menuElement.offsetHeight : 250;

    let top = mouseY;
    let left = mouseX;

    // 添加小偏移，避免菜单直接覆盖鼠标指针
    const offset = 5;
    top += offset;
    left += offset;

    // 智能边界检测和位置调整
    // 优先向右下方显示，如果空间不够则向左上方调整

    // 检查右边界，如果超出则向左偏移
    if (left + menuWidth > windowWidth) {
      left = mouseX - menuWidth - offset; // 向左显示
    }

    // 检查下边界，如果超出则向上偏移
    if (top + menuHeight > windowHeight) {
      top = mouseY - menuHeight - offset; // 向上显示
    }

    // 确保菜单不会超出屏幕边界
    if (left < 0) left = 5; // 留一点边距
    if (top < 0) top = 5;   // 留一点边距

    // 最终检查，确保菜单完全在屏幕内
    if (left + menuWidth > windowWidth) left = windowWidth - menuWidth - 5;
    if (top + menuHeight > windowHeight) top = windowHeight - menuHeight - 5;

    return { top, left };
  }, []); // menuRef dependency is implicit via .current access

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.desktopPet.setMousePassthrough(false); // Ensure interaction
    clearReaction(); // Close reactions when opening menu
    const position = calculateMenuPosition(e.clientX, e.clientY);
    setMenuPosition(position);
    setShowMenu(true); // Show the menu
  }, [calculateMenuPosition, clearReaction]);

  // Effect to handle clicks outside the menu to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if the click is outside the menuRef
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        // Also check if the click was *not* on the pet itself (opening the menu via right-click on pet shouldn't immediately close it)
        const isClickOnPet = petRef.current && petRef.current.contains(event.target as Node);
        if (!isClickOnPet) {
          setShowMenu(false);
          setMenuPosition(null);
          // Re-enable passthrough only if mouse is not over the pet anymore
          if (!isMouseOverPet.current) {
            if (window.desktopPet?.setMousePassthrough) {
              window.desktopPet.setMousePassthrough(true);
            }
          }
        }
      }
    };

    // Add listener only when the menu is shown
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    // Cleanup listener
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu, petRef, isMouseOverPet]); // Dependencies

  return {
    showMenu,
    setShowMenu,
    menuPosition,
    menuRef,
    handleContextMenu,
  };
}