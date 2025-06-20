import React from 'react';

interface PetContextMenuProps {
  showMenu: boolean;
  menuPosition: { top: number; left: number } | null;
  menuRef: React.RefObject<HTMLDivElement>;
  handleAction: (action: string) => void;
}

const PetContextMenu: React.FC<PetContextMenuProps> = ({
  showMenu,
  menuPosition,
  menuRef,
  handleAction,
}) => {
  if (!showMenu || !menuPosition) {
    return null;
  }

  // 使用 fixed 定位，直接使用屏幕坐标
  // menuPosition 已经包含了正确的屏幕坐标，不需要额外计算
  const style = {
    top: menuPosition.top,
    left: menuPosition.left,
    position: 'fixed' as React.CSSProperties['position'], // 使用 fixed 定位确保菜单相对于屏幕定位
    zIndex: 1000, // 确保菜单在最上层
  };

  return (
    <div
      className="pet-menu"
      style={style}
      ref={menuRef}
    >
      {/* Removed permanent actions: feed, pet, play, clean, sleep, massage, train, learn */}
      <button onClick={() => handleAction('photo')}>拍照</button>
      {/* Keep other non-permanent actions if any */}
      <hr />
      <button onClick={() => handleAction('status')}>状态详情</button>
      <button onClick={() => handleAction('skin')}>切换皮肤</button>
      <button onClick={() => handleAction('name')}>设置名称</button>
      <hr />
      <button onClick={() => handleAction('settings')}>设置</button>
      <button onClick={() => handleAction('minimize')}>最小化</button>
      <button onClick={() => handleAction('exit')}>退出</button>
    </div>
  );
};

export default PetContextMenu;