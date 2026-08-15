# Design Document — To-Do Life Dashboard

## Overview

The To-Do Life Dashboard is a zero-dependency, client-side productivity page delivered as a single HTML file (`index.html`) with one CSS file (`css/style.css`) and one JavaScript file (`js/app.js`). It targets modern browsers running either via the `file://` protocol or packaged as a browser extension.

The application exposes four widgets on a single, non-scrolling page:

| Widget | Responsibility |
|---|---|
| Greeting | Live clock, date, time-of-day greeting, optional personalised name |
| Focus Timer | Configurable 25–60 min countdown with Start / Stop / Reset |
| To-Do List | Add, edit, complete, delete, and sort tasks |
| Quick Links | Add and open user-defined URL shortcuts |

All user data persists exclusively through `localStorage` (no server, no cookies, no IndexedDB). Every `localStorage` key is prefixed `tld_` to avoid collisions with other extensions or pages using the same origin.

The design follows a strict **unidirectional data flow**: an in-memory `state` object is the single source of truth and the DOM is a pure projection of that state. No widget reads the DOM to derive application state.

---

## Architecture

### High-Level Data Flow

```
User Interaction
      │
      ▼
 Event Handler   (captures raw event, validates input)
      │
      ▼
 State Mutation  (updates the in-memory state object)
      │
      ├──► Storage Writer  (serialises state slice → localStorage)
      │
      └──► Renderer        (projects state slice → DOM)
```

### Module Sections in `js/app.js`

`app.js` is organised into eight clearly delimited comment-separated sections. There are no ES modules, no bundlers, and no global namespace pollution beyond a single `const state = {}` top-level object.

```
// ── 1. Storage ──────────────────────────────────────────────
// ── 2. Theme ────────────────────────────────────────────────
// ── 3. Greeting ─────────────────────────────────────────────
// ── 4. Timer ────────────────────────────────────────────────
// ── 5. Tasks ────────────────────────────────────────────────
// ── 6. Links ────────────────────────────────────────────────
// ── 7. Bootstrap ────────────────────────────────────────────
```

The **Bootstrap** section runs on `DOMContentLoaded`. It calls the initialisation functions of all other sections in dependency order: Storage → Theme → Greeting → Timer → Tasks → Links.

### Theme Application Timing

To prevent a flash of the wrong theme, a minimal inline `<script>` block in `<head>` (before any `<link>` or `<body>` element) reads `localStorage.getItem('tld_theme')` and sets `document.documentElement.dataset.theme` synchronously. The full Theme section of `app.js` then wires the toggle control after the DOM is ready.

```
┌─ <head> ────────────────────────────────────────────────────┐
│  <script>                                                    │
│    (function() {                                            │
│      var t = localStorage.getItem('tld_theme') || 'light';  │
│      document.documentElement.dataset.theme = t;            │
│    })();                                                     │
│  </script>                                                   │
│  <link rel="stylesheet" href="css/style.css">               │
└─────────────────────────────────────────────────────────────┘
```

CSS uses `[data-theme="dark"]` attribute selectors to switch colour tokens.

---

## Components and Interfaces

### 1. Storage Module

**Responsibility:** All `localStorage` reads and writes. Every call is wrapped in `try/catch` so that browsers with storage disabled or quotas exceeded degrade gracefully to in-memory defaults.

```js
// Public interface
Storage.load(key, defaultValue)     // → parsed value or defaultValue
Storage.save(key, value)            // → void (silently fails on error)
Storage.remove(key)                 // → void
```

Defined `localStorage` keys:

| Key | Type | Default (applied only when key is absent from localStorage) |
|---|---|---|
| `tld_theme` | `"light" \| "dark"` | `"light"` |
| `tld_userName` | `string` | `""` |
| `tld_timerDuration` | `number` (integer, 25–60) | `25` |
| `tld_tasks` | `Task[]` (JSON) | `[]` |
| `tld_links` | `Link[]` (JSON) | `[]` |
| `tld_sortOrder` | `SortOrder` (string enum) | `"date-asc"` |

### 2. Theme Module

**Responsibility:** Apply theme on load, wire the toggle button.

```js
// Public interface
Theme.init()         // reads localStorage, sets data-theme on <html>
Theme.toggle()       // flips current theme, persists, updates DOM
Theme.getCurrent()   // → "light" | "dark"
```

**Toggle semantics:** `Theme.toggle()` reads the stored theme value from `localStorage`. If and only if the stored value is exactly the string `"dark"`, it switches to `"light"`. In all other cases (stored value is `"light"`, absent, or any other string) it switches to `"dark"`. This prevents unexpected state from corrupted storage silently toggling to light.

The toggle button carries `aria-label` reflecting the *next* theme (e.g., "Switch to dark mode") so screen readers and sighted users always know what the next activation will do.

### 3. Greeting Module

**Responsibility:** Live clock tick, date format, greeting classification, user name editing.

```js
// Public interface
Greeting.init()           // seeds state, starts 1-minute interval
Greeting.render()         // projects state.greeting → DOM
Greeting.saveUserName(s)  // validates, trims, persists, re-renders
```

**User name semantics:**
- On load, the stored `User_Name` value is restored **exactly as stored** (no additional trimming or transformation at load time). The value written to storage is already trimmed at save time.
- `saveUserName(s)` trims `s`. If `s.trim()` is a non-empty string, the trimmed value is stored and the personalised greeting is shown.
- If `s.trim()` is empty (covers the empty string and all whitespace-only strings), the User_Name is removed from storage and the greeting reverts to the non-personalised form.
- Only strings where `s.trim() === ""` trigger the empty-name path. Any string containing at least one non-whitespace character is treated as a valid name.

The 1-minute interval is started with an initial tick aligned to the next full minute:

```js
const msUntilNextMinute = 60_000 - (Date.now() % 60_000);
setTimeout(() => {
  Greeting.render();
  setInterval(Greeting.render, 60_000);
}, msUntilNextMinute);
```

**Greeting classification** (`getGreetingPhrase(hours)`) is a pure function:

| Hours (local, inclusive) | Phrase |
|---|---|
| 05:00 – 11:59 (hours 5–11) | Good Morning |
| 12:00 – 17:59 (hours 12–17) | Good Afternoon |
| 18:00 – 21:59 (hours 18–21) | Good Evening |
| 22:00 – 04:59 (hours 22–23 and 0–4) | Good Night |

### 4. Timer Module

**Responsibility:** Focus Timer state machine and countdown logic.

```js
// Public interface
Timer.init()            // loads saved duration, seeds state, renders
Timer.start()           // transitions state → RUNNING, stores startTimestamp
Timer.stop()            // transitions state → PAUSED, captures remainingMs
Timer.reset()           // transitions state → IDLE, restores savedDuration
Timer.saveDuration(n)   // validates 25–60, persists, applies per §17.3-4
Timer.render()          // projects state.timer → DOM
Timer.tick()            // called by setInterval every 1 second
```

**Duration loading priority:** On `Timer.init()`, the duration is loaded from `localStorage`. If a saved value exists, it **always takes priority** over any hardcoded default. The default of 25 minutes is applied only when `localStorage` contains no `tld_timerDuration` entry at all (i.e., storage is truly empty for that key).

**Timer state machine:**

```
         ┌──────────────────────────┐
         │         IDLE             │◄────────── reset()
         │  display: savedDuration  │
         └──────────┬───────────────┘
                    │ start()
                    ▼
         ┌──────────────────────────┐
         │        RUNNING           │◄── start() (from PAUSED)
         │  counts down via tick()  │
         └──────────┬───────────────┘
              stop()│      │ reaches 00:00
                    ▼      ▼
         ┌────────────────────────────────┐
         │   PAUSED   │  EXPIRED (IDLE)   │
         │            │  display: 00:00   │
         └────────────┴───────────────────┘
```

**Tab-visibility accuracy:** Rather than counting ticks, the timer stores `startTimestamp = Date.now()` when started and `remainingAtStart` (the remaining ms at that moment). Each `tick()` computes:

```js
const elapsed = Date.now() - state.timer.startTimestamp;
const remaining = state.timer.remainingAtStart - elapsed;
```

This means pausing a tab for 10 minutes and returning will show the correct remaining time, not a stale tick count.

**Control enabled/disabled map by state:**

| Timer State | Start | Stop | Reset |
|---|---|---|---|
| IDLE | enabled | disabled | enabled |
| RUNNING | disabled | enabled | enabled |
| PAUSED | enabled | disabled | enabled |
| ERROR / LOADING | disabled | disabled | enabled |

During a system error or loading state that prevents the timer from accepting input, both Start and Stop are rendered disabled. Reset remains enabled so the user can always return to a known-good state.

### 5. Tasks Module

**Responsibility:** Task CRUD, sort, persistence, and rendering.

```js
// Public interface
Tasks.init()                  // loads from localStorage, renders
Tasks.add(description)        // validates, creates Task, appends, persists
Tasks.edit(id, description)   // validates, updates Task, persists
Tasks.toggleComplete(id)      // flips completed flag, persists
Tasks.delete(id)              // removes Task by id, persists
Tasks.setSortOrder(order)     // persists sort, re-renders
Tasks.render()                // projects state.tasks → DOM
Tasks.sortTasks(order, arr)   // pure function: returns sorted shallow copy
```

**Load sequence and input gating:** On `Tasks.init()`, non-task interactions (timer, links, greeting) are available immediately. Task-related actions (add, edit, complete, delete) are blocked until the render pass completes. If `localStorage` contains no task data, the empty list renders immediately and accepts user input without delay.

`Tasks.sortTasks()` **never mutates** its input array. It always returns a new array (shallow copy) sorted by the given `SortOrder`. The backing `state.tasks` array always stores tasks in insertion order; `insertionIndex` is the ground truth for `date-asc` and `date-desc` sorts.

**Sort order loading priority:** On `Tasks.init()`, the sort order is loaded from `localStorage`. If a stored value exists, it **always overrides** any in-memory or hardcoded default. The `"date-asc"` default is applied only when `localStorage` contains no `tld_sortOrder` entry at all.

**Sort strategies:**

| SortOrder | Comparator |
|---|---|
| `date-asc` | `a.insertionIndex - b.insertionIndex` |
| `date-desc` | `b.insertionIndex - a.insertionIndex` |
| `alpha-az` | `a.description.localeCompare(b.description)` |
| `alpha-za` | `b.description.localeCompare(a.description)` |
| `incomplete-first` | incomplete before complete, ties by insertionIndex |
| `complete-first` | complete before incomplete, ties by insertionIndex |

### 6. Links Module

**Responsibility:** Quick Links CRUD, persistence, and rendering.

```js
// Public interface
Links.init()              // loads from localStorage, renders
Links.add(label, url)     // validates, creates Link, appends, persists
Links.delete(id)          // removes Link by id, persists
Links.render()            // projects state.links → DOM
```

**Empty state:** When no links are saved, the panel renders with no link buttons and no blocking placeholder — user input (label and URL fields) is available immediately. A static hint may be shown via CSS `::before` or an `aria-label` on the container so the panel is not visually empty, but this must not be an interactive element that blocks submission.

Link buttons are rendered as `<a>` elements with `target="_blank" rel="noopener noreferrer"`. The `href` is set via `.setAttribute('href', link.url)` and the label via `.textContent = link.label`. No `innerHTML` is used anywhere in the application.

**URL validation** (`isValidUrl(s)`) is a pure function:

```js
function isValidUrl(s) {
  return typeof s === 'string' &&
    (s.startsWith('https://') || s.startsWith('http://'));
}
```

---

## Data Models

All data models are plain JSON-serialisable JavaScript objects.

### Task

```ts
interface Task {
  id: string;             // crypto.randomUUID() or Date.now().toString()
  description: string;    // trimmed, non-empty
  completed: boolean;
  insertionIndex: number; // monotonically increasing, assigned at creation
  createdAt: number;      // Date.now() at creation (for display / debug)
}
```

### Link

```ts
interface Link {
  id: string;    // crypto.randomUUID() or Date.now().toString()
  label: string; // trimmed, non-empty
  url: string;   // must start with http:// or https://
}
```

### TimerState

```ts
type TimerStatus = 'IDLE' | 'RUNNING' | 'PAUSED';

interface TimerState {
  status: TimerStatus;
  savedDuration: number;    // integer minutes, 25–60; persisted in localStorage
  remainingMs: number;      // milliseconds currently displayed
  startTimestamp: number;   // Date.now() at last start/resume (0 if not running)
  remainingAtStart: number; // remainingMs captured when last start/resume occurred
  intervalId: number | null;
}
```

### GreetingState

```ts
interface GreetingState {
  userName: string;  // "" if not set
}
```

### Top-Level Application State

```js
const state = {
  theme: 'light',                    // "light" | "dark"
  greeting: { userName: '' },
  timer: { /* TimerState */ },
  tasks: [],                         // Task[], backing array in insertion order
  links: [],                         // Link[]
  sortOrder: 'date-asc',             // SortOrder
};
```

### CSS Custom Properties (Design Tokens)

```css
:root {
  --color-bg: #d3985cde;
  --color-surface: #dcaa60e0;
  --color-text-primary: #1a1a1a;
  --color-text-secondary: #666666;
  --color-accent: #4a6fa5;
  --color-accent-hover: #3a5a8f;
  --color-border: #e0e0e0;
  --color-complete: #888888;
  --font-size-base: 1rem;         /* 16px */
  --font-size-sm: 0.875rem;       /* 14px — minimum body size */
  --border-radius: 6px;
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
}

[data-theme="dark"] {
  --color-bg: #1a1a2e;
  --color-surface: #16213e;
  --color-text-primary: #e0e0e0;
  --color-text-secondary: #aaaaaa;
  --color-accent: #6b8cba;
  --color-border: #333355;
  --color-complete: #666680;
}
```

### Page Layout (Grid)

```
┌───────────────────────────────────────────────────────────────┐
│  Theme Toggle (top-right, fixed position)                     │
├───────────────────┬───────────────────────────────────────────┤
│   Greeting Widget │   Focus Timer Widget                      │
│   (top-middle)      │   (middle-middle)                             │
├───────────────────┴───────────────────────────────────────────┤
│   To-Do List Widget                                           │
│   (bottom-left, scrollable internally if tasks overflow)      │
├───────────────────────────────────────────────────────────────┤
│   Quick Links Widget                                          │
│   (bottom-right)                                              │
└───────────────────────────────────────────────────────────────┘
```

On viewports ≥ 600px height and ≥ 320px width the four-widget grid fits without page-level scroll. Each widget is individually scrollable if its content overflows. The CSS grid uses `grid-template-areas` for semantic layout:

```css
.dashboard {
  display: grid;
  grid-template-areas:
    "time greeting  timer"
    "tasks     links";
  grid-template-rows: auto 1fr;
  grid-template-columns: 1fr 1fr;
  height: 100vh;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Time formatter produces valid HH:MM strings

*For any* `Date` object, `formatTime(date)` must return a string that matches the regular expression `/^\d{2}:\d{2}$/`, where the first component is a zero-padded hour (00–23) and the second is a zero-padded minute (00–59).

**Validates: Requirements 1.1**

---

### Property 2: Duration formatter produces valid MM:SS strings

*For any* non-negative integer number of seconds `s`, `formatDuration(s)` must return a string matching `/^\d{2}:\d{2}$/` where the minute component equals `Math.floor(s / 60)` (zero-padded) and the second component equals `s % 60` (zero-padded).

**Validates: Requirements 2.2**

---

### Property 3: Date formatter contains all required components

*For any* `Date` object, `formatDate(date)` must return a string that contains a recognised English day-of-week name, a numeric day, a recognised English month name, and the four-digit year.

**Validates: Requirements 1.2**

---

### Property 4: Greeting classifier covers the full 24-hour domain

*For any* integer hour `h` in the range 0–23 inclusive, `getGreetingPhrase(h)` must return exactly one of `"Good Morning"`, `"Good Afternoon"`, `"Good Evening"`, or `"Good Night"`, with no hour mapping to more than one phrase and no hour returning an unrecognised value. The mapping must be:
- hours 5–11 → `"Good Morning"` (05:00–11:59)
- hours 12–17 → `"Good Afternoon"` (12:00–17:59)
- hours 18–21 → `"Good Evening"` (18:00–21:59)
- hours 22–23 and 0–4 → `"Good Night"` (22:00–04:59)

**Validates: Requirements 1.3, 1.4, 1.5, 1.6**

---

### Property 5: Whitespace validator correctly classifies all-whitespace strings

*For any* string `s`, `isBlank(s)` must return `true` if and only if `s.trim()` equals the empty string. Equivalently, `isBlank(s)` must return `false` for any string containing at least one non-whitespace character.

**Validates: Requirements 4.3, 5.4, 15.6**

---

### Property 6: Timer control availability is a total function of timer state

*For any* timer state `ts` in `{ IDLE, RUNNING, PAUSED, ERROR, LOADING }`, the function `getControlAvailability(ts)` must return an object `{ start: boolean, stop: boolean, reset: boolean }` such that:
- In `IDLE`: start=true, stop=false, reset=true
- In `RUNNING`: start=false, stop=true, reset=true
- In `PAUSED`: start=true, stop=false, reset=true
- In `ERROR` or `LOADING`: start=false, stop=false, reset=true
- `reset` is always `true` regardless of state

**Validates: Requirements 3.2, 3.3, 3.4, 3.5, 3.6**

---

### Property 7: Adding a task grows the task list by exactly one

*For any* array of tasks `tasks` and any non-blank string `description`, calling `addTask(tasks, description)` must return a new array of length `tasks.length + 1` whose last element has a `description` equal to `description.trim()`, a `completed` value of `false`, and an `insertionIndex` strictly greater than any existing `insertionIndex` in `tasks`.

**Validates: Requirements 4.2, 16.7**

---

### Property 8: Sort preserves the underlying insertion-order invariant

*For any* array of tasks `tasks` and any `SortOrder` value `order`, `sortTasks(order, tasks)` must:
1. Return a new array (not mutate the input)
2. Return an array of the same length as the input
3. Contain exactly the same task `id` values as the input (no tasks added or removed)
4. When `order` is `"date-asc"`, return tasks in ascending `insertionIndex` order
5. Never modify the `insertionIndex` of any task in the original `tasks` array

**Validates: Requirements 4.5, 16.2, 16.6**

---

### Property 9: Edit save updates description, leaves other fields unchanged

*For any* task `t` and non-blank string `newDesc`, `editTask(t, newDesc)` must return a task object where `description` equals `newDesc.trim()` and all other fields (`id`, `completed`, `insertionIndex`, `createdAt`) are identical to the original.

**Validates: Requirements 5.3**

---

### Property 10: Edit cancel preserves the original task unchanged

*For any* task `t`, cancelling an edit must result in a task object that is deeply equal to `t` — no field may be modified.

**Validates: Requirements 5.5**

---

### Property 11: At most one task is in edit mode at any time

*For any* array of tasks `tasks` where at most one task is already in edit mode, calling `activateEditMode(tasks, id)` must return an array where exactly one task (the task with the matching `id`) is in edit mode and all other tasks are not in edit mode.

**Validates: Requirements 5.6**

---

### Property 12: Completion toggle is a boolean flip

*For any* task `t`, `toggleComplete(t)` must return a task where `completed` equals `!t.completed` and all other fields are identical to the original.

**Validates: Requirements 6.1, 6.2**

---

### Property 13: Delete removes the target task and only the target task

*For any* non-empty array of tasks `tasks` and any task `id` present in `tasks`, `deleteTask(tasks, id)` must return an array of length `tasks.length - 1` that does not contain any element with that `id`, and all other tasks are present unchanged.

**Validates: Requirements 6.3**

---

### Property 14: Task data serialization round-trip is lossless

*For any* array of tasks `tasks`, `deserializeTasks(serializeTasks(tasks))` must produce an array deeply equal to `tasks` — preserving `id`, `description`, `completed`, `insertionIndex`, and `createdAt` for every element.

**Validates: Requirements 7.1, 7.4**

---

### Property 15: Adding a link grows the links collection by exactly one

*For any* array of links `links`, non-empty string `label`, and URL string `url` starting with `http://` or `https://`, `addLink(links, label, url)` must return a new array of length `links.length + 1` whose last element has `label` equal to `label.trim()` and `url` equal to `url`.

**Validates: Requirements 9.2**

---

### Property 16: Link delete removes the target link and only the target link

*For any* non-empty array of links `links` and any link `id` present in `links`, `deleteLink(links, id)` must return an array of length `links.length - 1` that contains no element with that `id`, and all other links are unchanged.

**Validates: Requirements 9.5**

---

### Property 17: URL protocol validator accepts only http/https

*For any* string `s`, `isValidUrl(s)` must return `true` if and only if `s` starts with `"https://"` or `"http://"`. It must return `false` for all other strings, including empty strings, strings starting with `ftp://`, `//`, `www.`, or arbitrary text.

**Validates: Requirements 9.4**

---

### Property 18: Link data serialization round-trip is lossless

*For any* array of links `links`, `deserializeLinks(serializeLinks(links))` must produce an array deeply equal to `links` — preserving `id`, `label`, and `url` for every element.

**Validates: Requirements 10.1, 10.4**

---

### Property 19: Theme toggle respects exact stored value

*For any* stored theme string `t`, `toggleTheme(t)` must return `"light"` if and only if `t` is exactly the string `"dark"`. For any other value of `t` (including `"light"`, absent, or any unrecognised string), `toggleTheme(t)` must return `"dark"`. Consequently, applying `toggleTheme` twice to the value `"dark"` must return `"dark"`, and applying it twice to `"light"` must also return `"dark"` → `"light"` → `"dark"` — i.e., the round-trip identity holds for the canonical `"dark"` → `"light"` → `"dark"` cycle.

**Validates: Requirements 14.2, 14.3**

---

### Property 20: User name persistence is a round-trip with exact restoration

*For any* non-blank string `name` (i.e., `name.trim() !== ""`), calling `saveUserName(name)` followed by `loadUserName()` must return `name.trim()` exactly — byte-for-byte, with no additional transformation. Calling `saveUserName(s)` where `s.trim() === ""` (any whitespace-only or empty string) followed by `loadUserName()` must return the empty string `""`.

**Validates: Requirements 15.2, 15.5**

---

### Property 21: Timer duration validator enforces 25–60 range

*For any* number `n`, `isValidDuration(n)` must return `true` if and only if `n` is an integer and `25 ≤ n ≤ 60`. It must return `false` for non-integers, values below 25, values above 60, and non-numeric inputs.

**Validates: Requirements 17.1, 17.2**

---

### Property 22: Timer reset always uses the last saved duration

*For any* saved duration `d` (25–60) stored in state, calling `reset()` must set the displayed remaining time to `d * 60` seconds regardless of how many times the timer has been started, stopped, or allowed to expire.

**Validates: Requirements 17.7, 2.6**

---

## Error Handling

### localStorage Failures

Every `localStorage` call is wrapped in a `try/catch` block. On failure, `Storage.load()` returns the provided `defaultValue` and `Storage.save()` logs a `console.warn` and returns silently. The application continues to function as a non-persistent session.

All `localStorage` reads and writes are **synchronous** — the application never defers storage operations to microtasks, `setTimeout`, or `requestAnimationFrame`. This guarantees consistent data access behaviour during page load and in direct response to user actions (Req 13.3).

```js
function load(key, defaultValue) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? defaultValue : JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('[tld] localStorage write failed:', e);
  }
}
```

### Input Validation

All user inputs are validated before any state mutation. Validation failures are surfaced inline:
- Empty/whitespace-only text inputs: the field is focused, no state change occurs.
- Invalid timer duration (outside 25–60): an inline error message is shown adjacent to the input field. The input field is focused.
- Invalid URL (missing `http://`/`https://` prefix): an inline error message is shown adjacent to the URL field. The field is focused.

Error messages are injected as `textContent` into a dedicated `<span aria-live="polite">` adjacent to each validated input, ensuring assistive technologies announce the error without a focus change.

### Timer Arithmetic Edge Cases

- If `remainingMs` computed from timestamp arithmetic is negative (e.g., system clock adjustment), the timer clamps to 0 and transitions to `EXPIRED/IDLE`.
- If `savedDuration` loaded from `localStorage` falls outside 25–60 (data corruption), the module clamps it to 25 before using it.
- If the `setInterval` fires while the timer is not `RUNNING` (e.g., rapid state changes), `tick()` is a no-op unless `state.timer.status === 'RUNNING'`.

### JSON Parse Errors

If `localStorage` contains malformed JSON for tasks or links (e.g., corrupted by an extension conflict), `Storage.load()` catches the `JSON.parse` exception and returns the default value (`[]`). A `console.warn` records the key and raw value for debugging.

### Missing DOM Elements

The bootstrap function verifies that all required DOM element selectors are present before wiring event listeners. If an element is missing (e.g., partial HTML load), a `console.error` is emitted and the relevant module's `init()` returns early rather than throwing.

---

## Testing Strategy

### Overview

This application has no build tools or test frameworks installed. The testing strategy is designed to work with a lightweight browser-native test harness (a small `test/runner.js` file that defines `describe`, `it`, and `assert` helpers) or with a zero-config test runner like [QUnit](https://qunitjs.com/) loaded via a local file.

Because the application's logic functions are intentionally extracted as pure, side-effect-free functions, they can be imported and tested in complete isolation from the DOM and from `localStorage`.

The strategy uses a **dual testing approach**:
- **Unit / property-based tests**: verify pure logic functions against the 22 correctness properties
- **Integration tests**: verify localStorage bootstrap paths, timer tick behaviour, and end-to-end widget flows
- **Smoke tests**: verify DOM structure and browser compat at startup

Property-based testing is appropriate here because the core logic functions (`formatTime`, `formatDuration`, `formatDate`, `getGreetingPhrase`, `isBlank`, `isValidUrl`, `isValidDuration`, `sortTasks`, `addTask`, `editTask`, `deleteTask`, `toggleComplete`, `addLink`, `deleteLink`, `serializeTasks`, `deserializeTasks`) are all pure functions with well-defined input domains and universal properties.

**Recommended PBT library:** [fast-check](https://fast-check.dev/) — available as a single UMD file (`fast-check.min.js`) that can be loaded locally without a bundler. Alternatively, a manual random-input generator (~50 lines) can be included in the test file if no external files are desired.

### Property-Based Tests

Each property test must run a minimum of **100 iterations** with varied generated inputs. Each test includes a comment referencing the design property it validates.

```
// Feature: todo-life-dashboard, Property 1: Time formatter produces valid HH:MM strings
// Feature: todo-life-dashboard, Property 4: Greeting classifier covers the full 24-hour domain
// Feature: todo-life-dashboard, Property 8: Sort preserves the underlying insertion-order invariant
// ...
```

**Test file location:** `test/properties.test.js`

| Property | Generator(s) | Assertion |
|---|---|---|
| P1 — `formatTime` | Arbitrary `Date` (random ms since epoch) | Output matches `/^\d{2}:\d{2}$/` |
| P2 — `formatDuration` | Arbitrary integer 0–3600 | Output matches MM:SS; minutes=⌊s/60⌋; seconds=s%60 |
| P3 — `formatDate` | Arbitrary `Date` | Output contains day name, numeric day, month name, year |
| P4 — `getGreetingPhrase` | Integer 0–23 | Returns one of 4 known phrases; each hour maps to exactly one |
| P5 — `isBlank` | Arbitrary strings (incl. whitespace-only) | Round-trip: `isBlank(s) === (s.trim() === '')` |
| P6 — `getControlAvailability` | Arbitrary `TimerStatus` including ERROR/LOADING | Returns correct enabled map per status; start=false and stop=false for ERROR/LOADING |
| P7 — `addTask` | Arbitrary task array + non-blank string | Length grows by 1; new task at end; insertionIndex > all prior |
| P8 — `sortTasks` | Arbitrary task array + arbitrary `SortOrder` | Input not mutated; output same length; same ids; date-asc = ascending insertionIndex |
| P9 — `editTask` | Arbitrary task + non-blank string | Only `description` changes; all other fields preserved |
| P10 — `toggleComplete` | Arbitrary task | `completed` is flipped; all other fields preserved |
| P11 — `deleteTask` | Non-empty task array + valid id | Length shrinks by 1; target id absent; others unchanged |
| P12 — `serializeTasks` → `deserializeTasks` | Arbitrary `Task[]` | Deep equal round-trip |
| P13 — `addLink` | Arbitrary link array + valid (label, url) | Length grows by 1; new link at end |
| P14 — `deleteLink` | Non-empty link array + valid id | Length shrinks by 1; target absent; others unchanged |
| P15 — `isValidUrl` | Arbitrary strings (incl. http/https/ftp/empty) | Returns true iff starts with `http://` or `https://` |
| P16 — `serializeLinks` → `deserializeLinks` | Arbitrary `Link[]` | Deep equal round-trip |
| P17 — `toggleTheme` | Strings including `"dark"`, `"light"`, arbitrary strings | Returns `"light"` iff input is exactly `"dark"`; returns `"dark"` for all other inputs |
| P18 — `isValidDuration` | Integers −100 to 200 + non-integers | True iff integer and 25–60 |
| P19 — `at-most-one-edit-mode` | Arbitrary task array | After `activateEditMode(tasks, id)`, exactly 1 task has `editMode=true` |

### Unit / Example-Based Tests

**Test file location:** `test/unit.test.js`

Focus on concrete scenarios that complement property tests:

- Timer state machine transitions (IDLE → RUNNING → PAUSED → IDLE)
- Timer expiry at 00:00 transitions to IDLE and does not go negative
- Saved duration persists across multiple reset cycles
- Empty task list loads without error on bootstrap
- Empty links list shows placeholder message
- Theme applied before first paint (inline script sets `data-theme` before CSS loads)
- User name cleared when whitespace submitted
- Sort order applied on bootstrap from localStorage
- Link rejected when URL missing protocol

### Integration Tests

**Test file location:** `test/integration.test.js`

These tests run in a real browser window (or a headless browser via a simple HTML harness):

- Full page load with pre-seeded `localStorage` data — verify all widgets render pre-existing data
- Task lifecycle: add → edit → complete → delete → verify localStorage after each step
- Links lifecycle: add → open → delete → verify localStorage
- Timer accuracy: mock `Date.now()` to advance 90 seconds; verify display shows correct remaining time
- Theme persistence: toggle theme, reload page, verify data-theme is applied before body renders

### Smoke Tests

Run once at startup (can be checked via browser devtools or a startup assertion block):

- All four widget containers exist in the DOM
- Theme toggle button is present and has `aria-label`
- Timer controls (Start, Stop, Reset) are present
- Task input field is present
- Links input fields are present
- No JavaScript errors on cold load with empty `localStorage`
- No JavaScript errors on cold load with fully populated `localStorage`

### Testing Constraints

- No external CDN dependencies for tests — all test libraries must be locally referenced files
- Tests must run via `file://` protocol without a local server
- Property tests must run a minimum of **100 iterations** per property
- Tests must not pollute `localStorage` of the running page — use a mock/stub for the `Storage` module during unit and property tests
