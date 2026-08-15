"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { updateSiteSettings, type SettingsState } from "@/app/actions/settings";
import { uploadImageToStorage } from "@/lib/browser/upload";
import type { SiteSettings } from "@/lib/site";
import { parseResume, serializeResume, RESUME_TYPES, type ResumeItem } from "@/lib/resume";
import { inputCls } from "./shared";

const initialSettingsState: SettingsState = { message: "", success: false };

/**
 * 站点设置表单：博主名 / 简介 / GitHub / 邮箱 / 头像（上传或 URL）/ 备案号。
 * 保存后刷新路由（首页 / 关于页缓存即时生效）。
 */
export default function SettingsForm({ settings }: { settings: SiteSettings }) {
  const [authorName, setAuthorName] = useState(settings.author_name);
  const [intro, setIntro] = useState(settings.intro);
  const [bio, setBio] = useState(settings.bio);
  const [github, setGithub] = useState(settings.github);
  const [email, setEmail] = useState(settings.email);
  const [school, setSchool] = useState(settings.school);
  const [schoolUrl, setSchoolUrl] = useState(settings.school_url);
  const [avatarUrl, setAvatarUrl] = useState(settings.avatar_url);
  const [icp, setIcp] = useState(settings.icp);
  const [resumeRows, setResumeRows] = useState<ResumeItem[]>(() => parseResume(settings.resume));
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [state, formAction, pending] = useActionState<SettingsState, FormData>(
    updateSiteSettings,
    initialSettingsState
  );

  // 保存成功后刷新（首页/关于页缓存）
  const router = useRouter();
  const savedRef = useRef(false);
  useEffect(() => {
    if (state.success && !savedRef.current) {
      savedRef.current = true;
      router.refresh();
    }
  }, [state.success, router]);

  // 简历经历行编辑：更新 / 删除 / 添加
  function updateResume(idx: number, field: keyof ResumeItem, value: string) {
    setResumeRows((rows) => rows.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  }
  function removeResume(idx: number) {
    setResumeRows((rows) => rows.filter((_, i) => i !== idx));
  }
  function addResume() {
    setResumeRows((rows) => [
      ...rows,
      { type: "经历", title: "", org: "", time: "", desc: "" },
    ]);
  }

  // 选择头像文件 → 浏览器直传 Supabase Storage（不走 Server Action 中转，更快）
  async function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setAvatarUploading(true);
    try {
      const result = await uploadImageToStorage(file, "avatars");
      if (result.success && result.url) {
        setAvatarUrl(result.url);
        alert("✅ 头像已上传，点击下方「保存设置」生效");
      } else {
        alert(result.message);
      }
    } finally {
      setAvatarUploading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-ink-700/60 bg-ink-900/50 p-8">
      <h2 className="mb-6 text-xl font-bold text-fg">⚙️ 站点设置</h2>
      <p className="mb-6 text-sm text-fg-faint">
        这些信息会显示在首页、关于页和页脚；保存后立即生效。
      </p>

      <form action={formAction} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="set-author" className="mb-2 block text-sm text-fg-muted">
              博主名字
            </label>
            <input
              id="set-author"
              name="author_name"
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="set-intro" className="mb-2 block text-sm text-fg-muted">
              一句话简介
            </label>
            <input
              id="set-intro"
              name="intro"
              type="text"
              value={intro}
              onChange={(e) => setIntro(e.target.value)}
              placeholder="全栈学习者 & 生活记录者"
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label htmlFor="set-bio" className="mb-2 block text-sm text-fg-muted">
            个人介绍（关于页）
          </label>
          <textarea
            id="set-bio"
            name="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            placeholder="写一段自我介绍..."
            className={`${inputCls} resize-y`}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="set-github" className="mb-2 block text-sm text-fg-muted">
              GitHub 链接
            </label>
            <input
              id="set-github"
              name="github"
              type="url"
              value={github}
              onChange={(e) => setGithub(e.target.value)}
              placeholder="https://github.com/你的用户名"
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="set-email" className="mb-2 block text-sm text-fg-muted">
              邮箱
            </label>
            <input
              id="set-email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="set-school" className="mb-2 block text-sm text-fg-muted">
              学校
            </label>
            <input
              id="set-school"
              name="school"
              type="text"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              placeholder="所在学校（显示在关于页）"
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="set-school-url" className="mb-2 block text-sm text-fg-muted">
              学校官网链接（可选，点击学校名可跳转）
            </label>
            <input
              id="set-school-url"
              name="school_url"
              type="url"
              value={schoolUrl}
              onChange={(e) => setSchoolUrl(e.target.value)}
              placeholder="https://www.example.edu.cn"
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="set-avatar" className="mb-2 block text-sm text-fg-muted">
              头像图片（可上传或填 URL）
            </label>
            <div className="flex gap-2">
              <input
                id="set-avatar"
                name="avatar_url"
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://.../avatar.png"
                className={inputCls}
              />
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleAvatarFile}
                className="sr-only"
              />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                className="flex-shrink-0 rounded-lg border border-brand-400/30 px-4 py-3 text-sm text-brand-300 transition-colors hover:bg-brand-400/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {avatarUploading ? "上传中…" : "上传"}
              </button>
            </div>
            <p className="mt-1 text-xs text-fg-faint">
              支持 PNG / JPG / WebP，≤5MB；上传后点「保存设置」生效
            </p>
          </div>
          <div>
            <label htmlFor="set-icp" className="mb-2 block text-sm text-fg-muted">
              备案号（可选）
            </label>
            <input
              id="set-icp"
              name="icp"
              type="text"
              value={icp}
              onChange={(e) => setIcp(e.target.value)}
              placeholder="京ICP备xxxxxxxx号"
              className={inputCls}
            />
          </div>
        </div>

        {/* 简历经历：动态编辑，保存时序列化 JSON 写入隐藏字段 */}
        <input type="hidden" name="resume" value={serializeResume(resumeRows)} />
        <div>
          <label className="mb-2 block text-sm text-fg-muted">
            简历经历 <span className="text-fg-faint">（/resume 在线简历页展示，可空）</span>
          </label>
          <div className="space-y-3">
            {resumeRows.length === 0 && (
              <p className="text-sm text-fg-faint">还没有经历，点下方「添加经历」开始。</p>
            )}
            {resumeRows.map((item, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-ink-700/60 bg-ink-800/40 p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-fg-muted">经历 #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeResume(idx)}
                    aria-label={`删除经历 ${item.title || idx + 1}`}
                    className="rounded-lg border border-red-400/30 px-2.5 py-1 text-sm text-red-400 transition-colors hover:bg-red-400/10"
                  >
                    ✕ 删除
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <select
                    value={item.type}
                    onChange={(e) => updateResume(idx, "type", e.target.value)}
                    aria-label="类型"
                    className={`${inputCls} px-3 py-2`}
                  >
                    {RESUME_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <input
                    value={item.time}
                    onChange={(e) => updateResume(idx, "time", e.target.value)}
                    placeholder="时间（如 2024.09 - 2028.06）"
                    className={`${inputCls} px-3 py-2`}
                  />
                  <input
                    value={item.title}
                    onChange={(e) => updateResume(idx, "title", e.target.value)}
                    placeholder="标题（如：兰州大学 计算机专业）"
                    className={`${inputCls} px-3 py-2`}
                  />
                  <input
                    value={item.org}
                    onChange={(e) => updateResume(idx, "org", e.target.value)}
                    placeholder="机构/公司（可选）"
                    className={`${inputCls} px-3 py-2`}
                  />
                  <textarea
                    value={item.desc}
                    onChange={(e) => updateResume(idx, "desc", e.target.value)}
                    placeholder="描述（一句话，可选）"
                    rows={2}
                    className={`${inputCls} resize-y px-3 py-2 sm:col-span-2`}
                  />
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addResume}
            className="mt-3 rounded-lg border border-brand-400/30 px-4 py-2 text-sm text-brand-300 transition-colors hover:bg-brand-400/10"
          >
            ➕ 添加经历
          </button>
          <p className="mt-1 text-xs text-fg-faint">
            类型可选：教育 / 经历 / 奖项；保存后 /resume 页展示。
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-gradient-to-r from-brand-600 to-brand-500 px-6 py-3 font-medium text-white transition-colors hover:from-brand-500 hover:to-glow-400 disabled:cursor-not-allowed disabled:bg-ink-600 disabled:text-fg-faint"
          >
            {pending ? "保存中..." : "💾 保存设置"}
          </button>
          {state.message && (
            <span className={`text-sm ${state.success ? "text-emerald-400" : "text-red-400"}`}>
              {state.message}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
