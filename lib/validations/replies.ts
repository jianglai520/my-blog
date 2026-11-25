import { z } from "zod";

/**
 * 访客头像：客户端压成 96×96 WebP 的 data URL，存 DB（不开放匿名 Storage 写）。
 * 限制长度，避免有人直接塞大图或脚本。
 */
export const avatarDataSchema = z
  .string()
  .trim()
  .max(48_000, "头像数据过大")
  .refine(
    (value) =>
      value === "" ||
      /^data:image\/(webp|png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(value),
    "头像格式不合法",
  )
  .optional()
  .default("");

/** 游客回复（评论 / 留言）：匿名可发，昵称留空为「匿名」 */
export const replySchema = z.object({
  targetType: z.enum(["comment", "guestbook"]),
  targetId: z.coerce.number().int().positive("目标 ID 不合法"),
  identifier: z.string().trim().max(200).optional().default(""),
  name: z
    .string()
    .trim()
    .max(30, "昵称最长 30 字")
    .optional()
    .transform((value) => (value ? value : "匿名")),
  avatarData: avatarDataSchema,
  content: z.string().trim().min(1, "回复内容不能为空").max(1000, "回复最长 1000 字"),
});

export type ReplyInput = z.infer<typeof replySchema>;
