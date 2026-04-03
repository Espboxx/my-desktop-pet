import React, { useState } from 'react';
import { useHapticFeedback } from '@/hooks/interaction/useHapticFeedback';
import { useInteractionFeedback } from '@/hooks/interaction/useInteractionFeedback';
import { useSmoothMovement } from '@/hooks/animation/useSmoothMovement';

/**
 * 交互测试组件
 * 用于测试和演示新的交互功能
 */
const InteractionTest: React.FC = () => {
  const [testResults, setTestResults] = useState<string[]>([]);
  
  // 触觉反馈测试
  const hapticFeedback = useHapticFeedback({
    enabled: true,
    cooldownMs: 100
  });
  
  // 交互反馈测试
  const {
    interactionState,
    handlers: feedbackHandlers,
    getInteractionStyles
  } = useInteractionFeedback({
    hoverDelay: 50,
    clickFeedbackDuration: 150,
    enableHapticFeedback: true,
    smoothTransitions: true
  });
  
  // 平滑移动测试
  const smoothMovement = useSmoothMovement(
    { x: 200, y: 200 },
    {
      friction: 0.85,
      springStrength: 0.15,
      maxSpeed: 500,
      enableInertia: true,
      enableBounce: true
    }
  );

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const testHapticPatterns = () => {
    const patterns = [
      { name: '轻触', action: () => hapticFeedback.patterns.tap() },
      { name: '点击', action: () => hapticFeedback.patterns.click() },
      { name: '成功', action: () => hapticFeedback.patterns.success() },
      { name: '错误', action: () => hapticFeedback.patterns.error() },
      { name: '心跳', action: () => hapticFeedback.patterns.heartbeat() }
    ];

    patterns.forEach((pattern, index) => {
      setTimeout(() => {
        pattern.action();
        addTestResult(`触觉反馈: ${pattern.name}`);
      }, index * 500);
    });
  };

  const testSmoothMovement = () => {
    const positions = [
      { x: 100, y: 100 },
      { x: 300, y: 150 },
      { x: 250, y: 300 },
      { x: 150, y: 250 },
      { x: 200, y: 200 }
    ];

    positions.forEach((pos, index) => {
      setTimeout(() => {
        smoothMovement.setTargetPosition(pos);
        addTestResult(`移动到: (${pos.x}, ${pos.y})`);
      }, index * 1000);
    });
  };

  const testInteractionFeedback = () => {
    addTestResult('交互反馈测试开始');
    addTestResult(`悬停状态: ${interactionState.isHovering}`);
    addTestResult(`按压状态: ${interactionState.isPressed}`);
    addTestResult(`拖拽状态: ${interactionState.isDragging}`);
    addTestResult(`交互强度: ${interactionState.interactionIntensity.toFixed(2)}`);
  };

  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh',
      color: 'white'
    }}>
      <h1>🎮 交互功能测试面板</h1>
      
      {/* 控制面板 */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '20px',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        <h2>🎯 测试控制</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={testHapticPatterns}
            style={{
              background: 'linear-gradient(135deg, #ff6b6b, #ee5a24)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              padding: '10px 20px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            测试触觉反馈
          </button>
          
          <button
            onClick={testSmoothMovement}
            style={{
              background: 'linear-gradient(135deg, #4ecdc4, #44a08d)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              padding: '10px 20px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            测试平滑移动
          </button>
          
          <button
            onClick={testInteractionFeedback}
            style={{
              background: 'linear-gradient(135deg, #a8edea, #fed6e3)',
              border: 'none',
              borderRadius: '8px',
              color: '#333',
              padding: '10px 20px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            测试交互反馈
          </button>
          
          <button
            onClick={() => setTestResults([])}
            style={{
              background: 'linear-gradient(135deg, #ffeaa7, #fab1a0)',
              border: 'none',
              borderRadius: '8px',
              color: '#333',
              padding: '10px 20px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            清除日志
          </button>
        </div>
      </div>

      {/* 交互测试区域 */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '20px',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        position: 'relative',
        height: '400px'
      }}>
        <h2>🎨 交互测试区域</h2>
        
        {/* 交互反馈测试元素 */}
        <div
          {...feedbackHandlers}
          style={{
            ...getInteractionStyles(),
            position: 'absolute',
            top: '60px',
            left: '50px',
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #ff9a9e, #fecfef)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            userSelect: 'none',
            fontWeight: 'bold',
            color: '#333'
          }}
        >
          交互
        </div>

        {/* 平滑移动测试元素 */}
        <div
          style={{
            position: 'absolute',
            left: `${smoothMovement.position.x}px`,
            top: `${smoothMovement.position.y}px`,
            width: '60px',
            height: '60px',
            background: 'linear-gradient(135deg, #a8edea, #fed6e3)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: 'translate(-50%, -50%)',
            fontWeight: 'bold',
            color: '#333',
            fontSize: '12px',
            transition: smoothMovement.isMoving ? 'none' : 'all 0.3s ease'
          }}
        >
          移动
        </div>
      </div>

      {/* 状态显示 */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '20px',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        <h2>📊 实时状态</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <div>
            <h3>触觉反馈</h3>
            <p>支持状态: {hapticFeedback.isSupported() ? '✅ 支持' : '❌ 不支持'}</p>
            <p>启用状态: {hapticFeedback.getStatus().isEnabled ? '✅ 启用' : '❌ 禁用'}</p>
            <p>振动状态: {hapticFeedback.isVibrating ? '🔄 振动中' : '⏸️ 静止'}</p>
          </div>
          
          <div>
            <h3>交互反馈</h3>
            <p>悬停: {interactionState.isHovering ? '✅' : '❌'}</p>
            <p>按压: {interactionState.isPressed ? '✅' : '❌'}</p>
            <p>拖拽: {interactionState.isDragging ? '✅' : '❌'}</p>
            <p>强度: {(interactionState.interactionIntensity * 100).toFixed(0)}%</p>
          </div>
          
          <div>
            <h3>平滑移动</h3>
            <p>位置: ({smoothMovement.position.x.toFixed(0)}, {smoothMovement.position.y.toFixed(0)})</p>
            <p>移动中: {smoothMovement.isMoving ? '✅' : '❌'}</p>
            <p>速度: {smoothMovement.getMovementInfo().speed.toFixed(1)} px/s</p>
          </div>
        </div>
      </div>

      {/* 测试日志 */}
      <div style={{
        background: 'rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        padding: '20px',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        <h2>📝 测试日志</h2>
        <div style={{
          background: 'rgba(0, 0, 0, 0.5)',
          borderRadius: '8px',
          padding: '15px',
          fontFamily: 'monospace',
          fontSize: '14px',
          maxHeight: '200px',
          overflowY: 'auto'
        }}>
          {testResults.length === 0 ? (
            <p style={{ color: '#888' }}>暂无测试日志...</p>
          ) : (
            testResults.map((result, index) => (
              <div key={index} style={{ marginBottom: '5px' }}>
                {result}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default InteractionTest;
