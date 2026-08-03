import { z } from "zod";

/** 站点设置表单校验（后台保存用） */
export const settingsSchema = z.object({
  author_name: z.string().trim().min(1, "博主名不能为空").max(30),
  intro: z.string().trim().max(80, "简介最长 80 字").optional().or(z.literal("")),
  bio: z.string().trim().max(500, "个人介绍最长 500 字").optional().or(z.literal("")),
  github: z
    .string()
    .trim()
    .url("GitHub 需为合法 URL")
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || v.startsWith("https://"), "GitHub 链接需以 https:// 开头"),
  email: z.string().trim().email("邮箱格式不正确").optional().or(z.literal("")),
  avatar_url: z
    .string()
    .trim()
    .url("头像需为合法 URL")
    .optional()
    .or(z.literal("")),
  icp: z.string().trim().max(50, "备案号最长 50 字").optional().or(z.literal("")),
});

export type SettingsInput = z.infer<typeof settingsSchema>;
