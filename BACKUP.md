# 数据备份与恢复指南

> 适用：Supabase（PostgreSQL + Storage）数据库的备份与恢复策略。
> 原则：**多重备份 + 定期演练**，确保数据可恢复。

## 备份层级（三份）

| 层级 | 内容 | 频率 | 方式 |
|------|------|------|------|
| ① 数据库 | posts / comments / tags / profiles 等表 | 每周 | Supabase 控制台手动导出（见下） |
| ② 迁移脚本 | `supabase/migrations/`（0001~0005，随 Git 提交） | 每次变更 | 数据库结构的"第二份备份"，可重建表结构 |
| ③ 图片文件 | Storage `post-images` bucket | 每月 | Storage 导出（或依赖 Supabase 自动备份） |

> 升级建议：Supabase **Pro 档**（$25/月）自带 **PITR（时间点恢复）**，可恢复到任意时刻，强烈推荐启用。

## 手动导出（免费档，每周）

1. 打开 **Supabase 控制台** → 你的项目
2. 左侧 **Database → Backups**
3. 点击 **Create a backup**（或 Export）
4. 下载 `.sql` / `.dump` 文件，保存到**本地安全位置**（如网盘/移动硬盘）

## Storage 图片备份

- **方式一**（免费档）：Storage → Buckets → `post-images` → 逐个下载（图片多时繁琐）
- **方式二**：用 `supabase` CLI 或第三方工具（如 rclone）同步到本地/网盘

## 恢复演练（每季度一次）

**演练 JSON 备份可恢复**（推荐，安全不碰生产表）：

```bash
node scripts/backup.mjs       # ① 产出 backups/yyyy-mm-dd.json
node scripts/restore-drill.mjs # ② 临时 schema restore_test 重建全表 → 校验行数 → 自动清理
```

- `restore-drill.mjs` 在**临时 schema**（`restore_test`）里复制表结构 + 插入全部数据，对比每张表行数与备份一致，最后自动清理——全程不触碰生产表
- 输出 6 张表全部 ✅ 即演练通过（已执行：2026-08-03 全表行数一致）

**恢复表数据**（用导出的 .sql）：
1. Supabase → SQL Editor → 粘贴 .sql 内容运行（会重建数据；表结构已存在时可先 `DROP TABLE IF EXISTS` 相关表）
2. 验证：`SELECT count(*) FROM posts;` 与备份前一致

**重建表结构**（迁移脚本）：
1. 新建一个临时 Supabase 项目
2. 依次执行 `supabase/migrations/0001~0005` 的 SQL
3. 对比表结构与生产一致 → 迁移脚本有效

## 注意事项

- `.env.local` 与 `DATABASE_URL` **不参与备份**（是凭据，不是数据）
- 迁移脚本一旦发布（push），**不要修改已执行过的版本**——变更请新建 `0006_xxx.sql`
- 定期检查备份文件能正常打开（防损坏）
