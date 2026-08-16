import { z } from "zod";

/** 站内私信表单校验（Server Action 与客户端共用） */
export const messageSchema = z.object({
  // 昵称可选：留空自动存为「匿名」
  name: z
    .string()
    .trim()
    .max(30, "昵称最长 30 字")
    .optional()
    .transform((v) => (v ? v : "匿名")),
  // 联系方式可选（邮箱/微信等，仅博主可见）
  contact: z.string().trim().max(100, "联系方式最长 100 字").optional(),
  content: z.string().trim().min(1, "私信内容不能为空").max(2000, "私信最长 2000 字"),
});

export type MessageInput = z.infer<typeof messageSchema>;
