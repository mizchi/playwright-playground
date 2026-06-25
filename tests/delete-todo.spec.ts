// spec: specs/delete-todo.md
// seed: tests/seed.spec.ts
import { test, expect } from "@playwright/test";
import { gotoApp } from "./_helpers";

test.describe("Deleting Todos", () => {
  test("Add then delete returns to empty state", async ({ page }) => {
    // 1. アプリを開く（空状態）
    await gotoApp(page);
    await expect(page.getByTestId("todo-item")).toHaveCount(0);
    await expect(page.getByTestId("remaining")).toHaveText("0 items left");
    await expect(page).toHaveScreenshot("01-empty.png");

    // 2. "Read mail" を入力して Add
    await page.getByPlaceholder("What needs to be done?").fill("Read mail");
    await page.getByRole("button", { name: "Add" }).click();

    // 3. 1件表示され "1 item left"
    await expect(page.getByTestId("todo-item")).toHaveCount(1);
    await expect(page.getByTestId("remaining")).toHaveText("1 item left");

    // 4. Delete を押す
    await page.getByRole("button", { name: "delete Read mail" }).click();

    // goal: 空状態に復帰
    await expect(page.getByTestId("todo-item")).toHaveCount(0);
    await expect(page.getByTestId("remaining")).toHaveText("0 items left");
    await expect(page).toHaveScreenshot("02-goal.png");
  });
});
