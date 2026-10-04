import { beforeEach, afterEach, expect, test, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../src/app/App";

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

test("add and remove happen on a separate page and persist on home", async () => {
  const user = userEvent.setup();
  const view = render(<App />);
  await user.click(await screen.findByRole("button", { name: "添加工具" }));
  expect(screen.getByRole("heading", { name: "工具中心" })).toBeInTheDocument();
  expect(screen.queryByRole("region", { name: "首页工具栏" })).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "预览 翻译" }));
  expect(screen.getByRole("region", { name: "翻译操作区" })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "添加翻译到首页" }));
  expect(await screen.findByRole("button", { name: "移除翻译" })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "返回首页" }));
  expect(within(screen.getByRole("region", { name: "首页工具栏" })).getByRole("button", { name: "翻译" })).toBeInTheDocument();
  view.unmount();
  render(<App />);
  expect(await screen.findByRole("button", { name: "翻译" })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "添加工具" }));
  await user.click(screen.getByRole("button", { name: "移除翻译" }));
  await user.click(screen.getByRole("button", { name: "返回首页" }));
  expect(within(screen.getByRole("region", { name: "首页工具栏" })).queryByRole("button", { name: "翻译" })).not.toBeInTheDocument();
});

test("categories support keyboard filtering and change hidden previews", async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(await screen.findByRole("button", { name: "添加工具" }));
  const textCategory = screen.getByRole("button", { name: "文本" });
  textCategory.focus();
  await user.keyboard("{Enter}");
  expect(textCategory).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "预览 翻译" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "预览 文档转换" })).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "文件" }));
  expect(screen.getByRole("region", { name: "文档转换操作区" })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "常用" }));
  expect(screen.getByRole("region", { name: "OpenClaw 对话" })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "移除OpenClaw" }));
  expect(await screen.findByText("此分类暂无工具")).toBeInTheDocument();
});

test("a rejected save keeps the previous home selection and shows an error", async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(await screen.findByRole("button", { name: "添加工具" }));
  const originalSet = Storage.prototype.setItem;
  const write = vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key, value) {
    if (key.endsWith("toolSelection")) throw Error("quota exceeded");
    return originalSet.call(this, key, value);
  });
  await user.click(screen.getByRole("button", { name: "添加翻译到首页" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("quota exceeded");
  write.mockRestore();
  await user.click(screen.getByRole("button", { name: "返回首页" }));
  expect(screen.queryByRole("button", { name: "翻译" })).not.toBeInTheDocument();
});
