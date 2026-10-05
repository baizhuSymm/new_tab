import { isExtension } from "./chrome-storage";

export type BrowserHistoryEntry = {
  url: string;
  title: string;
  visitedAt: number;
};

const permission = { permissions: ["history" as const] };
const faviconPermission = { permissions: ["favicon" as const] };

export function isBrowserHistoryAvailable() {
  return isExtension() && "permissions" in chrome;
}

export async function hasBrowserHistoryAccess() {
  return isBrowserHistoryAvailable() && chrome.permissions.contains(permission);
}

export function requestBrowserHistoryAccess() {
  return chrome.permissions.request({ permissions: ["history", "favicon"] });
}

export async function hasBrowserFaviconAccess() {
  if (!isBrowserHistoryAvailable()) return false;
  try {
    return await chrome.permissions.contains(faviconPermission);
  } catch {
    return false;
  }
}

export function requestBrowserFaviconAccess() {
  return chrome.permissions.request(faviconPermission);
}

export function getBrowserFaviconUrl(pageUrl: string) {
  if (!isExtension()) return null;
  const url = new URL(chrome.runtime.getURL("/_favicon/"));
  url.searchParams.set("pageUrl", pageUrl);
  url.searchParams.set("size", "32");
  return url.toString();
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
