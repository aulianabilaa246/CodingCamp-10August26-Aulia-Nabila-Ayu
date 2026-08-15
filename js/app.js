/* To-Do Life Dashboard — application logic */

// ── State ────────────────────────────────────────────────────
const state = {
  greeting: { userName: '' },
  timer: {
    status: 'IDLE',
    savedDuration: 25,
    remainingMs: 25 * 60 * 1000,
    startTimestamp: 0,
    remainingAtStart: 0,
    intervalId: null
  },
  tasks: [],
  links: [],
  sortOrder: 'date-asc'
};

// ── 1. Storage ──────────────────────────────────────────────

const Storage = (() => {
  function load(key, defaultValue) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return defaultValue;
      return JSON.parse(raw);
    } catch (e) {
      console.warn('[tld] localStorage read/parse failed for key "' + key + '":', e);
      return defaultValue;
    }
  }

  function save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('[tld] localStorage write failed for key "' + key + '":', e);
    }
  }

  function remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('[tld] localStorage remove failed for key "' + key + '":', e);
    }
  }

  return { load, save, remove };
})();

// ── Pure Helpers ─────────────────────────────────────────────

function formatTime(date) {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return h + ':' + m;
}

function formatDate(date) {
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  // Example output: "Monday, 14 July 2025"
}

// Task 5.3 — Requirement 2.2
function formatDuration(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

// Task 5.4 — Requirements 1.3, 1.4, 1.5, 1.6
function getGreetingPhrase(hours) {
  if (hours >= 5 && hours <= 11) return 'Good Morning';
  if (hours >= 12 && hours <= 17) return 'Good Afternoon';
  if (hours >= 18 && hours <= 21) return 'Good Evening';
  return 'Good Night'; // 22–4
}

// Task 5.5 — Requirements 4.3, 5.4, 15.6
function isBlank(s) {
  return s.trim() === '';
}

// Task 5.6 — Requirement 9.4
function isValidUrl(s) {
  return typeof s === 'string' && (s.startsWith('https://') || s.startsWith('http://'));
}

// Task 5.7 — Requirements 17.1, 17.2
function isValidDuration(n) {
  return Number.isInteger(n) && n >= 25 && n <= 60;
}

// Task 5.8 — Requirements 4.2, 9.2
function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Date.now().toString();
}

// ── 2. Theme ────────────────────────────────────────────────

const Theme = (() => {
  // Updates the toggle button's aria-label and icon to reflect the *next* theme.
  // Requirement 14.7: the label always describes what will happen on next activation.
  function _updateToggleLabel(theme) {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    if (theme === 'dark') {
      btn.setAttribute('aria-label', 'Switch to light mode');
      btn.textContent = '☀️';
    } else {
      btn.setAttribute('aria-label', 'Switch to dark mode');
      btn.textContent = '🌙';
    }
  }

  // Task 4.1 — Requirements 14.5, 14.6, 14.7
  // Reads tld_theme from localStorage (default "light"), applies it to <html>,
  // updates the toggle button label, and wires the click event.
  function init() {
    const theme = Storage.load('tld_theme', 'light');
    document.documentElement.dataset.theme = theme;
    _updateToggleLabel(theme);

    // Wire the toggle button here so the Theme module is self-contained.
    // The Bootstrap section (task 15) will call Theme.init(); no duplicate wiring needed.
    const btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.addEventListener('click', toggle);
    }
  }

  // Task 4.2 — Requirements 14.2, 14.3, 14.4
  // Flips the theme, writes to localStorage, and refreshes the button label.
  function toggle() {
    const current = getCurrent();
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    Storage.save('tld_theme', next);
    _updateToggleLabel(next);
  }

  // Task 4.3 — Requirements 14.1, 14.7
  // Returns the currently active theme from the <html> data attribute.
  function getCurrent() {
    return document.documentElement.dataset.theme || 'light';
  }

  return { init, toggle, getCurrent };
})();

// ── 3. Greeting ─────────────────────────────────────────────

const Greeting = (() => {
  // Task 7.2 — Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 15.2, 15.4
  // Projects state.greeting and the current Date into the DOM.
  function render() {
    const now = new Date();
    const timeEl = document.getElementById('greeting-time');
    const dateEl = document.getElementById('greeting-date');
    const phraseEl = document.getElementById('greeting-phrase');
    const nameDisplayEl = document.getElementById('greeting-name-display');

    if (timeEl) timeEl.textContent = formatTime(now);
    if (dateEl) dateEl.textContent = formatDate(now);

    const phrase = getGreetingPhrase(now.getHours());
    const name = state.greeting.userName;

    if (phraseEl) phraseEl.textContent = phrase;
    if (nameDisplayEl) {
      nameDisplayEl.textContent = name ? ', ' + name + '!' : '';
    }
  }

  // Task 7.3 — Requirements 15.2, 15.5, 15.6
  // Validates input: if blank, clears the stored name; otherwise trims and persists.
  // Always re-renders after the state change.
  function saveUserName(s) {
    const errorEl = document.getElementById('greeting-name-error');
    if (isBlank(s)) {
      Storage.remove('tld_userName');
      state.greeting.userName = '';
    } else {
      const trimmed = s.trim();
      state.greeting.userName = trimmed;
      Storage.save('tld_userName', trimmed);
    }
    if (errorEl) errorEl.textContent = '';
    render();
  }

  // Task 7.4 — Requirements 1.7, 15.3, 15.4
  // Loads persisted user name, seeds state, renders immediately, then schedules
  // a minute-aligned clock tick so the display stays in sync with wall-clock minutes.
  // Task 7.5 — Requirements 15.1, 15.6, 15.7
  // Also wires the edit/save controls and surfaces validation errors inline.
  function init() {
    state.greeting.userName = Storage.load('tld_userName', '');
    render();

    const editBtn = document.getElementById('greeting-name-edit');
    const saveBtn = document.getElementById('greeting-name-save');
    const input   = document.getElementById('greeting-name-input');
    const form    = document.getElementById('greeting-name-form');
    const errorEl = document.getElementById('greeting-name-error');

    if (!editBtn || !saveBtn || !input || !form) {
      console.error('[tld] Greeting: one or more required DOM elements are missing.');
    }

    // Task 7.5 — Requirement 15.7
    // Toggle the inline name form open/closed; pre-fill with the current name on
    // open so the user can edit in-place rather than retyping from scratch.
    if (editBtn && form) {
      editBtn.addEventListener('click', function () {
        form.hidden = !form.hidden;
        if (!form.hidden) {
          if (input) {
            input.value = state.greeting.userName;
            input.focus();
          }
          // Clear any stale error message when reopening the form.
          if (errorEl) errorEl.textContent = '';
        }
      });
    }

    // Task 7.5 — Requirements 15.1, 15.2, 15.5, 15.6
    // Save button handler:
    //   • Blank / whitespace-only input → treated as "clear name" per Req 15.6;
    //     delegates to saveUserName which removes the stored value (Req 15.5).
    //     No error is raised — clearing is a valid intentional action.
    //   • Non-blank input → trim, persist, show personalised greeting (Req 15.2).
    // On either path: close the form and reset the field after saving.
    if (saveBtn && input) {
      saveBtn.addEventListener('click', function () {
        // saveUserName handles both the blank (clear) and non-blank (persist) cases
        // and always clears any previous error via its own errorEl reset.
        saveUserName(input.value);
        if (form)  form.hidden = true;
        if (input) input.value = '';
      });
    }

    // Minute-aligned clock — fires render() at the next exact minute boundary,
    // then every 60 s thereafter. This keeps the displayed time in step with the
    // system clock without accumulating per-tick drift.
    const msUntilNextMinute = 60000 - (Date.now() % 60000);
    setTimeout(function () {
      render();
      setInterval(render, 60000);
    }, msUntilNextMinute);
  }

  return { init, render, saveUserName };
})();

// ── 4. Timer ────────────────────────────────────────────────

const Timer = (() => {

  // Task 8.2 — Requirements 2.2, 3.2, 3.3, 3.4, 3.5
  // Projects state.timer → DOM: updates the MM:SS display and applies the
  // correct enabled/disabled state to Start, Stop, and Reset.
  //
  // Enabled/disabled map (disabled = true means the button is NOT clickable):
  //   IDLE:    start=false  stop=true   reset=false
  //   RUNNING: start=true   stop=false  reset=false
  //   PAUSED:  start=false  stop=true   reset=false
  //   reset is always enabled (disabled=false) regardless of state.
  function render() {
    const displayEl = document.getElementById('timer-display');
    const startBtn  = document.getElementById('timer-start');
    const stopBtn   = document.getElementById('timer-stop');
    const resetBtn  = document.getElementById('timer-reset');

    // Clamp to 0 before formatting so we never display negative time.
    const seconds = Math.ceil(state.timer.remainingMs / 1000);
    if (displayEl) displayEl.textContent = formatDuration(Math.max(0, seconds));

    // disabled=true means the button cannot be clicked in that state.
    const DISABLED = {
      IDLE:    { start: false, stop: true,  reset: false },
      RUNNING: { start: true,  stop: false, reset: false },
      PAUSED:  { start: false, stop: true,  reset: false }
    };
    const d = DISABLED[state.timer.status] || DISABLED.IDLE;

    if (startBtn) {
      startBtn.disabled = d.start;
      startBtn.setAttribute('aria-disabled', String(d.start));
    }
    if (stopBtn) {
      stopBtn.disabled = d.stop;
      stopBtn.setAttribute('aria-disabled', String(d.stop));
    }
    if (resetBtn) {
      // Reset is always enabled per Requirement 3.5.
      resetBtn.disabled = false;
      resetBtn.setAttribute('aria-disabled', 'false');
    }
  }

  // Task 8.3 — Requirements 2.3, 2.7, 2.8
  // Called by setInterval every 1 second.  Uses timestamp arithmetic so that
  // tab inactivity (throttled intervals) is corrected on the next tick.
  // Req 2.8: elapsed is derived from wall-clock timestamps, not tick count,
  // so a backgrounded/throttled tab always displays the correct remaining time.
  function tick() {
    // No-op if the timer is not actively counting down (Req 2.3).
    if (state.timer.status !== 'RUNNING') return;

    const elapsed   = Date.now() - state.timer.startTimestamp;
    const remaining = state.timer.remainingAtStart - elapsed;
    // Clamp to 0 so a system-clock adjustment or late tick never produces
    // a negative remainder (Req 2.7 — never display negative time).
    const clamped   = Math.max(0, remaining);

    if (clamped <= 0) {
      // Timer expired — transition to IDLE and display 00:00 (Req 2.8).
      clearInterval(state.timer.intervalId);
      state.timer.intervalId  = null;
      state.timer.remainingMs = 0;
      state.timer.status      = 'IDLE';
    } else {
      state.timer.remainingMs = clamped;
    }
    render();
  }

  // Task 8.4 — Requirements 2.3, 2.5
  // Transitions IDLE or PAUSED → RUNNING.  Records startTimestamp and
  // remainingAtStart so tick() can compute elapsed time accurately.
  function start() {
    if (state.timer.status !== 'IDLE' && state.timer.status !== 'PAUSED') return;
    state.timer.status = 'RUNNING';
    state.timer.startTimestamp  = Date.now();
    state.timer.remainingAtStart = state.timer.remainingMs;
    state.timer.intervalId = setInterval(tick, 1000);
    render();
  }

  // Task 8.5 — Requirement 2.4
  // Pauses the countdown.  Captures the exact remaining time using the same
  // timestamp arithmetic as tick() so no time is lost on stop.
  function stop() {
    if (state.timer.status !== 'RUNNING') return;
    const elapsed = Date.now() - state.timer.startTimestamp;
    state.timer.remainingMs = Math.max(0, state.timer.remainingAtStart - elapsed);
    clearInterval(state.timer.intervalId);
    state.timer.intervalId = null;
    state.timer.status = 'PAUSED';
    render();
  }

  // Task 8.6 — Requirements 2.1, 2.6, 17.7
  // Clears any running interval and restores remainingMs to the last saved
  // duration so Reset always shows the user's current preference, not 25 min.
  function reset() {
    if (state.timer.intervalId !== null) {
      clearInterval(state.timer.intervalId);
      state.timer.intervalId = null;
    }
    state.timer.status      = 'IDLE';
    state.timer.remainingMs = state.timer.savedDuration * 60 * 1000;
    render();
  }

  // Task 8.7 — Requirements 17.2, 17.3, 17.4
  // Validates the requested duration (integer 25–60) and persists it.
  // If the timer is IDLE the display is updated immediately via reset().
  // If RUNNING or PAUSED the new duration is saved for the next reset.
  function saveDuration(n) {
    const errorEl = document.getElementById('timer-duration-error');
    const inputEl = document.getElementById('timer-duration-input');

    if (!isValidDuration(n)) {
      if (errorEl) errorEl.textContent = 'Duration must be between 25 and 60 minutes.';
      if (inputEl) inputEl.focus();
      return;
    }

    // Clear any previous error.
    if (errorEl) errorEl.textContent = '';

    Storage.save('tld_timerDuration', n);
    state.timer.savedDuration = n;

    // Requirement 17.3: update display immediately only when IDLE.
    // Requirement 17.4: when RUNNING or PAUSED, apply only after next reset.
    if (state.timer.status === 'IDLE') {
      reset();
    }
  }

  // Task 8.8 — Requirements 2.1, 17.5, 17.6
  // Loads persisted duration, seeds state, calls render(), and wires all
  // timer control click handlers.
  function init() {
    let duration = Storage.load('tld_timerDuration', 25);
    // Clamp corrupt values per design §Timer Arithmetic Edge Cases.
    if (!isValidDuration(duration)) duration = 25;

    state.timer.savedDuration    = duration;
    state.timer.remainingMs      = duration * 60 * 1000;
    state.timer.status           = 'IDLE';
    state.timer.startTimestamp   = 0;
    state.timer.remainingAtStart = 0;
    state.timer.intervalId       = null;

    // Sync the duration input to the persisted value.
    const inputEl = document.getElementById('timer-duration-input');
    if (inputEl) {
      inputEl.value = duration;
    } else {
      console.error('[tld] Timer: #timer-duration-input element not found.');
    }

    // Wire control buttons.
    const startBtn = document.getElementById('timer-start');
    const stopBtn  = document.getElementById('timer-stop');
    const resetBtn = document.getElementById('timer-reset');
    const saveBtn  = document.getElementById('timer-duration-save');

    if (startBtn) {
      startBtn.addEventListener('click', start);
    } else {
      console.error('[tld] Timer: #timer-start element not found.');
    }
    if (stopBtn) {
      stopBtn.addEventListener('click', stop);
    } else {
      console.error('[tld] Timer: #timer-stop element not found.');
    }
    if (resetBtn) {
      resetBtn.addEventListener('click', reset);
    } else {
      console.error('[tld] Timer: #timer-reset element not found.');
    }
    if (saveBtn && inputEl) {
      saveBtn.addEventListener('click', function () {
        saveDuration(parseInt(inputEl.value, 10));
      });
    } else if (!saveBtn) {
      console.error('[tld] Timer: #timer-duration-save element not found.');
    }

    render();
  }

  return { init, render, tick, start, stop, reset, saveDuration };
})();

// ── 5. Tasks ────────────────────────────────────────────────

// Task 10.1 — Requirements 4.2, 16.7
// Pure function: returns a new array with one Task appended.
// Never mutates the input array.
//
// insertionIndex is strictly greater than every existing insertionIndex,
// which guarantees a stable insertion-order sort regardless of when tasks
// were created.  The Math.max(..., -1) sentinel makes the empty-array case
// produce insertionIndex = 0 without a special branch.
function addTask(tasks, description) {
  const maxIndex = tasks.length > 0
    ? Math.max(...tasks.map(function (t) { return t.insertionIndex; }))
    : -1;

  const newTask = {
    id:             generateId(),
    description:    description.trim(),
    completed:      false,
    insertionIndex: maxIndex + 1,
    createdAt:      Date.now()
  };

  return tasks.concat([newTask]);
}

// Task 10.5 — Requirements 16.1, 16.2, 16.6
// Pure function: returns a new shallow-copy array sorted by the given SortOrder.
// Never mutates the input array.
//
// Sort strategies:
//   date-asc        — ascending insertionIndex (original insertion order)
//   date-desc       — descending insertionIndex (most-recently-added first)
//   alpha-az        — A→Z by description (locale-aware)
//   alpha-za        — Z→A by description (locale-aware)
//   incomplete-first — incomplete tasks first; ties resolved by insertionIndex
//   complete-first  — completed tasks first; ties resolved by insertionIndex
//
// Unknown order values fall back to date-asc behaviour.
function sortTasks(order, tasks) {
  const copy = tasks.slice(); // shallow copy — never mutate the input

  switch (order) {
    case 'date-asc':
      copy.sort(function (a, b) { return a.insertionIndex - b.insertionIndex; });
      break;

    case 'date-desc':
      copy.sort(function (a, b) { return b.insertionIndex - a.insertionIndex; });
      break;

    case 'alpha-az':
      copy.sort(function (a, b) { return a.description.localeCompare(b.description); });
      break;

    case 'alpha-za':
      copy.sort(function (a, b) { return b.description.localeCompare(a.description); });
      break;

    case 'incomplete-first':
      // Incomplete (completed=false) sorts before complete (completed=true).
      // When both tasks have the same completion state, fall back to insertion order.
      copy.sort(function (a, b) {
        if (a.completed === b.completed) return a.insertionIndex - b.insertionIndex;
        return a.completed ? 1 : -1;
      });
      break;

    case 'complete-first':
      // Complete (completed=true) sorts before incomplete (completed=false).
      // Ties resolved by insertion order.
      copy.sort(function (a, b) {
        if (a.completed === b.completed) return a.insertionIndex - b.insertionIndex;
        return a.completed ? -1 : 1;
      });
      break;

    default:
      // Unknown order — fall back to date-asc.
      copy.sort(function (a, b) { return a.insertionIndex - b.insertionIndex; });
      break;
  }

  return copy;
}

// Task 10.2 — Requirement 5.3
// Pure function: returns a new task object with only `description` updated to
// newDesc.trim().  All other fields (id, completed, insertionIndex, createdAt)
// are copied unchanged.  The input task is never mutated.
function editTask(task, newDesc) {
  return Object.assign({}, task, { description: newDesc.trim() });
}

// Task 10.3 — Requirements 6.1, 6.2
// Returns a new task object with the completed flag flipped.
// Every other field (id, description, insertionIndex, createdAt) is
// carried over unchanged. Input task is never mutated.
function toggleComplete(task) {
  return Object.assign({}, task, { completed: !task.completed });
}

// Task 10.4 — Requirement 6.3
// Returns a new array with the task matching the given id removed.
// All other tasks are returned unchanged and in their original order.
// Input array is never mutated.
function deleteTask(tasks, id) {
  return tasks.filter(function (t) { return t.id !== id; });
}

// Task 10.6 — Requirement 7.4
// Serialises the tasks array to a JSON string.
// All Task fields (id, description, completed, insertionIndex, createdAt)
// are preserved verbatim by JSON.stringify.
function serializeTasks(tasks) {
  return JSON.stringify(tasks);
}

// Task 10.6 — Requirement 7.4
// Parses a JSON string back into a Task array.
// Returns [] on any error: invalid JSON, null/undefined input, non-string
// input, or a parsed value that is not an array.
function deserializeTasks(json) {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

// ── Tasks IIFE (stateful operations) ────────────────────────
// Stateful operations and rendering live here.
// Pure helpers (addTask, editTask, toggleComplete, deleteTask,
// sortTasks, serializeTasks, deserializeTasks) are defined above as
// module-level functions and are called from inside this IIFE.

const Tasks = (() => {

  // Task 11.2 — Requirements 4.4, 4.5, 6.1, 6.4, 7.2
  //
  // Projects state.tasks → #task-list.
  //
  // For each task, builds either:
  //   • Display mode: checkbox | description span | Edit btn | Delete btn
  //   • Edit mode:    inline text input (pre-populated) | Save btn | Cancel btn
  //
  // All nodes are built via createElement/textContent/setAttribute.
  // innerHTML is NEVER used (XSS hardening per design).
  // Completed tasks receive the CSS class "completed" (Req 6.4).
  function render() {
    const listEl = document.getElementById('task-list');
    if (!listEl) {
      console.error('[tld] Tasks.render(): #task-list element not found.');
      return;
    }

    // Clear existing children.
    while (listEl.firstChild) {
      listEl.removeChild(listEl.firstChild);
    }

    // Sort a display-only copy; never sort state.tasks in-place.
    const sorted = sortTasks(state.sortOrder, state.tasks);

    // Empty-state placeholder.
    if (sorted.length === 0) {
      const placeholder = document.createElement('li');
      placeholder.className = 'task-placeholder';
      placeholder.textContent = 'No tasks yet. Add one above!';
      listEl.appendChild(placeholder);
      return;
    }

    sorted.forEach(function (task) {
      const li = document.createElement('li');
      li.setAttribute('data-id', task.id);
      li.className = 'task-item' + (task.completed ? ' completed' : '');

      if (task.editMode) {
        // ── Edit mode ──────────────────────────────────────────────────────
        // Inline input pre-populated with the current description (Req 5.1).
        // data-edit-id lets Tasks.edit() focus this field on validation failure.
        const editInput = document.createElement('input');
        editInput.type = 'text';
        editInput.className = 'task-edit-input';
        editInput.setAttribute('data-edit-id', task.id);
        editInput.setAttribute('aria-label', 'Edit task description');
        editInput.value = task.description;

        const saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.className = 'task-edit-save';
        saveBtn.textContent = 'Save';
        saveBtn.addEventListener('click', function () {
          Tasks.edit(task.id, editInput.value);
        });

        // Enter key saves, Escape cancels.
        editInput.addEventListener('keydown', function (e) {
          if (e.key === 'Enter')  Tasks.edit(task.id, editInput.value);
          if (e.key === 'Escape') Tasks.cancelEdit();
        });

        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'task-edit-cancel';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.addEventListener('click', function () {
          Tasks.cancelEdit();
        });

        li.appendChild(editInput);
        li.appendChild(saveBtn);
        li.appendChild(cancelBtn);

        // Auto-focus after the element is inserted into the DOM.
        setTimeout(function () { editInput.focus(); }, 0);

      } else {
        // ── Display mode ───────────────────────────────────────────────────
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'task-checkbox';
        checkbox.checked = task.completed;
        checkbox.setAttribute('aria-label',
          'Mark task as ' + (task.completed ? 'incomplete' : 'complete') +
          ': ' + task.description);
        checkbox.addEventListener('change', function () {
          Tasks.toggleComplete(task.id);
        });

        const descSpan = document.createElement('span');
        descSpan.className = 'task-description';
        descSpan.textContent = task.description;

        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'task-edit-btn';
        editBtn.textContent = '✏️';
        editBtn.setAttribute('aria-label', 'Edit task: ' + task.description);
        editBtn.addEventListener('click', function () {
          Tasks.activateEditMode(task.id);
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'task-delete-btn';
        deleteBtn.textContent = '🗑️';
        deleteBtn.setAttribute('aria-label', 'Delete task: ' + task.description);
        deleteBtn.addEventListener('click', function () {
          Tasks.delete(task.id);
        });

        li.appendChild(checkbox);
        li.appendChild(descSpan);
        li.appendChild(editBtn);
        li.appendChild(deleteBtn);
      }

      listEl.appendChild(li);
    });
  }

  // Task 11.3 — Requirements 4.2, 4.3, 7.1
  // Validates the description with isBlank.
  // On failure: focus #task-input and surface error in #task-input-error.
  // On success: append task, persist, clear input, re-render.
  function add(description) {
    const inputEl = document.getElementById('task-input');
    const errorEl = document.getElementById('task-input-error');

    if (isBlank(description)) {
      if (errorEl) errorEl.textContent = 'Task description cannot be empty.';
      if (inputEl) inputEl.focus();
      return;
    }

    if (errorEl) errorEl.textContent = '';
    state.tasks = addTask(state.tasks, description);
    Storage.save('tld_tasks', serializeTasks(state.tasks));
    if (inputEl) inputEl.value = '';
    render();
  }

  // Task 11.4 — Requirements 5.3, 5.4
  // Validates the new description.
  // On blank: keep edit mode active and focus the inline input.
  // On success: apply the edit via the pure editTask() helper, clear all
  //   editMode flags, persist, re-render.
  function edit(id, description) {
    if (isBlank(description)) {
      // Keep edit mode active; refocus the inline input for this task.
      const inlineInput = document.querySelector('[data-edit-id="' + id + '"]');
      if (inlineInput) inlineInput.focus();
      return;
    }

    state.tasks = state.tasks.map(function (t) {
      if (t.id === id) {
        return Object.assign({}, editTask(t, description), { editMode: false });
      }
      return Object.assign({}, t, { editMode: false });
    });

    Storage.save('tld_tasks', serializeTasks(state.tasks));
    render();
  }

  // Task 11.5 — Requirements 5.1, 5.6
  //
  // Sets the editMode flag on every task in state:
  //   • The task whose id matches → editMode = true
  //   • All other tasks           → editMode = false
  //
  // This guarantees at most one task is ever in edit mode at a time (Req 5.6).
  //
  // editMode is a transient, in-memory-only flag. It is NOT persisted to
  // localStorage. serializeTasks() will include the field if it happens to
  // be present, but the flag carries no meaning across sessions; missing
  // or undefined editMode is treated as false by the renderer.
  //
  // After updating state, render() is called so the DOM immediately reflects
  // the new edit mode. render() pre-populates the inline <input> with
  // task.description for the task that has editMode = true (Req 5.1).
  function activateEditMode(id) {
    state.tasks = state.tasks.map(function (t) {
      return Object.assign({}, t, { editMode: t.id === id });
    });
    render();
  }

  // Task 11.6 — Requirement 5.5
  // Clears editMode on all tasks and re-renders, restoring all items to
  // display mode with their original descriptions unchanged.
  function cancelEdit() {
    state.tasks = state.tasks.map(function (t) {
      return Object.assign({}, t, { editMode: false });
    });
    render();
  }

  // Task 11.7 — Requirements 6.1, 6.2, 16.8
  // Flips the completed flag via the pure toggleComplete() helper,
  // persists, and re-renders (which re-applies the active sort).
  function toggleCompleteById(id) {
    state.tasks = state.tasks.map(function (t) {
      return t.id === id ? toggleComplete(t) : t;
    });
    Storage.save('tld_tasks', serializeTasks(state.tasks));
    render();
  }

  // Task 11.8 — Requirements 6.3, 7.1
  // Removes the target task via the pure deleteTask() helper, persists,
  // and re-renders.
  function deleteById(id) {
    state.tasks = deleteTask(state.tasks, id);
    Storage.save('tld_tasks', serializeTasks(state.tasks));
    render();
  }

  // Task 11.9 — Requirements 16.2, 16.3
  // Updates state.sortOrder, persists, and re-renders so the list immediately
  // reflects the new sort order.
  function setSortOrder(order) {
    state.sortOrder = order;
    Storage.save('tld_sortOrder', order);
    render();
  }

  // Task 11.10 — Requirements 7.2, 7.3, 16.4, 16.5
  // Loads persisted tasks and sort order, seeds state, renders,
  // and wires all task-related event listeners.
  function init() {
    const raw       = Storage.load('tld_tasks', '[]');
    state.tasks     = deserializeTasks(typeof raw === 'string' ? raw : JSON.stringify(raw));
    state.sortOrder = Storage.load('tld_sortOrder', 'date-asc');

    const addBtn  = document.getElementById('task-add-btn');
    const inputEl = document.getElementById('task-input');
    const sortSel = document.getElementById('task-sort-select');

    if (addBtn) {
      addBtn.addEventListener('click', function () {
        add(inputEl ? inputEl.value : '');
      });
    } else {
      console.error('[tld] Tasks: #task-add-btn not found.');
    }

    if (inputEl) {
      inputEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') add(inputEl.value);
      });
    } else {
      console.error('[tld] Tasks: #task-input not found.');
    }

    if (sortSel) {
      // Restore the persisted sort selection in the <select>.
      sortSel.value = state.sortOrder;
      sortSel.addEventListener('change', function () {
        setSortOrder(sortSel.value);
      });
    } else {
      console.error('[tld] Tasks: #task-sort-select not found.');
    }

    render();
  }

  return {
    init,
    render,
    add,
    edit,
    activateEditMode,
    cancelEdit,
    toggleComplete: toggleCompleteById,
    delete: deleteById,
    setSortOrder
  };
})();

// ── 5. Tasks (stateful module) ───────────────────────────────

const Tasks = (() => {

  // Task 11.2 — Requirements 4.4, 4.5, 6.1, 6.4, 7.2
  // Projects state.tasks → #task-list using createElement/textContent only.
  // No innerHTML anywhere (XSS hardening per design).
  // Tasks in editMode render an <input data-edit-id="..."> so Tasks.edit()
  // can focus the field on validation failure (Requirement 5.4).
  function render() {
    const listEl = document.getElementById('task-list');
    if (!listEl) {
      console.error('[tld] Tasks.render(): #task-list element not found.');
      return;
    }

    while (listEl.firstChild) {
      listEl.removeChild(listEl.firstChild);
    }

    const sorted = sortTasks(state.sortOrder, state.tasks);

    if (sorted.length === 0) {
      const placeholder = document.createElement('li');
      placeholder.className = 'task-placeholder';
      placeholder.textContent = 'No tasks yet. Add one above!';
      listEl.appendChild(placeholder);
      return;
    }

    sorted.forEach(function (task) {
      const li = document.createElement('li');
      li.setAttribute('role', 'listitem');
      li.setAttribute('data-task-id', task.id);
      li.className = 'task-item' + (task.completed ? ' completed' : '');

      if (task.editMode) {
        // ── Edit mode ─────────────────────────────────────────
        // The inline input carries data-edit-id so Tasks.edit() can
        // querySelector for it to re-focus on blank-input validation failure.
        const editInput = document.createElement('input');
        editInput.type = 'text';
        editInput.className = 'task-edit-input';
        editInput.setAttribute('data-edit-id', task.id);
        editInput.setAttribute('aria-label', 'Edit task description');
        editInput.value = task.description;

        editInput.addEventListener('keydown', function (e) {
          if (e.key === 'Enter')  Tasks.edit(task.id, editInput.value);
          if (e.key === 'Escape') Tasks.cancelEdit();
        });

        const saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.className = 'task-edit-save';
        saveBtn.textContent = 'Save';
        saveBtn.addEventListener('click', function () {
          Tasks.edit(task.id, editInput.value);
        });

        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'task-edit-cancel';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.addEventListener('click', function () {
          Tasks.cancelEdit();
        });

        li.appendChild(editInput);
        li.appendChild(saveBtn);
        li.appendChild(cancelBtn);

        // Auto-focus deferred so the element is in the DOM first.
        setTimeout(function () { editInput.focus(); }, 0);

      } else {
        // ── Display mode ──────────────────────────────────────
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'task-checkbox';
        checkbox.checked = task.completed;
        checkbox.setAttribute('aria-label', 'Mark task complete: ' + task.description);
        checkbox.addEventListener('change', function () {
          Tasks.toggleComplete(task.id);
        });

        const descSpan = document.createElement('span');
        descSpan.className = 'task-desc';
        descSpan.textContent = task.description;

        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'task-btn-edit';
        editBtn.textContent = '\u270F\uFE0F';
        editBtn.setAttribute('aria-label', 'Edit task: ' + task.description);
        editBtn.addEventListener('click', function () {
          Tasks.activateEditMode(task.id);
        });

        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'task-btn-delete';
        delBtn.textContent = '\uD83D\uDDD1\uFE0F';
        delBtn.setAttribute('aria-label', 'Delete task: ' + task.description);
        delBtn.addEventListener('click', function () {
          Tasks.delete(task.id);
        });

        li.appendChild(checkbox);
        li.appendChild(descSpan);
        li.appendChild(editBtn);
        li.appendChild(delBtn);
      }

      listEl.appendChild(li);
    });
  }

  // Task 11.3 — Requirements 4.2, 4.3, 7.1
  // Validates the description; on blank input surfaces an error and focuses
  // #task-input.  On success appends task, persists, clears input, re-renders.
  function add(description) {
    const inputEl = document.getElementById('task-input');
    const errorEl = document.getElementById('task-input-error');

    if (isBlank(description)) {
      if (errorEl) errorEl.textContent = 'Task description cannot be empty.';
      if (inputEl) inputEl.focus();
      return;
    }

    if (errorEl) errorEl.textContent = '';
    state.tasks = addTask(state.tasks, description);
    Storage.save('tld_tasks', serializeTasks(state.tasks));
    if (inputEl) inputEl.value = '';
    render();
  }

  // Task 11.4 — Requirements 5.3, 5.4
  // Validates the new description with isBlank.
  //
  // On FAILURE (blank / whitespace-only description):
  //   • Focus the inline edit input identified by [data-edit-id="<id>"] so the
  //     user can correct the entry without dismissing edit mode (Req 5.4).
  //   • Return early — state.tasks is NOT mutated; edit mode stays active.
  //
  // On SUCCESS (non-blank description):
  //   • Update the task's description via the pure editTask() helper.
  //   • Clear editMode on all tasks (only one task can be in edit mode at a
  //     time; clearing unconditionally is the simplest safe approach).
  //   • Persist the updated task array to localStorage.
  //   • Call render() to project the new state into the DOM.
  function edit(id, description) {
    if (isBlank(description)) {
      // Keep edit mode active; re-focus the inline input for this task.
      const inlineInput = document.querySelector('[data-edit-id="' + id + '"]');
      if (inlineInput) inlineInput.focus();
      return;
    }

    state.tasks = state.tasks.map(function (t) {
      if (t.id === id) {
        return Object.assign({}, editTask(t, description), { editMode: false });
      }
      return Object.assign({}, t, { editMode: false });
    });

    Storage.save('tld_tasks', serializeTasks(state.tasks));
    render();
  }

  // Task 11.5 — Requirements 5.1, 5.6
  // Sets editMode=true on the target task, false on all others, then re-renders.
  // This guarantees at most one task is ever in edit mode (Req 5.6).
  function activateEditMode(id) {
    state.tasks = state.tasks.map(function (t) {
      return Object.assign({}, t, { editMode: t.id === id });
    });
    render();
  }

  // Task 11.6 — Requirement 5.5
  // Clears editMode on every task and re-renders, restoring all tasks to
  // display mode with their original (unchanged) descriptions.
  function cancelEdit() {
    state.tasks = state.tasks.map(function (t) {
      return Object.assign({}, t, { editMode: false });
    });
    render();
  }

  // Task 11.7 — Requirements 6.1, 6.2, 16.8
  // Flips the completed flag via the pure toggleComplete() helper, persists,
  // and re-renders.  Because render() re-sorts, completion-based sort views
  // update in real time.
  function toggleCompleteTask(id) {
    state.tasks = state.tasks.map(function (t) {
      return t.id === id ? toggleComplete(t) : t;
    });
    Storage.save('tld_tasks', serializeTasks(state.tasks));
    render();
  }

  // Task 11.8 — Requirements 6.3, 7.1
  function deleteTaskById(id) {
    state.tasks = deleteTask(state.tasks, id);
    Storage.save('tld_tasks', serializeTasks(state.tasks));
    render();
  }

  // Task 11.9 — Requirements 16.2, 16.3
  function setSortOrder(order) {
    state.sortOrder = order;
    Storage.save('tld_sortOrder', order);
    render();
  }

  // Task 11.10 — Requirements 7.2, 7.3, 16.4, 16.5
  // Loads persisted tasks and sort order, seeds state, renders, and wires all
  // task-related event listeners.
  function init() {
    const raw = Storage.load('tld_tasks', '[]');
    state.tasks = deserializeTasks(typeof raw === 'string' ? raw : JSON.stringify(raw));

    const savedOrder = Storage.load('tld_sortOrder', 'date-asc');
    state.sortOrder = typeof savedOrder === 'string' ? savedOrder : 'date-asc';

    const sortSelect = document.getElementById('task-sort-select');
    if (sortSelect) {
      sortSelect.value = state.sortOrder;
    }

    render();

    const addBtn  = document.getElementById('task-add-btn');
    const inputEl = document.getElementById('task-input');

    if (addBtn) {
      addBtn.addEventListener('click', function () {
        add(inputEl ? inputEl.value : '');
      });
    } else {
      console.error('[tld] Tasks: #task-add-btn element not found.');
    }

    if (inputEl) {
      inputEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') add(inputEl.value);
      });
    } else {
      console.error('[tld] Tasks: #task-input element not found.');
    }

    if (sortSelect) {
      sortSelect.addEventListener('change', function () {
        setSortOrder(sortSelect.value);
      });
    } else {
      console.error('[tld] Tasks: #task-sort-select element not found.');
    }
  }

  return {
    init,
    render,
    add,
    edit,
    activateEditMode,
    cancelEdit,
    toggleComplete: toggleCompleteTask,
    delete: deleteTaskById,
    setSortOrder
  };
})();
