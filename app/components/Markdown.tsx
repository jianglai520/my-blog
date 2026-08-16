import { cache } from "react";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeStringify from "rehype-stringify";
import type { Element, Root } from "hast";

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
 * 给代码块补充语言标签：
 * rehype-pretty-code 输出 <figure data-rehype-pretty-code-figure><pre><code class="language-js">
 * 我们把语言名写到 code 的 data-language，供 CSS 工具条（::before）显示。
 */
function codeLangLabel() {
  return (tree: Root) => {
    const visit = (node: Element) => {
      if (node.tagName === "code") {
        const className = Array.isArray(node.properties.className)
          ? node.properties.className.map(String)
          : [];
        const lang = className.find((c) => c.startsWith("language-"));
        if (lang) {
          const name = lang.replace("language-", "");
          // 已知别名显示规范名（shiki 可能给 "js"/"ts" 等短名）
          const label =
            { js: "JavaScript", ts: "TypeScript", py: "Python", sh: "Shell", bash: "Bash" }[
              name
            ] ?? name;
          node.properties.dataLanguage = label;
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
 * Markdown → HTML（纯服务端渲染，客户端零 JS）。
 * 管线：remark-parse → remark-gfm → remark-rehype → rehype-slug → defaultCodeLang → codeLangLabel → rehype-pretty-code → rehype-stringify
 * 不启用 rehypeRaw，文章内原始 HTML 会被忽略（防注入，内容来源只有博主编辑器）。
 */
const toHtml = cache(async (source: string) => {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(defaultCodeLang)
    .use(codeLangLabel)
    .use(rehypePrettyCode, {
      theme: {
        dark: "github-dark",
        light: "github-light",
      },
      keepBackground: true,
      // CSDN 风格行号：给每行加 data-line 标记，CSS 用计数器渲染行号
      onVisitLine(node) {
        if (node.children.length === 0) {
          node.children = [{ type: "text", value: " " }];
        }
        node.properties = { ...node.properties, "data-line": "" };
      },
    })
    .use(rehypeStringify)
    .process(source);
  return String(file);
});

export default async function Markdown({ source }: { source: string }) {
  const html = await toHtml(source);
  return (
    <div
      className="markdown-body prose prose-invert max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
