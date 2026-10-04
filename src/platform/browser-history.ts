import { isExtension } from "./chrome-storage";

export type BrowserHistoryEntry = {
  url: string;
  title: string;
  visitedAt: number;
};

const permission = { permissions: ["history" as const] };

export function isBrowserHistoryAvailable() {
  return isExtension() && "permissions" in chrome;
}

export async function hasBrowserHistoryAccess() {
  return isBrowserHistoryAvailable() && chrome.permissions.contains(permission);
}

export function requestBrowserHistoryAccess() {
  return chrome.permissions.request(permission);
}

export async function getRecentBrowserHistory(): Promise<BrowserHistoryEntry[]> {
  const results = await chrome.history.search({ text: "", startTime: 0, maxResults: 50 });
  return results
    .flatMap((item) => {
      if (!item.url) return [];
      try {
        const url = new URL(item.url);
        if (url.protocol !== "http:" && url.protocol !== "https:") return [];
        return [{
          url: item.url,
          title: item.title?.trim() || url.hostname,
          visitedAt: item.lastVisitTime ?? 0,
        }];
      } catch {
        return [];
      }
    })
    .sort((a, b) => b.visitedAt - a.visitedAt)
    .slice(0, 20);
}

export function openNativeHistory() {
  return chrome.tabs.create({ url: "chrome://history/" });
}
