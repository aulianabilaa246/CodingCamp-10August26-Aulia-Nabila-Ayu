# Requirements Document

## Introduction

The To-Do List Life Dashboard is a client-side web application that serves as a personal productivity hub. It runs entirely in the browser using HTML, CSS, and Vanilla JavaScript with no backend server. All user data is persisted locally via the browser's Local Storage API. The dashboard surfaces four core productivity widgets on a single page: a contextual greeting with live date and time, a Focus Timer for timed work sessions, a To-Do List for task management, and a Quick Links panel for fast access to favourite websites.

The application must work as a standalone web page or as a browser extension in modern browsers (Chrome, Firefox, Edge, Safari). No complex setup, build tools, or test frameworks are required. The codebase follows a strict single-file-per-asset layout (one CSS file, one JavaScript file).

---

## Glossary

- **Dashboard**: The single-page web application described in this document.
- **Greeting_Widget**: The UI component that displays the current time, date, and a time-of-day greeting message.
- **Focus_Timer**: The countdown timer widget used to manage timed work sessions.
- **Session**: A single countdown interval started by the user on the Focus_Timer.
- **Task**: A single to-do item managed by the To-Do List widget.
- **Task_List**: The UI component responsible for displaying, adding, editing, completing, and deleting Tasks.
- **Quick_Links**: The UI component that displays user-defined shortcut buttons to external URLs.
- **Link**: A single Quick Links entry consisting of a label and a URL.
- **Local_Storage**: The browser's `localStorage` API used as the sole persistence mechanism.
- **Modern_Browser**: Chrome (latest), Firefox (latest), Edge (latest), and Safari (latest) at the time of use.
- **Theme**: The active colour scheme of the Dashboard, either "light" or "dark".
- **Theme_Toggle**: The persistent UI control that allows the user to switch between the light and dark Theme.
- **User_Name**: The optional personal name entered by the user that is incorporated into the greeting message.
- **Sort_Order**: The currently active rule by which the Task_List orders its displayed Tasks.
- **Timer_Duration_Setting**: The user-configured timer duration in whole minutes, between 25 and 60 inclusive, used to initialise the Focus_Timer. Defaults to 25 minutes if not set.

---

## Requirements

### Requirement 1: Live Greeting Display

**User Story:** As a user, I want to see the current time, date, and a personalised greeting when I open the Dashboard, so that I am immediately oriented to the current moment without leaving the page.

#### Acceptance Criteria

1. THE Greeting_Widget SHALL display the current local time in HH:MM format, updated every minute.
2. THE Greeting_Widget SHALL display the current local date in a human-readable format (e.g., "Monday, 14 July 2025").
3. WHEN the local time is at or after 05:00 and at or before 11:59, THE Greeting_Widget SHALL display the message "Good Morning".
4. WHEN the local time is at or after 12:00 and at or before 17:59, THE Greeting_Widget SHALL display the message "Good Afternoon".
5. WHEN the local time is at or after 18:00 and at or before 21:59, THE Greeting_Widget SHALL display the message "Good Evening".
6. WHEN the local time is at or after 22:00 or at or before 04:59, THE Greeting_Widget SHALL display the message "Good Night".
7. WHEN the Dashboard page loads, THE Greeting_Widget SHALL render the correct time, date, and greeting immediately without requiring user interaction.

---

### Requirement 2: Focus Timer — Countdown

**User Story:** As a user, I want a 25-minute countdown timer, so that I can time focused work sessions without using a separate application.

#### Acceptance Criteria

1. THE Focus_Timer SHALL initialise with the currently saved duration (default 25 minutes) each time the Dashboard loads or after a Reset action.
2. THE Focus_Timer SHALL display the remaining time in MM:SS format at all times.
3. WHEN the user activates the Start control, THE Focus_Timer SHALL begin counting down by one second per real-world second.
4. WHEN the Focus_Timer is counting down and the user activates the Stop control, THE Focus_Timer SHALL pause the countdown and retain the remaining time.
5. WHEN the Focus_Timer is paused and the user activates the Start control, THE Focus_Timer SHALL resume counting down from the retained remaining time.
6. WHEN the user activates the Reset control, THE Focus_Timer SHALL stop any active countdown and restore the display to the currently saved duration.
7. WHEN the countdown reaches 00:00, THE Focus_Timer SHALL stop automatically and display 00:00.
8. IF the browser tab becomes inactive while the Focus_Timer is counting down, THE Focus_Timer SHALL continue counting down accurately upon the tab becoming active again.

---

### Requirement 3: Focus Timer — Controls

**User Story:** As a user, I want clearly labelled Start, Stop, and Reset buttons on the Focus Timer, so that I can control the timer without ambiguity.

#### Acceptance Criteria

1. THE Focus_Timer SHALL provide a Start control, a Stop control, and a Reset control as distinct interactive elements.
2. WHILE the Focus_Timer is in its initial or reset state, THE Focus_Timer SHALL render the Stop control as disabled and the Start control as enabled.
3. WHILE the Focus_Timer is counting down, THE Focus_Timer SHALL render the Start control as disabled and the Stop control as enabled.
4. WHILE the Focus_Timer is paused, THE Focus_Timer SHALL render the Start control as enabled and the Stop control as disabled.
5. THE Focus_Timer SHALL render the Reset control as enabled at all times.
6. IF a system error or loading state prevents the Focus_Timer from accepting input, THEN THE Focus_Timer SHALL render both the Start control and the Stop control as disabled until the system stabilises.

---

### Requirement 4: To-Do List — Add and Display Tasks

**User Story:** As a user, I want to add tasks to a list and see them displayed on the Dashboard, so that I can track what I need to do.

#### Acceptance Criteria

1. THE Task_List SHALL provide a text input field and a submission control for adding new Tasks.
2. WHEN the user submits a non-empty task description, THE Task_List SHALL append the new Task to the list and clear the input field.
3. IF the user attempts to submit an empty or whitespace-only task description, THEN THE Task_List SHALL reject the submission and leave the input field focused.
4. THE Task_List SHALL display each Task with its description text, a completion toggle control, an edit control, and a delete control.
5. THE Task_List SHALL display Tasks in the order they were added, with the most recently added Task appearing at the bottom of the list.

---

### Requirement 5: To-Do List — Edit Tasks

**User Story:** As a user, I want to edit the text of an existing task, so that I can correct or update it without deleting and re-adding it.

#### Acceptance Criteria

1. WHEN the user activates the edit control on a Task, THE Task_List SHALL replace the Task's description display with an editable text field pre-populated with the current task description.
2. WHILE a Task is in edit mode, THE Task_List SHALL provide a save control to confirm the edit and a cancel control to discard changes.
3. WHEN the user confirms an edit with a non-empty description, THE Task_List SHALL update the Task's stored description and return the Task to display mode.
4. IF the user attempts to confirm an edit with an empty or whitespace-only description, THEN THE Task_List SHALL reject the save and keep the Task in edit mode with the field focused.
5. WHEN the user cancels an edit, THE Task_List SHALL restore the Task to display mode with the original description unchanged.
6. THE Task_List SHALL allow only one Task to be in edit mode at a time.

---

### Requirement 6: To-Do List — Complete and Delete Tasks

**User Story:** As a user, I want to mark tasks as done and delete tasks I no longer need, so that I can maintain an accurate and relevant task list.

#### Acceptance Criteria

1. WHEN the user activates the completion toggle on an incomplete Task, THE Task_List SHALL mark the Task as complete and apply a visual distinction (e.g., strikethrough text) to differentiate it from incomplete Tasks.
2. WHEN the user activates the completion toggle on a complete Task, THE Task_List SHALL mark the Task as incomplete and remove the visual completion distinction.
3. WHEN the user activates the delete control on a Task, THE Task_List SHALL remove the Task from the list permanently.
4. THE Task_List SHALL display incomplete Tasks and complete Tasks with a clear visual difference at all times.

---

### Requirement 7: To-Do List — Persistence

**User Story:** As a user, I want my tasks to be saved automatically, so that they are still present after I close and reopen the browser tab.

#### Acceptance Criteria

1. WHEN a Task is added, edited, completed, or deleted, THE Task_List SHALL write the current state of all Tasks to Local_Storage immediately.
2. WHEN the Dashboard page loads, THE Task_List SHALL read all Tasks from Local_Storage and render them; IF the Task data exists in Local_Storage, THE Task_List SHALL complete the render before accepting task-related user input; non-task interactions SHALL be available immediately.
3. IF no Task data exists in Local_Storage on page load, THEN THE Task_List SHALL render an empty list without error and accept user input immediately.
4. THE Task_List SHALL persist each Task's description, completion status, and insertion order across page reloads.

---

### Requirement 8: Quick Links — Display and Navigation

**User Story:** As a user, I want to see buttons for my favourite websites on the Dashboard, so that I can navigate to them with a single click.

#### Acceptance Criteria

1. THE Quick_Links SHALL display each saved Link as a labelled button.
2. WHEN the user activates a Link button, THE Quick_Links SHALL open the corresponding URL in a new browser tab.
3. THE Quick_Links SHALL display Link buttons in the order they were added.
4. IF no Links are saved, THE Quick_Links SHALL display a placeholder message indicating that no links have been added yet.

---

### Requirement 9: Quick Links — Add and Delete Links

**User Story:** As a user, I want to add and remove quick links, so that I can customise my shortcut panel to match my current needs.

#### Acceptance Criteria

1. THE Quick_Links SHALL provide a label input field, a URL input field, and a submission control for adding new Links.
2. WHEN the user submits a Link with a non-empty label and a valid URL, THE Quick_Links SHALL append the new Link to the panel and clear both input fields.
3. IF the user attempts to submit a Link with an empty label or an empty URL, THEN THE Quick_Links SHALL reject the submission and focus the first empty field.
4. IF the user attempts to submit a URL that does not begin with `http://` or `https://`, THEN THE Quick_Links SHALL reject the submission and indicate to the user that the URL must begin with `http://` or `https://`.
5. WHEN the user activates the delete control on a Link, THE Quick_Links SHALL remove the Link from the panel permanently.

---

### Requirement 10: Quick Links — Persistence

**User Story:** As a user, I want my quick links to be saved automatically, so that they are still present after I close and reopen the browser tab.

#### Acceptance Criteria

1. WHEN a Link is added or deleted, THE Quick_Links SHALL write the current state of all Links to Local_Storage immediately.
2. WHEN the Dashboard page loads, THE Quick_Links SHALL read all Links from Local_Storage and render them; IF valid Link data exists, THE Quick_Links SHALL complete the render before accepting link-related user input.
3. IF no valid Link data exists in Local_Storage on page load, THEN THE Quick_Links SHALL render no link buttons and proceed to accept user input immediately without error.
4. THE Quick_Links SHALL persist each Link's label and URL across page reloads.

---

### Requirement 11: Layout and Visual Design

**User Story:** As a user, I want a clean, readable, and visually organised Dashboard, so that I can use it comfortably without cognitive overhead.

#### Acceptance Criteria

1. THE Dashboard SHALL present all four widgets (Greeting_Widget, Focus_Timer, Task_List, Quick_Links) on a single page without requiring vertical scrolling on viewports with a minimum height of 600px and a minimum width of 320px.
2. THE Dashboard SHALL apply a consistent typographic scale with a minimum body font size of 14px to ensure readability.
3. THE Dashboard SHALL maintain a clear visual hierarchy that distinguishes widget titles, primary content, and controls from one another.
4. THE Dashboard SHALL use a single external CSS file located at `css/style.css` for all styling.
5. THE Dashboard SHALL use a single external JavaScript file located at `js/app.js` for all behaviour.

---

### Requirement 12: Browser Compatibility and Standalone Use

**User Story:** As a user, I want the Dashboard to work in any modern browser and be usable as a standalone file or browser extension, so that I can access it in my preferred environment.

#### Acceptance Criteria

1. THE Dashboard SHALL function correctly in Chrome (latest), Firefox (latest), Edge (latest), and Safari (latest) without browser-specific polyfills or build steps.
2. THE Dashboard SHALL operate correctly when opened as a local HTML file via the `file://` protocol.
3. THE Dashboard SHALL operate correctly when packaged and loaded as a browser extension.
4. THE Dashboard SHALL function without relying on external CDN assets or server-side processing; WHERE the Dashboard makes network requests to fetch data, those requests SHALL be initiated by explicit user action and SHALL NOT be required for the Dashboard's core functionality to operate.

---

### Requirement 13: Performance

**User Story:** As a user, I want the Dashboard to load instantly and respond to my interactions without lag, so that it does not interrupt my workflow.

#### Acceptance Criteria

1. THE Dashboard SHALL complete its initial render in under 1 second on a machine with a modern CPU and 4 GB of RAM when opened via the `file://` protocol.
2. WHEN the user performs any interactive action (add, edit, delete, start timer, click link), THE Dashboard SHALL update the UI within 100 milliseconds.
3. THE Dashboard SHALL use Local_Storage read and write operations synchronously at all times, including during page load and in direct response to user actions, to ensure consistent data access behaviour.

---

### Requirement 14: Light / Dark Mode Toggle

**User Story:** As a user, I want to switch between a light and dark colour theme, so that I can use the Dashboard comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a Theme_Toggle control that is visible and reachable at all times, regardless of which widget is in focus.
2. WHEN the user activates the Theme_Toggle while the Theme is "light", THE Dashboard SHALL switch the Theme to "dark" and update all visual styles accordingly.
3. WHEN the user activates the Theme_Toggle while the stored Theme value is exactly "dark", THE Dashboard SHALL switch the Theme to "light" and update all visual styles accordingly; IF the stored Theme value is not exactly "dark", THE Theme_Toggle activation SHALL have no effect.
4. WHEN the Theme changes, THE Dashboard SHALL write the selected Theme value to Local_Storage immediately.
5. WHEN the Dashboard page loads, THE Dashboard SHALL read the Theme value from Local_Storage and apply it before rendering any visible content, so that no flash of the opposite theme occurs.
6. IF no Theme value exists in Local_Storage on page load, THEN THE Dashboard SHALL apply the "light" Theme as the default.
7. THE Theme_Toggle SHALL display a label or icon that clearly indicates the Theme that will be activated upon the next activation (i.e., it reflects the opposite of the current Theme).

---

### Requirement 15: Custom Name in Greeting

**User Story:** As a user, I want to enter my name so that the greeting is personalised, so that the Dashboard feels more welcoming and personal.

#### Acceptance Criteria

1. THE Greeting_Widget SHALL provide an editable control through which the user can enter or update the User_Name.
2. WHEN the user saves a non-empty User_Name, THE Greeting_Widget SHALL append the User_Name to the greeting message (e.g., "Good Morning, Aulia!") and write the User_Name to Local_Storage immediately.
3. WHEN the Dashboard page loads and a User_Name exists in Local_Storage, THE Greeting_Widget SHALL restore the User_Name exactly as stored and display the personalised greeting before accepting user input.
4. IF no User_Name is stored in Local_Storage on page load, THEN THE Greeting_Widget SHALL display the greeting message without a name (e.g., "Good Morning") and render without error.
5. WHEN the user clears the User_Name field and saves, THE Greeting_Widget SHALL remove the User_Name from Local_Storage and revert to the non-personalised greeting format.
6. IF the user attempts to save a whitespace-only value as the User_Name, THEN THE Greeting_Widget SHALL treat the input as an empty value, applying only the behaviour described in acceptance criterion 5; values containing any non-whitespace character SHALL NOT trigger this behaviour.
7. THE Greeting_Widget SHALL allow the user to activate the name-edit control at any time without disrupting the live time and date display.

---

### Requirement 16: Task Sorting

**User Story:** As a user, I want to sort my task list by date added, alphabetical order, or completion status, so that I can view tasks in the order most useful to me at any moment.

#### Acceptance Criteria

1. THE Task_List SHALL provide a Sort_Order control that offers the following sort options: date added ascending (default), date added descending, alphabetical A→Z, alphabetical Z→A, incomplete tasks first, and complete tasks first.
2. WHEN the user selects a Sort_Order option, THE Task_List SHALL re-render the displayed Tasks in the selected order immediately without requiring a page reload.
3. WHEN the user selects a Sort_Order option, THE Task_List SHALL write the selected Sort_Order value to Local_Storage immediately.
4. WHEN the Dashboard page loads and a Sort_Order value exists in Local_Storage, THE Task_List SHALL override any default Sort_Order and apply the stored Sort_Order when rendering Tasks before accepting user input.
5. IF no Sort_Order value exists in Local_Storage on page load, THEN THE Task_List SHALL apply the "date added ascending" Sort_Order as the default.
6. THE Task_List SHALL preserve the original insertion order of each Task in the underlying data model regardless of the active Sort_Order, so that selecting "date added ascending" at any time restores the original order.
7. WHEN a new Task is added, THE Task_List SHALL insert the Task at the end of the underlying insertion-order sequence and re-render the list according to the active Sort_Order.
8. WHEN a Task's completion status changes, THE Task_List SHALL re-render the list according to the active Sort_Order immediately, so that completion-based sort views update in real time.

---

### Requirement 17: Configurable Focus Timer Duration

**User Story:** As a user, I want to change the Focus Timer duration when I need a longer session, so that I can adapt the timer to different types of work without being locked to 25 minutes.

#### Acceptance Criteria

1. THE Focus_Timer SHALL provide an input control through which the user can set the timer duration to any integer value between 25 and 60 minutes (inclusive), where 25 minutes is both the default and the minimum allowed value.
2. IF the user enters a value less than 25 or greater than 60, THEN THE Focus_Timer SHALL reject the input and display an error message indicating the duration must be between 25 and 60 minutes.
3. WHEN the user saves a valid duration while the Focus_Timer is in its initial or reset state, THE Focus_Timer SHALL update the display to the new duration immediately and write the value to Local_Storage.
4. WHEN the user saves a valid duration while the Focus_Timer is counting down or paused, THE Focus_Timer SHALL save the value to Local_Storage and apply the new duration only after the next Reset action.
5. WHEN the Dashboard page loads and a saved duration exists in Local_Storage, THE Focus_Timer SHALL initialise with that saved duration.
6. IF Local_Storage contains no saved duration value on page load, THEN THE Focus_Timer SHALL initialise with the default duration of 25 minutes.
7. WHEN the user activates the Reset control, THE Focus_Timer SHALL restore the display to the currently saved duration (not necessarily 25 minutes) so that a custom duration persists across multiple sessions.
