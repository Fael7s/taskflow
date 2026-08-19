# TaskFlow

A task list that survives a page reload without a backend, an account, or a network request: state lives in the browser and is persisted to Web Storage on every mutation.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Dependencies](https://img.shields.io/badge/dependencies-none-lightgrey.svg)](#tech-stack)

## Context

This project exists to work out how far a browser application can be structured before a framework becomes necessary. It has no dependencies, no build step, and no package manager, and it is deliberately kept that way: opening `index.html` from disk runs the whole application.

The engineering decision on display is layering under those constraints. State, persistence, rendering, and event wiring live in four separate files with one responsibility each, and they communicate in one direction only. `app.js` is the only file that knows about the others; `TaskManager` never touches the DOM, `UI` never touches storage, and `Storage` knows nothing about tasks beyond the fact that they serialize. The same boundaries a framework would impose are here, drawn by hand, which makes the cost of each one visible.

The interface language is Portuguese (`index.html` is marked `lang="pt-BR"`); the code and this document are in English.

## Tech stack

The repository contains no `package.json`, no lockfile, and no third-party code. The table lists what the source actually requires from the platform.

| Technology | Version / baseline | Why it was chosen |
|---|---|---|
| JavaScript | ES2015 or later | The source uses `class`, `const`/`let`, arrow functions, and template literals. No transpilation step exists, so the browser is the only runtime |
| DOM API | `Element.closest`, `dataset`, `classList` | `closest` is what makes one delegated listener able to resolve which task was clicked; `dataset` carries the task id on the element |
| Web Storage API | `localStorage` | Synchronous key-value persistence with no setup. Chosen over IndexedDB because the data is a single small array |
| CSS | Custom properties, flexbox, one media query | The five theme colors are declared once in `:root` and referenced everywhere; the breakpoint at 480px is the only responsive rule |
| HTML | HTML5 | Four classic `<script>` tags in dependency order; no module loader |

## Architecture

Four files, loaded in dependency order by `index.html`, each exposing exactly one global.

```
   index.html
     |
     +-- js/storage.js   Storage      localStorage read/write, JSON only
     +-- js/task.js      Task,        in-memory state: the tasks array
     |                   TaskManager  and add / toggle / remove
     +-- js/ui.js        UI           builds DOM nodes from task objects
     +-- js/app.js       (wiring)     the only file that talks to all three


   User action                app.js                    effect
   ------------------------------------------------------------------------
   click "Adicionar"  -->  read input, trim
                           reject if empty
                           TaskManager.addTask(name)  --> tasks array mutated
                           Storage.save(tasks)        --> localStorage written
                           UI.updateList(tasks, ul)   --> list rebuilt
                           clear the input

   click inside <ul>  -->  closest('li').dataset.id
                           toggle-btn -> TaskManager.toggleTask(id)
                           delete-btn -> TaskManager.removeTask(id)
                           Storage.save(tasks)
                           UI.updateList(tasks, ul)

   page load          -->  TaskManager.tasks = Storage.load()
                           UI.updateList(tasks, ul)
```

The order inside each handler is fixed: mutate state, persist, re-render. The array in `TaskManager.tasks` is the single source of truth; `localStorage` is a serialized copy of it and the DOM is a projection of it. Neither the DOM nor storage is ever read back to decide what the state is.

## Engineering properties

**One listener for the whole list, bound to a node that is never replaced.** `UI.updateList` destroys and recreates every `<li>` on each change, so listeners attached to individual items would be discarded with them. The click handler sits on the `<ul>` instead and dispatches on the class of the clicked element, which means the number of listeners stays at one regardless of list length, and no rebinding step exists to forget.

**Identity travels through the DOM as data, not as a closure.** Each `<li>` carries `data-id`; the handler reads it back with `dataset.id` and `parseInt`. Rebuilt nodes carry the same ids, so a re-render cannot desynchronize the DOM from the state array.

**Persistence is write-through, not write-behind.** Every mutation is followed by a full `Storage.save` in the same synchronous block. There is no debounce, no dirty flag, and no unload handler, so no window exists in which the visible list and the stored list disagree. The cost is that each save serializes the entire array regardless of how small the change was.

**Input validation before state mutation.** `app.js` trims the input and rejects an empty string before calling `addTask`, so whitespace-only entries never enter the array or storage. Verified in a browser: a whitespace-only submission produces no task.

**Deserialization is tolerant of a first run.** `Storage.load` returns an empty array when the key is absent, so the application starts identically on a fresh browser profile and on a returning one.

**Rendering is a pure function of the task array.** `UI.renderTask` takes a task object and returns a detached element; `updateList` takes an array and a container. Neither reads global state, which is what would allow them to be tested in isolation if a module system were introduced.

## Getting started

### Prerequisites

A browser with ES2015 support. Nothing else: no Node.js, no package installation, no build.

### Run it

```bash
git clone https://github.com/Fael7s/taskflow.git
cd taskflow
```

Open `index.html` directly in a browser. The application runs from the `file://` protocol; this was verified in Chromium, including persistence across a reload, because `localStorage` is keyed per file origin.

To serve it over HTTP instead:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

### Environment variables

None. The application has no configuration surface and no secrets. The only external state is the `localStorage` key `taskflow_tasks`, which holds a JSON array of `{ id, name, completed }` objects.

## Testing

There is no automated test suite in this repository: no test runner, no `package.json`, no CI workflow, and no assertions of any kind. That is the single largest gap in the project and it is listed first under limitations for that reason.

What has been verified is manual, driven through Chromium against this commit:

| Behaviour | Result |
|---|---|
| Adding a task renders it and writes `taskflow_tasks` to `localStorage` | works |
| Whitespace-only input is rejected | works, no task created |
| Tasks persist across a page reload | works, list restored from storage |
| Toggle and delete buttons update state, storage, and DOM together | works |
| Pressing Enter in the input field | does nothing; only the button click is wired |
| Clicking the gap between two list items | throws `TypeError: Cannot read properties of null (reading 'dataset')` |
| Two tasks created within the same millisecond | receive the same id; deleting one removes both |
| A task name containing HTML | is executed as HTML, not shown as text (see limitations) |

Making this suite automatic requires converting the four globals into ES modules or CommonJS exports, since nothing can currently be imported by a test runner. `TaskManager` and `Storage` would then be testable directly, and `UI` under jsdom.

## Technical decisions and trade-offs

### 1. Event delegation instead of per-item listeners

The problem: the list is destroyed and rebuilt on every state change. Listeners bound to each `<li>` would be thrown away with the nodes, so every render would need a rebinding pass, and forgetting it in one code path would produce a list where some rows respond and others do not.

Alternatives I considered: rebinding listeners after each render, switching to incremental DOM updates so nodes survive, or adopting a framework that handles the binding.

I chose one delegated listener on the `<ul>`, dispatching on `e.target.classList`.

What I gave up: dispatch now depends on the click landing exactly on the button element, and identity resolution assumes `closest('li')` returns something. Neither assumption is guarded. A click on the container's own area resolves to `null` and throws, which I confirmed in a browser rather than inferred. The handler also runs a save and a full re-render for clicks that matched no button at all, because the persist-and-render step sits outside the branch. Both are cheap to fix and are listed under limitations.

### 2. Full re-render instead of surgical DOM updates

The problem: keeping the DOM consistent with the array after add, toggle, and remove.

Alternatives I considered: mutating only the affected node (toggle a class, remove one `<li>`), keeping a virtual DOM, or rebuilding the list wholesale.

I chose the rebuild: `container.innerHTML = ''` followed by an append per task.

What I gave up: every interaction allocates one element per task, so the work is proportional to list size rather than to the size of the change. Any transient state inside the list is discarded on each render, which is invisible today only because the rows contain nothing focusable except buttons. Adding inline editing would break immediately under this strategy, and that is the point at which the incremental alternative stops being premature.

### 3. localStorage with whole-array serialization

The problem: the list has to survive a reload, and the project is not allowed a backend or a build step.

Alternatives I considered: IndexedDB, one storage key per task, or a server-side API.

I chose a single key holding the entire array, rewritten on every mutation.

What I gave up: writes are synchronous and block the main thread, and their cost scales with the total number of tasks rather than with the change being made. The origin quota is a few megabytes, and neither `setItem` nor `JSON.parse` is wrapped in error handling, so a full quota or a corrupted value fails uncaught, with the parse failure happening at startup and leaving an empty page. Per-key storage would have made writes proportional to the change; IndexedDB would have made them asynchronous and much larger. Both were more machinery than an array of short strings needs, but neither would have kept the error handling I skipped.

### 4. Classic scripts and globals instead of ES modules

The problem: separating persistence, state, rendering, and wiring without introducing a toolchain.

Alternatives I considered: `<script type="module">` with real imports, a bundler, or keeping everything in one file.

I chose four classic scripts, each defining one global object, ordered by dependency in `index.html`.

What I gave up: the dependency graph exists only as the order of four tags, and nothing enforces it. Every object sits on `window`, where any other script could redefine it. Most concretely, nothing can be imported, which is why there is no unit test in this repository. What it buys is that the project runs from `file://` with zero setup, which was the constraint I set. ES modules would have given real imports and testability at the cost of requiring an HTTP server, since module scripts are blocked under the `file://` protocol by CORS rules. Given that the goal was a zero-install project, I took the trade knowingly, and I would reverse it the moment tests were added.

### 5. `Date.now()` as the task identifier

The problem: each task needs a stable id that can round-trip through a DOM attribute and JSON.

Alternatives I considered: a counter persisted alongside the tasks, `crypto.randomUUID()`, or using array position.

I chose the millisecond timestamp, because it is monotonic enough for hand entry, needs no extra persisted state, and survives `JSON.stringify` as a number.

What I gave up: uniqueness. Two tasks created in the same millisecond receive the same id, and because `removeTask` filters by equality, deleting one of them removes both. I verified this by creating two tasks in a single tick: the ids matched and one delete emptied the list. Typing cannot trigger it, any programmatic insertion can. `crypto.randomUUID()` would have removed the failure mode entirely at no real cost, and it is the change I would make first.

## Known limitations and what I would do differently at larger scale

- **No automated tests and no CI.** Nothing in the repository can fail a build, because there is no build. This is the first thing I would change, and it forces the module change in decision 4.
- **Task names are inserted as HTML.** `UI.renderTask` builds the row with a template literal and assigns it through `innerHTML`, so a task name is parsed as markup. I confirmed in a browser that a name containing an `onerror` attribute executes, and that the payload is persisted to `localStorage` and re-executes on every subsequent page load. Building the row with `createElement` and `textContent` for the name removes the class of problem entirely. It matters little in a single-user local application and would be a stored cross-site scripting hole in any hosted, multi-user version.
- **Unguarded DOM lookup in the click handler.** `e.target.closest('li').dataset.id` assumes a match; clicking the list container itself throws a `TypeError`. A single early return when `closest` yields `null` fixes it, and moving the save and re-render inside the matched branches would also stop pointless work on clicks that changed nothing.
- **Colliding identifiers** (decision 5), with deletion removing every task sharing an id.
- **No error handling around storage.** A `QuotaExceededError` from `setItem` or a `SyntaxError` from `JSON.parse` propagates uncaught; a corrupt value makes the application fail on load with an empty list.
- **Keyboard support is incomplete.** Only the button's click event adds a task; pressing Enter in the input does nothing, verified in a browser. Wrapping the input in a `<form>` and handling `submit` would fix the keyboard path and the click path with one listener.
- **No accessibility work.** The two icon buttons carry glyphs and no accessible name, the list has no live region, and nothing announces that a task was completed or removed to a screen reader.
- **No filtering, sorting, editing, due dates, or ordering.** The data model is three fields, and the UI exposes exactly the three operations the model supports.
- **State is per-browser and per-origin.** There is no export, no import, and no sync; clearing site data destroys the list, and the same list opened from `file://` and from `http://localhost` are two unrelated datasets.
- **At larger scale**, the array-plus-full-rerender design is what breaks first. The order I would change things: modules and tests, then `textContent` rendering with UUID ids, then keyed incremental updates, and only then a persistence layer behind an interface so `localStorage` could be swapped for a remote API without touching `TaskManager`.

## License

MIT. See `LICENSE`.
