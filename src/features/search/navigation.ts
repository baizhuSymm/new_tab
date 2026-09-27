import type { Settings } from "../../domain/types";
export function openDestination(url: string, target: Settings["openTarget"]) {
  if (target === "new") window.open(url, "_blank", "noopener,noreferrer");
  else window.location.assign(url);
}
