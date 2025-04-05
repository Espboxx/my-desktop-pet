import React from 'react';
import { useSharedPetStatus } from '../../context/PetStatusContext'; // Import the shared status hook
import { gameData } from '../../constants/taskData'; // Import task definitions
import { ACHIEVEMENTS as predefinedAchievements } from '../../constants/petConstants'; // Import achievement definitions
import { Task, Achievement } from '../../types/petTypes'; // Import types

const TasksAchievementsTab: React.FC = () => {
  const { status, isLoaded } = useSharedPetStatus(); // Get status from context

  return (
    <div className="tasks-achievements-tab">
      <h2>任务与成就</h2>

      {isLoaded ? (
        <>
          <div className="tasks-section">
            <h3>进行中的任务</h3>
            {status.activeTasks.length > 0 ? (
              <ul>
                {status.activeTasks.map(taskId => {
                  const task: Task | undefined = gameData.tasks[taskId];
                  return task ? (
                    <li key={taskId}>
                      <strong>{task.name}</strong>: {task.description}
                      {/* TODO: Display goal progress if available */}
                    </li>
                  ) : (
                    <li key={taskId}>未知任务 (ID: {taskId})</li>
                  );
                })}
              </ul>
            ) : (
              <p>暂无进行中的任务。</p>
            )}
          </div>

          <div className="achievements-section">
            <h3>已解锁成就</h3>
            {status.unlockedAchievements.length > 0 ? (
              <ul>
                {status.unlockedAchievements.map(achievementId => {
                  const achievement: Achievement | undefined = predefinedAchievements[achievementId];
                  return achievement ? (
                    <li key={achievementId}>
                      <strong>{achievement.name}</strong>: {achievement.description}
                    </li>
                  ) : (
                    <li key={achievementId}>未知成就 (ID: {achievementId})</li>
                  );
                })}
              </ul>
            ) : (
              <p>尚未解锁任何成就。</p>
            )}
          </div>
        </>
      ) : (
        <p>正在加载状态...</p> // Show loading indicator
      )}
    </div>
  );
};

export default TasksAchievementsTab;