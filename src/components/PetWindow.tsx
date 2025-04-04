import React, { useState, useEffect, useRef } from 'react';
import type { DesktopPetAPI } from '../vite-env'; // Import the explicit type
import '../styles/PetWindow.css';

// 宠物类型和表情的接口
interface PetExpression {
  name: string;
  emoji: string;
  unlockLevel?: number; // 可选属性，表示解锁该表情需要的等级
}

interface PetType {
  name: string;
  color: string;
  borderColor: string;
  expressions: Record<string, PetExpression>;
}

// 宠物状态接口
interface PetStatus {
  mood: number;       // 心情 (0-100)
  cleanliness: number; // 清洁度 (0-100)
  hunger: number;     // 饥饿度 (0-100)
  energy: number;     // 精力 (0-100)
  exp: number;        // 经验值
  level: number;      // 等级
}

// 宠物类型和等级解锁内容
const PET_TYPES: Record<string, PetType> = {
  default: {
    name: '默认宠物',
    color: '#ffcc80',
    borderColor: '#e65100',
    expressions: {
      normal: { name: '正常', emoji: '😊' },
      happy: { name: '开心', emoji: '😄' },
      hungry: { name: '饿了', emoji: '🍕' },
      sleepy: { name: '困了', emoji: '😴' },
      sick: { name: '生病了', emoji: '🤢' },
      // 等级解锁表情
      level5: { name: '骄傲', emoji: '😎', unlockLevel: 5 },
      level10: { name: '酷炫', emoji: '🤩', unlockLevel: 10 },
      level15: { name: '大佬', emoji: '🦸', unlockLevel: 15 }
    }
  },
  leafy: {
    name: '小叶子',
    color: '#a5d6a7',
    borderColor: '#2e7d32',
    expressions: {
      normal: { name: '正常', emoji: '🌱' },
      happy: { name: '开心', emoji: '🌿' },
      hungry: { name: '饿了', emoji: '☀️' },
      sleepy: { name: '困了', emoji: '🌙' },
      // 等级解锁表情
      level5: { name: '开花', emoji: '🌸', unlockLevel: 5 },
      level10: { name: '茂盛', emoji: '🌳', unlockLevel: 10 }
    }
  },
  droplet: {
    name: '水滴滴',
    color: '#90caf9',
    borderColor: '#1565c0',
    expressions: {
      normal: { name: '正常', emoji: '💧' },
      happy: { name: '开心', emoji: '🌊' },
      hungry: { name: '饿了', emoji: '🥤' },
      sleepy: { name: '困了', emoji: '❄️' },
      // 等级解锁表情
      level5: { name: '彩虹', emoji: '🌈', unlockLevel: 5 },
      level10: { name: '浪花', emoji: '🌊🌊', unlockLevel: 10 }
    }
  }
};

// 等级解锁的互动类型
const LEVEL_UNLOCKS = {
  3: ['train'],  // 3级解锁训练
  5: ['learn'],  // 5级解锁学习
  8: ['special'] // 8级解锁特殊互动
};

const PetWindow: React.FC = () => {
  // Create a typed constant for the API
  const desktopPet = window.desktopPet as DesktopPetAPI;

  // 状态
  const [petType, setPetType] = useState<string>('default');
  const [expression, setExpression] = useState<string>('normal');
  const [showThought, setShowThought] = useState<boolean>(false);
  const [showMenu, setShowMenu] = useState<boolean>(false); // State for menu visibility
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null); // State for menu position
  const [alwaysOnTop, setAlwaysOnTop] = useState<boolean>(true);
  const [size, setSize] = useState<number>(100);
  const [opacity, setOpacity] = useState<number>(100);
  // const [isAnimating, setIsAnimating] = useState<boolean>(false); // 移除旧的动画状态
  const [currentAnimation, setCurrentAnimation] = useState<string | null>(null); // 新增状态控制具体动画类名
  const [status, setStatus] = useState<PetStatus>({
    mood: 80,
    cleanliness: 80,
    hunger: 80,
    energy: 80,
    exp: 0,
    level: 1
  });
  const [lowStatusFlags, setLowStatusFlags] = useState<Record<keyof Omit<PetStatus, 'exp' | 'level'>, boolean>>({
    mood: false,
    cleanliness: false,
    hunger: false,
    energy: false,
  });
  const [statusChangeAnimation, setStatusChangeAnimation] = useState<string | null>(null); // 新增 state 控制动画类
  const [levelUpAnimation, setLevelUpAnimation] = useState<boolean>(false); // 控制升级动画显示
  const [levelUpMessage, setLevelUpMessage] = useState<string>(''); // 升级消息文本
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Ref 来存储 timeout ID
  const menuRef = useRef<HTMLDivElement>(null); // Ref for the menu element
  const petRef = useRef<HTMLDivElement>(null); // Ref for the pet element

  // 拖动相关状态 (元素内拖动)
  const [petPosition, setPetPosition] = useState({ x: 0, y: 0 }); // 宠物元素的位置 state
  const isDragging = useRef<boolean>(false);
  const dragStartMousePos = useRef<{ clientX: number, clientY: number } | null>(null); // 只需记录 client 坐标
  const initialPetPosRef = useRef<{ x: number, y: number } | null>(null); // 拖动开始时宠物元素的初始位置
  const mouseDownButton = useRef<number | null>(null); // Store which button was pressed

  // 周期性改变表情
  // 状态随时间衰减
  useEffect(() => {
    const decayStatus = () => {
      // 基础衰减率 (调整后更合理的值)
      let moodDecay = 0.8;    // 心情衰减稍慢
      let cleanlinessDecay = 0.3;  // 清洁度衰减较慢
      let hungerDecay = 1.0;  // 饥饿感增加较快
      let energyDecay = 0.5;  // 精力消耗中等

      // 获取当前时间
      const now = new Date();
      const hours = now.getHours();

      // 昼夜影响 (6-18点为白天，其他为夜晚)
      const isDaytime = hours >= 6 && hours < 18;
      if (isDaytime) {
        // 白天: 精力消耗快，心情衰减慢
        energyDecay *= 1.5;
        moodDecay *= 0.7;
      } else {
        // 夜晚: 精力恢复快，饥饿感增加慢
        energyDecay *= 0.5;
        hungerDecay *= 0.7;
      }

      // 优化后的随机事件触发逻辑
      // 根据当前状态值动态调整触发概率
      const minStatus = Math.min(
        status.mood,
        status.cleanliness,
        status.hunger,
        status.energy
      );
      const eventChance = 0.05 + (0.1 * (1 - minStatus / 100));

      if (Math.random() < eventChance) {
        // 优先触发低状态的事件
        const states = [
          {name: 'mood' as keyof PetStatus, value: status.mood},
          {name: 'cleanliness' as keyof PetStatus, value: status.cleanliness},
          {name: 'hunger' as keyof PetStatus, value: status.hunger},
          {name: 'energy' as keyof PetStatus, value: status.energy}
        ].sort((a, b) => a.value - b.value);

        // 70%几率触发最低状态的事件，30%随机触发
        const targetState = Math.random() < 0.7
          ? states[0].name
          : states[Math.floor(Math.random() * 4)].name;

        // 事件效果：低状态时更可能改善，高状态时更可能恶化
        const currentValue = status[targetState];
        const improveChance = 0.7 - (currentValue / 200);
        const effect = Math.random() < improveChance ? 0.5 : 2;

        switch (targetState) {
          case 'mood': moodDecay *= effect; break;
          case 'cleanliness': cleanlinessDecay *= effect; break;
          case 'hunger': hungerDecay *= effect; break;
          case 'energy': energyDecay *= effect; break;
        }
      }

      setStatus(prev => {
        // 计算新状态
        const newStatus = {
          ...prev,
          mood: Math.max(0, prev.mood - moodDecay),
          cleanliness: Math.max(0, prev.cleanliness - cleanlinessDecay),
          hunger: Math.max(0, prev.hunger - hungerDecay),
          energy: Math.max(0, prev.energy - energyDecay)
        };
        
        // 每分钟获得1点经验
        newStatus.exp += 1;
        
        // 检查升级
        const expToNextLevel = 100 + (newStatus.level * 50);
        if (newStatus.exp >= expToNextLevel) {
          newStatus.exp -= expToNextLevel;
          newStatus.level += 1;
          // 根据等级播放不同动画
          if (newStatus.level <= 5) {
            setCurrentAnimation('level-up-small');
          } else if (newStatus.level <= 10) {
            setCurrentAnimation('level-up-medium');
          } else {
            setCurrentAnimation('level-up-large');
          }
          setLevelUpAnimation(true);
          setTimeout(() => {
            setLevelUpAnimation(false);
            setCurrentAnimation(null);
          }, 1500);
        }
        
        return newStatus;
      });
    }; // decayStatus 函数结束

    // --- 特殊事件检查 ---
    const checkSpecialEvents = () => {
      // 示例：极低概率心情大好事件
      if (Math.random() < 0.01) { // 1% 概率
        console.log("触发特殊事件：心情大好！");
        setStatus(prev => ({
          ...prev,
          mood: Math.min(100, prev.mood + 50) // 心情大幅提升
        }));
        // 添加动画反馈
        setExpression('happy'); // 强制开心
        if (!currentAnimation) { // 防止动画重叠
          setCurrentAnimation('jump-animation'); // 特殊事件用跳跃
          setTimeout(() => setCurrentAnimation(null), 500); // 动画持续时间后清除
        }
        // TODO: 添加更丰富的特殊事件反馈（如音效、粒子效果）
      }
      // 新增：低清洁度生病事件
      const SICKNESS_THRESHOLD = 15;
      const SICKNESS_CHANCE = 0.05; // 5% 概率
      if (status.cleanliness < SICKNESS_THRESHOLD && Math.random() < SICKNESS_CHANCE) {
        console.log("触发特殊事件：生病了！");
        setStatus(prev => ({
          ...prev,
          mood: Math.max(0, prev.mood - 30), // 心情大幅下降
          energy: Math.max(0, prev.energy - 40) // 精力大幅下降
        }));
        setExpression('sick'); // 设置生病表情
        if (!currentAnimation) { // 防止动画重叠
          setCurrentAnimation('sick-animation'); // 播放生病动画
          setTimeout(() => setCurrentAnimation(null), 1000); // 动画持续时间后清除
        }
      }
      // TODO: 在这里添加更多特殊事件的检查逻辑
    };

    // 定时器执行状态衰减和特殊事件检查
    const intervalId = setInterval(() => {
      decayStatus();
      checkSpecialEvents();
    }, 60000); // 每分钟执行一次

    return () => clearInterval(intervalId);
  }, [status]); // 依赖 status 以便在事件检查和衰减中使用最新状态

  // 根据状态自动改变表情和检查低状态警告
  useEffect(() => {
    const LOW_STATUS_THRESHOLD = 20; // 低状态阈值

    const updateExpressionAndWarnings = () => {
      let newExpression = 'normal';
      const prevLowStatusFlags = lowStatusFlags; // 保存之前的低状态标志，需要在 useState 声明后使用
      const newLowStatusFlags = {
        mood: status.mood < LOW_STATUS_THRESHOLD,
        cleanliness: status.cleanliness < LOW_STATUS_THRESHOLD,
        hunger: status.hunger < LOW_STATUS_THRESHOLD,
        energy: status.energy < LOW_STATUS_THRESHOLD
      };

      // 检测状态恢复
      let recovered = false;
      (Object.keys(newLowStatusFlags) as Array<keyof typeof newLowStatusFlags>).forEach(key => {
        // 确保 prevLowStatusFlags 存在且对应 key 的值从 true 变为 false
        if (prevLowStatusFlags && prevLowStatusFlags[key] && !newLowStatusFlags[key]) {
          recovered = true;
        }
      });

      if (recovered && !statusChangeAnimation) { // 只有在没有其他动画时才触发恢复动画
        setStatusChangeAnimation('recovery-positive'); // 触发恢复动画
      }

      // 优先显示低状态相关的表情
      if (newLowStatusFlags.hunger) {
        newExpression = 'hungry';
      } else if (newLowStatusFlags.energy) {
        newExpression = 'sleepy';
      } else if (newLowStatusFlags.cleanliness) {
        newExpression = 'normal'; // 暂时用 normal
      } else if (newLowStatusFlags.mood) {
        newExpression = 'normal'; // 暂时用 normal
      } else if (status.mood > 70) { // 如果没有低状态，再根据高心情显示开心
        // 根据等级显示不同表情
        if (status.level >= 15 && Math.random() > 0.7) {
          newExpression = 'level15';
        } else if (status.level >= 10 && Math.random() > 0.7) {
          newExpression = 'level10';
        } else if (status.level >= 5 && Math.random() > 0.7) {
          newExpression = 'level5';
        } else {
          newExpression = 'happy';
        }
      }

      setExpression(newExpression);
      setLowStatusFlags(newLowStatusFlags); // 更新低状态标志
      setShowThought(Math.random() > 0.3);
    };

    updateExpressionAndWarnings(); // 立即执行一次以更新初始状态
    const interval = setInterval(updateExpressionAndWarnings, 10000); // 10秒检查一次状态
    return () => clearInterval(interval);
  }, [status]); // 依赖 status

  // 监听设置更新
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await desktopPet.getPetSettings();
        setPetType(settings.petType || 'default');
        setAlwaysOnTop(settings.alwaysOnTop !== false);
        setSize(settings.size || 100);
        setOpacity(settings.opacity || 100);
      } catch (error) {
        console.error('加载设置失败:', error);
      }
    };

    loadSettings();

    // 监听外观更新
    const handleAppearanceUpdate = (data: { size: number, opacity: number }) => {
      setSize(data.size || 100);
      setOpacity(data.opacity || 100);
    };

    desktopPet.on('update-pet-appearance', handleAppearanceUpdate);

    return () => {
      desktopPet.off('update-pet-appearance');
    };
  }, []);

  // useEffect 来处理动画类的添加和移除
  useEffect(() => {
    if (statusChangeAnimation) {
      // 清除之前的 timeout (如果存在)
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
      // 设置新的 timeout 以在动画结束后移除类
      animationTimeoutRef.current = setTimeout(() => {
        setStatusChangeAnimation(null);
        animationTimeoutRef.current = null; // 清除 ref 中的 ID
      }, 500); // 假设动画持续 500ms
    }

    // 组件卸载时清除 timeout
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, [statusChangeAnimation]); // 依赖动画状态

  // Effect to handle clicks outside the menu to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close if menu is shown, menuRef exists, and the click is outside the menu element
      if (showMenu && menuRef.current && !menuRef.current.contains(event.target as Node)) {
        // Also check if the click was on the pet itself (using petRef)
        const isClickOnPet = petRef.current && petRef.current.contains(event.target as Node);
        // Close only if the click is outside both menu AND pet
        if (!isClickOnPet) {
            console.log("Clicked outside menu and pet, closing menu.");
            setShowMenu(false);
            setMenuPosition(null); // Reset position when closing
        } else {
            console.log("Clicked on pet while menu is open, not closing.");
        }
      }
    };

    if (showMenu) {
      // Use setTimeout to delay adding the listener slightly, preventing immediate closure
      // if the same click event that opened the menu bubbles up to the document.
      const timerId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
        console.log('Global mousedown listener for closing menu ADDED.');
      }, 0);
      return () => {
        clearTimeout(timerId);
        document.removeEventListener('mousedown', handleClickOutside);
        console.log('Global mousedown listener for closing menu REMOVED (cleanup).');
      };
    } else {
       // Ensure listener is removed if showMenu becomes false
       document.removeEventListener('mousedown', handleClickOutside);
    }

  }, [showMenu]); // Re-run effect when showMenu changes

  // Modified handleMouseDown for drag and right-click menu
  const handleMouseDown = (e: React.MouseEvent) => {
    // Prevent starting drag or showing menu if the click is inside the already visible menu
    if (showMenu && menuRef.current && menuRef.current.contains(e.target as Node)) {
      console.log("Mouse down inside the menu, ignoring.");
      return;
    }

    mouseDownButton.current = e.button; // Record the button pressed
    dragStartMousePos.current = { clientX: e.clientX, clientY: e.clientY }; // Record mouse start position

    // Add global mouseup listener regardless of button
    window.addEventListener('mouseup', handleGlobalMouseUp);
    console.log('Global mouseup listener added.');

    if (e.button === 0) { // Left mouse button for dragging
      console.log('Left mouse down on pet, initiating element drag...');
      initialPetPosRef.current = { ...petPosition }; // Record current pet position
      console.log('Initial pet element position stored:', initialPetPosRef.current);

      // --- Start Dragging ---
      console.log('Setting isDragging = true and adding global mousemove listener');
      isDragging.current = true; // Set dragging state
      window.addEventListener('mousemove', handleGlobalMouseMove); // Add global mousemove listener
      console.log('Global mousemove listener added.');

      // Hide menu on left click/drag start
      if (showMenu) {
        setShowMenu(false);
        setMenuPosition(null); // Reset position
      }

    } else if (e.button === 2) { // Right mouse button for menu
        console.log('Right mouse down on pet, calculating menu position.');
        e.preventDefault(); // Prevent default context menu here

        // Use a slight delay to allow the menu element to be potentially available if needed
        // Although we are trying to estimate/calculate without direct measurement first
        setTimeout(() => {
            if (petRef.current) { // Only need petRef for initial calculation
                const petRect = petRef.current.getBoundingClientRect();
                // Estimate menu height (adjust if needed, or measure if becomes complex)
                const estimatedMenuHeight = 180; // Adjusted estimate based on items
                const spacing = 10; // Space between pet and menu

                // Calculate position
                const top = petRect.top - estimatedMenuHeight - spacing;
                const left = petRect.left + petRect.width / 2; // Center based on pet

                // Basic boundary check (prevent going off top)
                const finalTop = Math.max(5, top); // Ensure some space from top edge

                setMenuPosition({ top: finalTop, left: left });
                setShowMenu(true); // Show the menu *after* setting position
                console.log('Menu position set:', { top: finalTop, left: left });

            } else {
                console.warn("Pet ref not available to calculate menu position. Falling back.");
                // Fallback: Position near the click event coordinates, shifted up
                const fallbackTop = e.clientY - 150; // Guess position above click
                const fallbackLeft = e.clientX;
                setMenuPosition({ top: Math.max(5, fallbackTop), left: fallbackLeft });
                setShowMenu(true);
            }
        }, 0); // setTimeout with 0ms delay

        // Prevent drag from starting on right-click
        isDragging.current = false;
    }
  };

  // Add handleContextMenu to prevent default browser menu
  const handleContextMenu = (e: React.MouseEvent) => {
    console.log('Context menu event triggered on pet container.');
    e.preventDefault(); // Prevent the default browser context menu
    // Menu visibility is handled in handleMouseDown now.
  };

  // 修改后的 handleGlobalMouseMove，用于元素内拖动
  const handleGlobalMouseMove = (e: MouseEvent) => {
    if (isDragging.current && dragStartMousePos.current && initialPetPosRef.current) {
      // 计算鼠标相对于拖动起点的位移 (使用 clientX/Y)
      const deltaX = e.clientX - dragStartMousePos.current.clientX;
      const deltaY = e.clientY - dragStartMousePos.current.clientY;

      // 计算宠物元素的新位置
      const newX = initialPetPosRef.current.x + deltaX;
      const newY = initialPetPosRef.current.y + deltaY;

      // 更新宠物位置 state
      setPetPosition({ x: newX, y: newY });
      // console.log(`Dragging element to: x=${newX}, y=${newY}`); // 可选日志
    }
  };

  // Global mouse up handler (attached to window during drag)
  const handleGlobalMouseUp = (e: MouseEvent) => {
    console.log(`Global mouse up triggered. Button released: ${e.button}. Button pressed was: ${mouseDownButton.current}`);

    // --- Right-click Menu Logic (on mouse up) ---
    // No action needed here for menu visibility based on current logic
    // (show on mousedown, hide on outside click or action)

    // --- Drag Cleanup Logic (for left-click drag) ---
    if (isDragging.current) {
      console.log('Global mouse up, stopping drag and removing global mousemove listener.');
      isDragging.current = false; // 清除拖动状态
      initialPetPosRef.current = null; // 清除初始宠物位置 ref
      // 移除 mousemove 监听器
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      console.log('Global mousemove listener removed.'); // Add log
    }

    // --- General Cleanup for ANY mouse up after a mouse down on the pet ---
    // Always remove the mouseup listener itself
    window.removeEventListener('mouseup', handleGlobalMouseUp);
    console.log('Global mouseup listener removed.'); // Add log

    // Always clear the recorded button and start position
    mouseDownButton.current = null; // 清除按下的按钮记录
    dragStartMousePos.current = null; // 清除鼠标起始位置记录
    console.log('mouseDownButton and dragStartMousePos cleared.'); // Add log
  };

  // Removed handleMouseMove and handleMouseUp as separate handlers bound to elements
  // Logic is now in handleGlobalMouseMove and handleGlobalMouseUp

  // Keep handleMouseLeave on container as a safety net to stop dragging if mouse exits window entirely
  const handleMouseLeave = (e: React.MouseEvent) => {
      // Only trigger if currently dragging (left mouse button was down)
      if (isDragging.current) {
          console.log('Mouse left container while dragging, stopping drag (safety net).');
          // Simulate a mouse up event to clean up state and listeners
          handleGlobalMouseUp(new MouseEvent('mouseup', { button: 0 })); // Simulate left button release
      }
  };

  // Menu Actions - Ensure menu closes
  const handleAction = (action: string) => {
    if (showMenu) {
      setShowMenu(false); // Close menu after action
      setMenuPosition(null); // Reset position
    }
    let animationType: string | null = null; // 动画类型

    switch (action) {
      case 'feed':
        setStatus(prev => ({
          ...prev,
          hunger: Math.min(100, prev.hunger + 30),
          mood: Math.min(100, prev.mood + 10)
        }));
        setExpression('happy');
        if (!currentAnimation) { setCurrentAnimation('shake-animation'); setTimeout(() => setCurrentAnimation(null), 400); } // 喂食 - 摇晃
        animationType = 'increase-positive'; // 喂食是积极的状态提升
        break;
      case 'pet':
        setStatus(prev => ({
          ...prev,
          cleanliness: Math.min(100, prev.cleanliness + 40),
          mood: Math.min(100, prev.mood + 15)
        }));
        setExpression('happy');
        if (!currentAnimation) { setCurrentAnimation('pulse-animation'); setTimeout(() => setCurrentAnimation(null), 500); } // 抚摸 - 心跳/缩放
        animationType = 'increase-positive'; // 抚摸也是积极的状态提升
        break;
      case 'play': { // 使用块作用域
        const ENERGY_THRESHOLD = 25; // 玩耍所需精力阈值
        if (status.energy >= ENERGY_THRESHOLD) {
          // 精力充足，可以玩耍
          setStatus(prev => ({
            ...prev,
            mood: Math.min(100, prev.mood + 25),
            energy: Math.max(0, prev.energy - 20)
          }));
          setExpression('happy');
          if (!currentAnimation) { setCurrentAnimation('spin-animation'); setTimeout(() => setCurrentAnimation(null), 600); } // 玩耍 - 旋转
        } else {
          // 精力不足，不想玩
          setStatus(prev => ({
            ...prev,
            mood: Math.max(0, prev.mood - 3), // 心情略微降低
            // energy: prev.energy // 精力不消耗或少量消耗
          }));
          setExpression('sleepy'); // 显示困倦表情
          if (!currentAnimation) { setCurrentAnimation('tired-animation'); setTimeout(() => setCurrentAnimation(null), 600); } // 播放疲惫动画
        }
        break;
      }
      case 'train': { // 新增训练互动 - 使用块作用域
        const ENERGY_THRESHOLD = 40; // 训练所需精力阈值
        if (status.energy >= ENERGY_THRESHOLD) {
          // 精力充足，训练成功
          setStatus(prev => ({
            ...prev,
            mood: Math.min(100, prev.mood + 10), // 心情少量增加
            energy: Math.max(0, prev.energy - 30)  // 精力大量消耗
          }));
          setExpression('happy'); // 训练成功后开心一下
          if (!currentAnimation) { setCurrentAnimation('jump-animation'); setTimeout(() => setCurrentAnimation(null), 500); } // 训练成功 - 跳跃
        } else {
          // 精力不足，训练效果不佳或失败
          setStatus(prev => ({
            ...prev,
            mood: Math.max(0, prev.mood - 5), // 心情少量降低
            energy: Math.max(0, prev.energy - 5) // 精力少量消耗
          }));
          setExpression('sleepy'); // 训练失败后困倦
          if (!currentAnimation) { setCurrentAnimation('tired-animation'); setTimeout(() => setCurrentAnimation(null), 600); } // 播放疲惫动画
        }
        break;
      }
      case 'learn': { // 新增学习互动 - 使用块作用域
        const ENERGY_THRESHOLD = 30; // 学习所需精力阈值
        if (status.energy >= ENERGY_THRESHOLD) {
          // 精力充足，学习成功
          setStatus(prev => ({
            ...prev,
            mood: Math.min(100, prev.mood + 5), // 心情少量增加
            energy: Math.max(0, prev.energy - 25) // 精力中等消耗
          }));
          setExpression('happy'); // 学习成功后开心一下
          if (!currentAnimation) { setCurrentAnimation('thinking-animation'); setTimeout(() => setCurrentAnimation(null), 700); } // 学习成功 - 思考
        } else {
          // 精力不足，学习效果不佳
          setStatus(prev => ({
            ...prev,
            mood: Math.max(0, prev.mood - 4), // 心情少量降低
            energy: Math.max(0, prev.energy - 10) // 精力少量消耗
          }));
          setExpression('sleepy'); // 学习失败后困倦
          if (!currentAnimation) { setCurrentAnimation('distracted-animation'); setTimeout(() => setCurrentAnimation(null), 600); } // 播放分心动画
        }
        break;
      }
      case 'settings':
        desktopPet.openSettings();
        break;
      case 'alwaysOnTop':
        setAlwaysOnTop(prev => {
          const newState = !prev;
          desktopPet.setAlwaysOnTop(newState);
          return newState;
        });
        break;
      case 'exit':
        window.close();
        break;
      default:
        console.warn('未知操作:', action);
    }

    // 触发状态变化动画 (如果适用)
    if (animationType) {
      setStatusChangeAnimation(animationType);
    }
  };

  // 获取当前宠物类型数据
  const currentPetType = PET_TYPES[petType] || PET_TYPES.default;
  const currentExpression = currentPetType.expressions[expression] || currentPetType.expressions.normal;

  // 动态样式
  const containerStyle: React.CSSProperties = {
    width: `${size}px`,
    height: `${size}px`, // 保持宽高一致
    opacity: opacity / 100,
  };

  const petStyle: React.CSSProperties = {
    backgroundColor: currentPetType.color,
    borderColor: currentPetType.borderColor,
    fontSize: `${size * 0.5}px`, // 根据大小调整字体大小
  };

  const thoughtStyle: React.CSSProperties = {
    fontSize: `${Math.max(12, size * 0.22)}px`, // Increased font size ratio, min 12px
    position: 'absolute', // Ensure it's absolutely positioned within its wrapper
    top: `-${size * 0.3}px`, // Position above the pet (negative top)
    left: `${size * 0.65}px`, // Position slightly to the right of the pet's center
    transform: 'translateX(-50%)', // Center the bubble horizontally relative to its left position
    pointerEvents: 'none', // Ensure it doesn't block interactions
  };

  const menuStyle: React.CSSProperties = {
    // 调整菜单位置和大小，可以根据需要修改
    // top: `${size * 0.1}px`, // 示例：菜单顶部与宠物顶部对齐
    // left: `${size * 1.1}px`, // 示例：菜单在宠物右侧
    fontSize: `${Math.max(10, size * 0.12)}px`, // 菜单字体大小，最小10px
  }; // Correctly close menuStyle

  // 鼠标穿透控制函数 (Ensure they are here, after menuStyle)
  const disablePassthrough = () => window.desktopPet?.setMousePassthrough(false);
  const enablePassthrough = () => window.desktopPet?.setMousePassthrough(true);

  console.log('Rendering PetWindow, showMenu:', showMenu); // Keep log for debugging

  return (
    // Outer wrapper for the entire window area, allows passthrough by default
    <div style={{ width: '100%', height: '100%', position: 'relative', pointerEvents: 'none' }}>
      {/* Draggable container for pet and menu */}
      <div
        className={`pet-container ${currentAnimation || ''} ${statusChangeAnimation || ''}`}
        style={{
          ...containerStyle, // Original size/opacity styles
          position: 'absolute', // Position absolutely within the wrapper
          left: 0, // Base position
          top: 0,  // Base position
          transform: `translate(${petPosition.x}px, ${petPosition.y}px)`, // Apply drag offset
          pointerEvents: 'auto', // This container *is* interactive
          cursor: isDragging.current ? 'grabbing' : 'grab', // Drag cursor
        }}
        onMouseDown={handleMouseDown} // Handles drag start and right-click for menu
        onContextMenu={handleContextMenu} // Prevent default context menu on the main interactive area
        onMouseLeave={(e) => {       // Leaving the container
          handleMouseLeave(e);     // Handle drag safety net
          // Enable passthrough ONLY if the mouse is not over the menu (which might be outside this container)
          // This logic is tricky with absolute positioning. A simpler approach:
          // Enable passthrough if not dragging AND menu is not shown.
          if (!isDragging.current && !showMenu) {
             enablePassthrough();
          }
        }}
        onMouseEnter={disablePassthrough} // Disable passthrough when mouse enters the main interactive area
      >

        {/* Pet Body and Thought Bubble Container - Rendered First in this group */}
        <div style={{ position: 'relative', pointerEvents: 'none' }}> {/* Wrapper for pet and bubble */}
          <div
            className={`pet ${levelUpAnimation ? 'level-up' : ''}`}
            style={{
              ...petStyle,
              pointerEvents: 'auto', // Pet itself needs to be interactive for drag and context menu
              position: 'relative'
            }}
            // Attach context menu prevention here if not on the main container
            // onContextMenu={handleContextMenu}
          >
            {currentExpression.emoji}
            <div className="level-display">
              {status.level}
            </div>
          </div>
          {/* Thought Bubble - Positioned relative to the pet wrapper */}
          {showThought && (
            <div className="thought-bubble" style={{...thoughtStyle, pointerEvents: 'none'}}>
              {expression === 'hungry' ? '饿了...' : expression === 'sleepy' ? '困了...' : '...'}
            </div>
          )}
        </div>
        {/* End of Pet Body and Thought Bubble Container */}

        {/* Status Bar - Rendered Second in this group */}
        <div className="status-bar" style={{ pointerEvents: 'auto' }}>
          {(Object.keys(status) as Array<keyof PetStatus>).map((key) => {
            const labelMap: Record<string, string> = {
              mood: '心情',
              cleanliness: '清洁',
              hunger: '饥饿',
              energy: '精力',
            };
            const value = status[key];
            const isLow = (['mood', 'cleanliness', 'hunger', 'energy'] as const).includes(key as any)
              ? lowStatusFlags[key as 'mood' | 'cleanliness' | 'hunger' | 'energy']
              : false;
            // Determine animation class based on status changes
            let animationClass = '';
            if (statusChangeAnimation === 'increase-positive' && (key === 'mood' || key === 'cleanliness' || key === 'hunger')) {
              animationClass = 'increase-positive';
            } else if (statusChangeAnimation === 'recovery-positive' && !isLow) {
               // Apply recovery only if the status is no longer low
               animationClass = 'recovery-positive';
            }

            const meterClass = `status-meter-fill ${key} ${isLow ? 'low-warning' : ''} ${animationClass}`;

            return (
              <div key={key} className="status-item">
                <span className="status-label">{labelMap[key] || key}:</span>
                <div className="status-meter">
                  <div
                    className={meterClass}
                    style={{ width: `${Math.round(value)}%` }}
                  />
                </div>
                <span className="status-value">{Math.round(value)}</span> {/* 显示具体数值 */}
              </div>
            );
          })}
        </div>
        {/* End of Status Bar */}

        {/* Conditionally Rendered Menu Container - Corrected Ternary Operator */}
        {showMenu ? (
          <div
            ref={menuRef} // Assign ref for outside click detection
            className="pet-menu" // Use the correct class for styling
            style={{
              // Base styles from menuStyle (like font size) can be included if needed
              // ...menuStyle,
              position: 'absolute', // Position absolutely relative to pet-container
              top: '105%', // Position below the container (adjust as needed)
              left: '50%', // Center horizontally relative to container
              transform: 'translateX(-50%)', // Adjust horizontal centering
              pointerEvents: 'auto', // Menu is interactive
              zIndex: 10 // Ensure menu is above other elements
            }}
            // Prevent event propagation to the container below
            onMouseDown={(e) => e.stopPropagation()}
            onContextMenu={(e) => {
                e.stopPropagation(); // Stop propagation
                e.preventDefault(); // Prevent default context menu *inside* the menu itself
            }}
            onMouseEnter={disablePassthrough} // Keep passthrough disabled when over menu
            // onMouseLeave={enablePassthrough} // Rely on container's onMouseLeave
          >
            {/* All Menu Buttons INSIDE the conditional block */}
            <button onClick={() => handleAction('feed')}>喂食</button>
            <button onClick={() => handleAction('pet')}>抚摸</button>
            <button onClick={() => handleAction('play')}>玩耍</button>
            <button onClick={() => handleAction('train')}>训练</button>
            <button onClick={() => handleAction('learn')}>学习</button>
            <hr />
            <button onClick={() => handleAction('settings')}>设置</button>
            <button onClick={() => handleAction('alwaysOnTop')}>
              {alwaysOnTop ? '取消置顶' : '置顶'}
            </button>
            <hr /> {/* Moved inside */}
            <button onClick={() => handleAction('exit')}>退出</button> {/* Moved inside */}
          </div>
        ) : null} {/* Render null when showMenu is false */}
        {/* End of Menu Container */}

      </div> {/* End of pet-container */}
    </div> // End of outer wrapper
  ); // End of return statement
}; // End of PetWindow component function

export default PetWindow; // Ensure only one export