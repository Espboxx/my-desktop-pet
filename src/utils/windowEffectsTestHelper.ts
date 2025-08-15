// 窗口特效测试工具
// 用于测试丝滑置顶等窗口特效功能

interface WindowEffectsTestResult {
  success: boolean;
  message: string;
  details: any;
}

interface WindowEffectsTestSuite {
  tests: Record<string, WindowEffectsTestResult>;
  summary: {
    total: number;
    passed: number;
    failed: number;
    success: boolean;
  };
}

// 测试API可用性
function testAPIAvailability(): WindowEffectsTestResult {
  try {
    console.log('🧪 测试窗口特效API可用性...');
    
    const requiredAPIs = [
      'smoothBringToTop',
      'cancelTopMost',
      'getWindowEffectsConfig',
      'updateWindowEffectsConfig',
      'isWindowAnimating'
    ];

    const missingAPIs: string[] = [];
    
    for (const api of requiredAPIs) {
      if (!window.desktopPet?.[api as keyof typeof window.desktopPet]) {
        missingAPIs.push(api);
      }
    }

    if (missingAPIs.length > 0) {
      return {
        success: false,
        message: `缺少API: ${missingAPIs.join(', ')}`,
        details: { missingAPIs, availableAPIs: Object.keys(window.desktopPet || {}) }
      };
    }

    return {
      success: true,
      message: '所有窗口特效API都可用',
      details: { availableAPIs: requiredAPIs }
    };

  } catch (error) {
    return {
      success: false,
      message: 'API可用性检查失败',
      details: { error: (error as Error).message }
    };
  }
}

// 测试配置获取和更新
async function testConfigManagement(): Promise<WindowEffectsTestResult> {
  try {
    console.log('🧪 测试配置管理...');
    
    if (!window.desktopPet?.getWindowEffectsConfig) {
      return {
        success: false,
        message: '配置管理API不可用',
        details: {}
      };
    }

    // 获取当前配置
    const configResponse = await window.desktopPet.getWindowEffectsConfig();
    if (!configResponse.success) {
      return {
        success: false,
        message: '获取配置失败',
        details: { error: configResponse.error }
      };
    }

    const originalConfig = configResponse.config;
    console.log('原始配置:', originalConfig);

    // 测试配置更新
    const testConfig = {
      duration: 500,
      easing: 'easeIn' as const
    };

    const updateResponse = await window.desktopPet.updateWindowEffectsConfig(testConfig);
    if (!updateResponse.success) {
      return {
        success: false,
        message: '更新配置失败',
        details: { error: updateResponse.error }
      };
    }

    console.log('更新后配置:', updateResponse.config);

    // 恢复原始配置
    if (originalConfig) {
      await window.desktopPet.updateWindowEffectsConfig(originalConfig);
    }

    return {
      success: true,
      message: '配置管理测试通过',
      details: { originalConfig, testConfig, updatedConfig: updateResponse.config }
    };

  } catch (error) {
    return {
      success: false,
      message: '配置管理测试失败',
      details: { error: (error as Error).message }
    };
  }
}

// 测试动画状态检查
async function testAnimationStatus(): Promise<WindowEffectsTestResult> {
  try {
    console.log('🧪 测试动画状态检查...');
    
    if (!window.desktopPet?.isWindowAnimating) {
      return {
        success: false,
        message: '动画状态API不可用',
        details: {}
      };
    }

    const statusResponse = await window.desktopPet.isWindowAnimating();
    if (!statusResponse.success) {
      return {
        success: false,
        message: '获取动画状态失败',
        details: { error: statusResponse.error }
      };
    }

    console.log('当前动画状态:', statusResponse.isAnimating);

    return {
      success: true,
      message: '动画状态检查通过',
      details: { isAnimating: statusResponse.isAnimating }
    };

  } catch (error) {
    return {
      success: false,
      message: '动画状态检查失败',
      details: { error: (error as Error).message }
    };
  }
}

// 测试丝滑置顶功能
async function testSmoothBringToTop(): Promise<WindowEffectsTestResult> {
  try {
    console.log('🧪 测试丝滑置顶功能...');
    
    if (!window.desktopPet?.smoothBringToTop) {
      return {
        success: false,
        message: '丝滑置顶API不可用',
        details: {}
      };
    }

    // 记录开始时间
    const startTime = Date.now();
    
    // 执行丝滑置顶
    console.log('开始执行丝滑置顶...');
    const response = await window.desktopPet.smoothBringToTop();
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`丝滑置顶完成，耗时: ${duration}ms`);

    if (!response.success) {
      return {
        success: false,
        message: '丝滑置顶执行失败',
        details: { error: response.error, duration }
      };
    }

    return {
      success: true,
      message: '丝滑置顶测试通过',
      details: { duration, response }
    };

  } catch (error) {
    return {
      success: false,
      message: '丝滑置顶测试失败',
      details: { error: (error as Error).message }
    };
  }
}

// 测试取消置顶功能
async function testCancelTopMost(): Promise<WindowEffectsTestResult> {
  try {
    console.log('🧪 测试取消置顶功能...');
    
    if (!window.desktopPet?.cancelTopMost) {
      return {
        success: false,
        message: '取消置顶API不可用',
        details: {}
      };
    }

    const response = await window.desktopPet.cancelTopMost();
    
    if (!response.success) {
      return {
        success: false,
        message: '取消置顶执行失败',
        details: { error: response.error }
      };
    }

    return {
      success: true,
      message: '取消置顶测试通过',
      details: { response }
    };

  } catch (error) {
    return {
      success: false,
      message: '取消置顶测试失败',
      details: { error: (error as Error).message }
    };
  }
}

// 运行完整的窗口特效测试套件
export async function runWindowEffectsTests(): Promise<WindowEffectsTestSuite> {
  console.log('🧪 开始窗口特效测试套件');
  
  const tests: Record<string, WindowEffectsTestResult> = {};
  
  // 运行各项测试
  tests.apiAvailability = testAPIAvailability();
  tests.configManagement = await testConfigManagement();
  tests.animationStatus = await testAnimationStatus();
  tests.smoothBringToTop = await testSmoothBringToTop();
  tests.cancelTopMost = await testCancelTopMost();
  
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
  console.log('📋 窗口特效测试结果:');
  console.log(`总体结果: ${success ? '✅ 成功' : '❌ 失败'}`);
  
  Object.entries(tests).forEach(([testName, result]) => {
    console.log(`${result.success ? '✅' : '❌'} ${testName}`);
    console.log(`消息: ${result.message}`);
    if (result.details && Object.keys(result.details).length > 0) {
      console.log('详情:', result.details);
    }
  });
  
  console.log(`\n📊 统计: ${passed}/${total} 通过`);
  
  if (success) {
    console.log('\n🎉 所有窗口特效测试通过！');
    console.log('💡 提示: 可以在设置中调整窗口特效参数');
  } else {
    console.log('\n⚠️ 部分测试失败，请检查相关功能');
  }
  
  return {
    tests,
    summary
  };
}

// 在全局作用域中暴露测试函数
if (typeof window !== 'undefined') {
  (window as any).runWindowEffectsTests = runWindowEffectsTests;
  console.log('🔧 窗口特效测试工具已加载，在控制台中运行 runWindowEffectsTests() 来测试');
}
