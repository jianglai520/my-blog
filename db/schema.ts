import {
  pgTable,
  bigint,
  text,
  boolean,
  uuid,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * 数据库 schema（镜像现有表结构，由 0001~0003 迁移建立）。
 * schema 即类型真相：`typeof posts.$inferSelect` 自动推断行类型。
 *
 * ⚠️ 属性名与数据库列名保持一致（snake_case），
 * 使推断出的类型与现有页面代码的字段命名（post.cover_image 等）兼容，页面零改动。
 * 后续表结构变更：改这里 → `drizzle-kit generate` 生成迁移。
 */

/** 文章 */
export const posts = pgTable("posts", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  author_id: uuid("author_id"),
  slug: text("slug").unique(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  excerpt: text("excerpt"),
  cover_image: text("cover_image"),
  status: text("status").notNull().default("published"),
  published: boolean("published").notNull().default(false),
  created_at: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});

/** 评论 */
export const comments = pgTable("comments", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  post_id: bigint("post_id", { mode: "number" })
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  content: text("content").notNull(),
  created_at: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});

/** 用户资料（关联 auth.users，仅本 schema 内管理博主标记） */
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  is_admin: boolean("is_admin").notNull().default(false),
  created_at: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
export type Profile = typeof profiles.$inferSelect;
