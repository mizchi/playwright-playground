import { test, expect } from "@playwright/test";
import { gotoApp } from "./_helpers";

// Seed: 環境が立ち上がり初期状態が空であることを保証する。
// planner はこれを実行して環境を把握する。
test("seed: app boots with empty state", async ({ page }) => {
  await gotoApp(page);
  await expect(page.getByRole("heading", { name: "TODO" })).toBeVisible();
  await expect(page.getByTestId("todo-item")).toHaveCount(0);
  await expect(page.getByTestId("remaining")).toHaveText("0 items left");
});
