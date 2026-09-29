import { test, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../src/app/App";
import { createRepository } from "../src/data/repository";
import { webStorage } from "../src/platform/web-storage";

test("wallpaper gallery switches built-ins and preserves selection on apply", async () => {
  render(<App />);
  await userEvent.click(await screen.findByRole("button", { name: "壁纸" }));
  expect(screen.getByRole("dialog", { name: "壁纸" })).toBeInTheDocument();
  const forest = screen.getByRole("button", { name: /林间湖泊/ });
  await userEvent.click(forest);
  expect(forest).toHaveAttribute("aria-pressed", "true");
  await userEvent.click(screen.getByRole("button", { name: "应用壁纸" }));
  expect(await screen.findByRole("button", { name: "壁纸" })).toBeInTheDocument();
  expect(document.querySelector('img[alt="城市晨光壁纸"]')).toHaveAttribute("src", "/wallpapers/forest-lake.webp");
});

test("dark theme selection applies to the document and persists", async () => {
  render(<App />);
  await userEvent.click(await screen.findByRole("button", { name: "设置" }));
  await userEvent.selectOptions(screen.getByLabelText("外观主题"), "dark");
  expect(document.documentElement).toHaveAttribute("data-theme", "dark");
  expect(localStorage.getItem("personal-tab:settings")).toContain('"theme":"dark"');
});

test("each built-in wallpaper keeps its crop when switching away and back", async () => {
  render(<App />);
  await userEvent.click(await screen.findByRole("button", { name: "壁纸" }));
  await userEvent.click(screen.getByRole("button", { name: /林间湖泊/ }));
  fireEvent.change(screen.getByLabelText("水平位置"), { target: { value: "20" } });
  await userEvent.click(screen.getByRole("button", { name: "应用壁纸" }));
  await userEvent.click(screen.getByRole("button", { name: "壁纸" }));
  await userEvent.click(screen.getByRole("button", { name: /雪山晨光/ }));
  expect(screen.getByLabelText("水平位置")).toHaveValue("50");
  await userEvent.click(screen.getByRole("button", { name: "应用壁纸" }));
  await userEvent.click(screen.getByRole("button", { name: "壁纸" }));
  await userEvent.click(screen.getByRole("button", { name: /林间湖泊/ }));
  expect(screen.getByLabelText("水平位置")).toHaveValue("20");
});

test("active custom wallpaper cannot be deleted before another is applied", async () => {
  const repository = createRepository(webStorage());
  await repository.load();
  const asset = { id: "test-upload", dataUrl: "data:image/webp;base64,YQ==", mimeType: "image/webp", byteLength: 1, positionX: 50, positionY: 50 };
  await repository.save("wallpaper", asset);
  await repository.applyWallpaperId(asset.id, { positionX: 50, positionY: 50 });
  render(<App />);
  await userEvent.click(await screen.findByRole("button", { name: "壁纸" }));
  expect(screen.getByRole("button", { name: "删除自定义壁纸" })).toBeDisabled();
  await userEvent.click(screen.getByRole("button", { name: /城市晨光/ }));
  await userEvent.click(screen.getByRole("button", { name: "应用壁纸" }));
  await userEvent.click(screen.getByRole("button", { name: "壁纸" }));
  vi.spyOn(window, "confirm").mockReturnValue(true);
  await userEvent.click(screen.getByRole("button", { name: "删除自定义壁纸" }));
  expect(await repository.load()).toMatchObject({ wallpapers: [] });
});
