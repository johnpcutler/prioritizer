# UI Refactor Strategy (Incremental & Low-Risk)

## Goal

Reduce complexity and duplication in `ui/display.js` by:

- Making **stage semantics explicit**
- Separating **derived state** from rendering
- Isolating **stage-specific views**
- Preserving all existing behavior

This refactor is **structural**, not functional. No UI or behavior changes are intended.

---

## Guiding Principles

- No frameworks introduced
- No large rewrites
- Each step is independently shippable
- Prefer extraction over abstraction
- Move logic only when ownership is clear

---

## Step 1: Split `display.js` into stage-specific view modules

### Why

`ui/display.js` currently contains rendering logic for **every stage**, making it hard to reason about or modify safely.

### Action

Create the following structure:

```
ui/
  display/
    index.js
    itemListingView.js
    urgencyView.js
    valueView.js
    durationView.js
    resultsView.js
```

### Move code as follows

| From `display.js` | To |
|------------------|----|
| `updateItemListingView`, `displayItemListingContent` | `itemListingView.js` |
| `updateUrgencyView`, `displayUrgencyViewContent` | `urgencyView.js` |
| `updateValueView`, `displayValueViewContent` | `valueView.js` |
| `updateDurationView`, `displayDurationViewContent` | `durationView.js` |
| `updateResultsView`, `displayResultsContent` | `resultsView.js` |

### New `ui/display/index.js`

```js
export * from './itemListingView.js';
export * from './urgencyView.js';
export * from './valueView.js';
export * from './durationView.js';
export * from './resultsView.js';
```

---

## Step 2: Introduce a generic stage view controller

### Why

Each stage view repeats the same pattern:

- Check current stage
- Show/hide section
- Render content
- Fire analytics once per transition

This should exist **once**.

### Action

Create `ui/stageView.js`:

```js
import { Store } from '../state/appState.js';
import { STAGE_CONTROLLER } from '../models/stages.js';

export function updateStageView({
  sectionId,
  stage,
  render,
  onFirstShow
}) {
  const el = document.getElementById(sectionId);
  if (!el) return;

  const appState = Store.getAppState();
  const currentStage = STAGE_CONTROLLER.getCurrentStage(appState);
  const wasHidden = el.style.display !== 'block';

  if (currentStage === stage) {
    el.style.display = 'block';
    render();

    if (wasHidden && onFirstShow) {
      onFirstShow();
    }
  } else {
    el.style.display = 'none';
  }
}
```

---

## Step 3: Move derived state logic out of UI code

### Why

UI code currently mixes rendering with business rules like:

- Parking lot detection
- Completion checks
- Permission logic

These belong in **models**, not views.

### Action

Create:

```
models/
  derived/
    items.js
```

```js
export function getParkingLotItems(items, property) {
  return items.filter(i => !i[property] || i[property] === 0);
}

export function allItemsHave(items, property) {
  return items.length > 0 && items.every(i => i[property] > 0);
}

export function canSetValue(item, appState) {
  return appState.locked || item.urgency > 0;
}
```

---

## Step 4: Extract common item rendering primitives

### Why

Item name, link, notes badge, and inactive styling are repeated across stages.

### Action

Create:

```
ui/
  render/
    itemHeader.js
```

```js
import { escapeHtml } from '../forms.js';

export function renderItemHeader(item) {
  const notesCount = item.notes?.length || 0;
  const linkHtml = item.link
    ? ` <a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer" class="item-link">🔗</a>`
    : '';

  return `
    <span class="item-name">
      ${escapeHtml(item.name)}${linkHtml}
      <button class="notes-badge" data-item-id="${item.id}">
        Notes (${notesCount})
      </button>
    </span>
  `;
}
```

---

## Step 5: Centralize analytics logic

### Why

Analytics is currently triggered inline in UI code, making refactors risky.

### Action

Create:

```
analytics/
  stageEvents.js
```

```js
import { analytics } from './analytics.js';

export function trackStageView(stage, items) {
  switch (stage) {
    case 'urgency':
      return analytics.trackEvent('View Urgency', {
        parkingLotCount: items.filter(i => !i.urgency).length
      });
    case 'value':
      return analytics.trackEvent('View Value', {
        parkingLotCount: items.filter(i => i.urgency && !i.value).length
      });
    case 'duration':
      return analytics.trackEvent('View Duration', {
        totalItems: items.length
      });
    case 'Results':
      return analytics.trackEvent('View Results', {
        resultsCount: items.length
      });
  }
}
```

---

## Recommended Refactor Order

1. Split `display.js` into stage files
2. Introduce `updateStageView`
3. Extract derived item logic
4. Extract item rendering primitives
5. Centralize analytics events

Each step can be committed independently.

---

## Expected Outcome

- Stage logic is explicit and centralized
- Views are smaller and easier to reason about
- Business rules are no longer embedded in HTML generation
- Adding a new stage is straightforward
- Future refactors are safer
