# Mobile Adaptation Design — Bottom Sheet + Touch Optimization

> **Approach:** B — Bottom panel + floating button, incremental enhancement on existing codebase
> **Target:** ≤768px down to 480px, desktop unchanged
> **Style:** All changes inside CSS media queries + modest JS additions, no framework changes

---

## 1. Architecture

### 1.1 Scope Boundary

All mobile-specific styles are gated behind `@media (max-width: 768px)` and `@media (max-width: 480px)`. Desktop layout is **untouched**.

### 1.2 File Changes

| File | Change |
|------|--------|
| `index.html` | Add Bottom Sheet HTML elements (add-event panel, edit-event panel) |
| `src/app.mjs` | Add bottom sheet show/hide logic; modify modal to use bottom sheet on mobile |
| `index.html` (CSS) | Add bottom sheet styles, touch optimization, all inside media queries |

No new files. No changes to `src/core.mjs`, `src/layout.mjs`, `src/storage.mjs`, or `src/constants.mjs`.

---

## 2. Bottom Sheet Component

### 2.1 HTML Structure

Two bottom sheet instances share the same base structure:

```html
<!-- Bottom Sheet Overlay -->
<div class="bs-overlay" id="bsOverlay"></div>

<!-- Add Event Bottom Sheet -->
<div class="bottom-sheet" id="bsAdd">
  <div class="bs-handle"></div>
  <div class="bs-content">
    <!-- same form fields as current side-panel -->
    <button class="btn btn-primary">添加到时间轴</button>
  </div>
</div>

<!-- Edit Event Bottom Sheet -->
<div class="bottom-sheet" id="bsEdit">
  <div class="bs-handle"></div>
  <div class="bs-content">
    <!-- same form fields as current modal -->
    <div class="bs-actions">
      <button class="btn btn-danger">删除</button>
      <button class="btn btn-primary">保存</button>
      <button class="btn btn-outline">取消</button>
    </div>
  </div>
</div>
```

### 2.2 States

- **Hidden** — `transform: translateY(100%)`, `pointer-events: none`
- **Visible** — `transform: translateY(0)`, overlay visible
- **Half** — default open position (50-60vh height), scrollable content

### 2.3 Behavior (mobile only)

| Trigger | Action |
|---------|--------|
| Tap FAB (`sidebarToggle`) | Show `bsAdd`, scroll to top |
| Tap event node | Show `bsEdit`, populate form |
| Tap overlay or swipe down handle | Hide current bottom sheet |
| Form submit success | Hide sheet + show toast animation stays down |
| Keyboard opens | Sheet stays visible, content scrolls to keep focused field visible |

---

## 3. Touch Optimization

### 3.1 Event Node Hit Area (≤768px)

Each `.event-circle` gets an invisible 44×44px touch target via `::before`:

```css
@media (max-width: 768px) {
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
}
```

This makes dots easy to tap/drag without changing their visual size.

### 3.2 Drag Feedback

During touch drag, the node gets a subtle scale + shadow bump for visual feedback. The drag tooltip font size increases on small screens.

### 3.3 Tick Interval Adaptation

```css
@media (max-width: 768px) {
  /* In JS: TICK_INTERVAL switches from 5 to 10 when container < 480px */
}
```

The `calculateLayout` function already accepts `TICK_INTERVAL` from constants. We override it dynamically in `render()` based on `timelineContainer.clientWidth`.

---

## 4. Modal Replacement

On mobile, the existing edit modal (`#modalOverlay`) is replaced by the bottom sheet pattern:

- The overlay + modal HTML stays (for desktop)
- On mobile, the modal's `.active` class triggers bottom sheet instead
- JS logic checks `window.innerWidth` to decide which UI to show

**Simpler alternative:** The bottom sheet IS the mobile modal. We add a `mobile-modal` class that transforms the existing modal into a bottom sheet via CSS alone:

```css
@media (max-width: 768px) {
  .modal-overlay.active {
    align-items: flex-end;     /* bottom-aligned instead of center */
  }
  .modal {
    width: 100%;
    max-width: 100%;
    border-radius: 16px 16px 0 0;
    max-height: 70vh;
    transform: translateY(0);
    animation: slideUp 0.25s ease;
  }
}
```

This is the **recommended approach** — reuses existing modal HTML, just changes positioning via CSS.

---

## 5. CSS Additions (all inside `@media`)

### 5.1 Bottom Sheet

```css
@media (max-width: 768px) {
  .bs-overlay {
    display: none;
    position: fixed; inset: 0;
    background: rgba(15,23,42,0.4);
    z-index: 999;
  }
  .bs-overlay.active { display: block; }

  .bottom-sheet {
    position: fixed;
    left: 0; right: 0; bottom: 0;
    background: var(--surface);
    border-radius: 16px 16px 0 0;
    z-index: 1000;
    transform: translateY(100%);
    transition: transform 0.3s ease;
    max-height: 70vh;
    overflow-y: auto;
    box-shadow: 0 -4px 20px rgba(0,0,0,0.1);
  }
  .bottom-sheet.active {
    transform: translateY(0);
  }

  .bs-handle {
    width: 36px; height: 4px;
    background: var(--border);
    border-radius: 2px;
    margin: 8px auto;
  }

  .bs-content {
    padding: 0 20px 24px;
  }

  @keyframes slideUp {
    from { transform: translateY(100%); }
    to   { transform: translateY(0); }
  }
}
```

### 5.2 Modal → Bottom Sheet (mobile)

```css
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
  }
}
```

### 5.3 Timeline Adjustments

```css
@media (max-width: 768px) {
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
  .age-tick {
    font-size: 10px;
  }
  .drag-tooltip {
    font-size: 14px;
    padding: 6px 14px;
  }
}
```

---

## 6. JS Changes in `src/app.mjs`

### 6.1 Bottom Sheet Toggle

```js
function openBottomSheet(id) {
  const sheet = document.getElementById(id);
  const overlay = document.getElementById('bsOverlay');
  if (!sheet) return;
  sheet.classList.add('active');
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeBottomSheet() {
  document.querySelectorAll('.bottom-sheet').forEach(s => s.classList.remove('active'));
  document.getElementById('bsOverlay').classList.remove('active');
  document.body.style.overflow = '';
}
```

### 6.2 FAB Click (mobile)

```js
// Modified from current sidebarToggle click
$.sidebarToggle.addEventListener('click', function() {
  if (window.innerWidth <= 768) {
    openBottomSheet('bsAdd');
    // Populate with any pre-filled data...
  } else {
    // Desktop: toggle sidebar as before
    $.sidePanel.classList.toggle('collapsed');
    this.textContent = $.sidePanel.classList.contains('collapsed') ? '✏' : '+';
  }
});
```

### 6.3 Edit on Mobile

In `openEditModal()`:
```js
function openEditModal(id) {
  editingId = id;
  const ev = currentEvents.find(e => e.id === id);
  if (!ev) return;

  if (window.innerWidth <= 768) {
    // Populate the bottom sheet edit form
    document.getElementById('bsEditAge').value = ev.age;
    // ... populate other fields
    openBottomSheet('bsEdit');
    return;
  }

  // Desktop: existing modal code
  // ...
}
```

### 6.4 Dynamic Tick Interval

```js
function render(animating) {
  const containerWidth = $.timelineContainer.clientWidth;
  const effectiveTickInterval = containerWidth < 480 ? 10 : TICK_INTERVAL;

  const layout = calculateLayout({
    events: currentEvents,
    currentAge,
    height,
    tickInterval: effectiveTickInterval,  // TODO: add to calculateLayout signature
    padding: { top: PADDING_TOP, bottom: PADDING_BOTTOM },
  });
  // ...
}
```

This requires a small update to `src/layout.mjs` to accept `tickInterval` in the options object.

---

## 7. Edge Cases

| Case | Behavior |
|------|----------|
| Bottom sheet open + keyboard appears | Sheet stays visible, scrolls to keep focused input visible |
| Bottom sheet + orientation change | Sheet re-centers, overlay persists |
| Double-tap FAB | First close if open, else open (toggle) |
| Very short content (< sheet height) | Sheet snaps to content height, no empty space |
| Desktop resize to mobile width | No issue — all CSS media queries |
| Mobile resize to desktop width | Sheets auto-close (media query no longer matches) |

---

## 8. Testing

| Test Case | Method |
|-----------|--------|
| FAB opens bottom sheet | Manual: tap FAB on mobile viewport |
| Bottom sheet form submits | Manual: fill form, tap submit → event appears on timeline |
| Swipe down closes sheet | Manual: tap handle, drag down |
| Edit event via bottom sheet | Manual: tap event → bottom sheet opens → edit → save |
| Keyboard doesn't break layout | Manual: focus input with mobile keyboard |
| Desktop unchanged | Manual: desktop viewport, all existing functionality works |
| Node tap area on mobile | Manual: tap near but not on dot → still triggers |
| Tick spacing on small screens | Visual: ≤480px should show fewer ticks |

---

## 9. Non-Goals

- No PWA / service worker
- No touch gesture beyond swipe-to-close
- No bottom tab navigation
- No changes to the data model or storage
- Desktop layout completely unchanged
