/** AI 能力：文本向量化（SiliconFlow BGE-M3）+ 文本切块 */

const EMBEDDING_MODEL = "BAAI/bge-m3";
const EMBEDDING_URL = "https://api.siliconflow.cn/v1/embeddings";

function getApiKey(): string {
  const key = process.env.EMBEDDING_API_KEY;
  if (!key) throw new Error("EMBEDDING_API_KEY 未配置（硅基流动）");
  return key;
}

/** 单段文本向量化（1024 维） */
export async function embedText(text: string): Promise<number[]> {
  const [vec] = await embedTexts([text]);
  return vec;
}

/** 批量文本向量化（SiliconFlow 一次请求支持多 input） */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (!texts.length) return [];

  const res = await fetch(EMBEDDING_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: texts }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Embedding 请求失败 (${res.status}): ${err.slice(0, 200)}`);
  }

  const data = (await res.json()) as { data?: { embedding: number[] }[] };
  const result = (data.data ?? []).map((d) => d.embedding);
  if (result.length !== texts.length) {
    throw new Error("Embedding 返回数量与输入不匹配");
  }
  return result;
}

/**
 * 文本切块：按段落聚合到目标长度（块间带重叠，兼顾上下文连续性）。
 * 简化实现：段落聚合 + 末段重叠前缀。
 */
export function chunkText(text: string, chunkSize = 500, overlap = 50): string[] {
  const paragraphs = text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const p of paragraphs) {
    if (current && current.length + p.length > chunkSize) {
      chunks.push(current);
      // 重叠：以上一块末尾 overlap 字符作为新块前缀，保持上下文
      current =
        overlap > 0 && current.length > overlap ? current.slice(-overlap) + "\n" + p : p;
    } else {
      current = current ? `${current}\n${p}` : p;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}
