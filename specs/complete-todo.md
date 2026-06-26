# Complete Todo Test Plan

## Application Overview

A focused test plan for the local TODO app (Vite preview at http://localhost:4173). The app provides a single-page interface with a text input ("What needs to be done?"), an "Add" button, a list of todo items each with a toggle checkbox and a delete button, and a remaining-count paragraph (data-testid="remaining"). All scenarios start from a blank/fresh state via the seed file.

## Test Scenarios

### 1. Completing Todos

**Seed:** `tests/seed.spec.ts`

#### 1.1. Complete a todo decrements the remaining count

**File:** `tests/completing-todos/complete-todo-decrements-count.spec.ts`

**Steps:**
  1. Starting state: blank app with no todos. The paragraph data-testid="remaining" reads "0 items left".
    - expect: The textbox labelled "What needs to be done?" is empty
    - expect: The todo list is empty
    - expect: The remaining count paragraph reads "0 items left"
  2. Type "Buy groceries" into the textbox labelled "What needs to be done?".
    - expect: The textbox contains the text "Buy groceries"
  3. Click the "Add" button.
    - expect: A new list item appears containing the text "Buy groceries"
    - expect: A checkbox with aria-label "toggle Buy groceries" is rendered unchecked
    - expect: A button with aria-label "delete Buy groceries" is rendered
    - expect: The remaining count paragraph reads "1 item left"
  4. Click the checkbox labelled "toggle Buy groceries".
    - expect: The checkbox labelled "toggle Buy groceries" is now in a checked state
    - expect: The list item for "Buy groceries" appears visually completed (e.g. strikethrough styling)
    - expect: The remaining count paragraph reads "0 items left"
