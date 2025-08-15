// 首次点击测试工具
// 用于验证修复首次点击隐藏问题的效果

interface FirstClickTestResult {
  success: boolean;
  message: string;
  details: any;
}

interface FirstClickTestSuite {
  tests: Record<string, FirstClickTestResult>;
  summary: {
    total: number;
    passed: number;
    failed: number;
    success: boolean;
  };
}

// 测试初始化状态
function testInitializationState(): FirstClickTestResult {
  try {
    console.log('🧪 测试初始化状态...');
    
    // 检查window.desktopPet API是否可用
    if (!window.desktopPet?.setMousePassthrough) {
      return {
        success: false,
        message: 'desktopPet API不可用',
        details: { hasDesktopPet: !!window.desktopPet }
      };
    }

    // 检查宠物元素是否存在
    const petElement = document.querySelector('.pet') as HTMLElement;
    if (!petElement) {
      return {
        success: false,
        message: '宠物元素未找到',
        details: { selector: '.pet' }
      };
    }

    return {
      success: true,
      message: '初始化状态检查通过',
      details: {
        hasDesktopPet: true,
        hasPetElement: true,
        petElement
      }
    };

  } catch (error) {
    return {
      success: false,
      message: '初始化状态检查失败',
      details: { error: (error as Error).message }
    };
  }
}

// 测试事件监听器绑定
function testEventListeners(): FirstClickTestResult {
  try {
    console.log('🧪 测试事件监听器绑定...');
    
    const petElement = document.querySelector('.pet') as HTMLElement;
    if (!petElement) {
      return {
        success: false,
        message: '宠物元素未找到',
        details: { selector: '.pet' }
      };
    }

    // 检查React合成事件监听器
    const reactPropsKey = Object.keys(petElement).find(key => key.startsWith('__reactProps'));
    
    let hasMouseDown = false;
    let hasMouseEnter = false;
    let hasMouseLeave = false;

    if (reactPropsKey && (petElement as any)[reactPropsKey]) {
      const props = (petElement as any)[reactPropsKey];
      hasMouseDown = typeof props.onMouseDown === 'function';
      hasMouseEnter = typeof props.onMouseEnter === 'function';
      hasMouseLeave = typeof props.onMouseLeave === 'function';
    }

    if (!hasMouseDown || !hasMouseEnter || !hasMouseLeave) {
      return {
        success: false,
        message: '事件监听器绑定不完整',
        details: {
          hasMouseDown,
          hasMouseEnter,
          hasMouseLeave,
          reactPropsKey
        }
      };
    }

    return {
      success: true,
      message: '事件监听器绑定检查通过',
      details: {
        hasMouseDown,
        hasMouseEnter,
        hasMouseLeave,
        reactPropsKey
      }
    };

  } catch (error) {
    return {
      success: false,
      message: '事件监听器检查失败',
      details: { error: (error as Error).message }
    };
  }
}

// 模拟首次点击测试
function testFirstClick(): Promise<FirstClickTestResult> {
  return new Promise((resolve) => {
    try {
      console.log('🧪 测试首次点击行为...');
      
      const petElement = document.querySelector('.pet') as HTMLElement;
      if (!petElement) {
        resolve({
          success: false,
          message: '宠物元素未找到',
          details: { selector: '.pet' }
        });
        return;
      }

      // 记录初始状态
      const initialRect = petElement.getBoundingClientRect();
      const initialVisible = initialRect.width > 0 && initialRect.height > 0;
      
      console.log('初始可见状态:', initialVisible);
      console.log('初始位置:', { left: initialRect.left, top: initialRect.top });

      // 创建鼠标进入事件
      const mouseEnterEvent = new MouseEvent('mouseenter', {
        clientX: initialRect.left + initialRect.width / 2,
        clientY: initialRect.top + initialRect.height / 2,
        bubbles: true,
        cancelable: true
      });

      // 创建鼠标点击事件
      const mouseDownEvent = new MouseEvent('mousedown', {
        clientX: initialRect.left + initialRect.width / 2,
        clientY: initialRect.top + initialRect.height / 2,
        button: 0,
        bubbles: true,
        cancelable: true
      });

      const mouseUpEvent = new MouseEvent('mouseup', {
        clientX: initialRect.left + initialRect.width / 2,
        clientY: initialRect.top + initialRect.height / 2,
        button: 0,
        bubbles: true,
        cancelable: true
      });

      // 执行事件序列
      console.log('发送 mouseenter 事件...');
      petElement.dispatchEvent(mouseEnterEvent);
      
      setTimeout(() => {
        console.log('发送 mousedown 事件...');
        petElement.dispatchEvent(mouseDownEvent);
        
        setTimeout(() => {
          console.log('发送 mouseup 事件...');
          document.dispatchEvent(mouseUpEvent);
          
          setTimeout(() => {
            // 检查点击后的状态
            const finalRect = petElement.getBoundingClientRect();
            const finalVisible = finalRect.width > 0 && finalRect.height > 0;
            
            console.log('最终可见状态:', finalVisible);
            console.log('最终位置:', { left: finalRect.left, top: finalRect.top });

            if (!finalVisible) {
              resolve({
                success: false,
                message: '首次点击后宠物窗口隐藏',
                details: {
                  initialVisible,
                  finalVisible,
                  initialRect: { left: initialRect.left, top: initialRect.top, width: initialRect.width, height: initialRect.height },
                  finalRect: { left: finalRect.left, top: finalRect.top, width: finalRect.width, height: finalRect.height }
                }
              });
            } else {
              resolve({
                success: true,
                message: '首次点击测试通过',
                details: {
                  initialVisible,
                  finalVisible,
                  initialRect: { left: initialRect.left, top: initialRect.top, width: initialRect.width, height: initialRect.height },
                  finalRect: { left: finalRect.left, top: finalRect.top, width: finalRect.width, height: finalRect.height }
                }
              });
            }
          }, 200);
        }, 100);
      }, 100);

    } catch (error) {
      resolve({
        success: false,
        message: '首次点击测试失败',
        details: { error: (error as Error).message }
      });
    }
  });
}

// 运行完整的首次点击测试套件
export async function runFirstClickTests(): Promise<FirstClickTestSuite> {
  console.log('🧪 开始首次点击测试套件');
  
  const tests: Record<string, FirstClickTestResult> = {};
  
  // 运行各项测试
  tests.initialization = testInitializationState();
  tests.eventListeners = testEventListeners();
  tests.firstClick = await testFirstClick();
  
  // 计算总结
  const total = Object.keys(tests).length;
  const passed = Object.values(tests).filter(test => test.success).length;
  const failed = total - passed;
  const success = failed === 0;
  
  const summary = {
    total,
    passed,
    failed,
    success
  };
  
  // 输出结果
  console.log('📋 首次点击测试结果:');
  console.log(`总体结果: ${success ? '✅ 成功' : '❌ 失败'}`);
  
  Object.entries(tests).forEach(([testName, result]) => {
    console.log(`${result.success ? '✅' : '❌'} ${testName}`);
    console.log(`消息: ${result.message}`);
    if (result.details) {
      console.log('详情:', result.details);
    }
  });
  
  console.log(`\n📊 统计: ${passed}/${total} 通过`);
  
  return {
    tests,
    summary
  };
}

// 在全局作用域中暴露测试函数
if (typeof window !== 'undefined') {
  (window as any).runFirstClickTests = runFirstClickTests;
  console.log('🔧 首次点击测试工具已加载，在控制台中运行 runFirstClickTests() 来测试');
}
