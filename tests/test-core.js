// Test infrastructure for Priority Manager test suite
// Provides assert functions, helpers, and utilities for all test suites

// Expose to window for non-module scripts to use
// This will be populated at the end of the file after all exports are defined

// Test storage keys (separate from app to avoid conflicts)
export const TEST_STORAGE_KEY = 'test_priorityItems';
export const TEST_APP_STATE_KEY = 'test_appState';

// Embedded test data (no server needed)
export const TEST_DATA = {
  "items": [
    {
      "id": "test-1",
      "name": "Test Item 1",
      "urgency": 2,
      "value": 3,
      "duration": 1,
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    {
      "id": "test-2",
      "name": "Test Item 2",
      "urgency": 1,
      "value": 0,
      "duration": 0,
      "createdAt": "2024-01-02T00:00:00.000Z"
    },
    {
      "id": "test-3",
      "name": "Test Item 3",
      "urgency": 0,
      "value": 0,
      "duration": 0,
      "createdAt": "2024-01-03T00:00:00.000Z"
    }
  ]
};

// Test results storage
export let testResults = [];
export let testCount = 0;
export let passCount = 0;
export let failCount = 0;
export let currentTestNumber = 0;
export let testFunctionNumber = 0; // Tracks test function numbers (increments once per test function)

// Test helper functions
// Note: testFunctionNumber should be set before calling assert functions
export let currentTestFunctionNum = null; // Set by test wrapper functions

export function assert(condition, message) {
    testCount++;
    currentTestNumber++;
    const testNum = currentTestFunctionNum !== null ? currentTestFunctionNum : currentTestNumber;
    if (condition) {
        passCount++;
        testResults.push({ status: 'PASS', message, testNumber: testNum });
        console.log(`✓ PASS [${testNum}]: ${message}`);
    } else {
        failCount++;
        testResults.push({ status: 'FAIL', message, testNumber: testNum });
        console.error(`✗ FAIL [${testNum}]: ${message}`);
    }
}

export function assertEqual(actual, expected, message) {
    testCount++;
    currentTestNumber++;
    const testNum = currentTestFunctionNum !== null ? currentTestFunctionNum : currentTestNumber;
    if (actual === expected) {
        passCount++;
        testResults.push({ status: 'PASS', message, testNumber: testNum });
        console.log(`✓ PASS [${testNum}]: ${message}`);
    } else {
        failCount++;
        testResults.push({ status: 'FAIL', message: `${message} (Expected: ${expected}, Got: ${actual})`, testNumber: testNum });
        console.error(`✗ FAIL [${testNum}]: ${message} (Expected: ${expected}, Got: ${actual})`);
    }
}

export function assertNotEqual(actual, expected, message) {
    testCount++;
    currentTestNumber++;
    const testNum = currentTestFunctionNum !== null ? currentTestFunctionNum : currentTestNumber;
    if (actual !== expected) {
        passCount++;
        testResults.push({ status: 'PASS', message, testNumber: testNum });
        console.log(`✓ PASS [${testNum}]: ${message}`);
    } else {
        failCount++;
        testResults.push({ status: 'FAIL', message: `${message} (Values should not be equal)`, testNumber: testNum });
        console.error(`✗ FAIL [${testNum}]: ${message}`);
    }
}

// Reset test counters
export function resetTestCounters() {
    testCount = 0;
    passCount = 0;
    failCount = 0;
    testResults = [];
    currentTestNumber = 0;
    testFunctionNumber = 0;
}

// Get next test function number (increments once per call)
export function getNextTestFunctionNumber() {
    testFunctionNumber++;
    return testFunctionNumber;
}

// Helper to run a test function with proper numbering
export function runTest(testFunction, testName) {
    currentTestFunctionNum = getNextTestFunctionNumber();
    try {
        const result = testFunction();
        // If it's async, we need to handle it differently
        if (result && typeof result.then === 'function') {
            return result.finally(() => {
                currentTestFunctionNum = null;
            });
        } else {
            currentTestFunctionNum = null;
            return result;
        }
    } catch (error) {
        currentTestFunctionNum = null;
        throw error;
    }
}

// Helper to run an async test function with proper numbering
export async function runAsyncTest(testFunction, testName) {
    currentTestFunctionNum = getNextTestFunctionNumber();
    try {
        await testFunction();
        console.log(`✓ Test ${currentTestFunctionNum} completed: ${testName || testFunction.name}`); // Debug log
    } catch (error) {
        console.error(`Error in test function: ${error.message}`);
        console.error(error.stack); // Log stack trace for debugging
        testResults.push({ status: 'ERROR', message: `Error in test ${currentTestFunctionNum}: ${error.message}`, testNumber: currentTestFunctionNum });
        failCount++; // Mark as failed if an error occurs
    } finally {
        currentTestFunctionNum = null;
    }
}

// Get items from storage (using the same function from app.js)
export function getItems() {
    // Use TestAdapter if available to get items from app's storage
    if (window.TestAdapter && window.TestAdapter.api) {
        return window.TestAdapter.getItems();
    }
    // Fallback for tests that need direct storage access
    const stored = localStorage.getItem(TEST_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
}

// Save items to storage
export function saveItems(items) {
    // Use TestAdapter if available to save items to app's storage
    // But we need to save directly for test setup, so we'll save to both
    if (window.TestAdapter && window.TestAdapter.api) {
        // Save to app's storage key for API to work
        localStorage.setItem('priorityItems', JSON.stringify(items));
    }
    // Also save to test storage key for fallback
    localStorage.setItem(TEST_STORAGE_KEY, JSON.stringify(items));
}

// Initialize default buckets structure - uses TestAdapter (no duplication)
export function initializeBuckets() {
    if (window.TestAdapter && window.TestAdapter.api) {
        return window.TestAdapter.initializeBuckets();
    }
    // Fallback if adapter not ready (shouldn't happen in normal flow)
    console.warn('TestAdapter not available, using fallback');
    return {
        urgency: { 1: { limit: 30, count: 0, overLimit: false, weight: 1, title: 'WHENEVER', description: '' }, 2: { limit: 30, count: 0, overLimit: false, weight: 1, title: 'SOON', description: '' }, 3: { limit: 30, count: 0, overLimit: false, weight: 1, title: 'ASAP', description: '' } },
        value: { 1: { limit: 30, count: 0, overLimit: false, weight: 1, title: 'MEH', description: '' }, 2: { limit: 30, count: 0, overLimit: false, weight: 1, title: 'BONUS', description: '' }, 3: { limit: 30, count: 0, overLimit: false, weight: 1, title: 'KILLER', description: '' } },
        duration: { 1: { limit: null, count: 0, overLimit: false, weight: 1, title: '1-3d', description: 'TBD' }, 2: { limit: null, count: 0, overLimit: false, weight: 1, title: '1-3w', description: 'TBD' }, 3: { limit: null, count: 0, overLimit: false, weight: 1, title: '1-3mo', description: 'TBD' } }
    };
}

// Migrate old state structure to new buckets structure - uses TestAdapter (no duplication)
export function migrateToBuckets(state) {
    if (window.TestAdapter && window.TestAdapter.api) {
        return window.TestAdapter.migrateToBuckets(state);
    }
    // Fallback if adapter not ready
    return state;
}

// Update buckets with current counts and over-limit status - uses TestAdapter (no duplication)
export function updateBuckets(state, items) {
    if (window.TestAdapter && window.TestAdapter.api) {
        return window.TestAdapter.updateBuckets(state, items);
    }
    // Fallback if adapter not ready
    return state;
}

// Get app state - uses TestAdapter (decoupled from app)
export function getAppState() {
    if (window.TestAdapter && window.TestAdapter.api) {
        const state = window.TestAdapter.getAppState();
        // Ensure currentStage defaults to 'Item Listing' if invalid or null
        if (!state || !state.currentStage || !['Item Listing', 'urgency', 'value', 'duration', 'Results', 'CD3'].includes(state.currentStage)) {
            // If state is invalid, create a new one
            if (!state || !state.currentStage) {
                const newState = { currentStage: 'Item Listing', buckets: initializeBuckets(), locked: true };
                saveAppState(newState);
                return newState;
            }
            state.currentStage = 'Item Listing';
            saveAppState(state);
        }
        return state;
    }
    // Fallback for tests that need direct storage access
    const stored = localStorage.getItem(TEST_APP_STATE_KEY);
    if (stored) {
        const state = JSON.parse(stored);
        // Ensure currentStage defaults to 'Item Listing' if invalid
        if (!state.currentStage || !['Item Listing', 'urgency', 'value', 'duration', 'Results', 'CD3'].includes(state.currentStage)) {
            state.currentStage = 'Item Listing';
            saveAppState(state);
        }
        return state;
    }
    const defaultState = { currentStage: 'Item Listing', buckets: initializeBuckets(), locked: true };
    saveAppState(defaultState);
    return defaultState;
}

// Save app state for tests - direct storage access needed for test setup
export function saveAppState(state) {
    // Always save to both test and app storage keys to keep them in sync
    localStorage.setItem('appState', JSON.stringify(state));
    localStorage.setItem(TEST_APP_STATE_KEY, JSON.stringify(state));
}

// Set entry stage for tests (kept for backward compatibility, uses TestAdapter)
export function setEntryStage(stage) {
    // Use TestAdapter if available, otherwise fallback to direct manipulation
    if (window.TestAdapter && window.TestAdapter.api) {
        return window.TestAdapter.setCurrentStage(stage);
    }
    return setCurrentStage(stage);
}

// Set current stage for tests (with validation like app.js)
// Note: This is test-specific logic, not using API directly
export function setCurrentStage(stage) {
    const STAGE_ORDER = ['Item Listing', 'urgency', 'value', 'duration', 'Results', 'CD3'];
    if (!STAGE_ORDER.includes(stage)) {
        return {
            success: false,
            error: `Invalid stage: ${stage}`
        };
    }
    
    const items = getItems();
    const appState = getAppState();
    const currentStage = appState.currentStage || 'Item Listing';
    
    // Validate stage transitions when advancing forward
    if (STAGE_ORDER.indexOf(stage) > STAGE_ORDER.indexOf(currentStage)) {
        // Check if all items have values for current stage
        if (currentStage === 'urgency') {
            const itemsWithoutUrgency = items.filter(item => !item.urgency || item.urgency === 0);
            if (itemsWithoutUrgency.length > 0) {
                return {
                    success: false,
                    error: `Error: Cannot advance to ${stage.charAt(0).toUpperCase() + stage.slice(1)} stage. All items must have urgency values set. ${itemsWithoutUrgency.length} item(s) still need urgency values.`
                };
            }
        } else if (currentStage === 'value') {
            const itemsWithoutValue = items.filter(item => !item.value || item.value === 0);
            if (itemsWithoutValue.length > 0) {
                return {
                    success: false,
                    error: `Error: Cannot advance to ${stage.charAt(0).toUpperCase() + stage.slice(1)} stage. All items must have value values set. ${itemsWithoutValue.length} item(s) still need value values.`
                };
            }
        } else if (currentStage === 'duration') {
            const itemsWithoutDuration = items.filter(item => !item.duration || item.duration === 0);
            if (itemsWithoutDuration.length > 0) {
                return {
                    success: false,
                    error: `Error: Cannot advance to ${stage.charAt(0).toUpperCase() + stage.slice(1)} stage. All items must have duration values set. ${itemsWithoutDuration.length} item(s) still need duration values.`
                };
            }
        }
    }
    
    appState.currentStage = stage;
    saveAppState(appState);
    return { success: true };
}

// Advance stage for tests - uses TestAdapter
export function advanceStage() {
    if (window.TestAdapter && window.TestAdapter.api) {
        return window.TestAdapter.advanceStage();
    }
    // Fallback implementation for tests
    const STAGE_ORDER = ['Item Listing', 'urgency', 'value', 'duration', 'Results', 'CD3'];
    const appState = getAppState();
    const items = getItems();
    const currentStage = appState.currentStage || 'Item Listing';
    
    const currentIndex = STAGE_ORDER.indexOf(currentStage);
    if (currentIndex === -1 || currentIndex >= STAGE_ORDER.length - 1) {
        return {
            success: false,
            error: 'Error: Already at the final stage (CD3). Cannot advance further.'
        };
    }
    
    // Special case: Item Listing -> Urgency: Must have at least one item
    if (currentStage === 'Item Listing') {
        if (items.length === 0) {
            return {
                success: false,
                error: 'You must have at least one item before advancing to Urgency stage.'
            };
        }
    } else {
        // Check if all items have values for current stage using *Set flags
        if (currentStage === 'urgency') {
            const itemsWithoutUrgency = items.filter(item => !item.urgencySet);
            if (itemsWithoutUrgency.length > 0) {
                return {
                    success: false,
                    error: `Error: Cannot advance stage. All items must have urgency values set. ${itemsWithoutUrgency.length} item(s) still need urgency values.`
                };
            }
        } else if (currentStage === 'value') {
            const itemsWithoutValue = items.filter(item => !item.valueSet);
            if (itemsWithoutValue.length > 0) {
                return {
                    success: false,
                    error: `Error: Cannot advance stage. All items must have value values set. ${itemsWithoutValue.length} item(s) still need value values.`
                };
            }
        } else if (currentStage === 'duration') {
            const itemsWithoutDuration = items.filter(item => !item.durationSet);
            if (itemsWithoutDuration.length > 0) {
                return {
                    success: false,
                    error: `Error: Cannot advance stage. All items must have duration values set. ${itemsWithoutDuration.length} item(s) still need duration values.`
                };
            }
        }
    }
    
    const nextStage = STAGE_ORDER[currentIndex + 1];
    appState.currentStage = nextStage;
    saveAppState(appState);
    // Also save to app's storage key
    if (window.TestAdapter && window.TestAdapter.api) {
        localStorage.setItem('appState', JSON.stringify(appState));
    }
    return { success: true };
}

// Go back stage for tests - uses TestAdapter
export function backStage() {
    if (window.TestAdapter && window.TestAdapter.api) {
        return window.TestAdapter.backStage();
    }
    // Fallback implementation for tests
    const STAGE_ORDER = ['Item Listing', 'urgency', 'value', 'duration', 'Results', 'CD3'];
    const appState = getAppState();
    const currentStage = appState.currentStage || 'Item Listing';
    
    const currentIndex = STAGE_ORDER.indexOf(currentStage);
    if (currentIndex <= 0) {
        return {
            success: false,
            error: 'Error: Already at the first stage (Item Listing). Cannot go back further.'
        };
    }
    
    const previousStage = STAGE_ORDER[currentIndex - 1];
    appState.currentStage = previousStage;
    saveAppState(appState);
    // Also save to app's storage key
    if (window.TestAdapter && window.TestAdapter.api) {
        localStorage.setItem('appState', JSON.stringify(appState));
    }
    return { success: true };
}

// Calculate bucket counts from items - uses TestAdapter (no duplication)
export function calculateBucketCounts(items) {
    if (window.TestAdapter && window.TestAdapter.api) {
        return window.TestAdapter.calculateBucketCounts(items);
    }
    // Fallback if adapter not ready
    return { urgency: { 1: 0, 2: 0, 3: 0 }, value: { 1: 0, 2: 0, 3: 0 }, duration: { 1: 0, 2: 0, 3: 0 } };
}

// Escape HTML helper
export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Display test results
export function displayTestResults() {
    const resultsDiv = document.getElementById('testResults');
    if (!resultsDiv) return;
    
    const passRate = testCount > 0 ? ((passCount / testCount) * 100).toFixed(1) : 0;
    
    // Show/hide copy button based on failing tests
    const copyBtn = document.getElementById('copyFailingTestsBtn');
    if (copyBtn) {
        if (failCount > 0) {
            copyBtn.style.display = 'inline-block';
        } else {
            copyBtn.style.display = 'none';
        }
    }
    
    let html = `
        <div class="test-summary">
            <h3>Test Results</h3>
            <div class="test-stats">
                <span class="test-stat">Total: ${testCount}</span>
                <span class="test-stat pass">Passed: ${passCount}</span>
                <span class="test-stat fail">Failed: ${failCount}</span>
                <span class="test-stat">Pass Rate: ${passRate}%</span>
            </div>
        </div>
        <div class="test-details">
    `;
    
    testResults.forEach((result, index) => {
        const statusClass = result.status === 'PASS' ? 'pass' : result.status === 'FAIL' ? 'fail' : 'error';
        html += `
            <div class="test-result ${statusClass}">
                <span class="test-status">${result.status}</span>
                <span class="test-number">[${result.testNumber || index + 1}]</span>
                <span class="test-message">${escapeHtml(result.message)}</span>
            </div>
        `;
    });
    
    html += '</div>';
    resultsDiv.innerHTML = html;
    
    // Scroll to results
    resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Fallback copy method
function fallbackCopyToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
        alert(`Copied ${testResults.filter(r => r.status === 'FAIL' || r.status === 'ERROR').length} failing test(s) to clipboard!`);
    } catch (err) {
        console.error('Fallback copy failed:', err);
        alert('Failed to copy to clipboard. Please copy manually from console.');
    }
    document.body.removeChild(textarea);
}

// Copy failing tests to clipboard
export function copyFailingTests() {
    const failingTests = testResults.filter(result => result.status === 'FAIL' || result.status === 'ERROR');
    
    if (failingTests.length === 0) {
        alert('No failing tests to copy!');
        return;
    }
    
    let text = 'Failing Tests:\n\n';
    failingTests.forEach(result => {
        text += `Test ${result.testNumber || 'N/A'}: ${result.message}\n`;
    });
    
    // Copy to clipboard
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            alert(`Copied ${failingTests.length} failing test(s) to clipboard!`);
        }).catch(err => {
            console.error('Failed to copy:', err);
            // Fallback: select text in a textarea
            fallbackCopyToClipboard(text);
        });
    } else {
        // Fallback for older browsers
        fallbackCopyToClipboard(text);
    }
}

// Expose everything to window for non-module scripts (must be at end after all functions are defined)
if (typeof window !== 'undefined') {
    window.TestCore = {
        TEST_STORAGE_KEY,
        TEST_APP_STATE_KEY,
        TEST_DATA,
        testResults,
        testCount,
        passCount,
        failCount,
        currentTestNumber,
        testFunctionNumber,
        currentTestFunctionNum,
        assert,
        assertEqual,
        assertNotEqual,
        resetTestCounters,
        getNextTestFunctionNumber,
        runTest,
        runAsyncTest,
        getItems,
        saveItems,
        initializeBuckets,
        migrateToBuckets,
        updateBuckets,
        getAppState,
        saveAppState,
        setEntryStage,
        setCurrentStage,
        advanceStage,
        backStage,
        calculateBucketCounts,
        escapeHtml,
        displayTestResults,
        copyFailingTests
    };
}

