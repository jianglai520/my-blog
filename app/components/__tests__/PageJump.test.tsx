import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PageJump from "@/app/components/PageJump";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

beforeEach(() => {
  push.mockClear();
});

describe("PageJump 页码直达", () => {
  it("输入页码后跳转到对应地址", async () => {
    const user = userEvent.setup();
    render(
      <PageJump current={1} total={4} hrefTemplate="/page/{page}" page1Href="/" />,
    );

    const input = screen.getByLabelText("跳转到页码");
    await user.clear(input);
    await user.type(input, "3");
    await user.click(screen.getByRole("button", { name: "跳转" }));

    expect(push).toHaveBeenCalledWith("/page/3");
  });

  it("第 1 页使用 page1Href", async () => {
    const user = userEvent.setup();
    render(
      <PageJump current={3} total={4} hrefTemplate="/page/{page}" page1Href="/" />,
    );

    const input = screen.getByLabelText("跳转到页码");
    await user.clear(input);
    await user.type(input, "1");
    await user.click(screen.getByRole("button", { name: "跳转" }));

    expect(push).toHaveBeenCalledWith("/");
  });

  it("支持 query 形式的模板", async () => {
    const user = userEvent.setup();
    render(
      <PageJump
        current={1}
        total={3}
        hrefTemplate="/tags/agent?page={page}"
        page1Href="/tags/agent"
      />,
    );

    const input = screen.getByLabelText("跳转到页码");
    await user.clear(input);
    await user.type(input, "2");
    await user.click(screen.getByRole("button", { name: "跳转" }));

    expect(push).toHaveBeenCalledWith("/tags/agent?page=2");
  });

  it("越界页码不跳转并标记无效", () => {
    render(
      <PageJump current={2} total={4} hrefTemplate="/page/{page}" page1Href="/" />,
    );

    const input = screen.getByLabelText("跳转到页码") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "99" } });
    fireEvent.submit(input.closest("form")!);

    expect(push).not.toHaveBeenCalled();
    expect(input.getAttribute("aria-invalid")).toBe("true");
  });

  it("当前页不重复跳转", () => {
    render(
      <PageJump current={2} total={4} hrefTemplate="/page/{page}" page1Href="/" />,
    );

    const input = screen.getByLabelText("跳转到页码") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "2" } });
    fireEvent.submit(input.closest("form")!);

    expect(push).not.toHaveBeenCalled();
  });
});
