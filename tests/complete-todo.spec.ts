// spec: specs/complete-todo.md
// seed: tests/seed.spec.ts

import { test, expect } from "@playwright/test";
import { gotoApp } from "./_helpers";

test.describe("Completing Todos", () => {
  test("Complete a todo decrements the remaining count", async ({ page }) => {
    // 1. Open the app and verify the blank initial state
    await gotoApp(page);
    await expect(page).toHaveScreenshot("01-blank-app.png");
    await expect(
      page.getByRole("textbox", { name: "What needs to be done?" })
    ).toBeVisible();
    await expect(page.getByTestId("todo-item")).toHaveCount(0);
    await expect(page.getByTestId("remaining")).toHaveText("0 items left");

    // 2. Type "Buy groceries" into the textbox "What needs to be done?"
    await page
      .getByRole("textbox", { name: "What needs to be done?" })
      .fill("Buy groceries");
    await expect(
      page.getByRole("textbox", { name: "What needs to be done?" })
    ).toHaveValue("Buy groceries");

    // 3. Click the "Add" button
    await page.getByRole("button", { name: "Add" }).click();
    await expect(
      page.getByRole("checkbox", { name: "toggle Buy groceries" })
    ).toBeVisible();
    await expect(
      page.getByRole("checkbox", { name: "toggle Buy groceries" })
    ).not.toBeChecked();
    await expect(
      page.getByRole("button", { name: "delete Buy groceries" })
    ).toBeVisible();
    await expect(page.getByTestId("remaining")).toHaveText("1 item left");

    // 4. Click the checkbox labelled "toggle Buy groceries" to complete the todo
    await page.getByRole("checkbox", { name: "toggle Buy groceries" }).click();
    await expect(
      page.getByRole("checkbox", { name: "toggle Buy groceries" })
    ).toBeChecked();
    await expect(page.getByTestId("remaining")).toHaveText("0 items left");
    await expect(page).toHaveScreenshot("02-todo-completed.png");
  });
});
