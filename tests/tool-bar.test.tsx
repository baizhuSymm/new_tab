import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { ToolBar } from "../src/features/tools/ToolBar";

test("home bar shows only selected tools and keeps add at the end", () => {
  const onAdd = vi.fn();
  render(<ToolBar selection={{ version: 1, ids: ["openclaw", "calculator", "future-tool"] }} onAdd={onAdd} />);
  const bar = screen.getByRole("region", { name: "首页工具栏" });
  const buttons = within(bar).getAllByRole("button");
  expect(buttons.map((button) => button.textContent)).toEqual(["OpenClaw", "计算器", "添加"]);
  expect(buttons[0]).toHaveAttribute("aria-expanded", "false");
  expect(buttons[2]).toHaveAccessibleName("添加工具");
});

test("empty selection still allows opening the tool center", async () => {
  const onAdd = vi.fn();
  render(<ToolBar selection={{ version: 1, ids: [] }} onAdd={onAdd} />);
  expect(screen.queryByRole("button", { name: "OpenClaw" })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "添加工具" }));
  expect(onAdd).toHaveBeenCalledOnce();
});

test("tool buttons switch a single panel and support keyboard toggle", async () => {
  const user = userEvent.setup();
  render(<ToolBar selection={{ version: 1, ids: ["openclaw", "calculator"] }} onAdd={() => {}} />);
  const openClaw = screen.getByRole("button", { name: "OpenClaw" });
  openClaw.focus();
  await user.keyboard("{Enter}");
  expect(openClaw).toHaveAttribute("aria-expanded", "true");
  expect(openClaw).toHaveAttribute("aria-controls", "tool-panel-openclaw");
  expect(screen.getByRole("region", { name: "OpenClaw 对话" })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "计算器" }));
  expect(screen.queryByRole("region", { name: "OpenClaw 对话" })).not.toBeInTheDocument();
  expect(screen.getByRole("region", { name: "计算器操作区" })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "计算器" }));
  expect(screen.queryByRole("region", { name: "计算器操作区" })).not.toBeInTheDocument();
});

test("removing an active tool closes its panel even if it is later added again", async () => {
  const onAdd = vi.fn();
  const { rerender } = render(<ToolBar selection={{ version: 1, ids: ["openclaw", "calculator"] }} onAdd={onAdd} />);
  await userEvent.click(screen.getByRole("button", { name: "计算器" }));
  rerender(<ToolBar selection={{ version: 1, ids: ["openclaw"] }} onAdd={onAdd} />);
  expect(screen.queryByRole("region", { name: "计算器操作区" })).not.toBeInTheDocument();
  rerender(<ToolBar selection={{ version: 1, ids: ["openclaw", "calculator"] }} onAdd={onAdd} />);
  expect(screen.getByRole("button", { name: "计算器" })).toHaveAttribute("aria-expanded", "false");
});
