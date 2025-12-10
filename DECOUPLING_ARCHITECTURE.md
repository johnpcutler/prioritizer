# Decoupling Architecture

## Overview
The app and tests are now completely decoupled through a public API layer. They don't know about each other's internals.

## Architecture Layers

### 1. App Layer (`app.js`)
- **Private**: All internal functions and state
- **No test awareness**: Removed all `window.TEST_DATA`, `window.runAllTests` checks
- **Exposes**: Only through `PriorityManagerAPI.init()` - passes an object with public methods

### 2. Public API Layer (`app-api.js`)
- **Purpose**: Single interface for all external access
- **Exposes**: Only public methods needed by external code
- **Decoupled**: Doesn't know about tests or any specific consumer
- **Access**: `window.PriorityManagerAPI`

### 3. Test Adapter Layer (`test-adapter.js`)
- **Purpose**: Bridges tests to the app through the public API
- **Decoupled**: Tests use this adapter, which uses the API
- **Access**: `window.TestAdapter`

### 4. Test Layer (`tests.js`)
- **Decoupled**: Only interacts through `TestAdapter`
- **Separate Storage**: Uses `test_priorityItems` and `test_appState` keys (different from app)
- **No Direct Access**: Doesn't call app functions directly

## Benefits

1. **Complete Separation**: App has zero knowledge of tests
2. **Testable**: Tests can be run independently
3. **Maintainable**: Changes to app internals don't break tests (as long as API is stable)
4. **Reusable**: API can be used by other consumers (plugins, extensions, etc.)
5. **Clear Interface**: Public API clearly defines what's available

## Usage

### For Tests:
```javascript
// Tests use TestAdapter
window.TestAdapter.getItems();
window.TestAdapter.addItem('Test Item');
window.TestAdapter.advanceStage();
```

### For Other Consumers:
```javascript
// Other code uses PriorityManagerAPI directly
window.PriorityManagerAPI.getItems();
window.PriorityManagerAPI.addItem('My Item');
window.PriorityManagerAPI.advanceStage();
```

## Storage Keys

- **App**: `priorityItems`, `appState`
- **Tests**: `test_priorityItems`, `test_appState`

This ensures tests don't interfere with app data and vice versa.

## Script Loading Order

1. `app-api.js` - Creates the API structure
2. `app.js` - Initializes app and registers with API
3. `test-adapter.js` - Creates adapter that uses API
4. `tests.js` - Uses adapter to test the app

