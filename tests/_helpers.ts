import type { Page } from "@playwright/test";

// VRT を安定させるための共通スタイル注入と初期化。
// planner/generator はこのファイルを読んで前提（決定論レイヤー）を把握すること。
export async function gotoApp(page: Page): Promise<void> {
  await page.goto("/");
  await page.addStyleTag({
    content: `*, *::before, *::after { transition: none !important; animation: none !important; }
              * { caret-color: transparent !important; }`,
  });
  await page.evaluate(() => document.fonts.ready);
}
