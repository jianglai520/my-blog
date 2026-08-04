import { z } from "zod";

/** 留言板表单校验（Server Action 与客户端共用） */
export const guestbookSchema = z.object({
  // 昵称可选：留空自动存为「匿名」
  name: z
    .string()
    .trim()
    .max(30, "昵称最长 30 字")
    .optional()
    .transform((v) => (v ? v : "匿名")),
  content: z.string().trim().min(1, "留言内容不能为空").max(1000, "留言最长 1000 字"),
});

export type GuestbookInput = z.infer<typeof guestbookSchema>;
