/**
 * 站点更新日志：从 GitHub 公开仓库读取提交记录。
 * - 构建/请求时带 1 小时缓存（ISR），不需要手动维护 changelog 文件
 * - 过滤测试提交与合并提交，保持页面干净
 * - 可选配置 GITHUB_TOKEN，避免匿名 API 的 60 次/小时限流
 */

import { logger } from "@/lib/logger";

const REPO = "jianglai520/my-blog";
const API = `https://api.github.com/repos/${REPO}/commits`;
const PER_PAGE = 100;
const REVALIDATE_SECONDS = 3600;

/** 这些提交不进更新日志 */
const NOISE = /^(test:|Merge\b|Revert\b|Initial commit from Create Next App)/i;

/** 从提交信息前缀推断类型（feat/fix/docs...） */
const TYPE_RE =
  /^(feat|fix|docs|refactor|perf|test|chore|style|build|ci|revert)(?:\([^)]*\))?:\s*/i;

export type ChangeType =
  | "feat"
  | "fix"
  | "docs"
  | "refactor"
  | "perf"
  | "test"
  | "chore"
  | "style"
  | "build"
  | "ci"
  | "revert"
  | "update";

export type ChangelogEntry = {
  sha: string;
  shortSha: string;
  message: string;
  type: ChangeType;
  date: string;
  url: string;
};

type GitHubCommit = {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author: { date: string } | null;
  };
};

function githubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "jianglai520-blog",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

async function fetchPage(page: number): Promise<GitHubCommit[]> {
  const res = await fetch(`${API}?per_page=${PER_PAGE}&page=${page}`, {
    headers: githubHeaders(),
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!res.ok) {
    throw new Error(`GitHub API ${res.status}`);
  }
  return (await res.json()) as GitHubCommit[];
}

function toEntry(commit: GitHubCommit): ChangelogEntry {
  const raw = commit.commit.message.split("\n")[0]?.trim() ?? "";
  const matched = raw.match(TYPE_RE);
  const type = (matched?.[1]?.toLowerCase() ?? "update") as ChangeType;
  const message = matched ? raw.replace(TYPE_RE, "") : raw;

  return {
    sha: commit.sha,
    shortSha: commit.sha.slice(0, 7),
    message,
    type,
    date: commit.commit.author?.date ?? new Date(0).toISOString(),
    url: commit.html_url,
  };
}

/** 读取站点更新日志（最新在前）；失败时返回 unavailable，由页面给出兜底提示 */
export async function getSiteChangelog(): Promise<{
  entries: ChangelogEntry[];
  source: "github" | "unavailable";
}> {
  try {
    const first = await fetchPage(1);
    const commits = [...first];
    // 首页满 100 条时再取第二页（仓库总量有限，最多 200 条）
    if (first.length === PER_PAGE) {
      commits.push(...(await fetchPage(2)));
    }

    const entries = commits
      .filter((commit) => {
        const message = commit.commit.message.split("\n")[0]?.trim() ?? "";
        return !NOISE.test(message);
      })
      .map(toEntry)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return { entries, source: "github" };
  } catch (error) {
    logger.error("读取更新日志失败:", error);
    return { entries: [], source: "unavailable" };
  }
}

export const CHANGELOG_REPO_URL = `https://github.com/${REPO}`;
