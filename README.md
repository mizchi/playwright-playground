# spec-to-playwright pipeline

自然言語の仕様を入力すると、ブラウザを探索してステップごとに画像（VRT）で確認しながら、
ゴール到達可能かを検証し、その操作列を再現性のある Playwright テストとして出力する
パイプライン。公式 Playwright test-agents（planner / generator / healer）を土台に、
VRT の決定性を規約レイヤーで固める（[設計書](docs/superpowers/specs/2026-06-25-spec-to-playwright-pipeline-design.md)）。

## 構成

| パス | 役割 |
|---|---|
| `app/` | 同梱サンプル TODO アプリ (Vite + Vanilla TS, SUT) |
| `tests/seed.spec.ts` | 環境 bootstrap。planner が環境把握に使う |
| `tests/_helpers.ts` | `gotoApp()` = 決定論スタイル注入 + font 待ち |
| `specs/_generation-rules.md` | generator が必読する VRT 強制規約 |
| `.claude/agents/` | `init-agents --loop=claude` が生成した3エージェント定義 |
| `playwright.config.ts` | webServer(build→preview) + 決定論 use + VRT 設定 |
| `Taskfile.pkl` | `verify` / `baseline` / `plan` / `generate` / `heal` タスク |

## パイプライン（段階式）

```
仕様(自然言語)
  │  ① plan:     Claude Code で playwright-test-planner agent を起動
  ▼
specs/<topic>.md          # 人間可読プラン
  │  ② generate: Claude Code で playwright-test-generator agent を起動
  ▼
tests/<topic>.spec.ts     # VRT 入り Playwright テスト
  │  ③ baseline: pnpm run baseline:linux  # linux baseline を撮りコミット
  │  ④ verify:   pkf run verify           # 連続2回 green で再現性確認
  ▼
（失敗時）⑤ heal: playwright-test-healer agent で修復
```

### ① plan

Claude Code で `playwright-test-planner` agent を起動し、仕様文（例:
「ゲストで TODO を2件追加して1件完了する」）を渡す。agent はサンプルアプリを
探索し `specs/<topic>.md` を生成する。

### ② generate

`playwright-test-generator` agent に `specs/<topic>.md` を渡す。agent は
`specs/_generation-rules.md` に従い、各シナリオの開始時とゴール時に
`toHaveScreenshot()` を入れたテストを `tests/` に生成する。

### ③ baseline

```sh
pnpm run baseline:linux   # 公式 playwright docker で linux baseline 生成
```

VRT スナップショットはプラットフォーム依存。CI(linux) と一致させるため
docker で生成してコミットする。ローカル darwin 用は `pnpm run baseline`。

### ④ verify（再現性確認）

```sh
pkf run verify            # = playwright test を連続2回。両方 green で合格
```

「連続2回 green（フレーキー検出）＋ VRT diff が閾値内」を満たして初めて
パイプライン成功とみなす。

### ⑤ heal

`verify` が落ちたら `playwright-test-healer` agent を起動し、UI を見て
locator / wait / baseline を修復させる。

## 決定論レイヤー（VRT を安定させる仕掛け）

- `playwright.config.ts`: 固定 viewport / `colorScheme:light` / `locale:en-US` /
  `timezoneId:UTC`、`webServer` は `vite build && vite preview`（HMR 注入回避）。
- `gotoApp()`: アニメ/トランジション無効化スタイル注入、caret 非表示、font 待ち。
- サンプルアプリ: 日時/ランダム/アニメ/localStorage 永続なし、初期状態は常に空。

## セットアップ

```sh
pnpm install
pnpm exec playwright install chromium
pkf hooks install        # secretlint を pre-push に設置
```

## 参考実装

`tests/guest-todo.spec.ts` は generator がいずれ出力すべきテストの参照実装。
VRT 付きで連続2回 green になることを実証している。
