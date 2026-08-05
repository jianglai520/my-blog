import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SettingsForm from "@/app/admin/SettingsForm";
import type { SiteSettings } from "@/lib/site";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/app/actions/settings", () => ({ updateSiteSettings: vi.fn() }));
vi.mock("@/app/actions/uploads", () => ({ uploadAvatar: vi.fn() }));

const baseSettings: SiteSettings = {
  author_name: "江来",
  intro: "全栈学习者",
  bio: "介绍文本",
  github: "",
  email: "",
  school: "",
  school_url: "",
  avatar_url: "",
  icp: "",
  skills: "[]",
  projects: "[]",
};

describe("SettingsForm 站点设置表单", () => {
  it("渲染所有设置字段与保存按钮", () => {
    render(<SettingsForm settings={baseSettings} />);

    expect(screen.getByText("⚙️ 站点设置")).toBeInTheDocument();
    expect(screen.getByLabelText("博主名字")).toBeInTheDocument();
    expect(screen.getByLabelText("一句话简介")).toBeInTheDocument();
    expect(screen.getByLabelText("个人介绍（关于页）")).toBeInTheDocument();
    expect(screen.getByLabelText("GitHub 链接")).toBeInTheDocument();
    expect(screen.getByLabelText("邮箱")).toBeInTheDocument();
    expect(screen.getByLabelText("学校")).toBeInTheDocument();
    expect(screen.getByLabelText("学校官网链接（可选，点击学校名可跳转）")).toBeInTheDocument();
    expect(screen.getByLabelText("头像图片（可上传或填 URL）")).toBeInTheDocument();
    expect(screen.getByLabelText("备案号（可选）")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "💾 保存设置" })).toBeInTheDocument();
  });

  it("初始值回填到对应字段", () => {
    render(
      <SettingsForm
        settings={{ ...baseSettings, author_name: "测试名", email: "a@b.com" }}
      />,
    );
    expect(screen.getByLabelText("博主名字")).toHaveValue("测试名");
    expect(screen.getByLabelText("邮箱")).toHaveValue("a@b.com");
  });
});
