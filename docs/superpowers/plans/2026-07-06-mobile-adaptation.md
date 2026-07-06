# Mobile Adaptation Implementation Plan — Bottom Sheet + Touch Optimization

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or inline execution to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add mobile-responsive bottom sheet for adding/editing events, touch-optimized timeline nodes, and adaptive tick spacing. Desktop unchanged.

**Architecture:** New HTML elements + CSS (all inside `@media` queries) + modest JS additions in `src/app.mjs`. One parameter addition to `src/layout.mjs` for tick interval override. No changes to `src/core.mjs` or `src/storage.mjs`.

**Tech Stack:** Vanilla JS, CSS media queries, no new dependencies.

---

## File Changes Summary

| File | Change |
|------|--------|
| `index.html` | Add `#bsOverlay` + `#bsAdd` bottom sheet HTML; add mobile CSS blocks |
| `src/constants.mjs` | Add `MOBILE_TICK_INTERVAL = 10` |
| `src/layout.mjs` | Accept optional `tickInterval` in options |
| `src/app.mjs` | Add bottom sheet open/close logic; modify FAB/edit/render for mobile |
| `tests/layout.test.mjs` | Add test for custom tickInterval |

---

## Implementation Tasks

### Task 1: Add `MOBILE_TICK_INTERVAL` to constants

**Files:**
- Modify: `src/constants.mjs`

- [ ] **Step 1: Add the constant**

Append after `export const TICK_INTERVAL = 5;`:
```js
export const MOBILE_TICK_INTERVAL = 10;
```

- [ ] **Step 2: Verify module loads**

Run: `node -e "import('./src/constants.mjs').then(m => console.log('OK', m.MOBILE_TICK_INTERVAL))"`
Expected: `OK 10`

- [ ] **Step 3: Commit**

```bash
git add src/constants.mjs
git commit -m "feat: add MOBILE_TICK_INTERVAL constant for small screens"
```

---

### Task 2: Accept `tickInterval` in `src/layout.mjs`

**Files:**
- Modify: `src/layout.mjs`

- [ ] **Step 1: Update function signature and loop**

In `calculateLayout`, destructure `tickInterval` from opts with fallback:
```js
function calculateLayout({ events, currentAge, height, padding = {}, tickInterval }) {
```

Change the tick loop:
```js
const interval = tickInterval ?? TICK_INTERVAL;
for (let a = 0; a <= currentAge; a += interval) {
  ticks.push({ age: a, y: ageToY(a) });
}
if (currentAge % interval !== 0) {
  ticks.push({ age: currentAge, y: ageToY(currentAge) });
}
```

Import `TICK_INTERVAL` in the import block (already imported from constants).

- [ ] **Step 2: Run layout tests**

Run: `node --test tests/layout.test.mjs`
Expected: All 10 tests pass

- [ ] **Step 3: Commit**

```bash
git add src/layout.mjs
git commit -m "feat: layout accepts optional tickInterval parameter"
```

---

### Task 3: Add test for custom tickInterval

**Files:**
- Modify: `tests/layout.test.mjs`

- [ ] **Step 1: Add test case**

Add after the existing ticks test:
```js
it('uses custom tickInterval when provided', () => {
  const events = [createEvent({ age: 10, title: 'X', impact: 5 })];
  const layout = calculateLayout({ events, currentAge: 30, height: 600, tickInterval: 10 });
  // With tickInterval=10: ticks at 0,10,20,30 = 4 ticks
  assert.equal(layout.ticks.length, 4);
  assert.equal(layout.ticks[0].age, 0);
  assert.equal(layout.ticks[1].age, 10);
  assert.equal(layout.ticks[2].age, 20);
  assert.equal(layout.ticks[3].age, 30);
});
```

- [ ] **Step 2: Run the test**

Run: `node --test tests/layout.test.mjs`
Expected: All 11 tests pass

- [ ] **Step 3: Commit**

```bash
git add tests/layout.test.mjs
git commit -m "test: add custom tickInterval test"
```

---

### Task 4: Add bottom sheet HTML to `index.html`

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add overlay + bottom sheet before `</body>`**

Add before the `<script type="module">` tag:

```html
<!-- Bottom Sheet Overlay (mobile) -->
<div class="bs-overlay" id="bsOverlay"></div>

<!-- Add Event Bottom Sheet (mobile) -->
<div class="bottom-sheet" id="bsAdd">
  <div class="bs-handle"></div>
  <div class="bs-content">
    <h3 style="font-size:16px;font-weight:600;margin-bottom:16px;">✏️ 添加事件</h3>
    <div class="form-group">
      <label for="bsInputAge">年龄</label>
      <input type="number" id="bsInputAge" min="0" max="150" placeholder="例如 22">
    </div>
    <div class="form-group">
      <label for="bsInputTitle">标题</label>
      <input type="text" id="bsInputTitle" placeholder="例如 大学毕业">
    </div>
    <div class="form-group">
      <label for="bsInputDesc">描述</label>
      <textarea id="bsInputDesc" placeholder="记录更多的细节…"></textarea>
    </div>
    <div class="form-group">
      <label for="bsInputStage">人生阶段</label>
      <select id="bsInputStage">
        <option value="">-- 不选择 --</option>
        <option value="童年">🧸 童年</option>
        <option value="青春期">🏫 青春期</option>
        <option value="青年">🎓 青年</option>
        <option value="职场">💼 职场</option>
        <option value="中年">🏡 中年</option>
        <option value="晚年">🌅 晚年</option>
      </select>
    </div>
    <div class="form-group">
      <label>影响力</label>
      <div class="impact-row">
        <input type="range" id="bsInputImpact" min="0" max="10" value="5">
        <span class="impact-value" id="bsImpactValue">5</span>
      </div>
    </div>
    <button class="btn btn-primary" id="bsBtnAdd">✅ 添加到时间轴</button>
  </div>
</div>
```

Note: The form fields use new IDs prefixed with `bs` to avoid conflicts with desktop form.

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: add bottom sheet HTML for mobile event creation"
```

---

### Task 5: Add bottom sheet CSS + mobile modal CSS

**Files:**
- Modify: `index.html` (CSS section)

- [ ] **Step 1: Add bottom sheet styles**

In the `<style>` section, add after the existing responsive block:

```css
/* ===== Bottom Sheet (mobile) ===== */
@media (max-width: 768px) {
  .bs-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(15,23,42,0.4);
    z-index: 999;
    backdrop-filter: blur(2px);
  }
  .bs-overlay.active { display: block; }

  .bottom-sheet {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--surface);
    border-radius: 16px 16px 0 0;
    z-index: 1000;
    transform: translateY(100%);
    transition: transform 0.3s ease;
    max-height: 70vh;
    overflow-y: auto;
    box-shadow: 0 -4px 24px rgba(0,0,0,0.12);
    -webkit-overflow-scrolling: touch;
  }
  .bottom-sheet.active {
    transform: translateY(0);
  }

  .bs-handle {
    width: 36px;
    height: 4px;
    background: var(--border);
    border-radius: 2px;
    margin: 8px auto;
  }

  .bs-content {
    padding: 0 20px 24px;
  }
}
```

- [ ] **Step 2: Add mobile modal → bottom sheet transform**

```css
/* ===== Modal → Bottom Sheet (mobile) ===== */
@media (max-width: 768px) {
  .modal-overlay.active {
    align-items: flex-end;
    padding: 0;
  }
  .modal {
    width: 100%;
    max-width: 100%;
    border-radius: 16px 16px 0 0;
    max-height: 75vh;
    margin: 0;
    animation: slideUp 0.25s ease;
    padding: 20px;
  }
}
```

- [ ] **Step 3: Add slideUp animation (if not already defined)**

```css
@keyframes slideUp {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}
```
(Add this outside media queries, next to existing `@keyframes` block)

- [ ] **Step 4: Add touch optimization + timeline mobile styles**

```css
/* ===== Touch & Timeline (mobile) ===== */
@media (max-width: 768px) {
  /* Touch target expansion for event circles */
  .event-circle {
    position: relative;
  }
  .event-circle::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 44px;
    height: 44px;
    border-radius: 50%;
  }

  /* Smaller labels */
  .event-label {
    font-size: 12px;
    padding: 4px 10px;
  }
  .event-label .event-title {
    font-size: 13px;
  }
  .event-label .event-age {
    font-size: 10px;
  }

  /* Smaller ticks */
  .age-tick {
    font-size: 10px;
  }

  /* Larger drag tooltip for finger readability */
  .drag-tooltip {
    font-size: 14px;
    padding: 6px 14px;
  }

  /* Make FAB more prominent on mobile */
  .sidebar-toggle {
    width: 56px;
    height: 56px;
    font-size: 24px;
    bottom: 28px;
    right: 28px;
  }
}
```

- [ ] **Step 5: Check that all CSS is syntactically valid**

Quick scan for missing brackets. The CSS blocks should be complete.

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "feat: add mobile CSS - bottom sheet, modal transform, touch optimization"
```

---

### Task 6: Update `src/app.mjs` — bottom sheet logic + mobile adaptations

**Files:**
- Modify: `src/app.mjs`

Changes needed:

1. Add new DOM IDs to cacheDom: `bsOverlay`, `bsAdd`, `bsInputAge`, `bsInputTitle`, `bsInputDesc`, `bsInputStage`, `bsInputImpact`, `bsImpactValue`, `bsBtnAdd`
2. Add `openBottomSheet()`, `closeBottomSheet()` functions
3. Modify FAB click handler to use bottom sheet on mobile
4. Modify `openEditModal()` to use bottom-aligned modal on mobile (no JS change needed — CSS handles it)
5. Add impact slider listener for bottom sheet
6. Add submit handler for `bsBtnAdd`
7. Modify `render()` to pass dynamic tickInterval

- [ ] **Step 1: Add batch of new DOM IDs to cacheDom**

Add to the `ids` array in `cacheDom()`:
```js
'bsOverlay', 'bsAdd',
'bsInputAge', 'bsInputTitle', 'bsInputDesc', 'bsInputStage',
'bsInputImpact', 'bsImpactValue', 'bsBtnAdd',
```

- [ ] **Step 2: Add bottom sheet functions**

Add after `showToast`:
```js
// ===== Bottom Sheet (mobile) =====
function openBottomSheet(id) {
  const sheet = document.getElementById(id);
  if (!sheet) return;
  sheet.classList.add('active');
  $.bsOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeBottomSheet() {
  document.querySelectorAll('.bottom-sheet').forEach(function(s) {
    s.classList.remove('active');
  });
  $.bsOverlay.classList.remove('active');
  document.body.style.overflow = '';
}
```

- [ ] **Step 3: Modify FAB click handler**

Current code (in init):
```js
$.sidebarToggle.addEventListener('click', function () {
  $.sidePanel.classList.toggle('collapsed');
  this.textContent = $.sidePanel.classList.contains('collapsed') ? '✏' : '+';
});
```

Change to:
```js
$.sidebarToggle.addEventListener('click', function () {
  if (window.innerWidth <= 768) {
    // Mobile: open bottom sheet instead of sidebar
    openBottomSheet('bsAdd');
  } else {
    // Desktop: toggle sidebar
    $.sidePanel.classList.toggle('collapsed');
    this.textContent = $.sidePanel.classList.contains('collapsed') ? '✏' : '+';
  }
});
```

- [ ] **Step 4: Add bottom sheet impact slider listener**

Add in `init()` after the desktop impact slider listener:
```js
$.bsInputImpact.addEventListener('input', function () {
  $.bsImpactValue.textContent = this.value;
});
```

- [ ] **Step 5: Add bottom sheet submit handler**

Add in `init()`:
```js
$.bsBtnAdd.addEventListener('click', function () {
  const age = parseInt($.bsInputAge.value);
  const title = $.bsInputTitle.value.trim();
  if (isNaN(age)) { showToast('请输入年龄'); return; }
  if (!title) { showToast('请输入标题'); return; }
  try {
    const event = createEvent({
      age: age,
      title: title,
      description: $.bsInputDesc.value.trim(),
      stage: $.bsInputStage.value,
      impact: parseInt($.bsInputImpact.value) || 0,
    });
    currentEvents = addEvent(currentEvents, event);
    saveEvents(currentEvents);
    render(true);
    $.bsInputAge.value = '';
    $.bsInputTitle.value = '';
    $.bsInputDesc.value = '';
    $.bsInputStage.value = '';
    $.bsInputImpact.value = 5;
    $.bsImpactValue.textContent = '5';
    closeBottomSheet();
    showToast('已添加：「' + title + '」');
  } catch (err) {
    showToast(err.message);
  }
});
```

- [ ] **Step 6: Close bottom sheet on overlay click**

Add in `init()`:
```js
$.bsOverlay.addEventListener('click', closeBottomSheet);
```

- [ ] **Step 7: Modify `render()` for dynamic tickInterval**

In the `render()` function, change the `calculateLayout` call from:
```js
const layout = calculateLayout({
  events: currentEvents,
  currentAge,
  height,
  padding: { top: PADDING_TOP, bottom: PADDING_BOTTOM },
});
```
To:
```js
const containerWidth = $.timelineContainer.clientWidth;
const effectiveTickInterval = containerWidth < 480 ? 10 : TICK_INTERVAL;

const layout = calculateLayout({
  events: currentEvents,
  currentAge,
  height,
  tickInterval: effectiveTickInterval,
  padding: { top: PADDING_TOP, bottom: PADDING_BOTTOM },
});
```

- [ ] **Step 8: Commit**

```bash
git add src/app.mjs
git commit -m "feat: add mobile bottom sheet logic and dynamic tick interval"
```

---

### Task 7: Run full test suite + smoke test

- [ ] **Step 1: Run all tests**

Run: `npm test`
Expected: All 34 tests pass (33 existing + 1 new tickInterval test)

- [ ] **Step 2: Serve locally and check**

Run a local server:
```bash
npx serve .  # or python -m http.server 8080
```

Verify manually in browser dev tools mobile viewport (375px-768px):
- [ ] FAB click → bottom sheet slides up
- [ ] Fill form → submit → event appears on timeline
- [ ] Bottom sheet auto-closes after submit
- [ ] Tap event node → modal slides up from bottom
- [ ] Edit event → save → timeline updates
- [ ] Delete event → confirmation → event removed
- [ ] Swipe/click overlay → bottom sheet closes
- [ ] Desktop viewport (≥769px) → sidebar works as before, no bottom sheet
- [ ] Timeline ticks are spaced farther apart on narrow screens
- [ ] Event circles have larger touch target

- [ ] **Step 3: Fix any issues found**

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "fix: address integration issues"
git push origin main
```
