# Spec-to-Playwright Pipeline — Design

Date: 2026-06-25
Status: Approved (design phase)

## 目的

自然言語の仕様を入力すると、ブラウザを探索してステップごとに画像（VRT）で
状態を確認しながら、ゴール到達可能かを検証し、その操作列を再現性のある
Playwright テストとして出力するパイプラインを作る。

公式 Playwright test-agents（`npx playwright init-agents` の planner / generator /
healer）を土台にし、公式が弱い「VRT の決定性」を規約レイヤーとして足す（案B）。

## スコープ

- IN: サンプルアプリ同梱、planner→generator→verify→heal の段階式パイプライン、
  VRT を再現性の軸に据える決定論レイヤー、パイプライン自己検証（CI）
- OUT（YAGNI）: 単一コマンドの一気通し（`all` タスクは枠だけ残す）、外部本番アプリ対応、
  探索フェーズでの Claude による逐次 Vision 判定（VRT に寄せたので不要）

## アーキテクチャ

段階式フロー:

```
仕様(自然言語)
  │  pkf run plan -- "ゲストでTODOを2件追加して1件完了する"
  ▼
[planner agent] ── サンプルアプリをブラウザ探索 ──▶ specs/<topic>.md
  │  pkf run generate -- specs/<topic>.md
  ▼
[generator agent] ── selector/assert をライブ検証 ──▶ tests/<topic>.spec.ts
  │   └─ 重要ステップで toHaveScreenshot() を挿入 + baseline 撮影
  │  pkf run verify
  ▼
[playwright run] ── 連続2回実行で再現性確認(DOM assert + VRT diff)
  │  失敗時: pkf run heal
  ▼
[healer agent] ── UI を見て locator/wait/baseline を修復 ──▶ tests/ 更新
```

## ディレクトリ構成

```
playwright-playground/
├── app/                      # 同梱サンプルアプリ (Vite + Vanilla TS)
│   ├── index.html
│   ├── src/main.ts           #   決定論的に作った TODO アプリ
│   └── vite.config.ts
├── specs/                    # planner 出力 (人間可読 Markdown プラン)
│   ├── _generation-rules.md  #   ★ generator が必ず読む VRT 規約 doc
│   └── <topic>.md
├── tests/
│   ├── seed.spec.ts          # ★ 環境 bootstrap + 決定論レイヤー
│   ├── <topic>.spec.ts       # generator 出力
│   └── <topic>.spec.ts-snapshots/  # VRT baseline (git 管理)
├── .claude/                  # init-agents が生成する agent 定義
├── playwright.config.ts
├── Taskfile.pkl              # plan/generate/verify/heal タスク
├── package.json              # pnpm, @playwright/test
├── .envrc / flake.nix        # CLAUDE.md 準拠の新規 repo 必須ファイル
└── docs/superpowers/specs/   # 本設計書
```

## サンプルアプリ (`app/`)

- Vite + Vanilla TS の最小 TODO アプリ。テスト時は `vite build` → `vite preview`
  で配信し、dev server の HMR スクリプト注入を避けて決定論性を上げる。
- 機能: 入力追加 / 完了トグル / 削除 / 残数表示。
- 状態: localStorage 永続なし。初期状態は常に空（テスト間リセットを確実にする）。
- 非決定要素の排除: 日時表示・アニメーション・ランダム ID を入れない。

## 決定論レイヤー（VRT が毎回同じ絵になる仕掛け）

`playwright.config.ts`:
- `webServer`: `vite build && vite preview --port 4173`、`reuseExistingServer: false`、
  固定ポート。
- `use`: `viewport: {width:1280, height:720}`, `deviceScaleFactor:1`,
  `colorScheme:'light'`, `locale:'en-US'`, `timezoneId:'UTC'`。
- `expect.toHaveScreenshot`: `animations:'disabled'`, 小さめの `maxDiffPixelRatio`,
  `stylePath` で共通 CSS 注入。

`tests/seed.spec.ts`（公式 seed の役割 + 決定論の共通化）:
- `prefers-reduced-motion` 強制・全アニメ / トランジション無効化の共通スタイル。
- caret 非表示、フォントロード待ち（`document.fonts.ready`）。
- アプリ初期状態リセット用ヘルパ（`page.goto` + 空状態の確認）。
- 環境説明コメント（planner / generator がここを読んで前提を把握する）。

`specs/_generation-rules.md`（generator 強制規約）:
- 各シナリオの **開始直後** と **ゴール到達時** に必ず `toHaveScreenshot('<step>.png')`。
- 動的・可変領域（もしあれば）は `mask` 指定。
- VRT は DOM アサーションの **代替ではなく追加**。意味的検証は `expect(locator)` で必ず併記。
- baseline は `--update-snapshots` で初回撮影し、コミットする。

## 段階式コマンド（`Taskfile.pkl`）

| タスク | 中身 | 担当 |
|---|---|---|
| `pkf run plan -- "<仕様>"` | planner agent 起動。seed 実行で環境把握 → `specs/<topic>.md` 出力 | 公式 planner |
| `pkf run generate -- specs/<topic>.md` | generator agent。`_generation-rules.md` 必読 → `tests/<topic>.spec.ts` + baseline 撮影 | 公式 generator + 規約 |
| `pkf run verify` | `playwright test` を連続2回実行。両方 green で再現性 OK。VRT diff 含む | playwright |
| `pkf run heal` | 失敗テストを healer agent に渡し UI を見て修復 | 公式 healer |
| `pkf run all -- "<仕様>"` | 将来用（今回スコープ外、枠のみ） | — |

agent 起動はエージェント定義（`.claude/`）を介すため、各タスクは「Claude Code に
該当 agent を実行させる」薄いラッパ + playwright 実行の組み合わせになる。
`init-agents --loop=claude` の生成物に合わせて最終確定する。

## 再現性確認の定義

1. `generate` 直後に baseline 撮影。
2. `verify` = 同一テストを **連続2回** green（フレーキー検出）。
3. VRT は baseline と pixel diff が閾値内。
4. 1〜3 すべて満たして初めて「パイプライン成功」とみなす。

## エラーハンドリング

- planner がゴール到達不能 → プランに「未達」と明記し停止（無理に生成しない）。
- generator の selector live 検証失敗 → 該当ステップを再探索でリトライ、N 回で諦めて
  該当箇所に `test.fixme` を残す。
- VRT diff 過大 → 「意図的変更か退行か」を人間に確認（自動 update はしない）。
- `vite preview` ポート競合 → 固定ポート + `reuseExistingServer:false`。

## テスト戦略（このパイプライン自体の検証）

- TDD で進める。最初に「サンプルアプリに対し 1 本の spec を通す」end-to-end を
  Red→Green で確立。
- 自己テスト: 既知の仕様 1 件を `plan→generate→verify` まで通し、生成 spec が
  連続 2 回 green になることを GitHub Actions でも回す。
- secretlint を pre-push に（CLAUDE.md 準拠）。

## 新規 repo 必須ファイル（CLAUDE.md 準拠）

- `.envrc`（direnv + `pkf hooks install`）
- `flake.nix`（devShell）
- `Taskfile.pkl`（タスク・git hook・cache）
- `apm.yml`（skill 宣言。少なくとも playwright 系 skill）
