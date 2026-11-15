"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { OrderedList, BulletList } from "@tiptap/extension-list";
import { Markdown } from "@tiptap/markdown";
import Image from "@tiptap/extension-image";
import {
  uploadImageToStorage,
  uploadAttachmentToStorage,
  type UploadResult,
} from "@/lib/browser/upload";

const initialUploadState: UploadResult = { url: null, message: "", success: false };

/** 常用表情分组（工具栏「表情」面板展示，点击插入光标处） */
const EMOJI_GROUPS: { label: string; items: string[] }[] = [
  {
    label: "笑脸",
    items: ["😀", "😄", "😁", "😂", "🤣", "😊", "😇", "🙂", "😉", "😍", "🤩", "😘", "😜", "🤪", "🤔", "🤗", "😎", "🥳", "😴", "😭"],
  },
  {
    label: "手势",
    items: ["👍", "👎", "👏", "🙌", "🙏", "🤝", "💪", "👌", "✌️", "🤞", "🫡", "👀", "🙈", "💅"],
  },
  {
    label: "心与情感",
    items: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💖", "💘", "💯", "🔥", "✨", "⭐", "🎉", "🎊"],
  },
  {
    label: "日常",
    items: ["📌", "📖", "📝", "✏️", "💻", "🖥️", "📱", "☕", "🍵", "🍕", "🍜", "🍰", "🎮", "🎧", "🎬", "📷", "🌙", "☀️", "🌈", "🚀"],
  },
];

const btnCls = (active: boolean) =>
  `rounded-md px-2 py-1 text-sm transition-colors disabled:opacity-40 ${
    active
      ? "bg-brand-500/30 text-brand-200"
      : "text-fg-muted hover:bg-ink-700/60 hover:text-fg"
  }`;

function ToolbarButton({
  onClick,
  active,
  title,
  disabled,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()} // 防止工具栏按钮抢走编辑器焦点
      onClick={onClick}
      className={btnCls(!!active)}
    >
      {children}
    </button>
  );
}

/** 编辑器句柄：提交时父组件通过 ref 读取最新 Markdown（避免编辑期间频繁序列化） */
export type EditorHandle = { getMarkdown: () => string };

/**
 * 禁用有序/无序列表的「输入自动检测」：
 * 输入 `1.` / `-` 后回车会触发列表转换把文本吞掉（ProseMirror input rule 行为）。
 * 覆写 addInputRules 返回空数组——列表仍可通过工具栏按钮创建，但输入不再自动转列表。
 */
const ListWithoutAutoDetect = [
  OrderedList.extend({ addInputRules() { return []; } }),
  BulletList.extend({ addInputRules() { return []; } }),
];

const Editor = forwardRef<EditorHandle, { value: string; onChange?: (md: string) => void }>(
  function Editor({ value, onChange }, ref) {
    const fileRef = useRef<HTMLInputElement>(null);
    const attachRef = useRef<HTMLInputElement>(null);
    const sourceRef = useRef<HTMLTextAreaElement>(null);
    const [uploadState, setUploadState] = useState<UploadResult>(initialUploadState);
    const [attachState, setAttachState] = useState<UploadResult>(initialUploadState);
    const [uploadPending, setUploadPending] = useState(false);
    const [attachPending, setAttachPending] = useState(false);
    // 批量附件上传进度（如 "2/5"，单个文件时为空）
    const [attachProgress, setAttachProgress] = useState("");
    // 表情面板开关
    const [showEmoji, setShowEmoji] = useState(false);
    // 默认源码模式：技术文章含表格/复杂 Markdown，避免 TipTap 序列化把结构压平
    const [sourceMode, setSourceMode] = useState(true);
    const [sourceText, setSourceText] = useState(value);

    const editor = useEditor({
      extensions: [
        StarterKit.configure({ orderedList: false, bulletList: false }),
        ...ListWithoutAutoDetect,
        Image.configure({ inline: false, allowBase64: false }),
        Markdown,
      ],
      content: value,
      contentType: "markdown", // 关键：声明初始 content 为 Markdown，否则被当 JSON 解析
      immediatelyRender: false,
      onUpdate: ({ editor }) => {
        // 性能：仅当父组件需要实时内容时才序列化。
        // PostForm 提交时通过 ref 读 getMarkdown()，编辑期间零序列化、零父组件重渲染。
        if (onChange) onChange(editor.getMarkdown());
      },
    });

    // 暴露最新 Markdown（父组件提交时调用；editor 未就绪返回空串）
    useImperativeHandle(
      ref,
      () => ({
        getMarkdown: () =>
          sourceMode ? sourceText : editor?.getMarkdown() ?? "",
      }),
      [editor, sourceMode, sourceText],
    );

  /**
   * 源码模式下对 textarea 做一次选区变换。
   * 用最小 diff + `insertText` 写回，而不是直接 setState：
   * 这样每次工具栏操作都会进入 textarea 的原生撤销栈，撤销/重做才可用。
   * 返回 false 表示当前不是源码模式（调用方回退到 TipTap）。
   */
  function editSource(
    transform: (
      text: string,
      start: number,
      end: number,
    ) => { text: string; start: number; end: number },
  ): boolean {
    if (!sourceMode) return false;
    const el = sourceRef.current;
    if (!el) return false;
    const oldText = el.value;
    const result = transform(oldText, el.selectionStart, el.selectionEnd);
    if (result.text === oldText) return true;

    // 计算变化区间，只替换这一段，保留其余文本与滚动位置
    let prefix = 0;
    while (
      prefix < oldText.length &&
      prefix < result.text.length &&
      oldText[prefix] === result.text[prefix]
    ) {
      prefix++;
    }
    let suffix = 0;
    while (
      suffix < oldText.length - prefix &&
      suffix < result.text.length - prefix &&
      oldText[oldText.length - 1 - suffix] ===
        result.text[result.text.length - 1 - suffix]
    ) {
      suffix++;
    }

    el.focus();
    el.setSelectionRange(prefix, oldText.length - suffix);
    document.execCommand(
      "insertText",
      false,
      result.text.slice(prefix, result.text.length - suffix),
    );
    el.setSelectionRange(result.start, Math.max(result.start, result.end));

    const nextText = el.value;
    setSourceText(nextText);
    onChange?.(nextText);
    return true;
  }

  /**
   * 把 Markdown 片段插入到「当前编辑位置」。
   * 编辑器默认是源码模式：此时必须写进 textarea 的 sourceText，
   * 否则片段只落在隐藏的 TipTap 实例里，提交时 getMarkdown() 读到的仍是空串
   * （表现为“已插入附件”，发布却提示“内容不能为空”）。
   */
  function insertMarkdownAtCursor(snippet: string): boolean {
    return editSource((text, start, end) => ({
      text: text.slice(0, start) + snippet + text.slice(end),
      start: start + snippet.length,
      end: start + snippet.length,
    }));
  }

  /** 源码模式：给选区包上 Markdown 标记（加粗/斜体/删除线） */
  function wrapSourceSelection(before: string, after = before): boolean {
    return editSource((text, start, end) => {
      const selected = text.slice(start, end);
      return {
        text: text.slice(0, start) + before + selected + after + text.slice(end),
        start: start + before.length,
        end: start + before.length + selected.length,
      };
    });
  }

  /** 源码模式：给选中行加前缀（标题/列表/引用），再次点击则取消 */
  function prefixSourceLines(prefix: string, clearHeadings = false): boolean {
    return editSource((text, start, end) => {
      const lineStart = text.lastIndexOf("\n", start - 1) + 1;
      let lineEnd = text.indexOf("\n", end);
      if (lineEnd === -1) lineEnd = text.length;
      const block = text.slice(lineStart, lineEnd);
      const lines = block.split("\n");
      const allPrefixed = lines.every((line) => line.startsWith(prefix));
      // 添加新的块级格式前，先剥掉旧的标题/引用/列表标记，避免 "1. - >" 层层叠加
      const blockPrefix = /^(?:#{1,6}\s+|>\s?|[-*+]\s+|\d+\.\s+)/;
      const clean = (line: string) => {
        let base = line;
        while (blockPrefix.test(base)) base = base.replace(blockPrefix, "");
        return clearHeadings ? base.replace(/^#{1,6}\s+/, "") : base;
      };
      const nextLines = lines.map((line) =>
        allPrefixed ? line.slice(prefix.length) : `${prefix}${clean(line)}`,
      );
      const nextBlock = nextLines.join("\n");
      const delta = nextBlock.length - block.length;
      return {
        text: text.slice(0, lineStart) + nextBlock + text.slice(lineEnd),
        start,
        end: Math.max(start, end + delta),
      };
    });
  }

  /** 源码模式：把选区包成代码块；选区本身已是代码块时去掉围栏 */
  function toggleSourceCodeBlock(): boolean {
    return editSource((text, start, end) => {
      const selected = text.slice(start, end);
      const fence = "```";
      const fenced = selected.match(/^```[^\n]*\n([\s\S]*?)\n?```$/);
      if (fenced) {
        const inner = fenced[1];
        return {
          text: text.slice(0, start) + inner + text.slice(end),
          start,
          end: start + inner.length,
        };
      }
      const body = selected;
      const insert =
        fence + "\n" + body + (body && !body.endsWith("\n") ? "\n" : "") + fence;
      return {
        text: text.slice(0, start) + insert + text.slice(end),
        start: start + fence.length + 1,
        end: start + fence.length + 1 + body.length,
      };
    });
  }

  /** 源码模式：撤销/重做走 textarea 原生历史 */
  function sourceUndoRedo(command: "undo" | "redo"): boolean {
    if (!sourceMode) return false;
    const el = sourceRef.current;
    if (!el) return false;
    el.focus();
    document.execCommand(command);
    setSourceText(el.value);
    onChange?.(el.value);
    return true;
  }

  // 选择本地图片后浏览器直传，成功后插入编辑器
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const date = new Date().toISOString().slice(0, 10); // yyyy-mm-dd
    setUploadPending(true);
    setUploadState(initialUploadState);
    setAttachState(initialUploadState);
    try {
      const res = await uploadImageToStorage(file, `posts/${date}`);
      setUploadState(res.success ? { ...res, message: "✅ 已插入图片" } : res);
      if (res.success && res.url) {
        const alt = file.name.replace(/[[\]]/g, "");
        if (!insertMarkdownAtCursor(`![${alt}](${res.url})`)) {
          editor?.chain().focus().setImage({ src: res.url }).run();
        }
      }
    } catch (err) {
      console.error("图片上传异常:", err);
      setUploadState({
        url: null,
        message: `❌ 上传失败：${err instanceof Error ? err.message : "未知错误"}（请检查登录状态与网络后重试）`,
        success: false,
      });
    } finally {
      setUploadPending(false);
      // 重置 input，允许下次选择同一文件再次触发 change
      e.target.value = "";
    }
  }

  // 选择附件后浏览器直传，支持多选：逐个上传，全部完成后一次性插入下载链接
  async function handleAttachChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const date = new Date().toISOString().slice(0, 10);
    setAttachPending(true);
    setAttachState(initialUploadState);
    setUploadState(initialUploadState);

    const snippets: string[] = [];
    const failed: string[] = [];
    let lastError = "";

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (files.length > 1) setAttachProgress(`${i + 1}/${files.length}`);
      try {
        const res = await uploadAttachmentToStorage(file, `attachments/${date}`);
        if (res.success && res.url) {
          const filename = file.name.replace(/[[\]]/g, "");
          snippets.push(`[📎 ${filename}](${res.url})`);
        } else {
          failed.push(file.name);
          lastError = res.message.replace(/^❌\s*/, "");
        }
      } catch (err) {
        console.error("附件上传异常:", err);
        failed.push(file.name);
        lastError = err instanceof Error ? err.message : "未知错误";
      }
    }

    // 批量插入一次完成，避免逐条 setState 相互覆盖
    if (snippets.length > 0) {
      const md = snippets.join("\n\n");
      if (!insertMarkdownAtCursor(md)) {
        editor?.chain().focus().insertContent(md, { contentType: "markdown" }).run();
      }
    }

    setAttachState({
      url: null,
      success: snippets.length > 0,
      message:
        failed.length === 0
          ? `✅ 已插入 ${snippets.length} 个附件`
          : snippets.length > 0
            ? `⚠️ 成功 ${snippets.length} 个，失败 ${failed.length} 个（${failed.join("、")}）：${lastError}`
            : `❌ 上传失败：${lastError || "请稍后重试"}`,
    });

    setAttachPending(false);
    setAttachProgress("");
    e.target.value = "";
  }

  // 插入表情到光标处，然后收起面板
  function insertEmoji(emoji: string) {
    if (!insertMarkdownAtCursor(emoji)) {
      editor?.chain().focus().insertContent(emoji).run();
    }
    setShowEmoji(false);
  }

  // 源码模式：在原始 Markdown 与可视化编辑之间切换
  function toggleSourceMode() {
    if (!editor) return;
    if (!sourceMode) {
      setSourceText(editor.getMarkdown());
      setSourceMode(true);
    } else {
      editor.commands.setContent(sourceText, {
        contentType: "markdown",
        emitUpdate: false,
      });
      setSourceMode(false);
    }
  }

  if (!editor) {
    return <div className="min-h-[320px] rounded-xl border border-ink-700/60 bg-ink-900/50" />;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-ink-600 bg-ink-900/50">
      {/* ===== 工具栏 ===== */}
      <div className="flex flex-wrap items-center gap-1 border-b border-ink-700/60 bg-ink-800/60 px-2 py-1.5">
        <ToolbarButton
          title="加粗"
          onClick={() => {
            if (!wrapSourceSelection("**")) editor.chain().focus().toggleBold().run();
          }}
          active={!sourceMode && editor.isActive("bold")}
        >
          <b>B</b>
        </ToolbarButton>
        <ToolbarButton
          title="斜体"
          onClick={() => {
            if (!wrapSourceSelection("*")) editor.chain().focus().toggleItalic().run();
          }}
          active={!sourceMode && editor.isActive("italic")}
        >
          <i>I</i>
        </ToolbarButton>
        <ToolbarButton
          title="删除线"
          onClick={() => {
            if (!wrapSourceSelection("~~")) editor.chain().focus().toggleStrike().run();
          }}
          active={!sourceMode && editor.isActive("strike")}
        >
          <s>S</s>
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-ink-700" />
        <ToolbarButton
          title="二级标题"
          onClick={() => {
            if (!prefixSourceLines("## ", true)) {
              editor.chain().focus().toggleHeading({ level: 2 }).run();
            }
          }}
          active={!sourceMode && editor.isActive("heading", { level: 2 })}
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          title="三级标题"
          onClick={() => {
            if (!prefixSourceLines("### ", true)) {
              editor.chain().focus().toggleHeading({ level: 3 }).run();
            }
          }}
          active={!sourceMode && editor.isActive("heading", { level: 3 })}
        >
          H3
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-ink-700" />
        <ToolbarButton
          title="无序列表"
          onClick={() => {
            if (!prefixSourceLines("- ")) editor.chain().focus().toggleBulletList().run();
          }}
          active={!sourceMode && editor.isActive("bulletList")}
        >
          •≡
        </ToolbarButton>
        <ToolbarButton
          title="有序列表"
          onClick={() => {
            if (!prefixSourceLines("1. ")) editor.chain().focus().toggleOrderedList().run();
          }}
          active={!sourceMode && editor.isActive("orderedList")}
        >
          1≡
        </ToolbarButton>
        <ToolbarButton
          title="引用"
          onClick={() => {
            if (!prefixSourceLines("> ")) editor.chain().focus().toggleBlockquote().run();
          }}
          active={!sourceMode && editor.isActive("blockquote")}
        >
          ❝
        </ToolbarButton>
        <ToolbarButton
          title="代码块"
          onClick={() => {
            if (!toggleSourceCodeBlock()) editor.chain().focus().toggleCodeBlock().run();
          }}
          active={!sourceMode && editor.isActive("codeBlock")}
        >
          {"</>"}
        </ToolbarButton>
        <ToolbarButton
          title="插入图片"
          onClick={() => fileRef.current?.click()}
        >
          🖼
        </ToolbarButton>
        <ToolbarButton
          title="插入附件（PDF/Word/Excel，可多选）"
          onClick={() => attachRef.current?.click()}
        >
          📎
        </ToolbarButton>
        <ToolbarButton
          title="插入表情"
          onClick={() => setShowEmoji((v) => !v)}
          active={showEmoji}
        >
          😀
        </ToolbarButton>
        <ToolbarButton
          title="源码模式（可直接粘贴 Markdown 表格）"
          onClick={toggleSourceMode}
          active={sourceMode}
        >
          MD
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-ink-700" />
        <ToolbarButton
          title="撤销"
          onClick={() => {
            if (!sourceUndoRedo("undo")) editor.chain().focus().undo().run();
          }}
          disabled={!sourceMode && !editor.can().undo()}
        >
          ↩
        </ToolbarButton>
        <ToolbarButton
          title="重做"
          onClick={() => {
            if (!sourceUndoRedo("redo")) editor.chain().focus().redo().run();
          }}
          disabled={!sourceMode && !editor.can().redo()}
        >
          ↪
        </ToolbarButton>

        {/* 上传状态提示 */}
        <span className="ml-auto text-xs text-fg-faint">
          {uploadPending || attachPending
            ? `上传中…${attachProgress ? ` ${attachProgress}` : ""}`
            : uploadState.message || attachState.message || ""}
        </span>
      </div>

      {/* ===== 表情面板 ===== */}
      {showEmoji && (
        <div className="max-h-56 overflow-y-auto border-b border-ink-700/60 bg-ink-800/60 px-3 py-2">
          {EMOJI_GROUPS.map((group) => (
            <div key={group.label} className="mb-1.5 last:mb-0">
              <p className="mb-1 text-xs text-fg-faint">{group.label}</p>
              <div className="flex flex-wrap gap-0.5">
                {group.items.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    title={emoji}
                    onClick={() => insertEmoji(emoji)}
                    className="rounded-md p-1 text-lg transition-colors hover:bg-brand-500/20"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===== 编辑区 ===== */}
      {sourceMode ? (
        <div>
          <textarea
            ref={sourceRef}
            value={sourceText}
            onChange={(e) => {
              setSourceText(e.target.value);
              onChange?.(e.target.value);
            }}
            spellCheck={false}
            placeholder="直接粘贴或编辑 Markdown 源码…（表格、代码块会原样保存）"
            className="min-h-[320px] w-full resize-y bg-transparent px-4 py-3 font-mono text-[13px] leading-relaxed text-fg outline-none placeholder:text-fg-faint"
          />
          <p className="border-t border-ink-700/60 px-4 py-2 text-[11px] leading-relaxed text-fg-faint">
            源码模式：保存的是原始 Markdown。表格等复杂内容请保持此模式编辑，切回可视化可能被压平。
          </p>
        </div>
      ) : (
        <EditorContent
          editor={editor}
          className="editor-content min-h-[320px] px-4 py-3 text-fg"
        />
      )}

      {/* 文件选择框（视觉隐藏但可交互；仅博主可上传） */}
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={handleFileChange}
        className="sr-only"
      />
      <input
        ref={attachRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.txt,.md,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/zip,text/plain,text/markdown"
        onChange={handleAttachChange}
        className="sr-only"
      />
    </div>
  );
});

export default Editor;
