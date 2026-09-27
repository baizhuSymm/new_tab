import type { SearchEngine, Shortcut } from "../../domain/types";
import { normalizeWebUrl } from "../../domain/urls";
export function resolveSearch(
  input: string,
  engine: SearchEngine,
): { kind: "url" | "search"; url: string } | null {
  const value = input.trim();
  if (!value) return null;
  if (
    /^(?:javascript|data|file|vbscript|blob|about|chrome|chrome-extension|edge|ftp):/i.test(
      value,
    )
  )
    return null;
  const website = normalizeWebUrl(value);
  if (website) return { kind: "url", url: website };
  const url = new URL(
    engine === "google"
      ? "https://www.google.com/search"
      : engine === "baidu"
        ? "https://www.baidu.com/s"
        : "https://www.bing.com/search",
  );
  url.searchParams.set(engine === "baidu" ? "wd" : "q", value);
  return { kind: "search", url: url.href };
}
export function matchShortcuts(input: string, shortcuts: Shortcut[]) {
  const q = input.trim().toLowerCase();
  return q
    ? shortcuts
        .filter((s) => `${s.name} ${s.url}`.toLowerCase().includes(q))
        .slice(0, 6)
    : [];
}
