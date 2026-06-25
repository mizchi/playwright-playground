# Delete Todo

**Seed:** `tests/seed.spec.ts`

ブラウザ探索で各ステップを実機確認し、ゴール到達を画像で検証済み。

## 1. Deleting Todos

### 1.1 Add then delete returns to empty state

**仕様:** ゲストが TODO を1件追加し、それを削除して空状態に戻す。

**Steps:**
1. アプリを開く（空状態）。"0 items left" が表示される。
2. "What needs to be done?" 入力欄に "Read mail" を入力し Add を押す。
3. TODO が1件表示され "1 item left" になる。
4. その項目の Delete ボタンを押す。

**Expected (goal):**
- TODO 一覧が空（0件）に戻る。
- "0 items left" が表示される。

**Visual checkpoints:** 開始時（空）と削除後（空に復帰）の2点を VRT で固定する。
