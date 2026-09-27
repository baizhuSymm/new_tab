import { chromium } from "@playwright/test";
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:5173");
  await page.getByRole("heading", { name: "常用", exact: true }).waitFor();
  const session = await page.context().newCDPSession(page);
  await session.send("DOM.enable");
  await session.send("CSS.enable");
  const { root } = await session.send("DOM.getDocument");
  for (const selector of [
    "h2",
    "time",
    "[data-module=shortcuts] button span:last-of-type",
  ]) {
    const { nodeId } = await session.send("DOM.querySelector", {
      nodeId: root.nodeId,
      selector,
    });
    console.log(
      selector,
      JSON.stringify(
        await session.send("CSS.getPlatformFontsForNode", { nodeId }),
      ),
    );
  }
} finally {
  await browser.close();
}
