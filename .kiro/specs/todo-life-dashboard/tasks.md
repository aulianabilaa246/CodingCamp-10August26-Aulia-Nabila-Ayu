# Implementation Plan: To-Do Life Dashboard

## Overview

Implement a zero-dependency, client-side productivity dashboard as three files: `index.html`, `css/style.css`, and `js/app.js`. The implementation follows the unidirectional data flow architecture defined in the design: state mutations always precede DOM projections, and all persistence flows exclusively through the `Storage` module using `tld_`-prefixed `localStorage` keys.

Tasks are ordered in module dependency order — Storage → Theme → Greeting → Timer → Tasks → Links → Bootstrap — so each task can be built on a fully working foundation.

---

## Tasks

- [x] 1. Scaffold project files and HTML structure
  - Create `index.html` with correct `<head>` metadata (charset, viewport, title)
  - Add the anti-flash inline `<script>` block in `<head>` that reads `tld_theme` and sets `document.documentElement.dataset.theme` before the CSS `<link>` tag
  - Add `<link rel="stylesheet" href="css/style.css">` and `<script src="js/app.js" defer></script>`
  - Create the four semantic widget containers with `id` attributes: `#widget-greeting`, `#widget-timer`, `#widget-tasks`, `#widget-links`
  - Add a `#theme-toggle` button with `aria-label` in a fixed top-right position
  - Create empty `css/style.css` and `js/app.js` files
  - _Requirements: 11.4, 11.5, 12.2, 14.5_

- [x] 2. Implement CSS design tokens, grid layout, and base styles
  - [x] 2.1 Define CSS custom properties (design tokens) for both `light` (`:root`) and `dark` (`[data-theme="dark"]`) themes in `css/style.css`
    - Include all tokens from the design: `--color-bg`, `--color-surface`, `--color-text-primary`, `--color-text-secondary`, `--color-accent`, `--color-accent-hover`, `--color-border`, `--color-complete`, `--font-size-base`, `--font-size-sm`, `--border-radius`, `--spacing-xs`, `--spacing-sm`, `--spacing-md`, `--spacing-lg`
    - _Requirements: 11.2, 14.2, 14.3_

  - [x] 2.2 Implement the `.dashboard` CSS grid with `grid-template-areas`, `grid-template-rows`, `grid-template-columns`, and `height: 100vh`
    - Assign each widget container to its named grid area (`greeting`, `timer`, `tasks`, `links`)
    - Each widget must be independently scrollable via `overflow-y: auto` without page-level scroll
    - _Requirements: 11.1, 11.3_

  - [x] 2.3 Write base styles for typography, buttons, inputs, and widget cards
    - Minimum body font size 14px (`--font-size-sm`)
    - Style the `#theme-toggle` button as fixed top-right, always visible
    - Apply `--color-complete` (strikethrough + muted color) to completed task items
    - _Requirements: 11.2, 11.3, 6.1, 6.4_

- [x] 3. Implement the Storage module (`js/app.js` — Section 1)
  - [x] 3.1 Write `Storage.load(key, defaultValue)` wrapped in `try/catch`; return `defaultValue` on missing key or JSON parse error; emit `console.warn` on parse failure
    - _Requirements: 7.3, 10.3, 12.1_

  - [x] 3.2 Write `Storage.save(key, value)` wrapped in `try/catch`; serialise with `JSON.stringify`; emit `console.warn` and return silently on write failure
    - _Requirements: 7.1, 10.1_

  - [x] 3.3 Write `Storage.remove(key)` wrapped in `try/catch`
    - _Requirements: 15.5_

- [x] 4. Implement the Theme module (`js/app.js` — Section 2)
  - [x] 4.1 Write `Theme.init()`: read `tld_theme` via `Storage.load` (default `"light"`), set `document.documentElement.dataset.theme`, update the toggle button's `aria-label` to reflect the *next* theme
    - _Requirements: 14.5, 14.6, 14.7_

  - [x] 4.2 Write `Theme.toggle()`: flip current theme between `"light"` and `"dark"`, update `document.documentElement.dataset.theme`, persist via `Storage.save('tld_theme', ...)`, update `aria-label`
    - _Requirements: 14.2, 14.3, 14.4_

  - [x] 4.3 Write `Theme.getCurrent()`: return `document.documentElement.dataset.theme`
    - Wire the `#theme-toggle` button's `click` event to `Theme.toggle()` in Bootstrap
    - _Requirements: 14.1, 14.7_

- [x] 5. Implement pure helper functions (used across modules)
  - [x] 5.1 Write `formatTime(date)` → `"HH:MM"` (zero-padded hours 00–23 and minutes 00–59)
    - _Requirements: 1.1_

  - [x] 5.2 Write `formatDate(date)` → human-readable string (e.g., `"Monday, 14 July 2025"`) using `Intl.DateTimeFormat` or manual day/month name arrays
    - _Requirements: 1.2_

  - [x] 5.3 Write `formatDuration(totalSeconds)` → `"MM:SS"` where minutes = `Math.floor(s/60)` and seconds = `s % 60`, both zero-padded
    - _Requirements: 2.2_

  - [x] 5.4 Write `getGreetingPhrase(hours)`: pure function mapping integer 0–23 to one of `"Good Morning"` (5–11), `"Good Afternoon"` (12–17), `"Good Evening"` (18–21), `"Good Night"` (22–4)
    - _Requirements: 1.3, 1.4, 1.5, 1.6_

  - [x] 5.5 Write `isBlank(s)`: returns `true` iff `s.trim() === ''`
    - _Requirements: 4.3, 5.4, 15.6_

  - [x] 5.6 Write `isValidUrl(s)`: returns `true` iff `s` starts with `"http://"` or `"https://"` and `typeof s === 'string'`
    - _Requirements: 9.4_

  - [x] 5.7 Write `isValidDuration(n)`: returns `true` iff `Number.isInteger(n) && n >= 25 && n <= 60`
    - _Requirements: 17.1, 17.2_

  - [x] 5.8 Write `generateId()`: return `crypto.randomUUID()` with fallback to `Date.now().toString()`
    - Used by `Tasks.add()` and `Links.add()`
    - _Requirements: 4.2, 9.2_

- [x] 6. Checkpoint — pure helpers and Storage complete
  - Verify `formatTime`, `formatDate`, `formatDuration`, `getGreetingPhrase`, `isBlank`, `isValidUrl`, `isValidDuration`, and all three `Storage.*` functions are defined and reachable in `app.js`. Ask the user if questions arise.

- [x] 7. Implement the Greeting module (`js/app.js` — Section 3)
  - [x] 7.1 Write the Greeting HTML markup inside `#widget-greeting`:
    - `#greeting-time`, `#greeting-date`, `#greeting-phrase`, `#greeting-name-display`, `#greeting-name-input` (text field), `#greeting-name-save` (button), `#greeting-name-edit` (button)
    - `<span aria-live="polite" id="greeting-name-error"></span>` for validation feedback
    - _Requirements: 1.7, 15.1, 15.7_

  - [x] 7.2 Write `Greeting.render()`: project `state.greeting` and current `Date` → DOM; call `formatTime`, `formatDate`, `getGreetingPhrase`; if `userName` non-empty append `, {name}!` to phrase
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 15.2, 15.4_

  - [x] 7.3 Write `Greeting.saveUserName(s)`: validate with `isBlank`; if blank call `Storage.remove('tld_userName')`, clear `state.greeting.userName`; otherwise trim, store in state, persist via `Storage.save`; re-render
    - _Requirements: 15.2, 15.5, 15.6_

  - [x] 7.4 Write `Greeting.init()`: load `tld_userName` via `Storage.load(key, '')`, seed `state.greeting`, call `Greeting.render()`; schedule clock ticks aligned to the next full minute using the `setTimeout` + `setInterval` pattern from the design
    - _Requirements: 1.7, 15.3, 15.4_

  - [x] 7.5 Wire `#greeting-name-save` click → `Greeting.saveUserName(inputValue)` and `#greeting-name-edit` click → show/hide name input field; validate via `isBlank` and surface errors in `#greeting-name-error`
    - _Requirements: 15.1, 15.6, 15.7_

- [x] 8. Implement the Timer module (`js/app.js` — Section 4)
  - [x] 8.1 Write the Timer HTML markup inside `#widget-timer`:
    - `#timer-display` (MM:SS readout), `#timer-start`, `#timer-stop`, `#timer-reset` buttons
    - `#timer-duration-input` (number input, min=25, max=60), `#timer-duration-save` button
    - `<span aria-live="polite" id="timer-duration-error"></span>` for validation feedback
    - _Requirements: 2.2, 3.1, 17.1_

  - [x] 8.2 Write `Timer.render()`: project `state.timer` → DOM; call `formatDuration(Math.ceil(state.timer.remainingMs / 1000))`; apply enabled/disabled map from the design (IDLE: start✓ stop✗ reset✓; RUNNING: start✗ stop✓ reset✓; PAUSED: start✓ stop✗ reset✓)
    - _Requirements: 2.2, 3.2, 3.3, 3.4, 3.5_

  - [x] 8.3 Write `Timer.tick()`: no-op if `status !== 'RUNNING'`; compute `elapsed = Date.now() - state.timer.startTimestamp`, `remaining = state.timer.remainingAtStart - elapsed`; clamp to 0; if `remaining <= 0` transition to `IDLE/EXPIRED` and clear interval; else update `state.timer.remainingMs` and call `Timer.render()`
    - _Requirements: 2.3, 2.7, 2.8_

  - [x] 8.4 Write `Timer.start()`: if `IDLE` or `PAUSED` → set `status = 'RUNNING'`, record `startTimestamp = Date.now()`, record `remainingAtStart = state.timer.remainingMs`, start `setInterval(Timer.tick, 1000)` and store `intervalId`; call `Timer.render()`
    - _Requirements: 2.3, 2.5_

  - [x] 8.5 Write `Timer.stop()`: if `RUNNING` → clear interval, set `status = 'PAUSED'`, capture `remainingMs` from current tick computation; call `Timer.render()`
    - _Requirements: 2.4_

  - [x] 8.6 Write `Timer.reset()`: clear interval, set `status = 'IDLE'`, set `remainingMs = state.timer.savedDuration * 60 * 1000`; call `Timer.render()`
    - _Requirements: 2.1, 2.6, 17.7_

  - [x] 8.7 Write `Timer.saveDuration(n)`: validate with `isValidDuration`; on failure inject error into `#timer-duration-error` and focus input; on success persist via `Storage.save('tld_timerDuration', n)`, update `state.timer.savedDuration`; if `status === 'IDLE'` call `Timer.reset()` to update display; if `RUNNING` or `PAUSED` save to localStorage only — apply on next reset
    - _Requirements: 17.2, 17.3, 17.4_

  - [x] 8.8 Write `Timer.init()`: load `tld_timerDuration` via `Storage.load` (default 25), clamp to 25 if corrupt, seed `state.timer`, call `Timer.render()`
    - Wire `#timer-start`, `#timer-stop`, `#timer-reset` click events, and `#timer-duration-save` click → `Timer.saveDuration()`
    - _Requirements: 2.1, 17.5, 17.6_

- [x] 9. Checkpoint — Greeting and Timer complete
  - Open `index.html` in a browser; confirm clock ticks, greeting phrase changes by hour, timer starts/stops/resets, and duration validation rejects out-of-range values. Ask the user if questions arise.

- [x] 10. Implement the Tasks module — pure functions (`js/app.js` — Section 5, part A)
  - [x] 10.1 Write `addTask(tasks, description)`: return new array with appended `Task` object (`id` from `generateId()`, `description: description.trim()`, `completed: false`, `insertionIndex: maxExistingIndex + 1`, `createdAt: Date.now()`)
    - _Requirements: 4.2, 16.7_

  - [x] 10.2 Write `editTask(task, newDesc)`: return new task object with only `description` updated to `newDesc.trim()`; all other fields (`id`, `completed`, `insertionIndex`, `createdAt`) unchanged
    - _Requirements: 5.3_

  - [x] 10.3 Write `toggleComplete(task)`: return new task object with `completed: !task.completed`; all other fields unchanged
    - _Requirements: 6.1, 6.2_

  - [x] 10.4 Write `deleteTask(tasks, id)`: return new array with the task matching `id` removed; all others unchanged
    - _Requirements: 6.3_

  - [x] 10.5 Write `sortTasks(order, tasks)`: return a new shallow-copy array sorted by the given `SortOrder`; never mutate input; implement all six comparators: `date-asc`, `date-desc`, `alpha-az`, `alpha-za`, `incomplete-first`, `complete-first`
    - _Requirements: 16.1, 16.2, 16.6_

  - [x] 10.6 Write `serializeTasks(tasks)` / `deserializeTasks(json)`: JSON stringify/parse with full field preservation; `deserializeTasks` must return `[]` on invalid input
    - _Requirements: 7.4_

- [~] 11. Implement the Tasks module — stateful operations and rendering (`js/app.js` — Section 5, part B)
  - [-] 11.1 Write the Task List HTML markup inside `#widget-tasks`:
    - `#task-input` (text field), `#task-add-btn` (button), `#task-sort-select` (`<select>` with six `<option>` values), `#task-list` (`<ul>`)
    - Task item template: checkbox (completion toggle), description `<span>`, edit button, delete button; edit mode swaps description span for `<input>` + save/cancel buttons
    - `<span aria-live="polite" id="task-input-error"></span>` for add-validation feedback
    - _Requirements: 4.1, 4.4, 5.1, 5.2, 6.4, 16.1_

  - [-] 11.2 Write `Tasks.render()`: clear `#task-list`; call `sortTasks(state.sortOrder, state.tasks)`; build DOM nodes for each task without `innerHTML` (use `createElement`, `textContent`, `setAttribute`); apply `completed` class for visual distinction; if `state.tasks` is empty show a placeholder message
    - _Requirements: 4.4, 4.5, 6.1, 6.4, 7.2_

  - [-] 11.3 Write `Tasks.add(description)`: validate with `isBlank`; on failure focus `#task-input` and surface error in `#task-input-error`; on success call `addTask()`, update `state.tasks`, persist via `Storage.save('tld_tasks', serializeTasks(...))`, clear input, call `Tasks.render()`
    - _Requirements: 4.2, 4.3, 7.1_

  - [-] 11.4 Write `Tasks.edit(id, description)`: validate with `isBlank`; on failure keep edit mode and focus inline input; on success call `editTask()`, update `state.tasks`, persist, call `Tasks.render()`
    - _Requirements: 5.3, 5.4_

  - [-] 11.5 Write `Tasks.activateEditMode(id)`: for each task set an `editMode` flag — only the target task gets `true`, all others get `false`; re-render so only one task is in edit mode at a time; pre-populate inline input with current description
    - _Requirements: 5.1, 5.6_

  - [~] 11.6 Write `Tasks.cancelEdit()`: clear all `editMode` flags; call `Tasks.render()` to restore display mode with original description
    - _Requirements: 5.5_

  - [~] 11.7 Write `Tasks.toggleComplete(id)`: call `toggleComplete(task)`, update `state.tasks`, persist, call `Tasks.render()`; re-render also applies active sort so completion-based sort views update in real time
    - _Requirements: 6.1, 6.2, 16.8_

  - [~] 11.8 Write `Tasks.delete(id)`: call `deleteTask()`, update `state.tasks`, persist, call `Tasks.render()`
    - _Requirements: 6.3, 7.1_

  - [~] 11.9 Write `Tasks.setSortOrder(order)`: update `state.sortOrder`, persist via `Storage.save('tld_sortOrder', order)`, call `Tasks.render()`
    - _Requirements: 16.2, 16.3_

  - [~] 11.10 Write `Tasks.init()`: load tasks via `Storage.load('tld_tasks', '[]')` → `deserializeTasks`; load sort order via `Storage.load('tld_sortOrder', 'date-asc')`; seed `state.tasks` and `state.sortOrder`; call `Tasks.render()`
    - Wire `#task-add-btn` click and `#task-input` keydown (Enter) → `Tasks.add()`
    - Wire `#task-sort-select` change → `Tasks.setSortOrder()`
    - _Requirements: 7.2, 7.3, 16.4, 16.5_

- [~] 12. Checkpoint — Tasks module complete
  - Add, edit (save and cancel), toggle complete, delete tasks; change sort order and verify tasks re-order; reload page and verify tasks and sort order restore from localStorage. Ask the user if questions arise.

- [~] 13. Implement the Links module — pure functions (`js/app.js` — Section 6, part A)
  - [~] 13.1 Write `addLink(links, label, url)`: return new array with appended `Link` object (`id` from `generateId()`, `label: label.trim()`, `url`)
    - _Requirements: 9.2_

  - [~] 13.2 Write `deleteLink(links, id)`: return new array with the link matching `id` removed; all others unchanged
    - _Requirements: 9.5_

  - [~] 13.3 Write `serializeLinks(links)` / `deserializeLinks(json)`: JSON stringify/parse with full field preservation; `deserializeLinks` must return `[]` on invalid input
    - _Requirements: 10.4_

- [ ] 14. Implement the Links module — stateful operations and rendering (`js/app.js` — Section 6, part B)
  - [~] 14.1 Write the Quick Links HTML markup inside `#widget-links`:
    - `#link-label-input` (text field), `#link-url-input` (text field), `#link-add-btn` (button), `#links-container` (holds link buttons)
    - `<span aria-live="polite" id="link-label-error"></span>` and `<span aria-live="polite" id="link-url-error"></span>` for validation feedback
    - _Requirements: 9.1, 9.3, 9.4_

  - [~] 14.2 Write `Links.render()`: clear `#links-container`; if `state.links` empty show placeholder `<p>` text; otherwise render each link as `<a target="_blank" rel="noopener noreferrer">` with `href` set via `setAttribute` and label via `textContent` (no `innerHTML`); add delete button per link
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [~] 14.3 Write `Links.add(label, url)`: validate label with `isBlank` and url with `isValidUrl`; focus first invalid field and surface error in appropriate `aria-live` `<span>`; on success call `addLink()`, update `state.links`, persist via `Storage.save('tld_links', serializeLinks(...))`, clear both inputs, call `Links.render()`
    - _Requirements: 9.2, 9.3, 9.4, 10.1_

  - [~] 14.4 Write `Links.delete(id)`: call `deleteLink()`, update `state.links`, persist, call `Links.render()`
    - _Requirements: 9.5, 10.1_

  - [~] 14.5 Write `Links.init()`: load links via `Storage.load('tld_links', '[]')` → `deserializeLinks`; seed `state.links`; call `Links.render()`
    - Wire `#link-add-btn` click → `Links.add()`
    - _Requirements: 10.2, 10.3_

- [ ] 15. Implement the Bootstrap section (`js/app.js` — Section 7)
  - [~] 15.1 Write the Bootstrap `DOMContentLoaded` handler: verify all required DOM element selectors are present; for any missing element emit `console.error` and return early for that module's `init()`
    - _Requirements: 12.1_

  - [~] 15.2 Call module init functions in dependency order: `Storage` (no init needed) → `Theme.init()` → `Greeting.init()` → `Timer.init()` → `Tasks.init()` → `Links.init()`
    - Confirm all event listeners (theme toggle, greeting name, timer controls, task add/edit/sort, link add/delete) are wired inside their respective `init()` calls so Bootstrap only orchestrates the sequence
    - _Requirements: 1.7, 7.2, 10.2, 14.5_

- [~] 16. Checkpoint — Full integration pass
  - Open `index.html` via `file://` in Chrome, Firefox, Edge, and Safari; verify cold load with empty localStorage shows defaults (light theme, "Good Morning/Afternoon/Evening/Night", 25:00 timer, empty task list with no error, placeholder links message); reload with populated localStorage and verify all widgets restore their state. Ask the user if questions arise.

- [ ] 17. Accessibility and semantic polish
  - [~] 17.1 Add `aria-label` or `aria-labelledby` to each widget section element; add `role="list"` / `role="listitem"` where semantic HTML alone is insufficient
    - _Requirements: 11.3_

  - [~] 17.2 Confirm all interactive controls (buttons, inputs, select) are keyboard-reachable and have visible focus styles; confirm `aria-live="polite"` `<span>` elements are present for every validated input field
    - _Requirements: 11.3_

  - [~] 17.3 Add `aria-disabled="true"` to timer buttons when disabled (in addition to the HTML `disabled` attribute) so assistive technologies announce the correct state
    - _Requirements: 3.2, 3.3, 3.4, 3.5_

- [~] 18. Final checkpoint — All requirements verified
  - Confirm all 17 requirements and their acceptance criteria are met; verify no page-level scroll on a 600 × 320 viewport; verify dark mode applies without flash on reload; ensure no `innerHTML` is used anywhere (XSS hardening per design). Ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional sub-tasks (none in this plan — no test framework required per the project's NFR).
- All three deliverable files (`index.html`, `css/style.css`, `js/app.js`) are the only files that must be created; no build tools, no bundler, no test runner installation.
- The anti-flash inline `<script>` in `<head>` (Task 1) is the single exception to the "all JS in `app.js`" rule — it must remain inline to fire before CSS loads.
- `innerHTML` is forbidden throughout the application per the design's XSS hardening requirement; always use `textContent`, `createElement`, and `setAttribute`.
- The `state` object is the single source of truth; the DOM must never be read to derive state.
- `crypto.randomUUID()` requires a secure context or `file://` — the `Date.now()` fallback in `generateId()` ensures compatibility with older browsers and non-secure origins.

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "2.2", "2.3", "3.1", "3.2", "3.3"] },
    { "id": 2, "tasks": ["4.1", "4.2", "4.3", "5.1", "5.2", "5.3", "5.4", "5.5", "5.6", "5.7", "5.8"] },
    { "id": 3, "tasks": ["7.1", "7.2", "7.3", "7.4", "7.5", "8.1", "8.2", "8.3", "8.4", "8.5", "8.6", "8.7", "8.8"] },
    { "id": 4, "tasks": ["10.1", "10.2", "10.3", "10.4", "10.5", "10.6"] },
    { "id": 5, "tasks": ["11.1", "11.2", "11.3", "11.4", "11.5", "11.6", "11.7", "11.8", "11.9", "11.10", "13.1", "13.2", "13.3"] },
    { "id": 6, "tasks": ["14.1", "14.2", "14.3", "14.4", "14.5"] },
    { "id": 7, "tasks": ["15.1", "15.2"] },
    { "id": 8, "tasks": ["17.1", "17.2", "17.3"] }
  ]
}
```
