# 2D图像系统文档

本文档详细介绍了桌面宠物应用的2D图像系统，包括架构设计、使用方法和技术实现。

## 概述

2D图像系统是对原有emoji表情系统的重大升级，提供了更丰富的视觉体验和用户自定义功能。系统支持多种图像格式，具备智能回退机制，确保在各种环境下都能正常运行。

## 主要特性

### 🎨 多格式支持
- **支持格式**: PNG、JPG、JPEG、GIF、WEBP
- **推荐格式**: PNG（支持透明背景）
- **图像尺寸**: 推荐64x64像素，支持32x32到128x128像素

### 🔄 智能回退机制
- **兼容性检查**: 自动检测浏览器支持情况
- **优雅降级**: 图像加载失败时自动回退到emoji
- **性能适配**: 根据设备性能调整图像质量

### 🚀 性能优化
- **智能预加载**: 优先加载常用表情，后台加载其他资源
- **图像缓存**: 避免重复加载，提升响应速度
- **内存管理**: 自动清理不需要的缓存

### 👤 用户自定义
- **图像导入**: 支持拖拽和点击上传
- **格式验证**: 自动检查文件格式和大小
- **预览功能**: 导入前可预览图像效果
- **本地存储**: 自定义图像保存在本地

## 架构设计

### 核心组件

```
src/
├── services/
│   ├── imageResourceManager.ts     # 图像资源管理
│   ├── customImageStorage.ts       # 用户自定义图像存储
│   └── compatibilityChecker.ts     # 兼容性检查
├── hooks/
│   ├── useImageResource.ts         # 图像资源Hook
│   ├── useImagePreloader.ts        # 图像预加载Hook
│   └── useCompatibility.ts         # 兼容性检查Hook
├── components/
│   ├── Pet/PetModel.tsx            # 宠物模型渲染
│   ├── ImageImport/                # 图像导入组件
│   ├── SettingsTabs/ImageManagementTab.tsx  # 图像管理界面
│   └── CompatibilityStatus/        # 兼容性状态显示
└── utils/
    └── placeholderImageGenerator.ts # 占位符图像生成
```

### 数据流

```
用户操作 → 图像管理界面 → 图像存储服务 → 本地存储
                ↓
图像资源管理器 → 缓存系统 → PetModel组件 → 渲染显示
                ↓
兼容性检查 → 智能回退 → emoji显示
```

## 使用指南

### 基础使用

1. **查看当前图像**: 在设置窗口的"图像管理"标签页查看当前宠物的图像状态
2. **导入自定义图像**: 点击"导入"按钮或拖拽图像文件到指定区域
3. **管理图像**: 可以预览、删除或替换已导入的图像

### 图像要求

- **文件格式**: PNG、JPG、JPEG、GIF、WEBP
- **文件大小**: 最大5MB
- **推荐尺寸**: 64x64像素
- **背景**: 建议使用透明背景（PNG格式）

### 命名规范

图像文件应按照以下规范命名：
- `normal.png` - 正常表情
- `happy.png` - 开心表情
- `hungry.png` - 饿了表情
- `sleepy.png` - 困了表情
- `look_left.png` - 看左表情
- 等等...

## 技术实现

### 图像资源管理

```typescript
// 获取图像URL，带回退机制
const imageUrl = await imageResourceManager.getImageUrl(petTypeId, expressionKey);

// 预加载图像
await imageResourceManager.preloadImage(imageUrl);

// 批量预加载
await imageResourceManager.preloadPetImages(petTypeId, expressionKeys);
```

### 自定义图像存储

```typescript
// 保存自定义图像
const result = customImageStorage.saveImage(
  petTypeId,
  expressionKey,
  dataUrl,
  filename
);

// 获取自定义图像
const customImage = customImageStorage.getImageByExpression(petTypeId, expressionKey);
```

### 兼容性检查

```typescript
// 检查浏览器兼容性
const report = await compatibilityChecker.checkCompatibility();

// 检查宠物类型兼容性
const compatibility = await compatibilityChecker.checkPetTypeCompatibility(petType);
```

## 配置选项

### 性能配置

在 `src/services/imageResourceManager.ts` 中可以调整以下参数：

```typescript
const MAX_STORAGE_SIZE = 50 * 1024 * 1024; // 最大存储空间 50MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;     // 单文件最大 5MB
const CACHE_SIZE_LIMIT = 100;              // 缓存条目限制
```

### 图像质量

系统会根据设备性能自动调整图像质量：
- **高质量**: 64px, PNG格式, 90%压缩
- **中等质量**: 48px, WebP格式, 80%压缩  
- **低质量**: 32px, JPEG格式, 70%压缩

## 故障排除

### 常见问题

1. **图像不显示**
   - 检查文件格式是否支持
   - 确认文件大小不超过限制
   - 查看兼容性状态

2. **加载缓慢**
   - 清理图像缓存
   - 检查网络连接
   - 降低图像质量

3. **存储空间不足**
   - 删除不需要的自定义图像
   - 导出数据后清空存储
   - 检查浏览器存储限制

### 调试工具

在开发环境中，可以通过设置窗口的"调试"标签页访问：
- 兼容性检查报告
- 图像资源状态
- 缓存统计信息
- 性能监控数据

## 最佳实践

### 图像设计

1. **保持一致性**: 所有表情图像应使用相同的风格和尺寸
2. **透明背景**: 使用PNG格式的透明背景以获得最佳效果
3. **居中对齐**: 确保图像内容在画布中居中
4. **适当大小**: 避免过大的文件影响加载速度

### 性能优化

1. **预加载策略**: 优先加载常用表情，延迟加载特殊表情
2. **缓存管理**: 定期清理不需要的缓存
3. **格式选择**: 根据图像特点选择合适的格式
4. **压缩优化**: 在保证质量的前提下适当压缩

### 用户体验

1. **渐进加载**: 先显示占位符，再加载实际图像
2. **错误处理**: 提供清晰的错误信息和解决建议
3. **状态反馈**: 显示加载进度和操作结果
4. **兼容提示**: 在不支持的环境中给出友好提示

## 更新日志

### v1.0.1 (2025-06-20)
- 🐛 修复Unicode编码错误：解决`btoa()`函数无法处理emoji等Unicode字符的问题
- ✅ 实现Unicode安全的Base64编码方法
- ✅ 添加TextEncoder回退机制以确保跨浏览器兼容性
- ✅ 验证占位符图像生成器在所有环境下正常工作

### v1.0.0 (2025-06-20)
- ✅ 实现基础2D图像系统
- ✅ 添加用户自定义图像功能
- ✅ 实现智能回退机制
- ✅ 添加性能优化和缓存
- ✅ 完成兼容性检查
- ✅ 创建图像管理界面

## 未来计划

- [ ] 支持动画GIF
- [ ] 添加图像编辑功能
- [ ] 实现云端同步
- [ ] 支持更多图像格式
- [ ] 添加图像压缩选项
- [ ] 实现批量导入功能
