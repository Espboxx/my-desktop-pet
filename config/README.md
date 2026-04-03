# 配置文件目录

## 概述

本项目采用集中式的配置文件管理，所有构建工具和运行时配置都统一放在这个目录中。

## 目录结构

```
config/
├── tsconfig.json           # TypeScript 配置
├── vite.config.ts          # Vite 构建配置
├── performanceConfig.ts    # 性能配置
└── README.md              # 本文档
```

## 配置文件说明

### tsconfig.json
- TypeScript 编译配置
- 包含路径别名设置
- 严格模式启用
- 模块解析配置

### vite.config.ts
- Vite 构建工具配置
- 插件配置 (React, Electron)
- 路径别名解析
- 开发服务器设置

### performanceConfig.ts
- 应用性能配置
- 开发和生产环境分离
- 性能监控开关
- 图像预加载配置

## 使用方法

这些配置文件在项目根目录也有对应的副本或符号链接，确保构建工具能够正常找到它们。

## 修改注意事项

1. **路径别名**: 修改 tsconfig.json 中的路径别名时，需要同步更新 vite.config.ts
2. **性能配置**: 修改 performanceConfig.ts 会影响应用运行时性能
3. **构建配置**: 修改 vite.config.ts 需要重启开发服务器

## 向后兼容性

为了保持向后兼容性，根目录保留了以下文件：
- `tsconfig.json` (符号链接)
- `vite.config.ts` (符号链接)

---

## 变更记录

### 2025-09-23
- 创建统一的配置目录
- 整合所有配置文件到 config/ 目录
- 建立符号链接保持向后兼容