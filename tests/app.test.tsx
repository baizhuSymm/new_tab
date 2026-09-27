import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { test, expect } from "vitest";
import { App } from "../src/app/App";

test("navigation opens settings and closing restores focus", async () => {
  render(<App />);
  const settings = await screen.findByRole("button", { name: "设置" });
  await userEvent.click(settings);
  expect(screen.getByRole("dialog", { name: "设置" })).toBeInTheDocument();
  await userEvent.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(settings).toHaveFocus();
});
