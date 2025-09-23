-- 桌面宠物 SQLite 数据库 Schema
-- 版本: 1.0
-- 描述: 分表存储不同类型的数据，支持高性能并发访问

-- 启用WAL模式提升并发性能
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = -64000;
PRAGMA foreign_keys = ON;
PRAGMA encoding = 'UTF-8';

-- ==============================
-- 系统表
-- ==============================

-- 数据库版本和迁移信息表
CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

-- 应用设置表
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    type TEXT DEFAULT 'string', -- string, number, boolean, object
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ==============================
-- 宠物核心数据表
-- ==============================

-- 宠物类型和基本信息表
CREATE TABLE IF NOT EXISTS pet_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'default',
    config_json TEXT, -- JSON格式的配置数据
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 宠物实例状态表
CREATE TABLE IF NOT EXISTS pet_status (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pet_type_id TEXT NOT NULL,
    mood REAL NOT NULL DEFAULT 50.0,
    cleanliness REAL NOT NULL DEFAULT 100.0,
    hunger REAL NOT NULL DEFAULT 100.0,
    energy REAL NOT NULL DEFAULT 100.0,
    exp REAL NOT NULL DEFAULT 0.0,
    level INTEGER NOT NULL DEFAULT 1,
    max_mood REAL NOT NULL DEFAULT 100.0,
    max_cleanliness REAL NOT NULL DEFAULT 100.0,
    max_hunger REAL NOT NULL DEFAULT 100.0,
    max_energy REAL NOT NULL DEFAULT 100.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pet_type_id) REFERENCES pet_types(id)
);

-- 宠物位置信息表
CREATE TABLE IF NOT EXISTS pet_position (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pet_status_id INTEGER NOT NULL,
    x REAL NOT NULL DEFAULT 0.0,
    y REAL NOT NULL DEFAULT 0.0,
    screen_width INTEGER NOT NULL DEFAULT 1920,
    screen_height INTEGER NOT NULL DEFAULT 1080,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pet_status_id) REFERENCES pet_status(id)
);

-- ==============================
-- 交互和成就系统表
-- ==============================

-- 互动计数表
CREATE TABLE IF NOT EXISTS interaction_counts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pet_status_id INTEGER NOT NULL,
    interaction_type TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pet_status_id) REFERENCES pet_status(id),
    UNIQUE(pet_status_id, interaction_type)
);

-- 成就表
CREATE TABLE IF NOT EXISTS achievements (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general',
    condition_json TEXT, -- JSON格式的解锁条件
    reward_json TEXT, -- JSON格式的奖励数据
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 用户成就解锁表
CREATE TABLE IF NOT EXISTS user_achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pet_status_id INTEGER NOT NULL,
    achievement_id TEXT NOT NULL,
    unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pet_status_id) REFERENCES pet_status(id),
    FOREIGN KEY (achievement_id) REFERENCES achievements(id),
    UNIQUE(pet_status_id, achievement_id)
);

-- ==============================
-- 任务系统表
-- ==============================

-- 任务定义表
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'daily',
    difficulty INTEGER DEFAULT 1,
    condition_json TEXT, -- JSON格式的完成条件
    reward_json TEXT, -- JSON格式的奖励数据
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 用户任务状态表
CREATE TABLE IF NOT EXISTS user_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pet_status_id INTEGER NOT NULL,
    task_id TEXT NOT NULL,
    status TEXT DEFAULT 'active', -- active, completed, expired
    progress_json TEXT, -- JSON格式的进度数据
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (pet_status_id) REFERENCES pet_status(id),
    FOREIGN KEY (task_id) REFERENCES tasks(id),
    UNIQUE(pet_status_id, task_id)
);

-- ==============================
-- 物品系统表
-- ==============================

-- 物品定义表
CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general',
    rarity TEXT DEFAULT 'common', -- common, rare, epic, legendary
    effect_json TEXT, -- JSON格式的效果数据
    is_consumable BOOLEAN DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 用户物品库存表
CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pet_status_id INTEGER NOT NULL,
    item_id TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    obtained_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME, -- 可选的过期时间
    FOREIGN KEY (pet_status_id) REFERENCES pet_status(id),
    FOREIGN KEY (item_id) REFERENCES items(id),
    UNIQUE(pet_status_id, item_id)
);

-- ==============================
-- 动画和外观表
-- ==============================

-- 动画定义表
CREATE TABLE IF NOT EXISTS animations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'idle',
    file_path TEXT NOT NULL,
    duration INTEGER DEFAULT 1000, -- 动画持续时间(ms)
    is_loop BOOLEAN DEFAULT 1,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 用户解锁动画表
CREATE TABLE IF NOT EXISTS unlocked_animations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pet_status_id INTEGER NOT NULL,
    animation_id TEXT NOT NULL,
    unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pet_status_id) REFERENCES pet_status(id),
    FOREIGN KEY (animation_id) REFERENCES animations(id),
    UNIQUE(pet_status_id, animation_id)
);

-- ==============================
-- 气泡系统表
-- ==============================

-- 气泡内容表
CREATE TABLE IF NOT EXISTS bubble_contents (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'mood',
    condition_json TEXT, -- JSON格式的显示条件
    priority INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 当前气泡状态表
CREATE TABLE IF NOT EXISTS pet_bubble (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pet_status_id INTEGER NOT NULL,
    content_id TEXT,
    is_visible BOOLEAN DEFAULT 0,
    display_duration INTEGER DEFAULT 5000,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pet_status_id) REFERENCES pet_status(id),
    FOREIGN KEY (content_id) REFERENCES bubble_contents(id)
);

-- ==============================
-- 自定义图像表
-- ==============================

-- 自定义图像表
CREATE TABLE IF NOT EXISTS custom_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    image_data TEXT NOT NULL, -- Base64编码的图像数据
    category TEXT DEFAULT 'custom',
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ==============================
-- 索引设计
-- ==============================

-- 宠物状态相关索引
CREATE INDEX IF NOT EXISTS idx_pet_status_type ON pet_status(pet_type_id);
CREATE INDEX IF NOT EXISTS idx_pet_status_updated ON pet_status(updated_at);
CREATE INDEX IF NOT EXISTS idx_pet_position_status ON pet_position(pet_status_id);

-- 交互相关索引
CREATE INDEX IF NOT EXISTS idx_interaction_counts_status ON interaction_counts(pet_status_id);
CREATE INDEX IF NOT EXISTS idx_interaction_counts_type ON interaction_counts(interaction_type);

-- 成就相关索引
CREATE INDEX IF NOT EXISTS idx_user_achievements_status ON user_achievements(pet_status_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked ON user_achievements(unlocked_at);

-- 任务相关索引
CREATE INDEX IF NOT EXISTS idx_user_tasks_status ON user_tasks(pet_status_id);
CREATE INDEX IF NOT EXISTS idx_user_tasks_status_type ON user_tasks(status);
CREATE INDEX IF NOT EXISTS idx_user_tasks_completed ON user_tasks(completed_at);

-- 物品相关索引
CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory(pet_status_id);
CREATE INDEX IF NOT EXISTS idx_inventory_item ON inventory(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_expires ON inventory(expires_at);

-- 动画相关索引
CREATE INDEX IF NOT EXISTS idx_unlocked_animations_status ON unlocked_animations(pet_status_id);

-- 气泡相关索引
CREATE INDEX IF NOT EXISTS idx_pet_bubble_status ON pet_bubble(pet_status_id);
CREATE INDEX IF NOT EXISTS idx_pet_bubble_visible ON pet_bubble(is_visible);

-- 设置相关索引
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(key);
CREATE INDEX IF NOT EXISTS idx_app_settings_updated ON app_settings(updated_at);

-- 自定义图像相关索引
CREATE INDEX IF NOT EXISTS idx_custom_images_category ON custom_images(category);
CREATE INDEX IF NOT EXISTS idx_custom_images_active ON custom_images(is_active);

-- ==============================
-- 触发器
-- ==============================

-- 自动更新时间戳触发器
CREATE TRIGGER IF NOT EXISTS update_pet_status_timestamp
AFTER UPDATE ON pet_status
FOR EACH ROW
BEGIN
    UPDATE pet_status SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_pet_position_timestamp
AFTER UPDATE ON pet_position
FOR EACH ROW
BEGIN
    UPDATE pet_position SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_app_settings_timestamp
AFTER UPDATE ON app_settings
FOR EACH ROW
BEGIN
    UPDATE app_settings SET updated_at = CURRENT_TIMESTAMP WHERE key = NEW.key;
END;

-- ==============================
-- 初始化数据
-- ==============================

-- 插入数据库版本信息
INSERT OR IGNORE INTO schema_version (version, description) VALUES (1, '初始数据库结构');

-- 插入默认宠物类型
INSERT OR IGNORE INTO pet_types (id, name, description, category, config_json) VALUES
('cat', '小猫', '可爱的小猫宠物', 'default', '{"speed": 1.0, "size": 1.0}'),
('dog', '小狗', '忠诚的小狗宠物', 'default', '{"speed": 1.2, "size": 1.1}'),
('rabbit', '兔子', '活泼的兔子宠物', 'default, '{"speed": 1.5, "size": 0.8}');

-- 插入默认应用设置
INSERT OR IGNORE INTO app_settings (key, value, type) VALUES
('window_opacity', '0.8', 'number'),
('window_size', '1.0', 'number'),
('sound_enabled', 'true', 'boolean'),
('auto_save_interval', '30000', 'number'),
('theme', 'light', 'string');