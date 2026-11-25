import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import Avatar from "@/app/components/Avatar";

// 测试替身：用原生 img 替代 next/image
/* eslint-disable @next/next/no-img-element */
vi.mock("next/image", () => ({
  default: (props: { src: string; alt: string }) => <img src={props.src} alt={props.alt} />,
}));
/* eslint-enable @next/next/no-img-element */

describe("Avatar 评论 / 留言头像", () => {
  it("没有头像时用昵称首字", () => {
    const { container } = render(<Avatar name="山间清风" size={32} />);
    const avatar = container.querySelector('[data-avatar="initial"]');
    expect(avatar).toBeTruthy();
    expect(avatar?.textContent).toBe("山");
  });

  it("有头像时渲染图片", () => {
    const { container } = render(
      <Avatar name="江来" size={32} avatarUrl="data:image/webp;base64,UklGRg==" />,
    );
    const avatar = container.querySelector('[data-avatar="photo"]');
    expect(avatar?.querySelector("img")?.getAttribute("src")).toBe(
      "data:image/webp;base64,UklGRg==",
    );
  });

  it("空昵称回退为匿名首字", () => {
    const { container } = render(<Avatar name="   " size={32} />);
    expect(container.querySelector('[data-avatar="initial"]')?.textContent).toBe("匿");
  });

  it("同一昵称颜色稳定", () => {
    const first = render(<Avatar name="林深" size={32} />);
    const second = render(<Avatar name="林深" size={32} />);
    const getBackground = (node: HTMLElement) =>
      node.querySelector<HTMLElement>('span[style*="linear-gradient"]')?.getAttribute("style");
    expect(getBackground(first.container)).toBe(getBackground(second.container));
  });
});
