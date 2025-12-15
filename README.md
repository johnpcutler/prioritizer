# Priority Manager

A web application for prioritizing items using urgency, value, and duration metrics.

## Available URLs

### Main Application
**URL:** `http://localhost:8000/` or `http://localhost:8000/index.html`

The main application interface where users can:
- Add and manage items
- Set urgency, value, and duration for items
- Navigate through stages: Items → Urgency → Value → Duration → Results
- View prioritized results sorted by CD3 (Cost of Delay Divided by Duration)

The app automatically initializes on page load, either loading existing state or starting fresh with defaults.

---

### Debug / JSON Data
**URL:** `http://localhost:8000/debug.html`

A debug page for developers to view the application's internal state in JSON format. This page:
- Displays current stage, locked status, buckets configuration, and all items
- Auto-refreshes every 2 seconds to show live updates
- Useful for debugging and inspecting application state
- Not linked from the main app (hidden route for developers)

---

### Tests
**URL:** `http://localhost:8000/tests.html`

A standalone test runner that automatically executes the full test suite. This page:
- Completely decoupled from the main app
- Automatically initializes its own app instance
- Runs all tests on page load
- Displays test results with pass/fail counts
- Shows status messages during initialization ("Initializing test environment...", "Starting app...", "Running tests...", etc.)
- Includes a "Copy Failing Tests" button when tests fail
- Not linked from the main app (hidden route for developers)

---

## Running the Application

1. Start the development server:
   ```bash
   python3 server.py
   ```

2. Open your browser and navigate to:
   - Main app: `http://localhost:8000/`
   - Debug page: `http://localhost:8000/debug.html`
   - Tests: `http://localhost:8000/tests.html`

## Notes

- All three pages operate independently and can be open simultaneously in different tabs
- The main app persists data in browser localStorage
- The tests page uses separate storage keys to avoid interfering with app data
- The debug page shows a read-only view of the current application state

---

## Project Structure

The codebase follows a modular architecture organized by concern. Here's an overview of the file and folder structure:

### Root Files

- **`index.html`** - Main application entry point. Contains the HTML structure and initializes the app via `app.js`
- **`app.js`** - Core application logic. Orchestrates all modules, handles business logic, and manages the application lifecycle
- **`app-api.js`** - Public API functions exposed globally for testing and debugging purposes
- **`styles.css`** - Global stylesheet containing all CSS for the application
- **`help.html`** - Standalone help documentation page with analytics tracking
- **`debug.html`** - Developer debug page showing application state in JSON format
- **`tests.html`** - Standalone test runner page
- **`server.py`** - Simple Python HTTP server for local development
- **`test-adapter.js`** - Test adapter providing a clean interface for test suites to interact with the app
- **`test-data.json`** - Sample test data used by test suites

### `/analytics/` - Analytics Abstraction Layer

- **`analytics.js`** - Core analytics abstraction module. Handles Amplitude initialization, environment-based API key selection (dev vs production), and provides `trackEvent()` and `identify()` functions
- **`stageEvents.js`** - Centralized analytics tracking for stage view events (View Items, View Urgency, View Value, View Duration, View Results)

### `/models/` - Business Logic & Data Models

- **`items.js`** - Item model and business logic. Handles item creation, property updates, CD3 calculations, confidence-weighted CD3, sequence management, and notes
- **`buckets.js`** - Bucket configuration model. Manages urgency/value/duration buckets, validation, defaults, and bucket operations
- **`stages.js`** - Stage navigation model. Defines stage order, validates stage transitions, and manages stage controller logic
- **`constants.js`** - Application-wide constants (categories, levels, property metadata, storage keys)
- **`bucketActions.js`** - Bucket action handlers for settings operations
- **`derived/items.js`** - Derived state functions for items. Computes business logic like parking lot detection, completion checks, and permission logic (canSetValue, canSetDuration, etc.)

### `/state/` - State Management

- **`appState.js`** - Centralized state management. Handles localStorage persistence, app state retrieval/saving, and provides the `Store` singleton for state access

### `/ui/` - User Interface

- **`display.js`** - General display utilities (JSON display, stage navigation updates, locked display, settings population)
- **`stageView.js`** - Generic stage view controller. Handles common view visibility logic and analytics tracking for stage transitions
- **`forms.js`** - Form utility functions (HTML escaping, form helpers)
- **`display/`** - Stage-specific view modules:
  - **`index.js`** - Central export point for all display functions
  - **`itemListingView.js`** - Item listing stage view (displays items, manages "Start Prioritizing" button)
  - **`urgencyView.js`** - Urgency stage view (3-column layout for urgency buckets)
  - **`valueView.js`** - Value stage view (3x3 grid for value/urgency combinations)
  - **`durationView.js`** - Duration stage view (3x3 grid with duration dropdowns)
  - **`resultsView.js`** - Results stage view (ranked list with CD3 scores, confidence surveys, reordering)
- **`render/`** - Common rendering primitives:
  - **`itemHeader.js`** - Reusable item header rendering (name, link, notes badge, inactive state styling)

### `/events/` - Event Handlers

- **`listeners.js`** - Main event listener orchestrator. Sets up all event listeners and handles results view interactions (reordering)
- **`items.js`** - Item operation event listeners (add, remove, bulk add, property setting, navigation buttons)
- **`navigation.js`** - Stage navigation event listeners
- **`settings.js`** - Settings form event listeners (bucket limits, weights, titles, descriptions)
- **`modals.js`** - Modal event listeners (notes, confidence surveys, clear data confirmation)
- **`app-controls.js`** - App control event listeners (help link, clear data, toggle locked)

### `/utils/` - Utility Functions

- **`csvExport.js`** - CSV export functionality. Generates CSV files with item data, handles CSV escaping, and triggers browser downloads

### `/config/` - Configuration

- **`commands.js`** - Command configuration (if used for CLI or API commands)

### `/tests/` - Test Suite

- **`test-runner.js`** - Main test runner that executes all test suites
- **`test-core.js`** - Core testing utilities and assertions
- **`suites/`** - Individual test suite files:
  - **`basic-items.js`** - Basic item operations (create, update, remove)
  - **`buckets.js`** - Bucket configuration and validation tests
  - **`stages.js`** - Stage navigation and validation tests
  - **`cd3.js`** - CD3 calculation tests
  - **`cost-of-delay.js`** - Cost of delay calculation tests
  - **`confidence-survey.js`** - Confidence survey functionality tests
  - **`csv-export.js`** - CSV export functionality tests
  - **`enhanced-item-listing.js`** - Item listing view enhancements (new items, buttons)
  - **`item-state.js`** - Item state management tests
  - **`locked-mode.js`** - Locked mode behavior tests
  - **`notes.js`** - Item notes functionality tests
  - **`property-validation.js`** - Property validation tests
  - **`sequence.js`** - Item sequence and reordering tests
  - **`board-position.js`** - Board position calculation tests
  - **`bulk-operations.js`** - Bulk item operations tests

### Architecture Principles

1. **Separation of Concerns**: Models handle business logic, UI handles rendering, events handle user interactions
2. **Modular Design**: Each module has a clear responsibility and can be tested independently
3. **State Management**: Centralized state via `Store` singleton with localStorage persistence
4. **Analytics Abstraction**: Analytics calls go through abstraction layer for easy provider switching
5. **Derived State**: Business logic computations extracted from UI code into `models/derived/`
6. **Stage-Based Views**: Each stage has its own view module for maintainability
7. **Event Delegation**: Event listeners use delegation patterns for dynamic content

