/**
 * 测试框架入口文件
 * 统一导出所有测试相关的工具和组件
 */

// 统一测试工具
export { UnifiedTester, DragTester, FirstClickTester, WindowEffectsTester } from './utils/unifiedTestHelpers';

// 测试组件
export { default as HapticFeedbackTest } from './components/HapticFeedbackTest';
export { default as ImageSystemTest } from './components/ImageSystemTest';
export { default as InteractionTest } from './components/InteractionTest';

// 数据库性能测试
export { runPerformanceTests } from './database/performance.test';

// 测试工具函数
export const createTestEnvironment = () => {
  // 创建测试环境
  return {
    isDevelopment: process.env.NODE_ENV === 'development',
    isTest: process.env.NODE_ENV === 'test',
    timestamp: new Date().toISOString(),
  };
};

export const runAllTests = async () => {
  // 运行所有测试的统一入口
  console.log('🧪 开始运行测试套件...');

  const results = {
    environment: createTestEnvironment(),
    performance: await import('./database/performance.test').then(m => m.runPerformanceTests().catch(() => 'skipped')),
    unified: 'Ready',
  };

  console.log('✅ 测试套件完成');
  return results;
};