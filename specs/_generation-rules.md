# Generation Rules (generator が必ず守る規約)

テストを生成するとき、以下を厳守する。これは generator agent への強制プロンプト。

## 決定論
- 各テストの冒頭で `import { gotoApp } from "./_helpers"` を使い `await gotoApp(page)` で開く。
  直接 `page.goto` しない（決定論スタイル注入と font 待ちのため）。
- 日時・ランダム・外部ネットワークに依存する検証を書かない。

## VRT (Visual Regression)
- 各シナリオの「開始直後」と「ゴール到達時」に必ず
  `await expect(page).toHaveScreenshot("<NN-step>.png")` を入れる（NN は 01, 02, ... の連番）。
- 動的・可変領域があれば `toHaveScreenshot({ mask: [locator] })` でマスクする。
- VRT は意味的検証の代替ではない。状態は必ず `expect(locator)` でも検証する
  （`toHaveCount` / `toHaveText` 等）。

## セレクタ
- role / testid / label ベースを優先する（`getByRole`, `getByTestId`, `getByLabel`）。
- CSS / xpath の直書きは避ける。

## baseline
- 生成直後に `pnpm exec playwright test <file> --update-snapshots` で baseline を撮る。
- baseline は CI と同じ環境（linux）で生成してコミットする。ローカル(darwin)で撮った
  `*-darwin.png` は CI で使われない。`pnpm run baseline:linux`（docker 経由）を使う。

## 再現性の定義
- 生成テストは「連続2回 green」で初めて合格とみなす（`pnpm run verify`）。
