import { z } from "zod";

/** 评论表单校验（Server Action 与客户端共用） */
export const commentSchema = z.object({
  postId: z.coerce.number().int().positive("文章 ID 不合法"),
  identifier: z.string().trim().min(1),
  name: z.string().trim().min(1, "昵称不能为空").max(30, "昵称最长 30 字"),
  content: z.string().trim().min(1, "评论内容不能为空").max(1000, "评论最长 1000 字"),
});

export type CommentFormInput = z.infer<typeof commentSchema>;
