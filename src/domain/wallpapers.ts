import type { Settings } from "./types";

export const builtinWallpapers = [
  { id: "city", name: "城市晨光", src: "/wallpapers/city-panorama.png" },
  { id: "forest", name: "林间湖泊", src: "/wallpapers/forest-lake.webp" },
  { id: "alpine", name: "雪山晨光", src: "/wallpapers/alpine-dawn.webp" },
] as const;

export function getWallpaperPosition(settings: Pick<Settings, "wallpaperPositions">, id: string) {
  return settings.wallpaperPositions[id] ?? { positionX: 50, positionY: 50 };
}
