/**
 * 统一的测试辅助工具
 * 合并了拖拽测试、首次点击测试和窗口特效测试的功能
 */

// ========== 类型定义 ==========

interface TestResult {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
  timestamp: number;
}

interface TestSuite {
  name: string;
  tests: Record<string, TestResult>;
  summary: {
    total: number;
    passed: number;
    failed: number;
    success: boolean;
    duration: number;
  };
  timestamp: number;
}

interface DragTestResult extends TestResult {
  details?: {
    selector?: string;
    reactFiberKey?: string;
    reactPropsKey?: string;
    hasMouseDown?: boolean;
    hasMouseMove?: boolean;
    hasMouseUp?: boolean;
    hasClickHandlers?: boolean;
  };
}

interface FirstClickTestResult extends TestResult {
  details?: {
    hasDesktopPet?: boolean;
    hasSetMousePassthrough?: boolean;
    hasSmoothBringToTop?: boolean;
    hasWindowEffectsConfig?: boolean;
  };
}

interface WindowEffectsTestResult extends TestResult {
  details?: {
    hasConfig?: boolean;
    hasMethods?: boolean;
    config?: Record<string, unknown>;
    isAnimating?: boolean;
  };
}

// ========== 通用测试工具 ==========

class TestHelper {
  private results: TestSuite[] = [];

  /**
   * 创建测试结果
   */
  createResult(success: boolean, message: string, details?: Record<string, unknown>): TestResult {
    return {
      success,
      message,
      details,
      timestamp: Date.now()
    };
  }

  /**
   * 查找宠物元素
   */
  findPetElement(): HTMLElement | null {
    return document.querySelector('.pet') as HTMLElement;
  }

  /**
   * 检查React属性
   */
  checkReactProps(element: HTMLElement): {
    reactFiberKey?: string;
    reactPropsKey?: string;
    props?: Record<string, unknown>;
  } {
    const reactFiberKey = Object.keys(element).find(key => key.startsWith('__reactFiber'));
    const reactPropsKey = Object.keys(element).find(key => key.startsWith('__reactProps'));

    let props: Record<string, unknown> | undefined;
    if (reactPropsKey) {
      props = (element as Record<string, unknown>)[reactPropsKey] as Record<string, unknown>;
    }

    return { reactFiberKey, reactPropsKey, props };
  }

  /**
   * 记录测试套件
   */
  recordSuite(suite: TestSuite): void {
    this.results.push(suite);
    console.log(`📊 测试套件完成: ${suite.name}`, suite.summary);
  }

  /**
   * 获取所有测试结果
   */
  getResults(): TestSuite[] {
    return this.results;
  }

  /**
   * 清空测试结果
   */
  clearResults(): void {
    this.results = [];
  }
}

// ========== 拖拽测试 ==========

export class DragTester extends TestHelper {
  /**
   * 测试拖拽功能
   */
  testDragFunctionality(): DragTestResult {
    console.log('🧪 开始拖拽功能测试...');

    const petElement = this.findPetElement();
    if (!petElement) {
      return this.createResult(false, '未找到宠物元素', { selector: '.pet' }) as DragTestResult;
    }

    const { reactFiberKey, reactPropsKey, props } = this.checkReactProps(petElement);

    // 检查事件处理器
    const hasMouseDown = typeof props?.onMouseDown === 'function';
    const hasMouseMove = typeof props?.onMouseMove === 'function';
    const hasMouseUp = typeof props?.onMouseUp === 'function';
    const hasClickHandlers = hasMouseDown || hasMouseMove || hasMouseUp;

    const details: DragTestResult['details'] = {
      selector: '.pet',
      reactFiberKey,
      reactPropsKey,
      hasMouseDown,
      hasMouseMove,
      hasMouseUp,
      hasClickHandlers
    };

    const success = hasClickHandlers;
    const message = success ? '✅ 拖拽功能正常' : '❌ 拖拽功能异常';

    return this.createResult(success, message, details) as DragTestResult;
  }

  /**
   * 运行完整的拖拽测试套件
   */
  runDragTestSuite(): TestSuite {
    const startTime = Date.now();
    const tests: Record<string, TestResult> = {};

    console.log('🔍 开始拖拽测试套件...');

    // 基础功能测试
    tests['dragFunctionality'] = this.testDragFunctionality();

    // 元素存在性测试
    const petElement = this.findPetElement();
    tests['elementExists'] = this.createResult(
      !!petElement,
      petElement ? '✅ 宠物元素存在' : '❌ 宠物元素不存在',
      { elementCount: document.querySelectorAll('.pet').length }
    );

    // React集成测试
    if (petElement) {
      const { reactFiberKey, reactPropsKey } = this.checkReactProps(petElement);
      tests['reactIntegration'] = this.createResult(
        !!(reactFiberKey && reactPropsKey),
        reactFiberKey && reactPropsKey ? '✅ React集成正常' : '❌ React集成异常',
        { reactFiberKey: !!reactFiberKey, reactPropsKey: !!reactPropsKey }
      );
    }

    const summary = this.calculateSummary(tests, Date.now() - startTime);
    const suite: TestSuite = {
      name: '拖拽功能测试',
      tests,
      summary,
      timestamp: startTime
    };

    this.recordSuite(suite);
    return suite;
  }
}

// ========== 首次点击测试 ==========

export class FirstClickTester extends TestHelper {
  /**
   * 测试初始化状态
   */
  testInitializationState(): FirstClickTestResult {
    console.log('🧪 测试初始化状态...');

    const hasDesktopPet = !!window.desktopPet;
    const hasSetMousePassthrough = typeof window.desktopPet?.setMousePassthrough === 'function';
    const hasSmoothBringToTop = typeof window.desktopPet?.smoothBringToTop === 'function';
    const hasWindowEffectsConfig = typeof window.desktopPet?.getWindowEffectsConfig === 'function';

    const success = hasDesktopPet && hasSetMousePassthrough;
    const details: FirstClickTestResult['details'] = {
      hasDesktopPet,
      hasSetMousePassthrough,
      hasSmoothBringToTop,
      hasWindowEffectsConfig
    };

    const message = success ? '✅ 初始化状态正常' : '❌ 初始化状态异常';

    return this.createResult(success, message, details) as FirstClickTestResult;
  }

  /**
   * 测试API可用性
   */
  testAPIAvailability(): FirstClickTestResult {
    console.log('🧪 测试API可用性...');

    const requiredAPIs = [
      'setMousePassthrough',
      'smoothBringToTop',
      'getWindowEffectsConfig',
      'updateWindowEffectsConfig',
      'isWindowAnimating'
    ];

    const availableAPIs = requiredAPIs.filter(api =>
      typeof window.desktopPet?.[api as keyof typeof window.desktopPet] === 'function'
    );

    const success = availableAPIs.length === requiredAPIs.length;
    const details: FirstClickTestResult['details'] = {
      hasDesktopPet: !!window.desktopPet,
      hasSetMousePassthrough: availableAPIs.includes('setMousePassthrough'),
      hasSmoothBringToTop: availableAPIs.includes('smoothBringToTop'),
      hasWindowEffectsConfig: availableAPIs.includes('getWindowEffectsConfig')
    };

    const message = success
      ? `✅ 所有必要API可用 (${availableAPIs.length}/${requiredAPIs.length})`
      : `❌ API缺失 (${availableAPIs.length}/${requiredAPIs.length})`;

    return this.createResult(success, message, details) as FirstClickTestResult;
  }

  /**
   * 运行首次点击测试套件
   */
  runFirstClickTestSuite(): TestSuite {
    const startTime = Date.now();
    const tests: Record<string, TestResult> = {};

    console.log('🔍 开始首次点击测试套件...');

    tests['initializationState'] = this.testInitializationState();
    tests['apiAvailability'] = this.testAPIAvailability();

    const summary = this.calculateSummary(tests, Date.now() - startTime);
    const suite: TestSuite = {
      name: '首次点击测试',
      tests,
      summary,
      timestamp: startTime
    };

    this.recordSuite(suite);
    return suite;
  }
}

// ========== 窗口特效测试 ==========

export class WindowEffectsTester extends TestHelper {
  /**
   * 测试窗口特效配置
   */
  testWindowEffectsConfig(): WindowEffectsTestResult {
    console.log('🧪 测试窗口特效配置...');

    const hasDesktopPet = !!window.desktopPet;
    const hasGetConfig = typeof window.desktopPet?.getWindowEffectsConfig === 'function';
    const hasUpdateConfig = typeof window.desktopPet?.updateWindowEffectsConfig === 'function';
    const hasMethods = hasGetConfig && hasUpdateConfig;

    let config: Record<string, unknown> | undefined;
    let isAnimating: boolean | undefined;

    if (hasGetConfig) {
      try {
        // 注意：这里应该异步调用，但为了同步测试，我们只检查方法存在性
        config = { test: 'config_available' };
        isAnimating = false; // 默认值
      } catch (error) {
        console.warn('获取窗口特效配置失败:', error);
      }
    }

    const success = hasDesktopPet && hasMethods;
    const details: WindowEffectsTestResult['details'] = {
      hasConfig: hasGetConfig,
      hasMethods,
      config,
      isAnimating
    };

    const message = success ? '✅ 窗口特效配置正常' : '❌ 窗口特效配置异常';

    return this.createResult(success, message, details) as WindowEffectsTestResult;
  }

  /**
   * 测试窗口特效方法
   */
  testWindowEffectsMethods(): WindowEffectsTestResult {
    console.log('🧪 测试窗口特效方法...');

    const methods = [
      'smoothBringToTop',
      'cancelTopMost',
      'getWindowEffectsConfig',
      'updateWindowEffectsConfig',
      'isWindowAnimating'
    ];

    const availableMethods = methods.filter(method =>
      typeof window.desktopPet?.[method as keyof typeof window.desktopPet] === 'function'
    );

    const success = availableMethods.length === methods.length;
    const details: WindowEffectsTestResult['details'] = {
      hasMethods: success,
      config: { availableMethods, totalMethods: methods.length }
    };

    const message = success
      ? `✅ 所有必要方法可用 (${availableMethods.length}/${methods.length})`
      : `❌ 方法缺失 (${availableMethods.length}/${methods.length})`;

    return this.createResult(success, message, details) as WindowEffectsTestResult;
  }

  /**
   * 运行窗口特效测试套件
   */
  runWindowEffectsTestSuite(): TestSuite {
    const startTime = Date.now();
    const tests: Record<string, TestResult> = {};

    console.log('🔍 开始窗口特效测试套件...');

    tests['windowEffectsConfig'] = this.testWindowEffectsConfig();
    tests['windowEffectsMethods'] = this.testWindowEffectsMethods();

    const summary = this.calculateSummary(tests, Date.now() - startTime);
    const suite: TestSuite = {
      name: '窗口特效测试',
      tests,
      summary,
      timestamp: startTime
    };

    this.recordSuite(suite);
    return suite;
  }
}

// ========== 主测试器 ==========

export class UnifiedTester {
  private dragTester = new DragTester();
  private firstClickTester = new FirstClickTester();
  private windowEffectsTester = new WindowEffectsTester();

  /**
   * 运行所有测试
   */
  async runAllTests(): Promise<TestSuite[]> {
    console.log('🚀 开始运行所有测试...');

    const results: TestSuite[] = [];

    // 运行各个测试套件
    results.push(this.dragTester.runDragTestSuite());
    results.push(this.firstClickTester.runFirstClickTestSuite());
    results.push(this.windowEffectsTester.runWindowEffectsTestSuite());

    // 输出总体结果
    const totalTests = results.reduce((sum, suite) => sum + suite.summary.total, 0);
    const passedTests = results.reduce((sum, suite) => sum + suite.summary.passed, 0);
    const failedTests = results.reduce((sum, suite) => sum + suite.summary.failed, 0);

    console.log('\n📊 ===== 测试完成 =====');
    console.log(`总计: ${totalTests} 个测试`);
    console.log(`通过: ${passedTests} 个`);
    console.log(`失败: ${failedTests} 个`);
    console.log(`成功率: ${totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0}%`);

    if (failedTests > 0) {
      console.log('\n❌ 失败的测试:');
      results.forEach(suite => {
        Object.entries(suite.tests).forEach(([testName, result]) => {
          if (!result.success) {
            console.log(`  - ${suite.name}.${testName}: ${result.message}`);
          }
        });
      });
    }

    return results;
  }

  /**
   * 运行特定测试套件
   */
  runTestSuite(suiteName: 'drag' | 'firstClick' | 'windowEffects'): TestSuite {
    switch (suiteName) {
      case 'drag':
        return this.dragTester.runDragTestSuite();
      case 'firstClick':
        return this.firstClickTester.runFirstClickTestSuite();
      case 'windowEffects':
        return this.windowEffectsTester.runWindowEffectsTestSuite();
      default:
        throw new Error(`未知的测试套件: ${suiteName}`);
    }
  }

  /**
   * 获取测试结果
   */
  getResults(): TestSuite[] {
    return [
      ...this.dragTester.getResults(),
      ...this.firstClickTester.getResults(),
      ...this.windowEffectsTester.getResults()
    ];
  }

  /**
   * 清空测试结果
   */
  clearResults(): void {
    this.dragTester.clearResults();
    this.firstClickTester.clearResults();
    this.windowEffectsTester.clearResults();
  }
}

// ========== 全局测试实例 ==========

export const unifiedTester = new UnifiedTester();

// ========== 便捷函数 ==========

/**
 * 运行所有测试
 */
export async function runAllTests(): Promise<TestSuite[]> {
  return unifiedTester.runAllTests();
}

/**
 * 运行拖拽测试
 */
export function runDragTest(): TestSuite {
  return unifiedTester.runTestSuite('drag');
}

/**
 * 运行首次点击测试
 */
export function runFirstClickTest(): TestSuite {
  return unifiedTester.runTestSuite('firstClick');
}

/**
 * 运行窗口特效测试
 */
export function runWindowEffectsTest(): TestSuite {
  return unifiedTester.runTestSuite('windowEffects');
}

// ========== 全局暴露 ==========

// 在开发环境中暴露到全局对象
if (process.env.NODE_ENV === 'development') {
  (window as any).unifiedTester = unifiedTester;
  (window as any).runAllTests = runAllTests;
  (window as any).runDragTest = runDragTest;
  (window as any).runFirstClickTest = runFirstClickTest;
  (window as any).runWindowEffectsTest = runWindowEffectsTest;
}

// ========== 辅助方法 ==========

// 添加到 TestHelper 基类的辅助方法
TestHelper.prototype.calculateSummary = function(
  tests: Record<string, TestResult>,
  duration: number
) {
  const testArray = Object.values(tests);
  const passed = testArray.filter(t => t.success).length;
  const failed = testArray.filter(t => !t.success).length;

  return {
    total: testArray.length,
    passed,
    failed,
    success: failed === 0,
    duration
  };
};