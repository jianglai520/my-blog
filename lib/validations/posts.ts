import { z } from "zod";

/** 文章表单校验（创建 / 编辑共用，Server Action 与客户端共用） */
export const postSchema = z.object({
  title: z.string().trim().min(1, "标题不能为空").max(120),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/i, "slug 只能包含字母、数字和连字符")
    .max(100)
    .optional()
    .or(z.literal("")),
  excerpt: z.string().trim().max(200, "摘要最长 200 字").optional().or(z.literal("")),
  coverImage: z.string().trim().url("封面图需为合法 URL").optional().or(z.literal("")),
  content: z.string().trim().min(1, "内容不能为空"),
  status: z.enum(["draft", "published"]).default("published"),
  tags: z.string().trim().max(200, "标签最多 200 字").optional().or(z.literal("")),
});

export type PostFormInput = z.infer<typeof postSchema>;
