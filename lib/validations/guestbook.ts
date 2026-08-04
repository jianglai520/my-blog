import { z } from "zod";

/** 留言板表单校验（Server Action 与客户端共用） */
export const guestbookSchema = z.object({
  name: z.string().trim().min(1, "昵称不能为空").max(30, "昵称最长 30 字"),
  content: z.string().trim().min(1, "留言内容不能为空").max(1000, "留言最长 1000 字"),
});

export type GuestbookInput = z.infer<typeof guestbookSchema>;
