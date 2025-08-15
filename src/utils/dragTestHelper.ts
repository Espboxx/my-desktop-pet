/**
 * 拖拽功能测试辅助工具
 * 用于验证拖拽功能是否正常工作
 */

interface DragTestResult {
  success: boolean;
  message: string;
  details?: any;
}

/**
 * 测试拖拽功能是否正常工作
 */
export function testDragFunctionality(): DragTestResult {
  try {
    // 检查必要的DOM元素
    const petElement = document.querySelector('.pet') as HTMLElement;
    if (!petElement) {
      return {
        success: false,
        message: '未找到宠物元素',
        details: { selector: '.pet' }
      };
    }

    // 检查React合成事件监听器
    // React使用合成事件系统，需要检查React内部的事件监听器
    const reactFiberKey = Object.keys(petElement).find(key => key.startsWith('__reactFiber'));
    const reactPropsKey = Object.keys(petElement).find(key => key.startsWith('__reactProps'));

    let hasMouseDown = false;
    let hasMouseMove = false;
    let hasMouseUp = false;

    // 检查React props中的事件处理器
    if (reactPropsKey && (petElement as any)[reactPropsKey]) {
      const props = (petElement as any)[reactPropsKey];
      hasMouseDown = typeof props.onMouseDown === 'function';
      hasMouseMove = typeof props.onMouseMove === 'function';
      hasMouseUp = typeof props.onMouseUp === 'function';
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

    if (!hasMouseDown) {
      return {
        success: false,
        message: '缺少mousedown事件监听器',
        details: {
          element: petElement,
          reactFiberKey,
          reactPropsKey,
          hasReactProps: !!reactPropsKey
        }
      };
    }

    // 检查位置样式
    const computedStyle = window.getComputedStyle(petElement);
    const position = computedStyle.position;
    const left = computedStyle.left;
    const top = computedStyle.top;

    if (position !== 'absolute') {
      return {
        success: false,
        message: '宠物元素位置样式不正确',
        details: { position, expected: 'absolute' }
      };
    }

    // 检查是否有有效的位置值
    if (!left || !top || left === 'auto' || top === 'auto') {
      return {
        success: false,
        message: '宠物元素位置值无效',
        details: { left, top }
      };
    }

    return {
      success: true,
      message: '拖拽功能基础检查通过',
      details: {
        element: petElement,
        position,
        left,
        top,
        hasMouseDown,
        hasMouseMove,
        hasMouseUp,
        reactFiberKey,
        reactPropsKey,
        hasReactProps: !!reactPropsKey
      }
    };

  } catch (error) {
    return {
      success: false,
      message: '拖拽功能测试出错',
      details: { error: error instanceof Error ? error.message : String(error) }
    };
  }
}

/**
 * 模拟拖拽操作
 */
export function simulateDrag(
  startX: number,
  startY: number,
  endX: number,
  endY: number
): Promise<DragTestResult> {
  return new Promise((resolve) => {
    try {
      const petElement = document.querySelector('.pet') as HTMLElement;
      if (!petElement) {
        resolve({
          success: false,
          message: '未找到宠物元素进行拖拽测试'
        });
        return;
      }

      // 记录初始位置
      const initialRect = petElement.getBoundingClientRect();
      const initialX = initialRect.left + initialRect.width / 2;
      const initialY = initialRect.top + initialRect.height / 2;

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
      petElement.dispatchEvent(mouseDownEvent);
      
      setTimeout(() => {
        document.dispatchEvent(mouseMoveEvent);
        
        setTimeout(() => {
          document.dispatchEvent(mouseUpEvent);
          
          // 检查位置是否改变
          setTimeout(() => {
            const finalRect = petElement.getBoundingClientRect();
            const finalX = finalRect.left + finalRect.width / 2;
            const finalY = finalRect.top + finalRect.height / 2;
            
            const deltaX = Math.abs(finalX - initialX);
            const deltaY = Math.abs(finalY - initialY);
            const moved = deltaX > 5 || deltaY > 5; // 至少移动5px
            
            resolve({
              success: moved,
              message: moved ? '拖拽测试成功' : '拖拽测试失败：位置未改变',
              details: {
                initial: { x: initialX, y: initialY },
                final: { x: finalX, y: finalY },
                delta: { x: deltaX, y: deltaY },
                moved
              }
            });
          }, 100);
        }, 50);
      }, 50);

    } catch (error) {
      resolve({
        success: false,
        message: '拖拽模拟测试出错',
        details: { error: error instanceof Error ? error.message : String(error) }
      });
    }
  });
}

/**
 * 检查全局事件监听器
 */
export function checkGlobalEventListeners(): DragTestResult {
  try {
    // 这个函数检查是否有全局鼠标事件监听器
    // 注意：由于安全限制，我们无法直接检查已添加的监听器
    // 但我们可以检查相关的状态和元素

    const petElement = document.querySelector('.pet') as HTMLElement;
    if (!petElement) {
      return {
        success: false,
        message: '未找到宠物元素'
      };
    }

    // 检查是否有拖拽相关的类或属性
    const isDragging = petElement.classList.contains('dragging') || 
                      petElement.style.cursor === 'grabbing' ||
                      petElement.style.cursor === 'grab';

    return {
      success: true,
      message: '全局事件监听器检查完成',
      details: {
        petElement: !!petElement,
        hasDragCursor: isDragging,
        cursor: petElement.style.cursor
      }
    };

  } catch (error) {
    return {
      success: false,
      message: '全局事件监听器检查出错',
      details: { error: error instanceof Error ? error.message : String(error) }
    };
  }
}

/**
 * 运行完整的拖拽测试套件
 */
export async function runDragTestSuite(): Promise<{
  overall: boolean;
  tests: Record<string, DragTestResult>;
}> {
  const tests: Record<string, DragTestResult> = {};

  // 基础功能测试
  tests.basicFunctionality = testDragFunctionality();

  // 全局事件监听器测试
  tests.globalListeners = checkGlobalEventListeners();

  // 模拟拖拽测试
  tests.simulatedDrag = await simulateDrag(100, 100, 200, 200);

  // 计算总体结果
  const overall = Object.values(tests).every(test => test.success);

  return { overall, tests };
}

/**
 * 在控制台中显示测试结果
 */
export function logTestResults(results: { overall: boolean; tests: Record<string, DragTestResult> }): void {
  console.group('🧪 拖拽功能测试结果');
  
  console.log(`总体结果: ${results.overall ? '✅ 通过' : '❌ 失败'}`);
  
  Object.entries(results.tests).forEach(([testName, result]) => {
    console.group(`${result.success ? '✅' : '❌'} ${testName}`);
    console.log('消息:', result.message);
    if (result.details) {
      console.log('详情:', result.details);
    }
    console.groupEnd();
  });
  
  console.groupEnd();
}

/**
 * 自动运行测试（开发环境）
 */
export function autoRunDragTests(): void {
  if (process.env.NODE_ENV === 'development') {
    // 等待组件加载完成后运行测试
    setTimeout(async () => {
      const results = await runDragTestSuite();
      logTestResults(results);
      
      if (!results.overall) {
        console.warn('⚠️ 拖拽功能测试失败，请检查实现');
      }
    }, 2000); // 2秒后运行测试
  }
}
