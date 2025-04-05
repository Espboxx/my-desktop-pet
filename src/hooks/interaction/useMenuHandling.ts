import { useState, useRef, useEffect, useCallback } from 'react';

interface MenuPosition {
  top: number;
  left: number;
}

interface UseMenuHandlingProps {
  petRef: React.RefObject<HTMLDivElement>;
  isMouseOverPet: React.RefObject<boolean>;
}

interface UseMenuHandlingReturn {
  showMenu: boolean;
  setShowMenu: (show: boolean) => void;
  menuPosition: MenuPosition | null;
  setMenuPosition: React.Dispatch<React.SetStateAction<MenuPosition | null>>;
  menuRef: React.RefObject<HTMLDivElement>;
  calculateMenuPosition: (mouseX: number, mouseY: number) => MenuPosition;
  handleContextMenu: (e: React.MouseEvent) => void;
}

export default function useMenuHandling({
  petRef,
  isMouseOverPet
}: UseMenuHandlingProps): UseMenuHandlingReturn {
  // 菜单状态
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // 菜单位置计算
  const calculateMenuPosition = useCallback((mouseX: number, mouseY: number) => {
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;
    const menuElement = menuRef.current;
    const menuWidth = menuElement ? menuElement.offsetWidth : 150;
    const menuHeight = menuElement ? menuElement.offsetHeight : 250;
    let top = mouseY;
    let left = mouseX;

    if (left + menuWidth > windowWidth) left = windowWidth - menuWidth;
    if (left < 0) left = 0;
    if (top + menuHeight > windowHeight) top = windowHeight - menuHeight;
    if (top < 0) top = 0;

    top += 2;
    left += 2;

    if (left + menuWidth > windowWidth) left = windowWidth - menuWidth;
    if (top + menuHeight > windowHeight) top = windowHeight - menuHeight;
    if (left < 0) left = 0;
    if (top < 0) top = 0;

    return { top, left };
  }, []);

  // 右键菜单处理
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.desktopPet.setMousePassthrough(false);
    const position = calculateMenuPosition(e.clientX, e.clientY);
    setMenuPosition(position);
    setShowMenu(true);
  }, [calculateMenuPosition]);

  // 点击菜单外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMenu && menuRef.current && !menuRef.current.contains(event.target as Node)) {
        const isClickOnPet = petRef.current && petRef.current.contains(event.target as Node);
        if (!isClickOnPet) {
          setShowMenu(false);
          setMenuPosition(null);
          if (!isMouseOverPet.current) {
            window.desktopPet.setMousePassthrough(true);
          }
        }
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu, petRef, isMouseOverPet]);

  return {
    showMenu,
    setShowMenu,
    menuPosition,
    setMenuPosition,
    menuRef,
    calculateMenuPosition,
    handleContextMenu,
  };
}