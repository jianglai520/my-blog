import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ThemeToggle from "@/app/components/ThemeToggle";

const { useThemeMock } = vi.hoisted(() => ({ useThemeMock: vi.fn() }));
vi.mock("next-themes", () => ({ useTheme: useThemeMock }));

describe("ThemeToggle 主题切换", () => {
  beforeEach(() => {
    useThemeMock.mockReset();
  });

  it("深色模式下显示「切换到浅色模式」，点击后调 setTheme('light')", async () => {
    const setTheme = vi.fn();
    useThemeMock.mockReturnValue({ resolvedTheme: "dark", setTheme });
    render(<ThemeToggle />);

    const btn = screen.getByRole("button", { name: "切换到浅色模式" });
    await userEvent.click(btn);
    expect(setTheme).toHaveBeenCalledWith("light");
  });

  it("浅色模式下显示「切换到深色模式」，点击后调 setTheme('dark')", async () => {
    const setTheme = vi.fn();
    useThemeMock.mockReturnValue({ resolvedTheme: "light", setTheme });
    render(<ThemeToggle />);

    const btn = screen.getByRole("button", { name: "切换到深色模式" });
    await userEvent.click(btn);
    expect(setTheme).toHaveBeenCalledWith("dark");
  });
});
