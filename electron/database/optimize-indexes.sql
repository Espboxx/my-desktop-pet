-- 数据库索引优化脚本
-- 针对桌面宠物应用的查询模式进行索引优化

-- ==============================
-- 性能分析后的索引优化
-- ==============================

-- 1. 宠物状态查询优化
-- 最常见的查询：获取最新的宠物状态
CREATE INDEX IF NOT EXISTS idx_pet_status_latest ON pet_status(id DESC);

-- 复合索引：根据宠物类型和更新时间查询
CREATE INDEX IF NOT EXISTS idx_pet_status_type_updated ON pet_status(pet_type_id, updated_at DESC);

-- 复合索引：状态范围查询（例如：查找心情低于某个值的宠物）
CREATE INDEX IF NOT EXISTS idx_pet_status_mood ON pet_status(mood);
CREATE INDEX IF NOT EXISTS idx_pet_status_energy ON pet_status(energy);
CREATE INDEX IF NOT EXISTS idx_pet_status_hunger ON pet_status(hunger);

-- 2. 位置信息查询优化
-- 复合索引：按屏幕区域查询位置
CREATE INDEX IF NOT EXISTS idx_pet_position_screen ON pet_position(screen_width, screen_height);

-- 3. 交互计数查询优化
-- 复合索引：按互动类型和计数排序
CREATE INDEX IF NOT EXISTS idx_interaction_counts_type_count ON interaction_counts(interaction_type, count DESC);

-- 4. 成就系统查询优化
-- 复合索引：按解锁时间查询最新成就
CREATE INDEX IF NOT EXISTS idx_user_achievements_status_unlocked ON user_achievements(pet_status_id, unlocked_at DESC);

-- 5. 任务系统查询优化
-- 复合索引：按状态和开始时间查询
CREATE INDEX IF NOT EXISTS idx_user_tasks_status_started ON user_tasks(status, started_at DESC);

-- 复合索引：按完成时间查询已完成任务
CREATE INDEX IF NOT EXISTS idx_user_tasks_completed_status ON user_tasks(completed_at DESC, status);

-- 6. 物品系统查询优化
-- 复合索引：按过期时间查询即将过期的物品
CREATE INDEX IF NOT EXISTS idx_inventory_status_expires ON inventory(pet_status_id, expires_at);

-- 复合索引：按物品类别和数量查询
CREATE INDEX IF NOT EXISTS idx_inventory_quantity ON inventory(item_id, quantity DESC);

-- 7. 动画系统查询优化
-- 复合索引：按解锁时间查询最新动画
CREATE INDEX IF NOT EXISTS idx_unlocked_animations_status_unlocked ON unlocked_animations(pet_status_id, unlocked_at DESC);

-- 8. 气泡系统查询优化
-- 复合索引：按可见性和创建时间查询
CREATE INDEX IF NOT EXISTS idx_pet_bubble_status_visible_created ON pet_bubble(pet_status_id, is_visible, created_at DESC);

-- 9. 应用设置查询优化
-- 复合索引：按设置类型和更新时间查询
CREATE INDEX IF NOT EXISTS idx_app_settings_type_updated ON app_settings(type, updated_at DESC);

-- 10. 自定义图像查询优化
-- 复合索引：按类别和活跃状态查询
CREATE INDEX IF NOT EXISTS idx_custom_images_category_active ON custom_images(category, is_active, created_at DESC);

-- ==============================
-- 全文搜索索引（如果需要）
-- ==============================

-- 为宠物类型名称创建全文搜索索引
-- CREATE VIRTUAL TABLE IF NOT EXISTS pet_types_search USING fts5(name, description, content=pet_types);

-- 为物品名称创建全文搜索索引
-- CREATE VIRTUAL TABLE IF NOT EXISTS items_search USING fts5(name, description, content=items);

-- ==============================
-- 覆盖索引优化
-- ==============================

-- 为宠物状态的常用查询创建覆盖索引
CREATE INDEX IF NOT EXISTS idx_pet_status_cover ON pet_status(pet_type_id, mood, cleanliness, hunger, energy, exp, level, updated_at);

-- 为互动计数的常用查询创建覆盖索引
CREATE INDEX IF NOT EXISTS idx_interaction_counts_cover ON interaction_counts(pet_status_id, interaction_type, count, updated_at);

-- 为用户成就的常用查询创建覆盖索引
CREATE INDEX IF NOT EXISTS idx_user_achievements_cover ON user_achievements(pet_status_id, achievement_id, unlocked_at);

-- ==============================
-- 统计和报表索引
-- ==============================

-- 按日期统计的索引
CREATE INDEX IF NOT EXISTS idx_pet_status_created_date ON pet_status(date(created_at));
CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked_date ON user_achievements(date(unlocked_at));
CREATE INDEX IF NOT EXISTS idx_user_tasks_completed_date ON user_tasks(date(completed_at));

-- ==============================
-- 索引使用统计查询
-- ==============================

-- 查询索引使用情况
-- SELECT * FROM sqlite_master WHERE type = 'index';

-- 查询索引统计信息
-- ANALYZE;
-- SELECT * FROM sqlite_stat1;

-- 查询查询计划
-- EXPLAIN QUERY PLAN SELECT * FROM pet_status ORDER BY id DESC LIMIT 1;

-- ==============================
-- 维护和优化建议
-- ==============================

-- 1. 定期执行 ANALYZE 更新统计信息
-- ANALYZE;

-- 2. 定期清理过期的数据
-- DELETE FROM user_tasks WHERE status = 'completed' AND completed_at < datetime('now', '-30 days');
-- DELETE FROM inventory WHERE expires_at IS NOT NULL AND expires_at < datetime('now');

-- 3. 定期执行 VACUUM 优化数据库
-- VACUUM;

-- 4. 定期执行 REINDEX 重建索引
-- REINDEX;

-- 5. 监控索引使用情况，删除未使用的索引
-- 监控查询性能，根据实际使用情况调整索引策略