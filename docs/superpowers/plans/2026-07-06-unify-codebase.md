# Unify Codebase: Eliminate Duplicate Logic Between `index.html` and `src/` Modules

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or inline execution to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the duplicated business logic between `index.html` inline `<script>` and the `src/` modules, making `src/` the single source of truth, and having `index.html` import from it via ES modules.

**Architecture:** Convert `src/` to ES modules (`.mjs`), extract shared constants into `src/constants.mjs`, create `src/app.mjs` as the UI entry point that imports from the other modules, and update `index.html` to load `<script type="module" src="src/app.mjs">`. The build step is eliminated entirely — the browser loads modules natively.

**Tech Stack:** Vanilla JS, ES Modules (`.mjs`), Node.js `node --test`, no bundlers, no dependencies.

---

## Background: The Problem

The `index.html` has a self-contained IIFE that duplicates ~80% of the logic from `src/core.js`, `src/layout.js`, and `src/storage.js`:

| Logic | `src/` modules (tested) | `index.html` inline (used by users) |
|-------|------------------------|-------------------------------------|
| `createEvent` | ✅ (destructuring params) | ✅ (opts object, slightly different) |
| `addEvent`/`updateEvent`/`deleteEvent` | ✅ | ✅ |
| `inferStages` | ✅ | ✅ |
| `saveEvents`/`loadEvents` | ✅ | ✅ |
| `calculateLayout` | ✅ (returns nested `{event, y, radius}`) | ✅ (returns flattened + ticks) |
| Constants, colors, helpers | ❌ missing from src/ | ✅ inline |
| All UI code (render/drag/modal/toast/export) | ❌ | ✅ inline |

**Risk**: A bug fix in `src/core.js` passes all tests but users never see it because `index.html` has its own copy.

## File Structure Changes

### Files to Create
- `src/constants.mjs` — Shared constants (`STAGE_COLORS`, `PADDING_*`, `MIN_RADIUS`, `MAX_RADIUS`, `TICK_INTERVAL`, `BASE_HEIGHT`, `STORAGE_KEY`) and helpers (`getStageColor`)
- `src/app.mjs` — UI entry point: state management, DOM rendering, drag, toast, modal, export/import, event listeners

### Files to Rename (convert to ES modules)
- `src/core.js` → `src/core.mjs`
- `src/layout.js` → `src/layout.mjs`
- `src/storage.js` → `src/storage.mjs`
- `tests/core.test.js` → `tests/core.test.mjs`
- `tests/layout.test.js` → `tests/layout.test.mjs`
- `tests/storage.test.js` → `tests/storage.test.mjs`

### Files to Modify
- `src/layout.mjs` — Enhance `calculateLayout` to also return `ticks` and flatten event data for UI convenience
- `index.html` — Remove the inline `<script>` block; add `<script type="module" src="src/app.mjs">`

### Files to Delete
- (none — all files are either renamed or created)

---

## Updated `calculateLayout` API

To unify the two versions, `src/layout.mjs`'s `calculateLayout` will be enhanced:

**Before** (returns nested):
```js
{ events: [{ event: {...}, y, radius }], stages: [...], totalHeight }
```

**After** (returns flattened + ticks):
```js
{ events: [{ id, age, title, description, stage, impact, y, radius }], stages: [...], ticks: [{ age, y }], totalHeight }
```

Signature change: `calculateLayout({ events, currentAge, height, padding })` → still accepts the same options object, but adds `ticks` to the return value. Existing layout tests need minor updates (access `.title` instead of `.event.title`, check for `.ticks`).

### Constants to Extract to `src/constants.mjs`

```js
export const STORAGE_KEY = 'life-timeline-events';
export const PADDING_TOP = 60;
export const PADDING_BOTTOM = 60;
export const MIN_RADIUS = 6;
export const MAX_RADIUS = 24;
export const TICK_INTERVAL = 5;
export const BASE_HEIGHT = 1200;
export const STAGE_COLORS = {
  '童年': '#60A5FA',
  '青春期': '#FBBF24',
  '青年': '#34D399',
  '职场': '#3B82F6',
  '中年': '#A78BFA',
  '晚年': '#F87171',
};
export function getStageColor(stage) { return STAGE_COLORS[stage] || '#94A3B8'; }
```

---

## Implementation Tasks

### Task 1: Create `src/constants.mjs` with shared constants

**Files:**
- Create: `src/constants.mjs`

- [ ] **Step 1: Create the file**

```js
// src/constants.mjs
// Shared constants and helpers for the life-timeline app.

export const STORAGE_KEY = 'life-timeline-events';

export const PADDING_TOP = 60;
export const PADDING_BOTTOM = 60;
export const MIN_RADIUS = 6;
export const MAX_RADIUS = 24;
export const TICK_INTERVAL = 5;
export const BASE_HEIGHT = 1200;
export const MIN_TIMELINE_HEIGHT = 600;

export const STAGE_COLORS = {
  '童年': '#60A5FA',
  '青春期': '#FBBF24',
  '青年': '#34D399',
  '职场': '#3B82F6',
  '中年': '#A78BFA',
  '晚年': '#F87171',
};

export function getStageColor(stage) {
  return STAGE_COLORS[stage] || '#94A3B8';
}
```

- [ ] **Step 2: Verify the file loads**

Run: `node -e "import('./src/constants.mjs').then(m => { console.log('OK', Object.keys(m).length, 'exports'); })"`
Expected: Prints `OK 12 exports`

- [ ] **Step 3: Commit**

```bash
git add src/constants.mjs
git commit -m "feat: extract shared constants to src/constants.mjs"
```

---

### Task 2: Convert `src/core.js` to ES module (`src/core.mjs`)

**Files:**
- Rename: `src/core.js` → `src/core.mjs`

| Change | Old | New |
|--------|-----|-----|
| Parameter style | Destructuring `{ age, title, ... }` | Keep destructuring (unchanged) |
| Export | `module.exports = { ... }` | `export { createEvent, addEvent, updateEvent, deleteEvent, inferStages }` |
| `generateId` | Private module-level function | Export it (UI needs it for new events) |
| `_idCounter` | `let` inside module | Keep as `let` (module scope) |

- [ ] **Step 1: Rename and convert**

Rename `src/core.js` to `src/core.mjs`.
Change `module.exports = { createEvent, addEvent, ... }` to `export { createEvent, addEvent, updateEvent, deleteEvent, inferStages, generateId }`.

```js
// End of file — change from:
module.exports = { createEvent, addEvent, updateEvent, deleteEvent, inferStages };
// To:
export { createEvent, addEvent, updateEvent, deleteEvent, inferStages, generateId };
```

- [ ] **Step 2: Verify the module loads**

Run: `node -e "import('./src/core.mjs').then(m => { console.log('OK', Object.keys(m).length, 'exports'); })"`
Expected: Prints `OK 6 exports`

- [ ] **Step 3: Commit**

```bash
git add src/core.mjs src/core.js
git commit -m "refactor: convert core.js to ES module (core.mjs), export generateId"
```

---

### Task 3: Convert `src/storage.js` to ES module (`src/storage.mjs`)

**Files:**
- Rename: `src/storage.js` → `src/storage.mjs`

- [ ] **Step 1: Rename and convert**

Rename `src/storage.js` to `src/storage.mjs`.
Change `module.exports = { saveEvents, loadEvents }` to `export { saveEvents, loadEvents }`.

Import `STORAGE_KEY` from `./constants.mjs` instead of defining it inline:
```js
import { STORAGE_KEY } from './constants.mjs';
```
Remove the `const STORAGE_KEY = ...` line.

- [ ] **Step 2: Verify the module loads**

Run: `node -e "import('./src/storage.mjs').then(m => { console.log('OK', Object.keys(m).length, 'exports'); })"`
Expected: Prints `OK 2 exports`

- [ ] **Step 3: Commit**

```bash
git add src/storage.mjs src/storage.js
git commit -m "refactor: convert storage.js to ES module, import STORAGE_KEY from constants"
```

---

### Task 4: Convert and enhance `src/layout.mjs` (add ticks + flattened events)

**Files:**
- Rename: `src/layout.js` → `src/layout.mjs`
- Modified: `src/layout.mjs` (enhanced `calculateLayout` return value)

**Changes to `calculateLayout`:**

1. Import constants and helpers from `./constants.mjs` and `./core.mjs`:
   ```js
   import { inferStages, generateId } from './core.mjs';
   import { PADDING_TOP, PADDING_BOTTOM, MIN_RADIUS, MAX_RADIUS, TICK_INTERVAL, STAGE_COLORS, getStageColor } from './constants.mjs';
   ```

2. Keep the existing padding-based signature but add ticks and flatten events.

3. The `positionedEvents` should now map to the flattened format:
   ```js
   const positionedEvents = sorted.map(event => ({
     id: event.id,
     age: event.age,
     title: event.title,
     description: event.description,
     stage: event.stage,
     impact: event.impact,
     y: ageToY(event.age),
     radius: impactToRadius(event.impact),
   }));
   ```

4. Add ticks to the return value:
   ```js
   const ticks = [];
   for (let a = 0; a <= currentAge; a += TICK_INTERVAL) {
     ticks.push({ age: a, y: ageToY(a) });
   }
   if (currentAge % TICK_INTERVAL !== 0) {
     ticks.push({ age: currentAge, y: ageToY(currentAge) });
   }
   ```

5. Return `{ events, stages, ticks, totalHeight, padding }`.

- [ ] **Step 1: Rename and rewrite**

Rename `src/layout.js` to `src/layout.mjs`.
Implement the changes described above.

- [ ] **Step 2: Verify the module loads**

Run: `node -e "import('./src/layout.mjs').then(m => { console.log('OK', Object.keys(m).length, 'exports'); })"`
Expected: Prints `OK 1 exports` (just `calculateLayout`)

- [ ] **Step 3: Commit**

```bash
git add src/layout.mjs src/layout.js
git commit -m "refactor: convert layout.js to ES module, add ticks and flattened event output"
```

---

### Task 5: Convert layout tests to cover new return format

**Files:**
- Modify: `tests/layout.test.mjs` (was `tests/layout.test.js`)

- [ ] **Step 1: Rename and update imports**

Rename `tests/layout.test.js` to `tests/layout.test.mjs`.

Change:
```js
const { createEvent } = require('../src/core');
const { calculateLayout } = require('../src/layout');
```
To:
```js
import { createEvent } from '../src/core.mjs';
import { calculateLayout } from '../src/layout.mjs';
import { describe, it } from 'node:test';
import assert from 'node:assert';
```

- [ ] **Step 2: Update assertions for flattened events**

For test "positions events proportionally by age":
```js
// Before:
const topY = layout.events[0].y;
const bottomY = layout.events[1].y;
// No change needed here (y is at same level)

// But verify flattened fields:
assert.equal(layout.events[0].title, '十岁');
```

For test "positions age 0 at the top with padding":
```js
assert.equal(layout.events[0].y, layout.padding.top);
// Change: layout.padding exists (was destructured internally)
```

For test "node radius reflects impact score":
```js
// Change from layout.events[0].event.title to layout.events[0].title
assert.ok(layout.events[0].radius < layout.events[1].radius);
```

For test "handles events sorted by age":
```js
// Before:
assert.equal(layout.events[0].event.title, 'A');
// After:
assert.equal(layout.events[0].title, 'A');
```

- [ ] **Step 3: Add a test for ticks**

Add at the end of the `calculateLayout` describe block:

```js
it('returns age ticks from 0 to currentAge', () => {
  const events = [createEvent({ age: 10, title: 'X', impact: 5 })];
  const layout = calculateLayout({ events, currentAge: 25, height: 600 });
  assert.ok(Array.isArray(layout.ticks));
  assert.ok(layout.ticks.length >= 5); // 0,5,10,15,20,25 = 6
  assert.equal(layout.ticks[0].age, 0);
  assert.equal(layout.ticks[layout.ticks.length - 1].age, 25);
  layout.ticks.forEach(t => {
    assert.equal(typeof t.age, 'number');
    assert.equal(typeof t.y, 'number');
    assert.ok(t.y >= 0);
  });
});
```

- [ ] **Step 4: Run tests to verify**

Run: `node --test tests/layout.test.mjs`
Expected: All 9 tests pass (8 original + 1 new)

- [ ] **Step 5: Add stage-color test to layout tests**

```js
it('stage bars have colors assigned', () => {
  const events = [
    createEvent({ age: 10, title: 'A', stage: '童年', impact: 3 }),
  ];
  const layout = calculateLayout({ events, currentAge: 30, height: 600 });
  assert.ok(layout.stages.length > 0);
  assert.ok(layout.stages[0].color); // hex color string
  assert.match(layout.stages[0].color, /^#/);
});
```

- [ ] **Step 6: Run tests again**

Run: `node --test tests/layout.test.mjs`
Expected: All 10 tests pass

- [ ] **Step 7: Commit**

```bash
git add tests/layout.test.mjs tests/layout.test.js
git commit -m "test: update layout tests for flattened events and ticks"
```

---

### Task 6: Convert core tests to ES module

**Files:**
- Rename: `tests/core.test.js` → `tests/core.test.mjs`

- [ ] **Step 1: Rename and update imports**

Rename `tests/core.test.js` to `tests/core.test.mjs`.

Change:
```js
const { describe, it } = require('node:test');
const assert = require('node:assert');
const { createEvent, addEvent, updateEvent, deleteEvent, inferStages } = require('../src/core');
```
To:
```js
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createEvent, addEvent, updateEvent, deleteEvent, inferStages } from '../src/core.mjs';
```

- [ ] **Step 2: Run tests**

Run: `node --test tests/core.test.mjs`
Expected: All 18 tests pass

- [ ] **Step 3: Commit**

```bash
git add tests/core.test.mjs tests/core.test.js
git commit -m "test: convert core tests to ES module"
```

---

### Task 7: Convert storage tests to ES module

**Files:**
- Rename: `tests/storage.test.js` → `tests/storage.test.mjs`

- [ ] **Step 1: Rename and update imports**

Rename `tests/storage.test.js` to `tests/storage.test.mjs`.

Change:
```js
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const { createEvent } = require('../src/core');
const { saveEvents, loadEvents } = require('../src/storage');
```
To:
```js
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { createEvent } from '../src/core.mjs';
import { saveEvents, loadEvents } from '../src/storage.mjs';
```

- [ ] **Step 2: Run tests**

Run: `node --test tests/storage.test.mjs`
Expected: All 3 tests pass

- [ ] **Step 3: Commit**

```bash
git add tests/storage.test.mjs tests/storage.test.js
git commit -m "test: convert storage tests to ES module"
```

---

### Task 8: Run all tests to confirm everything still works

- [ ] **Step 1: Run all tests**

Run: `node --test tests/*.test.mjs`
Expected: All 31 tests pass (18 core + 10 layout + 3 storage)

- [ ] **Step 2: Update `package.json` test script**

Edit `package.json`:
```json
"scripts": {
  "test": "node --test tests/*.test.mjs",
  "test:watch": "node --test --watch tests/*.test.mjs"
}
```

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore: update test scripts for .mjs files"
```

---

### Task 9: Create `src/app.mjs` (UI entry point)

**Files:**
- Create: `src/app.mjs`

This is the largest task. `src/app.mjs` contains all UI logic currently in the `index.html` inline script, minus the business logic that now lives in `src/core.mjs`, `src/layout.mjs`, `src/storage.mjs`.

**What goes into `src/app.mjs`:**
- Imports from all other modules
- App state: `currentEvents`, `currentAge`, `zoomLevel`, `editingId`
- All DOM references (lazy `getElementById` calls or module-level cached refs)
- Helper functions: `escHtml`, `getTimelineHeight`, `createDragTooltip`
- `render()` function — builds the timeline DOM
- `setupDrag()` — drag-to-reposition events
- `showToast()` — toast notification system
- `openEditModal()` / `closeModal()` — modal CRUD
- `downloadFile()`, `generateEditableHTML()`, `generatePrintHTML()` — export
- `importData()` — import handling
- All event listener setup (wrapped in a single `init()` function)
- `init()` — loads data, sets up listeners, renders initial view

**Key design decisions:**
- Use `const` and `let` (not `var`) — modern JS throughout
- Cache DOM element lookups in module scope for performance
- All event setup happens inside `init()`, called at module bottom

- [ ] **Step 1: Create the file with imports and state**

```js
// src/app.mjs — UI entry point for Life Timeline
import { createEvent, addEvent, updateEvent, deleteEvent, inferStages, generateId } from './core.mjs';
import { calculateLayout } from './layout.mjs';
import { saveEvents, loadEvents } from './storage.mjs';
import {
  STORAGE_KEY, PADDING_TOP, PADDING_BOTTOM, MIN_RADIUS, MAX_RADIUS,
  TICK_INTERVAL, BASE_HEIGHT, MIN_TIMELINE_HEIGHT,
  STAGE_COLORS, getStageColor,
} from './constants.mjs';

// ===== App State =====
let currentEvents = [];
let currentAge = 25;
let zoomLevel = 1;
let editingId = null;

// ===== DOM Cache (populated in init) =====
let $ = {}; // container for DOM element references

// ... rest of UI logic
```

- [ ] **Step 2: Implement all helper functions**

Port from inline script, replacing `var` with `const`/`let`, and removing any duplicate logic (e.g., `createEvent` etc. are now imported).

Functions to implement:
- `escHtml(str)` — unchanged
- `getTimelineHeight()` — unchanged logic
- `createDragTooltip()` — unchanged
- `showToast(msg, onUndo)` — unchanged
- `render(animating)` — uses imported `calculateLayout` instead of local version
- `setupDrag(node, circle, ev)` — unchanged
- `openEditModal(id)` — unchanged
- `closeModal()` — unchanged
- `downloadFile(content, filename, mimeType)` — unchanged
- `generateEditableHTML(data)` — unchanged
- `generatePrintHTML(events, age)` — unchanged
- `importData(data)` — unchanged
- `init()` — sets up all event listeners

- [ ] **Step 3: Key difference in `render()`**

The inline script's `render` calls `calculateLayout(events, currentAge, height)` (3 positional args).
The new `render` calls:
```js
const layout = calculateLayout({ events: currentEvents, currentAge, height });
```
The return value is the same flattened format, but `layout.events[i]` now directly has `.title`, `.age` etc. (no nested `.event`).

The rest of the render HTML generation is the same.

- [ ] **Step 4: Event listener setup in `init()`**

Port all event listeners from the inline script. Key listeners:
- `btnAddEvent` click → validate, `createEvent`, `addEvent`, `saveEvents`, `render`
- `inputImpact` input → update display
- `modalImpact` input → update display
- `btnSaveEvent` click → `updateEvent`
- `btnDeleteEvent` click → `deleteEvent`
- `btnCancelModal` / overlay click / Escape key → `closeModal`
- `currentAgeInput` change → update state + save + render
- `zoomIn` / `zoomOut` click → adjust zoom + render
- `timelineArea` wheel (with ctrlKey) → zoom
- `sidebarToggle` click → toggle panel
- `btnExportHTML` / `btnExportPDF` → export
- `btnImportFile` / `fileInput` change → import
- `btnClearAll` click → clear with undo

- [ ] **Step 5: Add the initialization call at module bottom**

```js
// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
```

(Note: `type="module"` scripts are deferred by default, so DOM is ready, but this is defensive.)

- [ ] **Step 6: Verify the file parses correctly**

Run: `node -e "import('./src/app.mjs').then(m => console.log('Parses OK')).catch(e => console.error(e))"`
Expected: `Parses OK`

(Note: this will fail because `app.mjs` references `document` and DOM APIs not available in Node. That's expected. The syntax check is sufficient.)

- [ ] **Step 7: Commit**

```bash
git add src/app.mjs
git commit -m "feat: create src/app.mjs UI entry point"
```

---

### Task 10: Update `index.html` — remove inline script, use ES module

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Remove the inline `<script>` block**

Delete everything from:
```html
<script>
(function() {
```
...to...
```
})();
</script>
```

- [ ] **Step 2: Add `<script type="module">`**

At the bottom of `<body>`, where the old script was:
```html
<script type="module" src="src/app.mjs"></script>
```

- [ ] **Step 3: Verify the HTML is valid**

Check that the file still has:
- Correct `<!DOCTYPE html>` at top
- All CSS intact
- All HTML element IDs unchanged (inputAge, inputTitle, etc.)
- The modal HTML intact
- Toast HTML intact

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "refactor: replace inline script with ES module import to app.mjs"
```

---

### Task 11: Integration test — serve and verify

- [ ] **Step 1: Start a local server**

Run: `npx serve .` or `python -m http.server 8080` in the project root.

- [ ] **Step 2: Open in browser**

Navigate to `http://localhost:8080` (or whatever port).
Verify:
- [ ] Page loads without console errors
- [ ] Empty state "你的人生还是一张白纸" is visible
- [ ] Side panel form is interactive (can type in fields)
- [ ] Click "添加到时间轴" with sample data → event appears
- [ ] Click the event → modal opens with correct data
- [ ] Edit title → save → event updates
- [ ] Drag event dot → age changes
- [ ] Export HTML → file downloads
- [ ] Zoom in/out → timeline resizes
- [ ] Change current age → timeline updates

- [ ] **Step 3: Run all tests**

Run: `node --test tests/*.test.mjs`
Expected: All tests pass

- [ ] **Step 4: Fix any issues found**

If integration test or unit tests reveal issues, fix them before final commit.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "fix: address integration issues"
```

---

## Post-Plan: What's Next

After this refactoring, the codebase is in a healthy state for future features:
- Single source of truth for business logic
- Tests cover the actual code that users run
- Adding a new function means: implement in `src/core.mjs` (or other), write tests, use in `src/app.mjs`
- Future "data backup" feature or "date precision" feature can be added cleanly

The next recommended priority is the **data loss risk** — adding automatic local backup, which is now a straightforward addition to `src/storage.mjs` and `src/app.mjs`.
