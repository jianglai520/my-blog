import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { embedText } from "@/lib/ai";
import { searchChunks } from "@/lib/rag";
import { getPostByIdentifier } from "@/lib/posts";

/**
 * 站内 AI 问答（Phase 2 RAG + 当前文章上下文）：
 * 访客提问 → 问题向量化 → pgvector 检索全站分块；
 * 同时带上「当前正在阅读的文章」作为最高优先级上下文（解决"这篇文章"类代词问题）。
 * 安全：① IP 限流（防刷 API 费用）；② API key 仅在服务端。
 *
 * ⚠️ 限流用内存 Map（单实例够用）；多实例部署需换 Redis/数据库限流。
 */
const RATE_LIMIT_MAX = 3; // 窗口内最多提问次数
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAP = new Map<string, number[]>();

const MAX_ANSWER_TOKENS = 800;
const CURRENT_POST_MAX_CHARS = 6000; // 当前文章喂入上限

const SYSTEM_PROMPT =
  "你是「jianglai520」个人博客的 AI 问答助手。你会收到：①用户当前正在阅读的文章（如果有）；②从全站文章检索到的片段；以及访客的问题。" +
  "回答优先级：先基于「当前文章」回答，再参考检索片段补充。只基于提供的内容回答（用简洁的中文，可适当使用列表）；" +
  "如果提供的内容中没有相关信息，请如实说明，不要编造。";

export async function POST(req: Request) {
  // ---------- ① IP 限流 ----------
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const now = Date.now();
  const recent = (RATE_LIMIT_MAP.get(ip) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS,
  );
  if (recent.length >= RATE_LIMIT_MAX) {
    return NextResponse.json(
      { error: "提问太频繁了，请一分钟后再试" },
      { status: 429 },
    );
  }
  recent.push(now);
  RATE_LIMIT_MAP.set(ip, recent);

  // ---------- ② 参数校验 ----------
  let body: { identifier?: string; question?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式不合法" }, { status: 400 });
  }
  const question = String(body.question ?? "").trim();
  const identifier = String(body.identifier ?? "").trim();
  if (!question) {
    return NextResponse.json({ error: "参数不合法" }, { status: 400 });
  }
  if (question.length > 500) {
    return NextResponse.json({ error: "问题太长了，请精简到 500 字以内" }, { status: 400 });
  }

  // ---------- ③ 当前文章上下文（解决"这篇文章"类代词问题） ----------
  const currentPost = identifier ? await getPostByIdentifier(identifier) : null;

  // ---------- ④ 向量检索最相关分块 ----------
  let embedding: number[];
  try {
    embedding = await embedText(question);
  } catch (e) {
    console.error("问题向量化失败:", e);
    return NextResponse.json(
      { error: e instanceof Error && e.message.includes("未配置") ? e.message : "检索服务暂时不可用" },
      { status: 500 },
    );
  }

  const chunks = await searchChunks(embedding);
  if (!currentPost && !chunks.length) {
    return NextResponse.json(
      { error: "知识库还没有可检索的内容，稍后再试" },
      { status: 404 },
    );
  }

  // ---------- ⑤ 组装上下文：当前文章优先，检索片段补充 ----------
  const contextParts: string[] = [];
  if (currentPost) {
    contextParts.push(
      `【用户当前正在阅读的文章】\n标题：${currentPost.title}\n内容（节选）：\n${currentPost.content.slice(0, CURRENT_POST_MAX_CHARS)}`,
    );
  }
  if (chunks.length) {
    contextParts.push(
      chunks.map((c, i) => `【全站检索片段 ${i + 1}】\n${c.content}`).join("\n\n---\n\n"),
    );
  }
  const userMsg = `${contextParts.join("\n\n---\n\n")}\n\n——\n访客问题：${question}`;

  // ---------- ⑥ 调 DeepSeek ----------
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    console.error("DEEPSEEK_API_KEY 未配置");
    return NextResponse.json({ error: "AI 服务未配置，请联系站长" }, { status: 500 });
  }

  let res: Response;
  try {
    res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMsg },
        ],
        temperature: 0.6,
        max_tokens: MAX_ANSWER_TOKENS,
      }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch (e) {
    console.error("DeepSeek 请求失败:", e);
    return NextResponse.json({ error: "AI 服务暂时不可用，请稍后再试" }, { status: 502 });
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("DeepSeek 返回错误:", res.status, errText);
    return NextResponse.json({ error: "AI 服务暂时不可用" }, { status: 502 });
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const answer = data.choices?.[0]?.message?.content?.trim() ?? "";
  if (!answer) {
    return NextResponse.json({ error: "AI 没有返回内容，请换个问题试试" }, { status: 502 });
  }

  return NextResponse.json({ answer });
}
