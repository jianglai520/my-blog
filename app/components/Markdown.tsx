import { unstable_cache } from "next/cache";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypeKatex from "rehype-katex";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeStringify from "rehype-stringify";
import "katex/dist/katex.min.css";
import type { Element, Root } from "hast";

/**
 * 正文图片懒加载：外部图床图片通常很大，浏览器默认会立刻加载。
 * 统一补 loading/decoding，减少首屏图片请求与解码开销。
 */
function lazyImages() {
  return (tree: Root) => {
    const visit = (node: Element) => {
      if (node.tagName === "img") {
        node.properties = {
          ...node.properties,
          loading: "lazy",
          decoding: "async",
        };
      }
      for (const child of node.children ?? []) {
        if (child.type === "element") visit(child as Element);
      }
    };
    for (const child of tree.children) {
      if (child.type === "element") visit(child as Element);
    }
  };
}

/**
 * 无语言代码块补默认语言 text：
 * rehype-pretty-code 对无语言标注的代码块不做高亮（原样输出裸 <pre>），
 * 统一补 language-text 使其也走 shiki 双主题（深浅色下都有协调底色）。
 */
function defaultCodeLang() {
  return (tree: Root) => {
    const visit = (node: Element) => {
      if (node.tagName === "code") {
        const className = Array.isArray(node.properties.className)
          ? node.properties.className.map(String)
          : [];
        const hasLang = className.some((c) => c.startsWith("language-"));
        if (!hasLang && !node.properties.dataLanguage) {
          node.properties.className = ["language-text"];
        }
      }
      for (const child of node.children ?? []) {
        if (child.type === "element") visit(child as Element);
      }
    };
    for (const child of tree.children) {
      if (child.type === "element") visit(child as Element);
    }
  };
}

/**
 * 单行块级公式兼容：`$$E=mc^2$$` 独占一行时，remark-math 会解析成「行内公式」，
 * 显示成小号内联样式。这里把它规范成标准块级写法：
 *
 *     $$
 *     E=mc^2
 *     $$
 *
 * 代码块（``` / ~~~）内的内容不处理，避免误改示例代码。
 */
function normalizeDisplayMath(source: string): string {
  const lines = source.split("\n");
  let inFence = false;

  return lines
    .map((line) => {
      if (/^\s*(`{3,}|~{3,})/.test(line)) {
        inFence = !inFence;
        return line;
      }
      if (inFence) return line;

      // 注意：文章正文可能是 CRLF，行尾 \r 会让 `$` 匹配不上
      const clean = line.replace(/\r$/, "");
      const match = clean.match(/^[ \t]*\$\$([^\n]+?)\$\$[ \t]*$/);
      if (match && !match[1].includes("$$")) {
        return `$$\n${match[1]}\n$$`;
      }
      return line;
    })
    .join("\n");
}

/**
 * Markdown → HTML（纯服务端渲染，客户端零 JS）。
 * 管线：remark-parse → remark-gfm → remark-math → remark-rehype → rehype-slug
 *      → lazyImages → defaultCodeLang → rehype-katex → rehype-pretty-code → rehype-stringify
 * 不启用 rehypeRaw，文章内原始 HTML 会被忽略（防注入，内容来源只有博主编辑器）。
 *
 * 数学公式：支持 `$$...$$`（块级，含独占一行的单行写法）与 `$...$`（行内），
 * 由 KaTeX 渲染成静态 HTML；
 * throwOnError: false —— 公式写错时只在原位显示错误标记，不会让整篇文章渲染失败。
 *
 * 使用 unstable_cache 按「正文内容」缓存渲染结果：
 * Shiki 代码高亮是文章页 TTFB 的主要成本，缓存后重复访问不再重新渲染。
 * tag "posts" 在发布/编辑时失效；内容变化本身也会生成新的缓存 key。
 * 渲染管线变化时必须递增 key 前缀（当前 v3 = KaTeX + 单行块级公式兼容），
 * 否则已缓存的旧 HTML 不会更新。
 */
const toHtml = unstable_cache(
  async (source: string) => {
    const file = await unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkMath)
      .use(remarkRehype)
      .use(rehypeSlug)
      .use(lazyImages)
      .use(defaultCodeLang)
      .use(rehypeKatex, { throwOnError: false, strict: false })
      .use(rehypePrettyCode, {
        theme: {
          dark: "github-dark",
          light: "github-light",
        },
        keepBackground: true,
      })
      .use(rehypeStringify)
      .process(normalizeDisplayMath(source));
    return String(file);
  },
  ["markdown-html-v3"],
  { revalidate: 3600, tags: ["posts"] },
);

export default async function Markdown({ source }: { source: string }) {
  const html = await toHtml(source);
  return (
    <div
      className="markdown-body prose prose-invert max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
