// 窗口特效设置标签页
// 允许用户配置丝滑置顶等窗口特效

import React, { useState, useCallback } from 'react';
import { useWindowEffects } from '@/hooks/core/useWindowEffects';
import type { SmoothTopMostConfig } from '@/types/windowEffects';

const WindowEffectsTab: React.FC = () => {
  const {
    config,
    isAnimating,
    isLoading,
    error,
    smoothBringToTop,
    cancelTopMost,
    updateConfig,
    enableSmoothEffects,
    disableSmoothEffects,
    setAnimationDuration,
    setEasingFunction,
  } = useWindowEffects();

  const [testInProgress, setTestInProgress] = useState(false);

  // 测试丝滑置顶效果
  const handleTestSmoothTopMost = useCallback(async () => {
    setTestInProgress(true);
    try {
      const success = await smoothBringToTop();
      if (success) {
        console.log('丝滑置顶测试成功');
      } else {
        console.warn('丝滑置顶测试失败');
      }
    } catch (error) {
      console.error('丝滑置顶测试异常:', error);
    } finally {
      setTestInProgress(false);
    }
  }, [smoothBringToTop]);

  // 处理配置更新
  const handleConfigUpdate = useCallback(async (updates: Partial<SmoothTopMostConfig>) => {
    const success = await updateConfig(updates);
    if (!success) {
      console.warn('配置更新失败');
    }
  }, [updateConfig]);

  // 处理持续时间变化
  const handleDurationChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const duration = parseInt(event.target.value, 10);
    if (!isNaN(duration)) {
      setAnimationDuration(duration);
    }
  }, [setAnimationDuration]);

  // 处理步数变化
  const handleStepsChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const steps = parseInt(event.target.value, 10);
    if (!isNaN(steps)) {
      handleConfigUpdate({ steps });
    }
  }, [handleConfigUpdate]);

  // 处理缓动函数变化
  const handleEasingChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const easing = event.target.value as SmoothTopMostConfig['easing'];
    setEasingFunction(easing);
  }, [setEasingFunction]);

  if (!config) {
    return (
      <div className="window-effects-tab">
        <div className="loading-message">
          {isLoading ? '加载配置中...' : '配置不可用'}
        </div>
        {error && (
          <div className="error-message">
            错误: {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="window-effects-tab">
      <h3>窗口特效设置</h3>
      
      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      {/* 启用/禁用开关 */}
      <div className="setting-group">
        <label className="setting-label">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => {
              if (e.target.checked) {
                enableSmoothEffects();
              } else {
                disableSmoothEffects();
              }
            }}
            disabled={isLoading}
          />
          启用丝滑置顶效果
        </label>
        <p className="setting-description">
          启用后，点击宠物时会有平滑的置顶动画效果
        </p>
      </div>

      {/* 动画配置 */}
      {config.enabled && (
        <>
          <div className="setting-group">
            <label className="setting-label">
              动画持续时间: {config.duration}ms
            </label>
            <input
              type="range"
              min="100"
              max="2000"
              step="50"
              value={config.duration}
              onChange={handleDurationChange}
              disabled={isLoading}
              className="setting-slider"
            />
            <p className="setting-description">
              调整置顶动画的持续时间（100-2000毫秒）
            </p>
          </div>

          <div className="setting-group">
            <label className="setting-label">
              动画步数: {config.steps}
            </label>
            <input
              type="range"
              min="5"
              max="50"
              step="1"
              value={config.steps}
              onChange={handleStepsChange}
              disabled={isLoading}
              className="setting-slider"
            />
            <p className="setting-description">
              调整动画的平滑度（步数越多越平滑，但消耗更多资源）
            </p>
          </div>

          <div className="setting-group">
            <label className="setting-label">
              缓动函数
            </label>
            <select
              value={config.easing}
              onChange={handleEasingChange}
              disabled={isLoading}
              className="setting-select"
            >
              <option value="linear">线性 (Linear)</option>
              <option value="easeInOut">缓入缓出 (Ease In Out)</option>
              <option value="easeIn">缓入 (Ease In)</option>
              <option value="easeOut">缓出 (Ease Out)</option>
            </select>
            <p className="setting-description">
              选择动画的缓动效果
            </p>
          </div>
        </>
      )}

      {/* 测试按钮 */}
      <div className="setting-group">
        <button
          onClick={handleTestSmoothTopMost}
          disabled={isLoading || testInProgress || !config.enabled}
          className="test-button"
        >
          {testInProgress ? '测试中...' : '测试丝滑置顶'}
        </button>
        <p className="setting-description">
          点击测试当前配置的置顶效果
        </p>
      </div>

      {/* 状态信息 */}
      <div className="status-info">
        <div className="status-item">
          <span className="status-label">动画状态:</span>
          <span className={`status-value ${isAnimating ? 'animating' : 'idle'}`}>
            {isAnimating ? '动画中' : '空闲'}
          </span>
        </div>
        <div className="status-item">
          <span className="status-label">配置状态:</span>
          <span className={`status-value ${isLoading ? 'loading' : 'ready'}`}>
            {isLoading ? '加载中' : '就绪'}
          </span>
        </div>
      </div>

      {/* 高级选项 */}
      <details className="advanced-options">
        <summary>高级选项</summary>
        <div className="advanced-content">
          <button
            onClick={cancelTopMost}
            disabled={isLoading}
            className="cancel-button"
          >
            取消置顶
          </button>
          <p className="setting-description">
            立即取消窗口的置顶状态
          </p>
        </div>
      </details>
    </div>
  );
};

export default WindowEffectsTab;
