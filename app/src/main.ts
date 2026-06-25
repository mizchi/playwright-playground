interface Todo {
  id: number;
  title: string;
  done: boolean;
}

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
