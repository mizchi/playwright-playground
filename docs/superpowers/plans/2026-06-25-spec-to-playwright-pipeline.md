# Spec-to-Playwright Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 自然言語仕様 → ブラウザ探索 → VRT 付き Playwright テスト出力 → 連続2回 green で再現性確認、までを段階式で回すパイプラインを、公式 test-agents を土台に構築する。

**Architecture:** 公式 `init-agents` の planner/generator/healer を土台に、VRT の決定性を `playwright.config.ts` + `tests/seed.spec.ts` + `specs/_generation-rules.md` の規約レイヤーで固める（設計書 案B）。テスト対象は同梱 Vite + Vanilla TS の TODO アプリ。

**Tech Stack:** pnpm, TypeScript, Vite, @playwright/test, pkfire (Taskfile.pkl), GitHub Actions, secretlint

---

## File Structure

- `package.json`, `pnpm-workspace.yaml` — ルート。app と test を1パッケージで扱う（単純化）
- `app/` — Vite + Vanilla TS の TODO アプリ（SUT）
- `tests/seed.spec.ts` — 環境 bootstrap + 決定論ヘルパ
- `tests/guest-todo.spec.ts` — 最初の手書き e2e（パイプライン到達目標。後で generator 出力に置き換え可能な参照実装）
- `playwright.config.ts` — webServer / 決定論 use / VRT 設定
- `specs/_generation-rules.md` — generator 強制規約
- `Taskfile.pkl` — plan/generate/verify/heal タスク
- `.github/workflows/ci.yml` — 自己テスト CI
- `.envrc`, `flake.nix`, `apm.yml` — CLAUDE.md 準拠

---

## Task 1: Repo scaffolding

**Files:**
- Create: `package.json`, `.gitignore`, `.node-version`

- [ ] **Step 1: package.json**

```json
{
  "name": "playwright-playground",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@9.0.0",
  "scripts": {
    "app:build": "vite build app",
    "app:preview": "vite preview app --port 4173 --strictPort",
    "test": "playwright test"
  },
  "devDependencies": {
    "@playwright/test": "^1.49.0",
    "vite": "^6.0.0",
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 2: .gitignore**

```
node_modules/
app/dist/
test-results/
playwright-report/
blob-report/
.DS_Store
```

- [ ] **Step 3: .node-version** → `24`

- [ ] **Step 4: install & commit**

Run: `pnpm install`
Then: `git add -A && git commit -m "chore: scaffold repo"`

---

## Task 2: Sample Vite + Vanilla TS TODO app

**Files:**
- Create: `app/index.html`, `app/src/main.ts`, `app/src/style.css`, `app/vite.config.ts`

決定論性のため: アニメ無し、日時/ランダム無し、localStorage 永続無し、初期状態は空。

- [ ] **Step 1: app/vite.config.ts**

```ts
import { defineConfig } from "vite";
export default defineConfig({ root: "app", build: { outDir: "dist" } });
```

- [ ] **Step 2: app/index.html**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>TODO</title>
    <link rel="stylesheet" href="./src/style.css" />
  </head>
  <body>
    <main>
      <h1>TODO</h1>
      <form id="new-todo-form">
        <input id="new-todo" placeholder="What needs to be done?" autocomplete="off" />
        <button type="submit">Add</button>
      </form>
      <ul id="todo-list" data-testid="todo-list"></ul>
      <p id="remaining" data-testid="remaining">0 items left</p>
    </main>
    <script type="module" src="./src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 3: app/src/style.css**

```css
* { box-sizing: border-box; }
body { font-family: system-ui, sans-serif; margin: 0; background: #fff; color: #111; }
main { max-width: 480px; margin: 40px auto; padding: 0 16px; }
form { display: flex; gap: 8px; }
#new-todo { flex: 1; padding: 8px; }
ul { list-style: none; padding: 0; }
li { display: flex; gap: 8px; align-items: center; padding: 8px 0; border-bottom: 1px solid #eee; }
li.done span { text-decoration: line-through; color: #999; }
li span { flex: 1; }
```

- [ ] **Step 4: app/src/main.ts**

```ts
interface Todo { id: number; title: string; done: boolean; }

const state: { todos: Todo[]; nextId: number } = { todos: [], nextId: 1 };

const list = document.querySelector<HTMLUListElement>("#todo-list")!;
const remaining = document.querySelector<HTMLParagraphElement>("#remaining")!;
const form = document.querySelector<HTMLFormElement>("#new-todo-form")!;
const input = document.querySelector<HTMLInputElement>("#new-todo")!;

function render(): void {
  list.innerHTML = "";
  for (const todo of state.todos) {
    const li = document.createElement("li");
    li.className = todo.done ? "done" : "";
    li.dataset.testid = "todo-item";

    const toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.checked = todo.done;
    toggle.setAttribute("aria-label", `toggle ${todo.title}`);
    toggle.addEventListener("change", () => {
      todo.done = toggle.checked;
      render();
    });

    const span = document.createElement("span");
    span.textContent = todo.title;

    const del = document.createElement("button");
    del.textContent = "Delete";
    del.setAttribute("aria-label", `delete ${todo.title}`);
    del.addEventListener("click", () => {
      state.todos = state.todos.filter((t) => t.id !== todo.id);
      render();
    });

    li.append(toggle, span, del);
    list.append(li);
  }
  const left = state.todos.filter((t) => !t.done).length;
  remaining.textContent = `${left} item${left === 1 ? "" : "s"} left`;
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const title = input.value.trim();
  if (!title) return;
  state.todos.push({ id: state.nextId++, title, done: false });
  input.value = "";
  render();
});

render();
```

- [ ] **Step 5: verify build & manual serve**

Run: `pnpm app:build`
Expected: `app/dist/index.html` 生成、エラー無し。

- [ ] **Step 6: commit** → `git add -A && git commit -m "feat: sample vite todo app"`

---

## Task 3: Playwright deterministic config + seed

**Files:**
- Create: `playwright.config.ts`, `tests/seed.spec.ts`, `tests/_helpers.ts`

- [ ] **Step 1: install browsers**

Run: `pnpm exec playwright install chromium`

- [ ] **Step 2: playwright.config.ts**

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? "blob" : "list",
  webServer: {
    command: "pnpm app:build && pnpm app:preview",
    url: "http://localhost:4173",
    reuseExistingServer: false,
    timeout: 120_000,
  },
  use: {
    baseURL: "http://localhost:4173",
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    colorScheme: "light",
    locale: "en-US",
    timezoneId: "UTC",
    ...devices["Desktop Chrome"],
  },
  expect: {
    toHaveScreenshot: { animations: "disabled", maxDiffPixelRatio: 0.01 },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
```

- [ ] **Step 3: tests/_helpers.ts**（決定論共通レイヤー）

```ts
import type { Page } from "@playwright/test";

// VRT を安定させるための共通スタイル注入と初期化。
// planner/generator はこのファイルを読んで前提を把握すること。
export async function gotoApp(page: Page): Promise<void> {
  await page.goto("/");
  await page.addStyleTag({
    content: `*, *::before, *::after { transition: none !important; animation: none !important; }
              * { caret-color: transparent !important; }`,
  });
  await page.evaluate(() => document.fonts.ready);
}
```

- [ ] **Step 4: tests/seed.spec.ts**

```ts
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
```

- [ ] **Step 5: run seed**

Run: `pnpm exec playwright test seed`
Expected: PASS（webServer が build+preview を起動し緑）

- [ ] **Step 6: commit** → `git add -A && git commit -m "feat: playwright deterministic config + seed"`

---

## Task 4: 最初の手書き e2e（パイプライン到達目標 + VRT 確立）

**Files:**
- Create: `tests/guest-todo.spec.ts`

これは「generator がいずれ出力すべきテストの参照実装」。VRT が安定して2回 green になることをここで実証する。

- [ ] **Step 1: tests/guest-todo.spec.ts**

```ts
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
```

- [ ] **Step 2: baseline 撮影**

Run: `pnpm exec playwright test guest-todo --update-snapshots`
Expected: PASS、`tests/guest-todo.spec.ts-snapshots/` に png 生成

- [ ] **Step 3: 再現性確認（連続2回）**

Run: `pnpm exec playwright test guest-todo && pnpm exec playwright test guest-todo`
Expected: 両方 PASS（VRT diff 閾値内）

- [ ] **Step 4: commit（baseline 含む）** → `git add -A && git commit -m "test: guest todo e2e with VRT baseline"`

---

## Task 5: Generator 強制規約 doc

**Files:**
- Create: `specs/_generation-rules.md`

- [ ] **Step 1: specs/_generation-rules.md**

```markdown
# Generation Rules (generator が必ず守る規約)

テストを生成するとき、以下を厳守する。

## 決定論
- 各テストの冒頭で `import { gotoApp } from "./_helpers"` を使い `await gotoApp(page)` で開く。
  直接 `page.goto` しない（決定論スタイル注入のため）。

## VRT
- 各シナリオの「開始直後」と「ゴール到達時」に必ず `await expect(page).toHaveScreenshot("<NN-step>.png")` を入れる。
- 動的・可変領域があれば `toHaveScreenshot({ mask: [locator] })` でマスクする。
- VRT は意味的検証の代替ではない。状態は必ず `expect(locator)` でも検証する（カウント・テキスト等）。

## セレクタ
- role / testid / label ベースを優先（`getByRole`, `getByTestId`, `getByLabel`）。
- CSS / xpath の直書きは避ける。

## baseline
- 生成直後に `playwright test <file> --update-snapshots` で baseline を撮りコミットする。
```

- [ ] **Step 2: commit** → `git add -A && git commit -m "docs: generator rules"`

---

## Task 6: init-agents（公式エージェント生成）+ 適応

**Filesः**
- Create: `.claude/...`（init-agents が生成。実体に合わせる）

- [ ] **Step 1: 公式エージェント生成**

Run: `pnpm exec playwright init-agents --loop=claude`
Expected: planner/generator/healer のエージェント定義が生成される（`.claude/` 配下等）。

- [ ] **Step 2: 生成物の確認**

Run: `git status && find .claude -type f 2>/dev/null`
生成されたファイル構造を確認し、planner が `tests/seed.spec.ts`、generator が `specs/_generation-rules.md` を参照するよう、生成された定義に追記する（具体パスは生成物に依存するためここで確定）。

- [ ] **Step 3: commit** → `git add -A && git commit -m "chore: init playwright agents (claude loop)"`

---

## Task 7: Taskfile.pkl 段階式コマンド

**Files:**
- Create: `Taskfile.pkl`

agent 起動部は「Claude Code に該当 agent を実行させる」前提のラッパ。playwright 実行系は直接呼ぶ。

- [ ] **Step 1: Taskfile.pkl**

```pkl
amends "package://pkg.pkl-lang.org/pkl-pantry/pkl.toml@1.0.0#/toml.pkl" // placeholder; pkfire skill のスキーマに合わせ確定
```

※ pkfire skill を参照して正式スキーマで以下タスクを定義:
- `verify`: `pnpm exec playwright test && pnpm exec playwright test`（連続2回 = 再現性）
- `baseline`: `pnpm exec playwright test --update-snapshots`
- `plan` / `generate` / `heal`: agent 起動手順を echo するガイドタスク（実起動は Claude Code 側）

- [ ] **Step 2: hooks（secretlint pre-push）**

pkfire skill の `assets/recipes/14-secretlint-pre-push.pkl` に従い secretlint を pre-push に設定。
devDeps に `secretlint@^9` + `@secretlint/secretlint-rule-preset-recommend@^9`。

- [ ] **Step 3: verify タスク実行**

Run: `pkf run verify`
Expected: guest-todo + seed が2回連続 green

- [ ] **Step 4: commit** → `git add -A && git commit -m "build: pkfire staged tasks + secretlint"`

---

## Task 8: 環境ファイル + CI 自己テスト

**Files:**
- Create: `.envrc`, `flake.nix`, `apm.yml`, `.github/workflows/ci.yml`

- [ ] **Step 1: .envrc**

```sh
PATH_add ./node_modules/.bin
pkf hooks install >/dev/null 2>&1 || true
```

- [ ] **Step 2: flake.nix**（node 24 + pnpm の devShell。最小形）

- [ ] **Step 3: apm.yml**（playwright 系 skill を宣言）

- [ ] **Step 4: .github/workflows/ci.yml**

```yaml
name: ci
on: [push, pull_request]
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 24, cache: pnpm }
      - run: pnpm install
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm exec playwright test
      - run: pnpm exec playwright test  # 再現性: 連続2回目
      - uses: actions/upload-artifact@v4
        if: failure()
        with: { name: playwright-report, path: playwright-report/ }
```

- [ ] **Step 5: commit** → `git add -A && git commit -m "ci: e2e self-test + env files"`

---

## Self-Review

- 設計書の各節 → タスク対応: サンプルアプリ(T2)、決定論レイヤー(T3)、参照e2e+再現性(T4)、
  生成規約(T5)、公式エージェント(T6)、段階コマンド/verify/secretlint(T7)、CI自己テスト/env(T8)。網羅。
- placeholder: Taskfile.pkl のスキーマと .claude 生成物は外部ツール依存のため実行時に確定する旨を明示（pkfire skill / init-agents 出力を参照）。これは未確定ではなく「ツール出力に従う」指示。
- 型整合: `gotoApp(page)` は T3 で定義し T4/規約で参照。`data-testid` は `todo-item`/`todo-list`/`remaining` で一貫。
