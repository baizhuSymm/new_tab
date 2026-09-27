import { readFile, access } from "node:fs/promises";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
const root = resolve("dist");
const manifest = JSON.parse(
  await readFile(resolve(root, "manifest.json"), "utf8"),
);
if (
  manifest.manifest_version !== 3 ||
  manifest.chrome_url_overrides.newtab !== "index.html"
)
  throw Error("Invalid extension manifest");
for (const path of Object.values(manifest.icons))
  await access(resolve(root, path));
const html = await readFile(
  resolve(root, manifest.chrome_url_overrides.newtab),
  "utf8",
);
const doc = new JSDOM(html).window.document;
for (const node of doc.querySelectorAll("script[src],link[href]")) {
  const path = node.getAttribute("src") ?? node.getAttribute("href");
  if (!path.startsWith("./"))
    throw Error(`Non-relative bundle reference: ${path}`);
  await access(resolve(root, path));
  if (node.tagName === "SCRIPT") {
    const code = await readFile(resolve(root, path), "utf8");
    if (/[@]vite\/client|react-refresh|import\s*\(?["']https?:/.test(code))
      throw Error("Development or remote script found");
  }
}
console.log(
  "Manifest, local entry points, icons and production script checks passed.",
);
