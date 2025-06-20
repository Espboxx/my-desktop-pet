# 宠物图像资源目录结构

这个目录包含桌面宠物应用的所有2D图像资源。

## 目录结构

```
pets/
├── default/                    # 默认宠物类型
│   ├── expressions/           # 表情图像
│   │   ├── normal.png        # 正常表情
│   │   ├── happy.png         # 开心表情
│   │   ├── hungry.png        # 饿了表情
│   │   ├── sleepy.png        # 困了表情
│   │   ├── sick.png          # 生病表情
│   │   ├── level5.png        # 5级解锁表情
│   │   ├── level10.png       # 10级解锁表情
│   │   ├── level15.png       # 15级解锁表情
│   │   ├── look_left.png     # 看左表情
│   │   ├── look_right.png    # 看右表情
│   │   ├── look_up.png       # 看上表情
│   │   ├── look_down.png     # 看下表情
│   │   ├── look_up_left.png  # 看左上表情
│   │   ├── look_up_right.png # 看右上表情
│   │   ├── look_down_left.png # 看左下表情
│   │   └── look_down_right.png # 看右下表情
│   └── base.png              # 基础图像（可选）
├── droplet/                   # 水滴宠物类型
│   ├── expressions/          # 表情图像
│   │   ├── normal.png        # 正常表情
│   │   ├── happy.png         # 开心表情
│   │   ├── hungry.png        # 饿了表情
│   │   ├── sleepy.png        # 困了表情
│   │   ├── level5.png        # 5级解锁表情
│   │   ├── level10.png       # 10级解锁表情
│   │   ├── look_left.png     # 看左表情
│   │   ├── look_right.png    # 看右表情
│   │   ├── look_up.png       # 看上表情
│   │   ├── look_down.png     # 看下表情
│   │   ├── look_up_left.png  # 看左上表情
│   │   ├── look_up_right.png # 看右上表情
│   │   ├── look_down_left.png # 看左下表情
│   │   └── look_down_right.png # 看右下表情
│   └── base.png              # 基础图像（可选）
└── custom/                    # 用户自定义图像
    └── [用户上传的图像文件]

```

## 图像规范

### 文件格式
- 支持格式：PNG、JPG、JPEG、GIF、WEBP
- 推荐格式：PNG（支持透明背景）

### 图像尺寸
- 推荐尺寸：64x64 像素
- 最小尺寸：32x32 像素
- 最大尺寸：128x128 像素

### 命名规范
- 使用小写字母和下划线
- 表情名称必须与 petConstants.ts 中定义的表情键名一致
- 例如：normal.png, happy.png, look_left.png

## 使用说明

1. **默认图像**：应用会优先使用对应表情的专用图像
2. **回退机制**：如果专用图像不存在，会使用基础图像（base.png）
3. **最终回退**：如果所有图像都不存在，会回退到emoji显示
4. **用户自定义**：用户可以通过设置界面上传自己的图像到custom目录

## 注意事项

- 所有图像文件应该具有透明背景以获得最佳效果
- 图像应该居中对齐，适合在圆形容器中显示
- 保持图像风格一致性以获得更好的用户体验
