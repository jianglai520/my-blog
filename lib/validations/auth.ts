import { z } from "zod";

/** 登录 / 注册表单校验 */
export const credentialsSchema = z.object({
  email: z.string().trim().email("邮箱格式不正确").max(120),
  password: z.string().min(6, "密码至少需要 6 位").max(128),
});

export type CredentialsInput = z.infer<typeof credentialsSchema>;
