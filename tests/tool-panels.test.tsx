import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { getToolDefinition, toolDefinitions } from "../src/features/tools/registry";

afterEach(() => vi.restoreAllMocks());

test("the four built-in tools each have one registered panel", () => {
  expect(toolDefinitions.map((tool) => tool.id)).toEqual([
    "openclaw", "calculator", "translator", "document-converter",
  ]);
  for (const tool of toolDefinitions)
    expect(getToolDefinition(tool.id).Panel).toBeTruthy();
});

test("OpenClaw keeps its honest connection state and local console action", async () => {
  const open = vi.spyOn(window, "open").mockReturnValue(null);
  const Panel = getToolDefinition("openclaw").Panel;
  render(<Panel />);
  expect(screen.getByRole("region", { name: "OpenClaw 对话" })).toBeInTheDocument();
  expect(screen.getByLabelText("发送给 OpenClaw 的消息")).toBeDisabled();
  await userEvent.click(screen.getByRole("button", { name: "打开 OpenClaw 控制台" }));
  expect(open).toHaveBeenCalledWith(
    "http://127.0.0.1:18789/", "_blank", "noopener,noreferrer",
  );
});

test("calculator keys change the expression but do not fabricate a result", async () => {
  const Panel = getToolDefinition("calculator").Panel;
  render(<Panel />);
  for (const key of ["1", "+", "2"])
    await userEvent.click(screen.getByRole("button", { name: key }));
  expect(screen.getByLabelText("计算表达式")).toHaveTextContent("1+2");
  await userEvent.click(screen.getByRole("button", { name: "=" }));
  expect(screen.getByRole("status", { name: "操作提示" })).toHaveTextContent("计算功能尚未接入");
  expect(screen.getByLabelText("计算表达式")).toHaveTextContent("1+2");
});

test("translation input and language choices work without fake translation", async () => {
  const Panel = getToolDefinition("translator").Panel;
  render(<Panel />);
  const text = "你好，世界！".repeat(40);
  fireEvent.change(screen.getByRole("textbox", { name: "待翻译文本" }), { target: { value: text } });
  await userEvent.selectOptions(screen.getByLabelText("目标语言"), "en");
  expect(screen.getByRole("textbox", { name: "待翻译文本" })).toHaveValue(text);
  await userEvent.click(screen.getByRole("button", { name: "翻译" }));
  expect(screen.getByRole("status")).toHaveTextContent("翻译服务尚未接入");
  expect(screen.queryByText("Hello, world!")).not.toBeInTheDocument();
});

test("document demo shows a file name but never reads or converts it", async () => {
  const Panel = getToolDefinition("document-converter").Panel;
  render(<Panel />);
  const file = new File(["private contents"], `${"长文件名".repeat(30)}.txt`, { type: "text/plain" });
  const read = vi.fn();
  Object.defineProperty(file, "arrayBuffer", { value: read });
  await userEvent.upload(screen.getByLabelText("选择文档"), file);
  expect(screen.getByText(file.name)).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "转换文档" }));
  expect(screen.getByRole("status")).toHaveTextContent("转换功能尚未接入");
  expect(read).not.toHaveBeenCalled();
  expect(screen.queryByRole("link", { name: /下载/ })).not.toBeInTheDocument();
});
