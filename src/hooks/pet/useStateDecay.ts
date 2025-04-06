import { useEffect, useState, useCallback } from 'react';
import { PetStatus } from '../../types/petTypes';
import { LEVEL_UNLOCKS, ACHIEVEMENTS as predefinedAchievements } from '../../constants/petConstants';
import { gameData } from '../../constants/taskData';
import { ITEMS as predefinedItems } from '../../constants/itemData';
import { DECAY_RATES, EVENT_CHANCES, STATUS_THRESHOLDS } from './constants';

/**
 * 状态衰减和特殊事件hook
 * 处理状态随时间的变化、特殊事件、升级检查、任务检查等
 */
export function useStateDecay(
  isLoaded: boolean,
  setStatus: React.Dispatch<React.SetStateAction<PetStatus>>,
  statusRef: React.MutableRefObject<PetStatus>,
  showBubble: (text: string, type: 'thought' | 'speech', duration?: number) => void
) {
  const [newlyUnlocked, setNewlyUnlocked] = useState<string[]>([]);

  // 状态衰减、特殊事件、升级检查、任务检查、主动需求气泡
  useEffect(() => {
    if (!isLoaded) return; // 等待状态加载

    const intervalId = setInterval(() => {
      // --- 衰减率、一天中的时间、随机事件 ---
      let moodDecay = DECAY_RATES.MOOD;
      let cleanlinessDecay = DECAY_RATES.CLEANLINESS;
      let hungerIncrease = DECAY_RATES.HUNGER;
      let energyDecay = DECAY_RATES.ENERGY;
      // ... (基于时间和随机事件的修饰符) ...

      // --- 更新状态 ---
      setStatus(prev => {
        const currentTasks = gameData.tasks; // 获取所有定义的任务
        const currentAchievements = predefinedAchievements; // 使用导入的成就

        // 创建先前状态的可变副本以使用
        let newStatus: PetStatus = {
          ...prev,
          mood: Math.floor(Math.max(0, Math.min(prev.maxMood, prev.mood - moodDecay))),
          cleanliness: Math.floor(Math.max(0, Math.min(prev.maxCleanliness, prev.cleanliness - cleanlinessDecay))),
          hunger: Math.floor(Math.min(prev.maxHunger, prev.hunger + hungerIncrease)),
          energy: Math.floor(Math.max(0, Math.min(prev.maxEnergy, prev.energy - energyDecay))),
          exp: prev.exp + 1 // 经验始终略微增加
        };

        // --- 独立特殊事件（直接应用于newStatus）---
        let specialEventOccurred = false;
        let eventMessage = "";

        // --- 升级检查 ---
        const expToNextLevel = 100 + (newStatus.level * 50);
        if (newStatus.exp >= expToNextLevel) {
          const oldLevel = prev.level;
          newStatus.exp -= expToNextLevel;
          newStatus.level += 1;
          const newLevel = newStatus.level;
          
          // 状态值上限提升（每升一级增加5点上限）
          const statusLimitIncrease = 5;
          newStatus.maxMood += statusLimitIncrease;
          newStatus.maxCleanliness += statusLimitIncrease;
          newStatus.maxHunger += statusLimitIncrease;
          newStatus.maxEnergy += statusLimitIncrease;
          
          // 提示玩家状态值上限已提升
          const statusUpgradeMsg = `状态值上限提升! 心情:${newStatus.maxMood} 清洁:${newStatus.maxCleanliness} 饥饿:${newStatus.maxHunger} 能量:${newStatus.maxEnergy}`;
          setNewlyUnlocked(prevUnlocked => [...prevUnlocked, statusUpgradeMsg]);
          
          // 解锁项检查
          const unlockedItems: string[] = [];
          for (const [levelStr, items] of Object.entries(LEVEL_UNLOCKS)) {
             const level = Number(levelStr);
             if (!isNaN(level) && level > oldLevel && level <= newLevel) {
               unlockedItems.push(...items.map(item => `互动: ${item}`));
             }
           }
          if (unlockedItems.length > 0) {
            setNewlyUnlocked(prevUnlocked => [...prevUnlocked, ...unlockedItems]);
            console.log(`Level Up! ${newLevel}. Unlocked: ${unlockedItems.join(', ')}`);
          } else {
             console.log(`Level Up! Reached level ${newLevel}.`);
          }
          
          console.log(statusUpgradeMsg); // 在控制台也显示状态值上限提升信息
        }

        // --- 任务检查（基于状态的目标）---
        const newlyCompletedTasks: string[] = [];
        const taskNotifications: string[] = [];
        let currentActiveTasks = [...newStatus.activeTasks]; // 在这里使用newStatus

        for (const taskId of prev.activeTasks) { // 迭代区间开始时活动的任务
          const task = currentTasks[taskId];
          // 使用newStatus.completedTasks检查是否已在此周期中完成
          if (!task || newStatus.completedTasks.includes(taskId)) continue;

          let allGoalsMetForThisTask = true;
          let taskProgressMade = false;

          for (const goal of task.goals) {
            let goalMetInThisCheck = goal.completed || false;

            switch (goal.type) {
              case 'reachStatus':
                if (goal.status && goal.targetValue !== undefined && goal.status in newStatus) {
                  const statusValue = newStatus[goal.status as keyof PetStatus];
                  if (typeof statusValue === 'number' && statusValue >= goal.targetValue) {
                    goalMetInThisCheck = true;
                  }
                }
                 break;
              // 其他情况保持不变（maintainStatus, performInteraction）
              case 'maintainStatus': break;
              case 'performInteraction': break;
            }

            if (!goalMetInThisCheck) {
              allGoalsMetForThisTask = false;
            } else if (!goal.completed) {
                taskProgressMade = true;
            }
          } // 结束目标循环

          if (allGoalsMetForThisTask) {
            if (!prev.completedTasks.includes(taskId)) { // 确保我们仅基于prev状态完成一次
                newlyCompletedTasks.push(taskId);
                taskNotifications.push(`任务完成: ${task.name}`);
                newStatus.exp += task.reward.exp;

                // --- 添加物品奖励 ---
                if (task.reward.items && task.reward.items.length > 0) {
                  const currentInventory = { ...newStatus.inventory }; // 创建可变副本
                  task.reward.items.forEach(itemId => {
                    const item = predefinedItems[itemId]; // 获取物品详情用于通知
                    if (item) {
                      currentInventory[itemId] = (currentInventory[itemId] || 0) + 1;
                      taskNotifications.push(`获得物品: ${item.name}`); // 添加物品通知
                      console.log(`Item Added: ${item.name} (ID: ${itemId})`);
                    } else {
                      console.warn(`Task ${task.id} tried to reward non-existent item: ${itemId}`);
                    }
                  });
                  newStatus.inventory = currentInventory; // 在newStatus中更新库存
                }
                // --- 结束物品奖励 ---

                if (task.reward.unlocks) {
                    setNewlyUnlocked(prevUnlocked => [...prevUnlocked, ...task.reward.unlocks!.map(u => `任务解锁: ${u}`)]);
                }
                console.log(`Task Completed: ${task.name}`);
                currentActiveTasks = currentActiveTasks.filter(id => id !== taskId); // 更新可变列表
            }
          } else if (taskProgressMade) {
              // console.log(`Progress made on task: ${task.name}`);
          }
        } // 结束任务循环

        // 更新newStatus中的任务列表
        newStatus.activeTasks = currentActiveTasks;
        if (newlyCompletedTasks.length > 0) {
          // 使用prev.completedTasks避免在interval运行快速时添加重复项
          newStatus.completedTasks = [...prev.completedTasks, ...newlyCompletedTasks];
          // 如果需要，通知由setNewlyUnlocked在此回调外处理
        }

        // --- 成就检查（精细） ---
        const newlyUnlockedAchievements: string[] = [];
        const achievementNotifications: string[] = [];

        for (const achievement of Object.values(currentAchievements)) {
          // 根据newStatus.unlockedAchievements检查
          if (newStatus.unlockedAchievements.includes(achievement.id)) {
            continue;
          }

          let allConditionsMet = true;
          for (const condition of achievement.conditions) {
            let conditionMet = false;
            switch (condition.type) {
              case 'statusThreshold':
                if (condition.status && condition.threshold !== undefined && condition.status in newStatus) {
                  const statusValue = newStatus[condition.status as keyof PetStatus];
                  // 处理动态上限的状态值检查
                  if (typeof statusValue === 'number') {
                    // 特殊处理"maxMood"和"maxClean"成就，它们需要检查状态是否达到当前上限
                    if (achievement.id === 'maxMood' && condition.status === 'mood') {
                      // 检查心情是否达到当前上限
                      conditionMet = statusValue >= newStatus.maxMood;
                    } else if (achievement.id === 'maxClean' && condition.status === 'cleanliness') {
                      // 检查清洁度是否达到当前上限
                      conditionMet = statusValue >= newStatus.maxCleanliness;
                    } else {
                      // 其他常规阈值检查
                      conditionMet = statusValue >= condition.threshold;
                    }
                  }
                }
                break;
              case 'levelReached':
                if (condition.level !== undefined && newStatus.level >= condition.level) {
                  conditionMet = true;
                }
                break;
              case 'interactionCount':
                if (condition.interactionType && condition.count !== undefined) {
                    const count = newStatus.interactionCounts[condition.interactionType] || 0;
                    if (count >= condition.count) {
                        conditionMet = true;
                    }
                }
                break;
              case 'taskCompleted':
                if (condition.taskId && newStatus.completedTasks.includes(condition.taskId)) {
                  conditionMet = true;
                }
                break;
            }
            if (!conditionMet) {
              allConditionsMet = false;
              break;
            }
          }

          if (allConditionsMet) {
            // 根据prev状态检查，确保它之前未解锁
            if (!prev.unlockedAchievements.includes(achievement.id)) {
                newlyUnlockedAchievements.push(achievement.id);
                achievementNotifications.push(`成就解锁: ${achievement.name}`);
                newStatus.exp += achievement.reward?.exp || 0;
                if (achievement.reward?.unlocks) {
                    setNewlyUnlocked(prevUnlocked => [...prevUnlocked, ...achievement.reward!.unlocks!.map(u => `成就解锁: ${u}`)]);
                }
                if (achievement.reward?.idleAnimation) {
                    if (!newStatus.unlockedIdleAnimations.includes(achievement.reward.idleAnimation)) {
                        newStatus.unlockedIdleAnimations = [...newStatus.unlockedIdleAnimations, achievement.reward.idleAnimation];
                        console.log(`Unlocked Idle Animation: ${achievement.reward.idleAnimation}`);
                        setNewlyUnlocked(prevUnlocked => [...prevUnlocked, `解锁新动画: ${achievement.reward!.idleAnimation}`]);
                    }
                }
                console.log(`Achievement Unlocked: ${achievement.name}!`);
            }
          }
        } // 结束成就循环

        if (newlyUnlockedAchievements.length > 0) {
          // 使用prev.unlockedAchievements避免重复
          newStatus.unlockedAchievements = [...prev.unlockedAchievements, ...newlyUnlockedAchievements];
          // 通知在外部由setNewlyUnlocked处理
        }

        // --- 应用特殊事件 ---
        // 心情提升
        if (!specialEventOccurred && Math.random() < EVENT_CHANCES.MOOD_BOOST) {
          eventMessage = "特殊事件: 心情提升!";
          newStatus.mood = Math.floor(Math.min(newStatus.maxMood, newStatus.mood + 50));
          specialEventOccurred = true;
        }
        
        // 宠物自学习 - 宠物自己学习获得经验
        if (!specialEventOccurred && Math.random() < EVENT_CHANCES.SELF_LEARNING) {
          const expGain = 10 + Math.floor(Math.random() * 15); // 获得10-24点经验值
          eventMessage = `特殊事件: 宠物自学习! 获得${expGain}点经验`;
          newStatus.exp += expGain;
          newStatus.energy = Math.floor(Math.max(0, newStatus.energy - 10)); // 消耗一些能量
          specialEventOccurred = true;
        }
        
        // 健身事件 - 宠物锻炼身体获得经验和能量
        if (!specialEventOccurred && Math.random() < EVENT_CHANCES.EXERCISE && newStatus.energy > 30) {
          const expGain = 8 + Math.floor(Math.random() * 10); // 获得8-17点经验值
          eventMessage = `特殊事件: 宠物健身! 获得${expGain}点经验`;
          newStatus.exp += expGain;
          newStatus.energy = Math.floor(Math.max(0, newStatus.energy - 15)); // 消耗能量
          newStatus.maxEnergy += 1; // 小幅提升能量上限
          specialEventOccurred = true;
        }
        
        // 发现宝藏 - 宠物发现宝物获得经验和可能获得物品
        if (!specialEventOccurred && Math.random() < EVENT_CHANCES.TREASURE) {
          const expGain = 15 + Math.floor(Math.random() * 20); // 获得15-34点经验值
          eventMessage = `特殊事件: 发现宝藏! 获得${expGain}点经验`;
          newStatus.exp += expGain;
          
          // 随机获得一些物品的机会 (20%几率)
          if (Math.random() < 0.2) {
            // 获取所有可用物品的ID
            const allItemIds = Object.keys(predefinedItems);
            if (allItemIds.length > 0) {
              // 随机选择一个物品
              const randomItemId = allItemIds[Math.floor(Math.random() * allItemIds.length)];
              const item = predefinedItems[randomItemId];
              if (item) {
                // 添加物品到库存
                const newInventory = { ...newStatus.inventory };
                newInventory[randomItemId] = (newInventory[randomItemId] || 0) + 1;
                newStatus.inventory = newInventory;
                eventMessage += ` 和物品: ${item.name}`;
              }
            }
          }
          specialEventOccurred = true;
        }
        
        // 与其他宠物互动 - 宠物遇到朋友获得经验和心情
        if (!specialEventOccurred && Math.random() < EVENT_CHANCES.INTERACTION) {
          const expGain = 12 + Math.floor(Math.random() * 8); // 获得12-19点经验值
          eventMessage = `特殊事件: 与其他宠物互动! 获得${expGain}点经验`;
          newStatus.exp += expGain;
          newStatus.mood = Math.floor(Math.min(newStatus.maxMood, newStatus.mood + 20)); // 提升心情
          specialEventOccurred = true;
        }
        
        // 灵感迸发 - 宠物突然有灵感获得经验
        if (!specialEventOccurred && Math.random() < EVENT_CHANCES.INSPIRATION) {
          const expGain = 18 + Math.floor(Math.random() * 12); // 获得18-29点经验值
          eventMessage = `特殊事件: 灵感迸发! 获得${expGain}点经验`;
          newStatus.exp += expGain;
          specialEventOccurred = true;
        }
        
        // 生病
        if (!specialEventOccurred && newStatus.cleanliness < STATUS_THRESHOLDS.SICKNESS_THRESHOLD && Math.random() < EVENT_CHANCES.SICKNESS) {
          eventMessage = "特殊事件: 宠物生病了!";
          newStatus.mood = Math.floor(Math.max(0, newStatus.mood - 30));
          newStatus.energy = Math.floor(Math.max(0, newStatus.energy - 40));
          specialEventOccurred = true;
        }

        if (specialEventOccurred) {
          console.log(eventMessage);
          // 保存事件消息，以便在setStatus回调外显示
          const eventMessageToShow = eventMessage;
          // 在setStatus完成后通过气泡显示事件
          setTimeout(() => {
            showBubble(eventMessageToShow, 'thought', 5000); // 显示5秒钟
          }, 100);
        }

        // --- 最终返回 ---
        return newStatus;
      }); // 结束setStatus

      // --- 主动需求气泡（在setStatus完成后运行）---
      // 使用轻微延迟，确保在setStatus之后更新statusRef
      setTimeout(() => {
        const currentStatus = statusRef.current; // 使用更新的状态引用

        // 仅当当前没有气泡活动时检查
        if (!currentStatus.bubble.active && Math.random() < EVENT_CHANCES.PROACTIVE_BUBBLE) {
          let bubbleText = "";
          let bubbleType: 'thought' | 'speech' = 'thought'; // 默认为思考

          // 优先级需求：饥饿 > 能量 > 心情（根据需要调整优先级）
          if (currentStatus.hunger >= STATUS_THRESHOLDS.HUNGER_NEED && currentStatus.hunger < 80) { // 检查中等饥饿
            const hungerTexts = ["有点饿了...", "想吃点零食...", "肚子在叫了..."];
            bubbleText = hungerTexts[Math.floor(Math.random() * hungerTexts.length)];
          } else if (currentStatus.energy <= STATUS_THRESHOLDS.ENERGY_NEED && currentStatus.energy > 20) { // 检查中等疲倦
            const tiredTexts = ["有点困了...", "想打个盹...", "眼皮好重..."];
            bubbleText = tiredTexts[Math.floor(Math.random() * tiredTexts.length)];
          } else if (currentStatus.mood <= STATUS_THRESHOLDS.MOOD_NEED && currentStatus.mood > 20) { // 检查中等无聊/悲伤
            const moodTexts = ["有点无聊...", "想玩...", "求关注~"];
            bubbleText = moodTexts[Math.floor(Math.random() * moodTexts.length)];
          }
          // 如果需要，添加清洁度检查
          // else if (currentStatus.cleanliness <= 50 && currentStatus.cleanliness > 20) { ... }

          if (bubbleText) {
            console.log(`Proactive Bubble Triggered: ${bubbleText}`);
            showBubble(bubbleText, bubbleType); // 调用现有的showBubble函数
          }
        }
      }, 10); // 小延迟（10毫秒）

    }, 60000); // 每分钟运行一次

    return () => clearInterval(intervalId); // 清理间隔
  }, [isLoaded, showBubble]); // 添加showBubble到依赖项

  // 清除新解锁内容状态的函数
  const clearNewlyUnlocked = useCallback(() => {
    setNewlyUnlocked([]);
  }, []); // setNewlyUnlocked是稳定的

  return { newlyUnlocked, clearNewlyUnlocked };
}