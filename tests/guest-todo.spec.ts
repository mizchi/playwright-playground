import { test, expect } from "@playwright/test";
import { gotoApp } from "./_helpers";

// 仕様: ゲストで TODO を2件追加し、1件を完了にする
test("guest adds two todos and completes one", async ({ page }) => {
  await gotoApp(page);
  await expect(page).toHaveScreenshot("01-empty.png");

  await page.getByPlaceholder("What needs to be done?").fill("Buy milk");
  await page.getByRole("button", { name: "Add" }).click();
  await page.getByPlaceholder("What needs to be done?").fill("Walk dog");
  await page.getByRole("button", { name: "Add" }).click();

  await expect(page.getByTestId("todo-item")).toHaveCount(2);
  await expect(page.getByTestId("remaining")).toHaveText("2 items left");

  await page.getByRole("checkbox", { name: "toggle Buy milk" }).check();

  await expect(page.getByTestId("remaining")).toHaveText("1 item left");
  await expect(page).toHaveScreenshot("02-goal.png");
});
