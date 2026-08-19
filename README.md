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
| Web Crypto | `crypto.randomUUID` | Task identifiers. Exposed only in secure contexts, which `file://` and `localhost` both are; a counter-based fallback covers the rest |
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
   click "Adicionar"  -->  addTaskFromInput()
   or Enter in input       read input, trim
                           reject if empty
                           TaskManager.addTask(name)  --> tasks array mutated
                           clear the input
                           persistAndRender()

   click inside <ul>  -->  closest('li'), return if null
                           toggle-btn -> TaskManager.toggleTask(id)
                           delete-btn -> TaskManager.removeTask(id)
                           anything else -> return, no work
                           persistAndRender()

   persistAndRender() -->  Storage.save(tasks)        --> localStorage written
                           show a message if it failed
                           UI.updateList(tasks, ul)   --> list rebuilt

   page load          -->  TaskManager.tasks = Storage.load()
                           show a message if the stored value was unreadable
                           UI.updateList(tasks, ul)
```

The order inside each handler is fixed: mutate state, persist, re-render. The array in `TaskManager.tasks` is the single source of truth; `localStorage` is a serialized copy of it and the DOM is a projection of it. Neither the DOM nor storage is ever read back to decide what the state is.

## Engineering properties

**One listener for the whole list, bound to a node that is never replaced.** `UI.updateList` destroys and recreates every `<li>` on each change, so listeners attached to individual items would be discarded with them. The click handler sits on the `<ul>` instead and dispatches on the class of the clicked element, which means the number of listeners stays at one regardless of list length, and no rebinding step exists to forget.

**Identity travels through the DOM as data, not as a closure.** Each `<li>` carries `data-id`; the handler reads it back with `dataset.id` and compares it as a string, never parsing it. Rebuilt nodes carry the same ids, so a re-render cannot desynchronize the DOM from the state array, and ids written by earlier versions of the application stay addressable.

**Persistence is write-through, not write-behind.** Every mutation is followed by a full `Storage.save` in the same synchronous block. There is no debounce, no dirty flag, and no unload handler, so no window exists in which the visible list and the stored list disagree. The cost is that each save serializes the entire array regardless of how small the change was.

**Input validation before state mutation.** `app.js` trims the input and rejects an empty string before calling `addTask`, so whitespace-only entries never enter the array or storage. Verified in a browser: a whitespace-only submission produces no task.

**Deserialization is tolerant of a first run and of a bad one.** `Storage.load` returns an empty array when the key is absent, when the stored value does not parse, and when it parses into something other than an array. The application starts the same way on a fresh browser profile, on a returning one, and on one whose stored data was corrupted.

**Untrusted input never reaches the HTML parser.** Task names are written with `textContent` on an element built by `createElement`, so a name containing markup is displayed, not interpreted. This holds for names already in storage as well as newly typed ones, because both take the same render path.

**Storage failures are reported, not swallowed.** `Storage.save` returns whether the write succeeded and records the error; the caller shows a message in a live region when it did not. A list that cannot be persisted never looks persisted.

**One entry point for adding a task.** The button click and the Enter keydown call the same function, so the trim, the empty check, the input reset and the persist step cannot diverge between the two.

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
| Whitespace-only input is rejected, from both the button and Enter | works, no task created |
| Tasks persist across a page reload | works, list restored from storage |
| Toggle and delete buttons update state, storage, and DOM together | works |
| Pressing Enter in the input field | adds the task, same path as the button |
| Clicking the gap between two list items | ignored, no error and no re-render |
| Two tasks created within the same millisecond | receive different ids; deleting one leaves the other |
| A task name containing HTML | rendered as text |
| A payload written by an earlier version, already in storage | rendered as text, not executed |
| Tasks stored with the old timestamp ids | still load, toggle and delete individually |
| Corrupted JSON in `localStorage` | list starts empty and the page reports it, no uncaught error |
| `setItem` failing, for example on exceeded quota | reported in the status line, the page keeps working |

Making this suite automatic requires converting the four globals into ES modules or CommonJS exports, since nothing can currently be imported by a test runner. `TaskManager` and `Storage` would then be testable directly, and `UI` under jsdom.

## Technical decisions and trade-offs

### 1. Event delegation instead of per-item listeners

The problem: the list is destroyed and rebuilt on every state change. Listeners bound to each `<li>` would be thrown away with the nodes, so every render would need a rebinding pass, and forgetting it in one code path would produce a list where some rows respond and others do not.

Alternatives I considered: rebinding listeners after each render, switching to incremental DOM updates so nodes survive, or adopting a framework that handles the binding.

I chose one delegated listener on the `<ul>`, dispatching on `e.target.classList`.

What I gave up: dispatch depends on the click landing exactly on the button element, so a click anywhere else in the row matches no branch. Two consequences had to be handled explicitly rather than falling out of the design. A click on the container's own area resolves to `null`, which threw a `TypeError` until an early return was added; and a click that matches no button now returns before the persist-and-render step instead of rewriting storage and rebuilding the list for nothing. A framework would have given both for free. Here they are two guard clauses I had to notice were missing.

### 2. Full re-render instead of surgical DOM updates

The problem: keeping the DOM consistent with the array after add, toggle, and remove.

Alternatives I considered: mutating only the affected node (toggle a class, remove one `<li>`), keeping a virtual DOM, or rebuilding the list wholesale.

I chose the rebuild: `container.innerHTML = ''` followed by an append per task.

What I gave up: every interaction allocates one element per task, so the work is proportional to list size rather than to the size of the change. Any transient state inside the list is discarded on each render, which is invisible today only because the rows contain nothing focusable except buttons. Adding inline editing would break immediately under this strategy, and that is the point at which the incremental alternative stops being premature.

### 3. localStorage with whole-array serialization

The problem: the list has to survive a reload, and the project is not allowed a backend or a build step.

Alternatives I considered: IndexedDB, one storage key per task, or a server-side API.

I chose a single key holding the entire array, rewritten on every mutation.

What I gave up: writes are synchronous and block the main thread, and their cost scales with the total number of tasks rather than with the change being made. The origin quota is a few megabytes, and both failure modes are real: an exceeded quota on `setItem` and a corrupted value on `JSON.parse`. Both are now caught. A failed read falls back to an empty list, a failed write is surfaced in a status line instead of leaving a list that looks saved, and neither takes the page down. What the recovery cannot do is repair the data: a corrupted value is not salvaged, it is replaced by an empty list on the next save. Per-key storage would have made writes proportional to the change; IndexedDB would have made them asynchronous. Both were more machinery than an array of short strings needs.

### 4. Classic scripts and globals instead of ES modules

The problem: separating persistence, state, rendering, and wiring without introducing a toolchain.

Alternatives I considered: `<script type="module">` with real imports, a bundler, or keeping everything in one file.

I chose four classic scripts, each defining one global object, ordered by dependency in `index.html`.

What I gave up: the dependency graph exists only as the order of four tags, and nothing enforces it. Every object sits on `window`, where any other script could redefine it. Most concretely, nothing can be imported, which is why there is no unit test in this repository. What it buys is that the project runs from `file://` with zero setup, which was the constraint I set. ES modules would have given real imports and testability at the cost of requiring an HTTP server, since module scripts are blocked under the `file://` protocol by CORS rules. Given that the goal was a zero-install project, I took the trade knowingly, and I would reverse it the moment tests were added.

### 5. `crypto.randomUUID()` for identity, with ids treated as opaque

The problem: each task needs a stable, unique id that can round-trip through a DOM attribute and JSON.

This started as `Date.now()`, which was wrong: two tasks created in the same millisecond received the same id, and because `removeTask` filters by equality, deleting one of them removed both. I verified the collision in a browser before replacing it.

Alternatives I considered: a counter persisted alongside the tasks, `crypto.randomUUID()`, or using array position.

I chose `crypto.randomUUID()`, with a timestamp-and-counter fallback for the non-secure contexts where the browser does not expose it. The harder half of the change was compatibility: tasks already in storage carry the old numeric timestamps, and they had to keep working. So ids became opaque strings end to end. Nothing parses them, the click handler reads `dataset.id` as the string the DOM returns, and `TaskManager` compares with `String(a) === String(b)`.

What I gave up: ids are no longer sortable or meaningful, so creation order now depends on array position alone, and a UUID string costs more storage than a number. The fallback branch is also untested in normal use, since every context I run this in exposes `randomUUID`. In exchange, two tasks can no longer share an identity, and stored data written by the previous version still loads, toggles and deletes correctly, which I verified with a payload carrying the old id format.

## Known limitations and what I would do differently at larger scale

- **No automated tests and no CI.** Nothing in the repository can fail a build, because there is no build. This is the first thing I would change, and it forces the module change in decision 4.
- **No form element.** The input and the button are wired individually, with a keydown listener carrying the Enter path. A `<form>` with a `submit` handler would cover both entry points with one listener and bring native browser behaviour with it.
- **Recovery from a corrupted store loses the data.** A value that fails to parse is replaced by an empty list rather than salvaged, and the next save overwrites it.
- **The `randomUUID` fallback is not exercised.** Every context this runs in exposes `crypto.randomUUID`, so the counter branch is dead code in practice and has only been reasoned about, not observed.
- **No accessibility work beyond the status line.** The status message is a live region, but the two icon buttons carry glyphs and no accessible name, and nothing announces that a task was completed or removed to a screen reader.
- **No filtering, sorting, editing, due dates, or ordering.** The data model is three fields, and the UI exposes exactly the three operations the model supports.
- **State is per-browser and per-origin.** There is no export, no import, and no sync; clearing site data destroys the list, and the same list opened from `file://` and from `http://localhost` are two unrelated datasets.
- **At larger scale**, the array-plus-full-rerender design is what breaks first. The order I would change things now: modules and tests, then keyed incremental updates, and only then a persistence layer behind an interface so `localStorage` could be swapped for a remote API without touching `TaskManager`.

## License

MIT. See `LICENSE`.
