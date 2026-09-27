import { test, expect } from "vitest";
import { normalizeWebUrl } from "../src/domain/urls";
import {
  resolveSearch,
  matchShortcuts,
} from "../src/features/search/resolveSearch";
import { seedShortcuts } from "../src/domain/defaults";
test("normalizes domains and refuses executable protocols", () => {
  expect(normalizeWebUrl(" example.com ")).toBe("https://example.com/");
  expect(normalizeWebUrl("localhost:3000")).toBe("https://localhost:3000/");
  for (const value of [
    " JavaScript:alert(1)",
    "DATA:text/html,x",
    "file:///tmp",
    "https://",
    "hello",
    "https://user:pass@example.com",
  ])
    expect(normalizeWebUrl(value)).toBeNull();
});
test("resolves phrases, blank input and explicit unsafe schemes", () => {
  expect(resolveSearch("example.com", "bing")?.kind).toBe("url");
  expect(resolveSearch("你好 世界", "google")?.url).toBe(
    "https://www.google.com/search?q=%E4%BD%A0%E5%A5%BD+%E4%B8%96%E7%95%8C",
  );
  expect(resolveSearch("  ", "bing")).toBeNull();
  expect(resolveSearch("JaVaScRiPt:alert(1)", "bing")).toBeNull();
  expect(resolveSearch("主题:旅行", "bing")?.kind).toBe("search");
  expect(matchShortcuts("g", seedShortcuts).length).toBeLessThanOrEqual(6);
});
