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

