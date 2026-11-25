import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypeKatex from "rehype-katex";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeStringify from "rehype-stringify";
import type { Element, Root } from "hast";

/**
 * 正文图片属性：
 * - lazy/async：外部图床图片通常很大，减少首屏请求与解码开销
 * - no-referrer：Gitee 等图床有防盗链，带本站 Referer 会被 302 到 favicon；
 *   不带 Referer 时正常返回图片
 */
function lazyImages() {
  return (tree: Root) => {
    const visit = (node: Element) => {
      if (node.tagName === "img") {
        node.properties = {
          ...node.properties,
          loading: "lazy",
          decoding: "async",
          referrerPolicy: "no-referrer",
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
export function normalizeDisplayMath(source: string): string {
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
 *
 * 不启用 rehypeRaw：文章内原始 HTML 会被忽略（防注入）。
 * 公式写错时 `throwOnError: false` 只在原位显示错误标记，不会让整篇文章渲染失败。
 */
export async function renderMarkdownHtml(source: string): Promise<string> {
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
}
