import React, { useState, useEffect } from 'react';
import { useHapticFeedback } from '../hooks/interaction/useHapticFeedback';
import { getUserActivationManager } from '../services/userActivation/UserActivationManager';

/**
 * 触觉反馈测试组件
 * 用于测试和验证用户激活管理器和触觉反馈功能
 */
const HapticFeedbackTest: React.FC = () => {
  const [activationInfo, setActivationInfo] = useState<any>(null);
  const [testResults, setTestResults] = useState<string[]>([]);
  
  const hapticFeedback = useHapticFeedback({
    enabled: true,
    debugMode: true,
    fallbackBehavior: 'log'
  });

  const userActivationManager = getUserActivationManager({ debugMode: true });

  // 更新激活信息
  const updateActivationInfo = () => {
    const info = userActivationManager.getActivationInfo();
    setActivationInfo(info);
  };

  useEffect(() => {
    updateActivationInfo();
    
    // 监听用户交互
    const unsubscribe = userActivationManager.onUserInteraction(() => {
      updateActivationInfo();
      addTestResult('用户交互检测到，触觉反馈已激活');
    });

    return unsubscribe;
  }, [userActivationManager]);

  const addTestResult = (result: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults(prev => [...prev.slice(-9), `${timestamp}: ${result}`]);
  };

  const testVibration = (pattern: number | number[], name: string) => {
    const success = hapticFeedback.vibrate(pattern);
    addTestResult(`${name}: ${success ? '成功' : '失败'}`);
  };

  const testUserActivationManager = () => {
    const success = userActivationManager.tryVibrate([100, 50, 100]);
    addTestResult(`用户激活管理器振动测试: ${success ? '成功' : '失败'}`);
  };

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      left: '10px',
      background: 'rgba(0, 0, 0, 0.9)',
      color: 'white',
      padding: '20px',
      borderRadius: '8px',
      fontSize: '12px',
      maxWidth: '400px',
      zIndex: 10000,
      fontFamily: 'monospace'
    }}>
      <h3>触觉反馈测试面板</h3>
      
      {/* 激活状态信息 */}
      <div style={{ marginBottom: '15px' }}>
        <h4>用户激活状态:</h4>
        {activationInfo && (
          <div>
            <div>已交互: {activationInfo.hasInteracted ? '是' : '否'}</div>
            <div>可使用API: {activationInfo.canUseAPIs ? '是' : '否'}</div>
            <div>Electron环境: {activationInfo.isElectron ? '是' : '否'}</div>
            <div>支持振动: {activationInfo.supportsVibration ? '是' : '否'}</div>
            <div>交互次数: {activationInfo.interactionCount}</div>
            {activationInfo.electronInfo && (
              <div>
                <div>Electron版本: {activationInfo.electronInfo.electronVersion || 'N/A'}</div>
                <div>平台: {activationInfo.electronInfo.platform}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 测试按钮 */}
      <div style={{ marginBottom: '15px' }}>
        <h4>测试按钮:</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
          <button onClick={() => testVibration(10, '轻击')}>轻击</button>
          <button onClick={() => testVibration([10, 50, 10], '双击')}>双击</button>
          <button onClick={() => testVibration(50, '长按')}>长按</button>
          <button onClick={() => hapticFeedback.patterns.success()}>成功</button>
          <button onClick={() => hapticFeedback.patterns.error()}>错误</button>
          <button onClick={() => testUserActivationManager()}>管理器测试</button>
          <button onClick={() => hapticFeedback.testFeedback()}>完整测试</button>
          <button onClick={updateActivationInfo}>刷新状态</button>
        </div>
      </div>

      {/* 测试结果 */}
      <div>
        <h4>测试结果:</h4>
        <div style={{ 
          maxHeight: '150px', 
          overflowY: 'auto',
          background: 'rgba(255, 255, 255, 0.1)',
          padding: '5px',
          borderRadius: '4px'
        }}>
          {testResults.map((result, index) => (
            <div key={index} style={{ marginBottom: '2px' }}>
              {result}
            </div>
          ))}
          {testResults.length === 0 && (
            <div style={{ color: '#888' }}>暂无测试结果</div>
          )}
        </div>
      </div>

      {/* 说明 */}
      <div style={{ marginTop: '10px', fontSize: '10px', color: '#ccc' }}>
        <div>• 在现代浏览器中，首次点击后触觉反馈才会生效</div>
        <div>• 在Electron环境中，触觉反馈策略可能不同</div>
        <div>• 桌面设备通常不支持振动功能</div>
      </div>
    </div>
  );
};

export default HapticFeedbackTest;
