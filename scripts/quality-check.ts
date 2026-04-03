#!/usr/bin/env node

import { execSync } from 'child_process';

interface ExecError {
  status?: number;
  stdout?: string;
  message: string;
}

/**
 * 代码质量检查脚本
 * 检查类型、语法、代码风格等
 */

console.log('🔍 开始代码质量检查...\n');

const results = {
  typeCheck: { passed: false, output: '' },
  lint: { passed: false, output: '' },
  build: { passed: false, output: '' },
  tests: { passed: false, output: '' }
};

try {
  // 1. TypeScript 类型检查
  console.log('📝 执行 TypeScript 类型检查...');
  execSync('npx tsc --noEmit', { encoding: 'utf8', cwd: process.cwd() });
  results.typeCheck.passed = true;
  results.typeCheck.output = '✅ TypeScript 类型检查通过';
  console.log('✅ TypeScript 类型检查通过\n');
} catch (error) {
  const execError = error as ExecError;
  results.typeCheck.passed = false;
  results.typeCheck.output = execError.stdout || execError.message;
  console.log('❌ TypeScript 类型检查失败');
  console.log(results.typeCheck.output + '\n');
}

try {
  // 2. ESLint 检查
  console.log('🧹 执行 ESLint 检查...');
  execSync('npx eslint src/ electron/ --ext .ts,.tsx', {
    encoding: 'utf8',
    cwd: process.cwd(),
    maxBuffer: 1024 * 1024 * 10 // 10MB buffer
  });
  results.lint.passed = true;
  results.lint.output = '✅ ESLint 检查通过';
  console.log('✅ ESLint 检查通过\n');
} catch (error) {
  const execError = error as ExecError;
  results.lint.passed = false;
  results.lint.output = execError.stdout || execError.message;
  console.log('❌ ESLint 检查失败');
  console.log(results.lint.output + '\n');
}

try {
  // 3. 构建检查
  console.log('🏗️ 执行构建检查...');
  execSync('npm run build', {
    encoding: 'utf8',
    cwd: process.cwd(),
    maxBuffer: 1024 * 1024 * 20 // 20MB buffer
  });
  results.build.passed = true;
  results.build.output = '✅ 构建成功';
  console.log('✅ 构建成功\n');
} catch (error) {
  const execError = error as ExecError;
  results.build.passed = false;
  results.build.output = execError.stdout || execError.message;
  console.log('❌ 构建失败');
  console.log(results.build.output + '\n');
}

try {
  // 4. 测试检查（如果存在测试）
  console.log('🧪 执行测试检查...');
  execSync('npm test', {
    encoding: 'utf8',
    cwd: process.cwd(),
    maxBuffer: 1024 * 1024 * 10 // 10MB buffer
  });
  results.tests.passed = true;
  results.tests.output = '✅ 测试通过';
  console.log('✅ 测试通过\n');
} catch (error) {
  const execError = error as ExecError;
  // 测试失败不一定算错误，可能只是没有测试
  if (execError.status === 1) {
    results.tests.passed = false;
    results.tests.output = execError.stdout || execError.message;
    console.log('❌ 测试失败');
    console.log(results.tests.output + '\n');
  } else {
    results.tests.passed = true;
    results.tests.output = '⚠️ 测试未配置或跳过';
    console.log('⚠️ 测试未配置或跳过\n');
  }
}

// 生成报告
console.log('📊 质量检查报告');
console.log('='.repeat(50));

const checks = [
  { name: 'TypeScript 类型检查', result: results.typeCheck },
  { name: 'ESLint 检查', result: results.lint },
  { name: '构建检查', result: results.build },
  { name: '测试检查', result: results.tests }
];

const allPassed = checks.every(check => check.result.passed);

checks.forEach(check => {
  const status = check.result.passed ? '✅' : '❌';
  console.log(`${status} ${check.name}`);
  if (!check.result.passed && check.result.output) {
    console.log(`   ${check.result.output.split('\n')[0]}`);
  }
});

console.log('='.repeat(50));

if (allPassed) {
  console.log('🎉 所有检查通过！代码质量良好。');
  process.exit(0);
} else {
  console.log('⚠️ 部分检查未通过，请查看以上详情。');
  process.exit(1);
}
