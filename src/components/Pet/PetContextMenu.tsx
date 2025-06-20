import React from 'react';

interface PetContextMenuProps {
  showMenu: boolean;
  menuPosition: { top: number; left: number } | null;
  petPosition: { x: number; y: number }; // Need pet's absolute position
  menuRef: React.RefObject<HTMLDivElement>;
  handleAction: (action: string) => void;
}

const PetContextMenu: React.FC<PetContextMenuProps> = ({
  showMenu,
  menuPosition,
  petPosition,
  menuRef,
  handleAction,
}) => {
  if (!showMenu || !menuPosition) {
    return null;
  }

  // Calculate position relative to the pet container/window if needed,
  // or keep absolute positioning depending on CSS setup.
  // Here, we calculate relative to the pet's position within its container.
  const style = {
    top: menuPosition.top - petPosition.y,
    left: menuPosition.left - petPosition.x,
    position: 'absolute' as React.CSSProperties['position'], // Ensure the menu is positioned correctly with correct type
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