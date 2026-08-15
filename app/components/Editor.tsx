"use client";

import {
  forwardRef,
  startTransition,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useActionState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { OrderedList, BulletList } from "@tiptap/extension-list";
import { Markdown } from "@tiptap/markdown";
import Image from "@tiptap/extension-image";
import { uploadImage, uploadAttachment, type UploadState } from "@/app/actions/uploads";

const initialUploadState: UploadState = { url: null, message: "", success: false };

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
    const attachNameRef = useRef("附件");
    const [uploadState, uploadAction, uploadPending] = useActionState(
      uploadImage,
      initialUploadState
    );
    const [attachState, attachAction, attachPending] = useActionState(
      uploadAttachment,
      initialUploadState
    );
    // 表情面板开关
    const [showEmoji, setShowEmoji] = useState(false);

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
        getMarkdown: () => editor?.getMarkdown() ?? "",
      }),
      [editor],
    );

  // 选择本地图片后立即上传（useActionState 的 action 需在 startTransition 内调用）
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    startTransition(() => {
      uploadAction(fd);
    });
    // 重置 input，允许下次选择同一文件再次触发 change
    e.target.value = "";
  }

  // 选择附件后立即上传
  function handleAttachChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    attachNameRef.current = file.name; // 记录原始文件名（存储路径是 UUID，插入链接时用原名）
    const fd = new FormData();
    fd.append("file", file);
    startTransition(() => {
      attachAction(fd);
    });
    e.target.value = "";
  }

  // 插入表情到光标处，然后收起面板
  function insertEmoji(emoji: string) {
    editor?.chain().focus().insertContent(emoji).run();
    setShowEmoji(false);
  }

  // 图片上传成功后插入编辑器
  useEffect(() => {
    if (uploadState.success && uploadState.url && editor) {
      editor.chain().focus().setImage({ src: uploadState.url }).run();
    }
  }, [uploadState, editor]);

  // 附件上传成功后插入下载链接（Markdown 语法，用原始文件名）
  useEffect(() => {
    if (attachState.success && attachState.url && editor) {
      const filename = attachNameRef.current || "附件";
      const md = `[📎 ${filename}](${attachState.url})`;
      editor.chain().focus().insertContent(md, { contentType: "markdown" }).run();
    }
  }, [attachState, editor]);

  if (!editor) {
    return <div className="min-h-[320px] rounded-xl border border-ink-700/60 bg-ink-900/50" />;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-ink-600 bg-ink-900/50">
      {/* ===== 工具栏 ===== */}
      <div className="flex flex-wrap items-center gap-1 border-b border-ink-700/60 bg-ink-800/60 px-2 py-1.5">
        <ToolbarButton
          title="加粗"
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
        >
          <b>B</b>
        </ToolbarButton>
        <ToolbarButton
          title="斜体"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
        >
          <i>I</i>
        </ToolbarButton>
        <ToolbarButton
          title="删除线"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive("strike")}
        >
          <s>S</s>
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-ink-700" />
        <ToolbarButton
          title="二级标题"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          title="三级标题"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive("heading", { level: 3 })}
        >
          H3
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-ink-700" />
        <ToolbarButton
          title="无序列表"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
        >
          •≡
        </ToolbarButton>
        <ToolbarButton
          title="有序列表"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
        >
          1≡
        </ToolbarButton>
        <ToolbarButton
          title="引用"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
        >
          ❝
        </ToolbarButton>
        <ToolbarButton
          title="代码块"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          active={editor.isActive("codeBlock")}
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
          title="插入附件（PDF/Word/Excel）"
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
        <span className="mx-1 h-5 w-px bg-ink-700" />
        <ToolbarButton
          title="撤销"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        >
          ↩
        </ToolbarButton>
        <ToolbarButton
          title="重做"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        >
          ↪
        </ToolbarButton>

        {/* 上传状态提示 */}
        <span className="ml-auto text-xs text-fg-faint">
          {uploadPending || attachPending
            ? "上传中…"
            : uploadState.success
              ? "✅ 已插入图片"
              : attachState.success
                ? "✅ 已插入附件"
                : uploadState.message.startsWith("❌")
                  ? uploadState.message
                  : attachState.message.startsWith("❌")
                    ? attachState.message
                    : ""}
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
      <EditorContent
        editor={editor}
        className="editor-content min-h-[320px] px-4 py-3 text-fg"
      />

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
        accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.txt,.md,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/zip,text/plain,text/markdown"
        onChange={handleAttachChange}
        className="sr-only"
      />
    </div>
  );
});

export default Editor;
