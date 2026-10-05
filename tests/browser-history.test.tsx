import { afterEach, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserHistory } from "../src/features/history/BrowserHistory";
import { getBrowserFaviconUrl, getRecentBrowserHistory } from "../src/platform/browser-history";

afterEach(() => vi.unstubAllGlobals());

test("browser history reads recent real URLs in visit order", async () => {
  const search = vi.fn().mockResolvedValue([
    { id: "older", url: "https://older.example/a", title: "较早", lastVisitTime: 100 },
    { id: "internal", url: "chrome://settings/", title: "设置", lastVisitTime: 400 },
    { id: "newer", url: "https://newer.example/b", title: "较新", lastVisitTime: 300 },
  ]);
  vi.stubGlobal("chrome", { runtime: { id: "extension-test" }, history: { search } });
  await expect(getRecentBrowserHistory()).resolves.toEqual([
    { url: "https://newer.example/b", title: "较新", visitedAt: 300 },
    { url: "https://older.example/a", title: "较早", visitedAt: 100 },
  ]);
  expect(search).toHaveBeenCalledWith({ text: "", startTime: 0, maxResults: 50 });
});

test("history access is requested only after clicking enable", async () => {
  const request = vi.fn().mockResolvedValue(true);
  const contains = vi.fn().mockResolvedValue(false);
  const search = vi.fn().mockResolvedValue([
    { id: "site", url: "https://example.com/read", title: "文章", lastVisitTime: Date.now() },
  ]);
  const onOpen = vi.fn();
  vi.stubGlobal("chrome", {
    runtime: { id: "extension-test" },
    permissions: { contains, request },
    history: { search, onVisited: { addListener: vi.fn(), removeListener: vi.fn() }, onVisitRemoved: { addListener: vi.fn(), removeListener: vi.fn() } },
  });
  render(<BrowserHistory onOpen={onOpen} />);
  expect(await screen.findByRole("button", { name: "启用浏览历史" })).toBeInTheDocument();
  expect(request).not.toHaveBeenCalled();
  expect(search).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole("button", { name: "启用浏览历史" }));
  expect(request).toHaveBeenCalledWith({ permissions: ["history", "favicon"] });
  const site = await screen.findByRole("button", { name: /文章/ });
  expect(site).toHaveTextContent("example.com");
  await userEvent.click(site);
  expect(onOpen).toHaveBeenCalledWith("https://example.com/read");
});

test("denied history access does not read browsing data", async () => {
  const request = vi.fn().mockResolvedValue(false);
  const search = vi.fn();
  vi.stubGlobal("chrome", {
    runtime: { id: "extension-test" },
    permissions: { contains: vi.fn().mockResolvedValue(false), request },
    history: { search, onVisited: { addListener: vi.fn(), removeListener: vi.fn() }, onVisitRemoved: { addListener: vi.fn(), removeListener: vi.fn() } },
  });
  render(<BrowserHistory onOpen={() => {}} />);
  await userEvent.click(await screen.findByRole("button", { name: "启用浏览历史" }));
  expect(screen.getByRole("button", { name: "启用浏览历史" })).toBeInTheDocument();
  expect(search).not.toHaveBeenCalled();
});

test("web preview explains that real browser history needs the extension", () => {
  render(<BrowserHistory onOpen={() => {}} />);
  expect(screen.getByText("浏览历史仅在浏览器扩展中显示")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "启用浏览历史" })).not.toBeInTheDocument();
});

test("optional history permission can be offered before its API is exposed", async () => {
  vi.stubGlobal("chrome", {
    runtime: { id: "extension-test" },
    permissions: { contains: vi.fn().mockResolvedValue(false), request: vi.fn() },
  });
  render(<BrowserHistory onOpen={() => {}} />);
  expect(await screen.findByRole("button", { name: "启用浏览历史" })).toBeInTheDocument();
});

test("browser favicon URL uses the browser cache for the visited page", () => {
  vi.stubGlobal("chrome", {
    runtime: { id: "extension-test", getURL: (path: string) => `chrome-extension://extension-test${path}` },
  });
  expect(getBrowserFaviconUrl("https://example.com/read?q=1")).toBe(
    "chrome-extension://extension-test/_favicon/?pageUrl=https%3A%2F%2Fexample.com%2Fread%3Fq%3D1&size=32",
  );
});

test("existing history users can enable site icons with a click", async () => {
  let faviconGranted = false;
  const request = vi.fn().mockImplementation(async () => { faviconGranted = true; return true; });
  vi.stubGlobal("chrome", {
    runtime: { id: "extension-test", getURL: (path: string) => `chrome-extension://extension-test${path}` },
    permissions: {
      contains: vi.fn().mockImplementation(async ({ permissions }) => permissions[0] === "history" || faviconGranted),
      request,
    },
    history: {
      search: vi.fn().mockResolvedValue([{ url: "https://example.com/read", title: "文章", lastVisitTime: Date.now() }]),
      onVisited: { addListener: vi.fn(), removeListener: vi.fn() },
      onVisitRemoved: { addListener: vi.fn(), removeListener: vi.fn() },
    },
  });
  render(<BrowserHistory onOpen={() => {}} />);
  const site = await screen.findByRole("button", { name: /文章/ });
  expect(site.querySelector("img")).toBeNull();
  await userEvent.click(screen.getByRole("button", { name: "显示网站图标" }));
  expect(request).toHaveBeenCalledWith({ permissions: ["favicon"] });
  expect((await screen.findByRole("button", { name: /文章/ })).querySelector("img")).toHaveAttribute(
    "src", expect.stringContaining("/_favicon/?pageUrl="),
  );
});
