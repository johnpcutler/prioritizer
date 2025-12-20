# Architectural Overview

## Table of Contents
1. [High-Level Architecture](#high-level-architecture)
2. [Core Architectural Principles](#core-architectural-principles)
3. [Layer Architecture](#layer-architecture)
4. [Data Flow](#data-flow)
5. [State Management](#state-management)
6. [UI Architecture](#ui-architecture)
7. [Event Handling](#event-handling)
8. [Business Logic & Models](#business-logic--models)
9. [Analytics Architecture](#analytics-architecture)
10. [Testing Architecture](#testing-architecture)
11. [Key Design Patterns](#key-design-patterns)

---

## High-Level Architecture

The Priority Manager application follows a **layered, modular architecture** with clear separation of concerns. The application is built as a client-side single-page application (SPA) using vanilla JavaScript ES6 modules, with no external framework dependencies.

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Presentation Layer                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   HTML/UI    │  │ Stage Views  │  │   Modals     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                      Event Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Navigation   │  │   Items      │  │   Settings   │      │
│  │   Events     │  │   Events     │  │   Events     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│  ┌──────────────────────────────────────────────────────┐ │
│  │                    app.js                             │ │
│  │  (Orchestrates business logic, coordinates modules)   │ │
│  └──────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                      Business Logic Layer                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Models     │  │   Derived    │  │   Stages     │      │
│  │  (items.js)  │  │   State      │  │ (stages.js)  │      │
│  │  (buckets.js)│  │ (derived/)   │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                      State Layer                             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │              appState.js (Store)                      │ │
│  │  (Centralized state management with localStorage)     │ │
│  └──────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                      Persistence Layer                       │
│  ┌──────────────────────────────────────────────────────┐ │
│  │              Browser localStorage                      │ │
│  └──────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Architectural Principles

### 1. **Separation of Concerns**
Each module has a single, well-defined responsibility:
- **Models** (`models/`) handle business logic and data structures
- **UI** (`ui/`) handles rendering and display logic
- **Events** (`events/`) handle user interactions
- **State** (`state/`) manages application state and persistence
- **Analytics** (`analytics/`) handles tracking and instrumentation

### 2. **Modular Design**
- Each module is self-contained and can be tested independently
- Modules communicate through well-defined interfaces
- ES6 modules (`import`/`export`) enforce explicit dependencies
- No circular dependencies between modules

### 3. **Single Source of Truth**
- Application state is centralized in `Store` singleton (`state/appState.js`)
- All state mutations go through `Store.save()` or `Store.update()`
- State is persisted to `localStorage` automatically
- Derived state is computed, not stored

### 4. **Declarative UI Updates**
- UI updates are triggered by state changes
- Views are re-rendered based on current state, not incrementally updated
- Stage views use a generic controller pattern for consistency

### 5. **Business Logic Separation**
- Business rules are extracted from UI code into `models/derived/`
- Derived state functions are pure (no side effects)
- Validation logic is centralized in models
- Calculations (CD3, Cost of Delay) are in model layer

### 6. **Event Delegation**
- Event listeners use delegation patterns for dynamic content
- Event handlers are organized by domain (navigation, items, settings, modals)
- Centralized event orchestration in `events/listeners.js`

### 7. **Analytics Abstraction**
- Analytics calls go through abstraction layer (`analytics/analytics.js`)
- Provider-agnostic design allows easy switching
- Environment-based configuration (dev vs production)
- Centralized stage event tracking

---

## Layer Architecture

### Presentation Layer (`ui/`)

**Purpose**: Handles all UI rendering and display logic.

**Structure**:
- `ui/display.js` - General display utilities (JSON display, stage navigation UI)
- `ui/stageView.js` - Generic stage view controller (handles visibility and analytics)
- `ui/display/` - Stage-specific view modules:
  - `itemListingView.js` - Item listing stage
  - `urgencyView.js` - Urgency categorization stage
  - `valueView.js` - Value assessment stage
  - `durationView.js` - Duration estimation stage
  - `resultsView.js` - Results display stage
- `ui/render/` - Common rendering primitives:
  - `itemHeader.js` - Reusable item header rendering
- `ui/forms.js` - Form utility functions (HTML escaping, form helpers)

**Key Patterns**:
- Each stage view module exports an `update*View()` function
- Views use `updateStageView()` helper for common visibility logic
- Rendering functions are pure (take state, return HTML)
- HTML escaping is handled centrally via `escapeHtml()`

### Event Layer (`events/`)

**Purpose**: Handles all user interactions and DOM events.

**Structure**:
- `events/listeners.js` - Main orchestrator, sets up all event listeners
- `events/navigation.js` - Stage navigation events
- `events/items.js` - Item operation events (add, remove, property setting)
- `events/settings.js` - Settings form events
- `events/modals.js` - Modal interactions (notes, confidence surveys)
- `events/app-controls.js` - App-level controls (help, clear data, locked toggle)

**Key Patterns**:
- Event delegation for dynamic content
- Handlers receive business logic functions as dependencies
- Centralized setup via `setupAllEventListeners()`
- Event handlers call business logic functions, not direct state mutations

### Application Layer (`app.js`)

**Purpose**: Orchestrates business logic and coordinates modules.

**Responsibilities**:
- Initializes application on page load
- Exposes business logic functions (addItem, setItemProperty, advanceStage, etc.)
- Coordinates state updates and UI refreshes
- Provides API for testing and debugging
- Manages application lifecycle

**Key Patterns**:
- Functions return `{ success: boolean, error?: string }` for error handling
- Business logic functions trigger UI refresh via `refreshApp()`
- Command system for declarative operations
- Global API exposure for backward compatibility

### Business Logic Layer (`models/`)

**Purpose**: Contains all business logic, data models, and calculations.

**Structure**:
- `models/items.js` - Item model, CRUD operations, CD3 calculations, confidence surveys
- `models/buckets.js` - Bucket configuration model, validation, normalization
- `models/stages.js` - Stage navigation model, validation rules, stage controller
- `models/constants.js` - Application-wide constants
- `models/bucketActions.js` - Bucket operation handlers
- `models/derived/items.js` - Derived state functions (parking lot detection, completion checks)

**Key Patterns**:
- Pure functions for calculations (no side effects)
- Normalization functions ensure data consistency
- Validation functions return `{ valid: boolean, reason?: string }`
- Derived state is computed on-demand, not cached
- Business rules are declarative (e.g., `STAGE_RULES`)

### State Layer (`state/appState.js`)

**Purpose**: Centralized state management with persistence.

**Key Features**:
- **Store Singleton**: Single source of truth for application state
- **Automatic Persistence**: State is saved to `localStorage` on every update
- **Migration Support**: Handles schema migrations for existing data
- **Normalization**: Ensures state consistency on load
- **Subscriber Pattern**: Supports reactive updates (though not currently used)

**State Structure**:
```javascript
{
  currentStage: 'Item Listing',
  visitedStages: ['Item Listing'],
  buckets: { urgency: {...}, value: {...}, duration: {...} },
  locked: true,
  resultsManuallyReordered: false,
  confidenceWeights: { 1: 0.30, 2: 0.50, 3: 0.70, 4: 0.90 },
  confidenceLevelLabels: { ... }
}
```

**Storage Keys**:
- `APP_STATE_KEY` - Application state (stage, buckets, settings)
- `STORAGE_KEY` - Items array

### Persistence Layer

**Purpose**: Handles data persistence to browser storage.

**Implementation**:
- Uses `localStorage` API
- Two separate keys for state and items
- Automatic serialization/deserialization
- Migration logic for schema changes
- No server-side persistence (client-only)

---

## Data Flow

### Typical User Action Flow

```
User Action (click, input, etc.)
    ↓
Event Handler (events/*.js)
    ↓
Business Logic Function (app.js)
    ↓
Model Function (models/*.js)
    ↓
State Update (Store.save() or Store.update())
    ↓
localStorage Persistence (automatic)
    ↓
UI Refresh (refreshApp() or specific update*View())
    ↓
View Rendering (ui/display/*.js)
    ↓
DOM Update
```

### Example: Setting Item Urgency

1. **User clicks urgency button** → `events/items.js` handler fires
2. **Handler calls** → `setItemProperty(itemId, 'urgency', value)` in `app.js`
3. **Business logic validates** → Checks stage, locked mode, prerequisites
4. **Model updates item** → `updateItemProperty()` in `models/items.js`
5. **Metrics recalculated** → `recomputeItemMetrics()` calculates CD3, Cost of Delay
6. **State saved** → `Store.saveItems(items)` and `Store.save(appState)`
7. **UI refreshed** → `refreshApp()` calls all `update*View()` functions
8. **Views re-render** → Stage views update based on new state

### State Flow Diagram

```
┌─────────────┐
│ User Action │
└──────┬──────┘
       │
       ▼
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Event     │─────▶│   Business   │─────▶│   Model     │
│   Handler   │      │    Logic     │      │  Function   │
└─────────────┘      └──────┬───────┘      └──────┬──────┘
                            │                     │
                            ▼                     ▼
                    ┌─────────────┐      ┌─────────────┐
                    │   Store     │◀─────│  State      │
                    │   Update    │      │  Mutation   │
                    └──────┬──────┘      └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │localStorage │
                    │ Persistence │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐      ┌─────────────┐
                    │   UI        │◀─────│   View      │
                    │   Refresh   │      │  Render     │
                    └─────────────┘      └─────────────┘
```

---

## State Management

### Store Pattern

The application uses a **Store singleton pattern** similar to Redux, but simplified:

```javascript
export const Store = {
  state: null,
  subscribers: [],
  
  init() { ... },
  load() { ... },
  save(state) { ... },
  update(mutator) { ... },
  getAppState() { ... },
  getItems() { ... },
  saveItems(items) { ... }
}
```

### State Access Patterns

1. **Read State**: `Store.getAppState()` or `Store.getItems()`
   - Always reloads from storage (no caching)
   - Ensures fresh state

2. **Update State**: `Store.save(state)` or `Store.update(mutator)`
   - Automatically persists to localStorage
   - Triggers subscriber notifications (if any)

3. **Update Items**: `Store.saveItems(items)`
   - Separate storage key for items
   - No automatic UI refresh (must call `refreshApp()`)

### State Normalization

State is normalized on load:
- Migrates old schema versions
- Ensures required properties exist
- Normalizes nested structures (buckets, items)
- Fixes data inconsistencies (duplicate IDs, etc.)

### Derived State

Derived state is computed on-demand, not stored:
- `getParkingLotItems()` - Items without a property set
- `allItemsHave()` - Completion checks
- `canSetValue()` - Permission checks
- `hasAdvancedItems()` - Progress indicators

**Benefits**:
- Always reflects current state
- No synchronization issues
- Single source of truth

---

## UI Architecture

### Stage-Based Views

The application uses a **stage-based view system** where only one stage view is visible at a time:

1. **Item Listing** - Add and manage items
2. **Urgency** - Categorize items by urgency (3 columns)
3. **Value** - Assess value in urgency/value grid (3x3)
4. **Duration** - Set duration in urgency/value grid (3x3 with dropdowns)
5. **Results** - View prioritized results sorted by CD3

### Generic Stage View Controller

All stage views use a common pattern via `updateStageView()`:

```javascript
updateStageView({
  sectionId: 'urgencyViewSection',
  stage: 'urgency',
  render: displayUrgencyViewContent,
  onFirstShow: () => trackStageView('urgency', items)
});
```

**Benefits**:
- Consistent visibility logic
- Automatic analytics tracking
- Reduced code duplication
- Easier to add new stages

### View Rendering Pattern

Each view module follows this pattern:

```javascript
export function updateUrgencyView() {
  updateStageView({
    sectionId: 'urgencyViewSection',
    stage: 'urgency',
    render: displayUrgencyViewContent,
    onFirstShow: () => {
      const items = Store.getItems();
      trackStageView('urgency', items);
    }
  });
}

function displayUrgencyViewContent() {
  const items = Store.getItems();
  const appState = Store.getAppState();
  // ... render logic
}
```

### Rendering Primitives

Common UI patterns are extracted into reusable functions:
- `renderItemHeader()` - Item name, link, notes badge
- `getItemCardClasses()` - CSS class generation for item cards
- `getListItemCardClasses()` - CSS class generation for list items

**Benefits**:
- Consistent UI across stages
- Single place to update item display
- Reduced code duplication

---

## Event Handling

### Event Delegation

The application uses **event delegation** for dynamic content:

```javascript
resultsList.addEventListener('click', function handleResultsViewClick(e) {
  const arrowBtn = e.target.closest('.results-arrow-btn');
  if (arrowBtn) {
    // Handle arrow button click
  }
});
```

**Benefits**:
- Works with dynamically added content
- Single listener per container
- Better performance

### Event Handler Organization

Event handlers are organized by domain:

- **Navigation** (`events/navigation.js`) - Stage navigation clicks
- **Items** (`events/items.js`) - Item operations (add, remove, property setting)
- **Settings** (`events/settings.js`) - Settings form submissions
- **Modals** (`events/modals.js`) - Modal interactions
- **App Controls** (`events/app-controls.js`) - App-level actions

### Centralized Setup

All event listeners are set up via `setupAllEventListeners()`:

```javascript
setupAllEventListeners({
  navigateToStage,
  addItem,
  setItemProperty,
  // ... all handler functions
});
```

**Benefits**:
- Single place to see all event setup
- Easy to add new handlers
- Clear dependencies

### Handler Pattern

Event handlers receive business logic functions as dependencies:

```javascript
export function setupItemsListeners({
  addItem,
  bulkAddItems,
  setItemProperty,
  // ...
}) {
  // Use handlers here
}
```

**Benefits**:
- Testable (can inject mock functions)
- Clear dependencies
- No direct state mutations in handlers

---

## Business Logic & Models

### Item Model (`models/items.js`)

**Responsibilities**:
- Item CRUD operations
- Property updates and validation
- CD3 and Cost of Delay calculations
- Confidence survey calculations
- Sequence management
- Notes management

**Key Functions**:
- `createItem(name, link)` - Create new item
- `updateItemProperty(item, property, value, buckets)` - Update item property
- `calculateCD3(item, buckets)` - Calculate CD3 score
- `calculateCostOfDelay(item, buckets)` - Calculate Cost of Delay
- `calculateConfidenceWeightedCD3(item, appState)` - Confidence-weighted CD3
- `recomputeItemMetrics(item, buckets)` - Recalculate all metrics

**Validation**:
- Property prerequisites (e.g., can't set value without urgency)
- Property unset validation (e.g., can't unset urgency if value is set)
- Stage-based validation (locked mode)

### Bucket Model (`models/buckets.js`)

**Responsibilities**:
- Bucket configuration (limits, weights, titles, descriptions)
- Bucket normalization and validation
- Bucket count calculations

**Key Functions**:
- `initializeBuckets()` - Create default bucket configuration
- `normalizeBuckets(buckets)` - Ensure consistent structure
- `updateBuckets(state, items)` - Update bucket counts
- `calculateBucketCounts(items, buckets)` - Count items per bucket

### Stage Model (`models/stages.js`)

**Responsibilities**:
- Stage navigation logic
- Stage validation rules
- Stage controller (advance, back, navigate)

**Key Features**:
- **Declarative Rules**: `STAGE_RULES` object defines validation per stage
- **Stage Controller**: `STAGE_CONTROLLER` object manages all stage operations
- **Visited Stages**: Tracks which stages have been visited
- **Navigation Validation**: Checks prerequisites before allowing navigation

**Example Rule**:
```javascript
'urgency': [
  items => items.every(i => i.urgencySet) || 'All items need urgency set...'
]
```

### Derived State (`models/derived/items.js`)

**Purpose**: Pure functions that compute business logic about items.

**Key Functions**:
- `getParkingLotItems(items, property)` - Items without property set
- `allItemsHave(items, property)` - Completion check
- `canSetValue(item, appState)` - Permission check
- `hasAdvancedItems(items)` - Progress indicator

**Benefits**:
- Business logic separated from UI
- Testable (pure functions)
- Reusable across views
- Always reflects current state

---

## Analytics Architecture

### Abstraction Layer

Analytics calls go through an abstraction layer (`analytics/analytics.js`):

```javascript
export const analytics = {
  init(),
  identify(userId, userProperties),
  trackEvent(eventName, properties)
};
```

**Benefits**:
- Provider-agnostic (currently Amplitude, easy to switch)
- Environment-based configuration (dev vs production API keys)
- Graceful degradation (works if analytics fails)
- Centralized initialization

### Environment Detection

Analytics automatically detects environment:
- `localhost` or `127.0.0.1` → Development API key
- Other domains → Production API key

### Dynamic Script Loading

Amplitude script is loaded dynamically:
- Only loads when needed
- Handles initialization state
- Prevents duplicate loading
- Works with ES modules

### Stage Event Tracking

Stage-specific events are centralized in `analytics/stageEvents.js`:

```javascript
export function trackStageView(stage, items) {
  switch (stage) {
    case 'urgency':
      return analytics.trackEvent('View Urgency', {
        parkingLotCount: getParkingLotItems(items, 'urgency').length
      });
    // ...
  }
}
```

**Benefits**:
- Consistent event naming
- Stage-specific properties
- Single place to update tracking

### Event Naming Convention

Events follow a consistent naming pattern:
- `View {Stage}` - Stage view events
- `Set {Property}` - Property setting events
- `{Action} {Entity}` - Action events (e.g., "Add Item", "Delete Survey")

---

## Testing Architecture

### Test Runner (`tests/test-runner.js`)

**Purpose**: Executes all test suites and reports results.

**Features**:
- Standalone test page (`tests.html`)
- Automatic execution on page load
- Pass/fail reporting
- Error handling and reporting

### Test Core (`tests/test-core.js`)

**Purpose**: Provides testing utilities and assertions.

**Features**:
- `assert()` - Basic assertion
- `assertEqual()` - Equality assertion
- `assertThrows()` - Exception assertion
- Test grouping and organization

### Test Adapter (`test-adapter.js`)

**Purpose**: Provides clean interface for tests to interact with app.

**Features**:
- Wraps app functions for testing
- Handles app initialization
- Provides test-specific storage keys
- Isolates test data from app data

### Test Suites (`tests/suites/`)

Test suites are organized by domain:
- `basic-items.js` - Item CRUD operations
- `buckets.js` - Bucket configuration
- `stages.js` - Stage navigation
- `cd3.js` - CD3 calculations
- `confidence-survey.js` - Confidence surveys
- `sequence.js` - Item sequencing
- And more...

**Pattern**:
```javascript
test('Test name', () => {
  // Arrange
  // Act
  // Assert
});
```

---

## Key Design Patterns

### 1. **Singleton Pattern** (Store)

```javascript
export const Store = {
  state: null,
  init() { ... },
  save(state) { ... }
};
```

**Use Case**: Centralized state management

### 2. **Module Pattern** (ES6 Modules)

```javascript
// Export
export function myFunction() { ... }

// Import
import { myFunction } from './module.js';
```

**Use Case**: Code organization and dependency management

### 3. **Factory Pattern** (Commands)

```javascript
const { COMMANDS, COMMAND_FORMS } = createCommands({
  addItem,
  setItemProperty,
  // ...
});
```

**Use Case**: Declarative command system

### 4. **Strategy Pattern** (Stage Views)

```javascript
updateStageView({
  stage: 'urgency',
  render: displayUrgencyViewContent
});
```

**Use Case**: Different rendering strategies per stage

### 5. **Observer Pattern** (Store Subscribers)

```javascript
Store.subscribe(callback);
Store.notifySubscribers();
```

**Use Case**: Reactive updates (currently minimal usage)

### 6. **Template Method Pattern** (Stage View Controller)

```javascript
export function updateStageView({ sectionId, stage, render, onFirstShow }) {
  // Common logic
  if (currentStage === stage) {
    render();
    if (wasHidden && onFirstShow) {
      onFirstShow();
    }
  }
}
```

**Use Case**: Common stage view behavior

### 7. **Adapter Pattern** (Test Adapter)

```javascript
// Wraps app functions for testing
window.PriorityManagerAPI.init({ ... });
```

**Use Case**: Test interface abstraction

### 8. **Facade Pattern** (Analytics)

```javascript
analytics.trackEvent('Event Name', properties);
// Hides Amplitude implementation details
```

**Use Case**: Simplified interface to complex subsystem

---

## Architectural Decisions

### Why No Framework?

**Decision**: Use vanilla JavaScript ES6 modules instead of React/Vue/Angular.

**Rationale**:
- Simpler deployment (no build step)
- Smaller bundle size
- Full control over rendering
- Easier to understand for contributors
- No framework-specific learning curve

**Trade-offs**:
- More manual DOM manipulation
- No virtual DOM optimizations
- More boilerplate for complex UIs

### Why Centralized State?

**Decision**: Use Store singleton instead of scattered state.

**Rationale**:
- Single source of truth
- Easier debugging
- Consistent persistence
- Clear data flow

**Trade-offs**:
- All state in one place (can be large)
- No fine-grained reactivity

### Why Stage-Based Views?

**Decision**: Show one stage at a time instead of all stages.

**Rationale**:
- Simpler UI (less cognitive load)
- Clear workflow progression
- Easier to implement
- Better mobile experience

**Trade-offs**:
- Can't see multiple stages simultaneously
- Requires navigation between stages

### Why localStorage?

**Decision**: Use browser localStorage instead of server-side storage.

**Rationale**:
- No backend required
- Works offline
- Simple deployment
- Fast (no network latency)

**Trade-offs**:
- Data tied to browser/device
- Limited storage (~5-10MB)
- No sharing between users
- No backup/recovery

### Why ES6 Modules?

**Decision**: Use ES6 modules instead of bundler (Webpack, Rollup).

**Rationale**:
- Native browser support
- No build step
- Clear dependencies
- Easier debugging

**Trade-offs**:
- Requires HTTP server (can't use file://)
- More HTTP requests (though HTTP/2 helps)
- No tree-shaking

---

## Future Considerations

### Potential Improvements

1. **URL State Sharing**: Encode state in URL for sharing (planned)
2. **Export/Import**: JSON export/import for backup
3. **Collaboration**: Real-time collaboration (would require backend)
4. **Offline Support**: Service worker for offline functionality
5. **Performance**: Virtual scrolling for large item lists
6. **Accessibility**: Enhanced ARIA labels and keyboard navigation
7. **Internationalization**: Multi-language support
8. **Theming**: Dark mode, custom themes

### Scalability Considerations

- **State Size**: Current architecture handles hundreds of items well
- **Rendering**: Full re-render on each update (acceptable for current scale)
- **Storage**: localStorage limits may require pagination or compression
- **Analytics**: Current abstraction supports high event volume

---

## Conclusion

The Priority Manager application follows a **clean, modular architecture** with clear separation of concerns. The layered design makes it easy to understand, test, and maintain. The use of vanilla JavaScript and ES6 modules keeps the codebase simple and accessible, while the centralized state management and event delegation patterns provide structure and consistency.

The architecture is designed to be:
- **Maintainable**: Clear module boundaries and responsibilities
- **Testable**: Pure functions and dependency injection
- **Extensible**: Easy to add new features or stages
- **Debuggable**: Clear data flow and state management
- **Performant**: Efficient rendering and state updates

This architecture has proven effective for the application's current scope and provides a solid foundation for future enhancements.

