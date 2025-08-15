// 手动拖拽测试工具
// 可以在开发者控制台中运行

export function runManualDragTest() {
  console.log('🧪 开始手动拖拽测试');
  
  // 查找宠物元素
  const petElement = document.querySelector('.pet') as HTMLElement;
  if (!petElement) {
    console.error('❌ 未找到宠物元素');
    return;
  }

  console.log('✅ 找到宠物元素:', petElement);

  // 检查React合成事件监听器
  const reactFiberKey = Object.keys(petElement).find(key => key.startsWith('__reactFiber'));
  const reactPropsKey = Object.keys(petElement).find(key => key.startsWith('__reactProps'));
  
  console.log('React Fiber Key:', reactFiberKey);
  console.log('React Props Key:', reactPropsKey);
  
  let hasMouseDown = false;
  let hasMouseMove = false;
  let hasMouseUp = false;

  // 检查React props中的事件处理器
  if (reactPropsKey && (petElement as any)[reactPropsKey]) {
    const props = (petElement as any)[reactPropsKey];
    hasMouseDown = typeof props.onMouseDown === 'function';
    hasMouseMove = typeof props.onMouseMove === 'function';
    hasMouseUp = typeof props.onMouseUp === 'function';
    
    console.log('React Props检测结果:');
    console.log('  onMouseDown:', hasMouseDown);
    console.log('  onMouseMove:', hasMouseMove);
    console.log('  onMouseUp:', hasMouseUp);
  }

  // 如果React props检查失败，尝试检查原生事件监听器
  if (!hasMouseDown) {
    hasMouseDown = petElement.onmousedown !== null;
  }
  if (!hasMouseMove) {
    hasMouseMove = petElement.onmousemove !== null;
  }
  if (!hasMouseUp) {
    hasMouseUp = petElement.onmouseup !== null;
  }

  console.log('最终检测结果:');
  console.log('  hasMouseDown:', hasMouseDown);
  console.log('  hasMouseMove:', hasMouseMove);
  console.log('  hasMouseUp:', hasMouseUp);

  // 测试结果
  const testResult = {
    basicFunctionality: {
      success: hasMouseDown,
      message: hasMouseDown ? '拖拽功能基础检查通过' : '缺少mousedown事件监听器',
      details: {
        element: petElement,
        hasMouseDown,
        hasMouseMove,
        hasMouseUp,
        reactFiberKey,
        reactPropsKey,
        hasReactProps: !!reactPropsKey
      }
    }
  };

  console.log('📋 测试结果:');
  console.log('basicFunctionality:', testResult.basicFunctionality.success ? '✅ 成功' : '❌ 失败');
  console.log('消息:', testResult.basicFunctionality.message);
  console.log('详情:', testResult.basicFunctionality.details);

  // 模拟拖拽测试
  if (hasMouseDown) {
    console.log('🎯 开始模拟拖拽测试...');
    
    const rect = petElement.getBoundingClientRect();
    const startX = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2;
    const endX = startX + 50;
    const endY = startY + 50;

    // 创建鼠标事件
    const mouseDownEvent = new MouseEvent('mousedown', {
      clientX: startX,
      clientY: startY,
      button: 0,
      bubbles: true,
      cancelable: true
    });

    const mouseMoveEvent = new MouseEvent('mousemove', {
      clientX: endX,
      clientY: endY,
      button: 0,
      bubbles: true,
      cancelable: true
    });

    const mouseUpEvent = new MouseEvent('mouseup', {
      clientX: endX,
      clientY: endY,
      button: 0,
      bubbles: true,
      cancelable: true
    });

    // 执行拖拽序列
    console.log('发送 mousedown 事件...');
    petElement.dispatchEvent(mouseDownEvent);
    
    setTimeout(() => {
      console.log('发送 mousemove 事件...');
      document.dispatchEvent(mouseMoveEvent);
      
      setTimeout(() => {
        console.log('发送 mouseup 事件...');
        document.dispatchEvent(mouseUpEvent);
        console.log('✅ 拖拽测试完成');
      }, 100);
    }, 100);
  }

  return testResult;
}

// 在全局作用域中暴露测试函数
if (typeof window !== 'undefined') {
  (window as any).runManualDragTest = runManualDragTest;
  console.log('🔧 手动拖拽测试工具已加载，在控制台中运行 runManualDragTest() 来测试');
}
