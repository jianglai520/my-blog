// 安装 git hooks；在非 git 环境（如 Vercel 构建沙箱）下静默跳过。
// 用法：npm run prepare（npm install 时自动执行）
import { existsSync } from "node:fs";
import { execSync } from "node:child_process";

if (!existsSync(".git")) {
  console.log("[setup-hooks] 非 git 环境，跳过 hook 安装");
  process.exit(0);
}

execSync("npx simple-git-hooks", { stdio: "inherit" });
