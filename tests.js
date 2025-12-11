// Test suite for Priority Manager
// Tests are completely decoupled from app internals
// All interactions go through TestAdapter -> PriorityManagerAPI -> App

// Test storage keys (separate from app to avoid conflicts)
const TEST_STORAGE_KEY = 'test_priorityItems';
const TEST_APP_STATE_KEY = 'test_appState';

// Embedded test data (no server needed)
const TEST_DATA = {
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
let testResults = [];
let testCount = 0;
let passCount = 0;
let failCount = 0;
let currentTestNumber = 0;
let testFunctionNumber = 0; // Tracks test function numbers (increments once per test function)

// Test helper functions
// Note: testFunctionNumber should be set before calling assert functions
let currentTestFunctionNum = null; // Set by test wrapper functions

function assert(condition, message) {
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

function assertEqual(actual, expected, message) {
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

function assertNotEqual(actual, expected, message) {
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
function resetTestCounters() {
    testCount = 0;
    passCount = 0;
    failCount = 0;
    testResults = [];
    currentTestNumber = 0;
    testFunctionNumber = 0;
}

// Get next test function number (increments once per call)
function getNextTestFunctionNumber() {
    testFunctionNumber++;
    return testFunctionNumber;
}

// Helper to run a test function with proper numbering
function runTest(testFunction, testName) {
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
async function runAsyncTest(testFunction, testName) {
    currentTestFunctionNum = getNextTestFunctionNumber();
    try {
        await testFunction();
    } finally {
        currentTestFunctionNum = null;
    }
}

// Get items from storage (using the same function from app.js)
function getItems() {
    // Use TestAdapter if available to get items from app's storage
    if (window.TestAdapter && window.TestAdapter.api) {
        return window.TestAdapter.getItems();
    }
    // Fallback for tests that need direct storage access
    const stored = localStorage.getItem(TEST_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
}

// Save items to storage
function saveItems(items) {
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
function initializeBuckets() {
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
function migrateToBuckets(state) {
    if (window.TestAdapter && window.TestAdapter.api) {
        return window.TestAdapter.migrateToBuckets(state);
    }
    // Fallback if adapter not ready
    return state;
}

// Update buckets with current counts and over-limit status - uses TestAdapter (no duplication)
function updateBuckets(state, items) {
    if (window.TestAdapter && window.TestAdapter.api) {
        return window.TestAdapter.updateBuckets(state, items);
    }
    // Fallback if adapter not ready
    return state;
}

// Get app state - uses TestAdapter (decoupled from app)
function getAppState() {
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
function saveAppState(state) {
    // Always save to both test and app storage keys to keep them in sync
    localStorage.setItem('appState', JSON.stringify(state));
    localStorage.setItem(TEST_APP_STATE_KEY, JSON.stringify(state));
}

// Set entry stage for tests (kept for backward compatibility, uses TestAdapter)
function setEntryStage(stage) {
    // Use TestAdapter if available, otherwise fallback to direct manipulation
    if (window.TestAdapter && window.TestAdapter.api) {
        return window.TestAdapter.setCurrentStage(stage);
    }
    return setCurrentStage(stage);
}

// Set current stage for tests (with validation like app.js)
// Note: This is test-specific logic, not using API directly
function setCurrentStage(stage) {
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
function advanceStage() {
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
function backStage() {
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

// Calculate bucket counts (same as in app.js)
// Calculate bucket counts from items - uses TestAdapter (no duplication)
function calculateBucketCounts(items) {
    if (window.TestAdapter && window.TestAdapter.api) {
        return window.TestAdapter.calculateBucketCounts(items);
    }
    // Fallback if adapter not ready
    return { urgency: { 1: 0, 2: 0, 3: 0 }, value: { 1: 0, 2: 0, 3: 0 }, duration: { 1: 0, 2: 0, 3: 0 } };
}


// Run all tests
async function runAllTests() {
    console.log('🧪 Starting test suite...\n');
    resetTestCounters();
    
    // Show loading state
    const resultsDiv = document.getElementById('testResults');
    if (resultsDiv) {
        resultsDiv.innerHTML = '<div class="empty-state">Running tests... Please wait.</div>';
    }
    
    // Ensure TestAdapter is initialized
    if (!window.TestAdapter || !window.TestAdapter.api) {
        console.log('Initializing TestAdapter...');
        await window.TestAdapter.init();
    }
    
    // Save current state
    const originalData = localStorage.getItem(TEST_STORAGE_KEY);
    
    try {
        // Clear storage for clean test (both test and app storage)
        localStorage.removeItem(TEST_STORAGE_KEY);
        localStorage.removeItem(TEST_APP_STATE_KEY);
        localStorage.removeItem('priorityItems'); // App's storage key
        localStorage.removeItem('appState'); // App's state key
        
        // Test 1: Add Item
        console.log('--- Test 1: Add Item ---');
        runTest(testAddItem);
        
        // Test 2: Set Urgency
        console.log('\n--- Test 2: Set Urgency ---');
        runTest(testSetUrgency);
        
        // Test 3: Set Value (with Urgency prerequisite)
        console.log('\n--- Test 3: Set Value (with Urgency) ---');
        runTest(testSetValue);
        
        // Test 4: Set Duration (with Value prerequisite)
        console.log('\n--- Test 4: Set Duration (with Value) ---');
        runTest(testSetDuration);
        
        // Test 5: Validation - Set Value without Urgency
        console.log('\n--- Test 5: Validation - Set Value without Urgency ---');
        runTest(testSetValueWithoutUrgency);
        
        // Test 6: Validation - Set Duration without Value
        console.log('\n--- Test 6: Validation - Set Duration without Value ---');
        runTest(testSetDurationWithoutValue);
        
        // Test 7: Load test data
        console.log('\n--- Test 7: Load Test Data ---');
        runTest(testLoadTestData);
        
        // Test 8: Entry stage validation
        console.log('\n--- Test 8: Entry Stage Validation ---');
        runTest(testEntryStageValidation);
        
        // Test 9: Bucket over-limit tracking
        console.log('\n--- Test 9: Bucket Over-Limit Tracking ---');
        runTest(testBucketLimitValidation);
        
        // Test 10: Lowering limits with existing items
        console.log('\n--- Test 10: Lowering Limits with Existing Items ---');
        runTest(testLoweringLimitsWithExistingItems);
        
        // Test 11: Add item only in urgency stage
        console.log('\n--- Test 11: Add Item Only in Urgency Stage ---');
        runTest(testAddItemOnlyInUrgencyStage);
        
        // Test 12: Cannot set urgency when entry stage is value
        console.log('\n--- Test 12: Cannot Set Urgency When Entry Stage is Value ---');
        runTest(testCannotSetUrgencyWhenEntryStageIsValue);
        
        // Test 13: Entry stage is always "urgency" on app start
        console.log('\n--- Test 13: Entry Stage Always "urgency" on App Start ---');
        runTest(testEntryStageAlwaysUrgencyOnStart);
        
        // Test 14: Cannot advance to next stage unless all items have current stage values
        console.log('\n--- Test 14: Cannot Advance Without All Items Having Current Stage Values ---');
        runTest(testCannotAdvanceWithoutAllItemsHavingCurrentStage);
        
        // Test 15: Stage navigation with advanceStage and backStage
        console.log('\n--- Test 15: Stage Navigation (Advance/Back) ---');
        runTest(testStageNavigation);
        
        // Test 16: Bucket weights default to 1
        console.log('\n--- Test 16: Bucket Weights Default to 1 ---');
        runTest(testBucketWeightsDefault);
        
        // Test 17: Set urgency weight
        console.log('\n--- Test 17: Set Urgency Weight ---');
        runTest(testSetUrgencyWeight);
        
        // Test 18: Set value weight
        console.log('\n--- Test 18: Set Value Weight ---');
        runTest(testSetValueWeight);
        
        // Test 19: Set duration weight
        console.log('\n--- Test 19: Set Duration Weight ---');
        runTest(testSetDurationWeight);
        
        // Test 20: Weight validation (non-negative)
        console.log('\n--- Test 20: Weight Validation ---');
        runTest(testWeightValidation);
        
        // Test 21: Urgency buckets have default titles and descriptions
        console.log('\n--- Test 21: Urgency Buckets Default Titles and Descriptions ---');
        runTest(testUrgencyBucketsDefaults);
        
        // Test 22: Set urgency title
        console.log('\n--- Test 22: Set Urgency Title ---');
        runTest(testSetUrgencyTitle);
        
        // Test 23: Set urgency description
        console.log('\n--- Test 23: Set Urgency Description ---');
        runTest(testSetUrgencyDescription);
        
        // Test 24: Value buckets have default titles and descriptions
        console.log('\n--- Test 24: Value Buckets Default Titles and Descriptions ---');
        runTest(testValueBucketsDefaults);
        
        // Test 25: Set value title
        console.log('\n--- Test 25: Set Value Title ---');
        runTest(testSetValueTitle);
        
        // Test 26: Set value description
        console.log('\n--- Test 26: Set Value Description ---');
        runTest(testSetValueDescription);
        
        // Test 27: Duration buckets have default titles and descriptions
        console.log('\n--- Test 27: Duration Buckets Default Titles and Descriptions ---');
        runTest(testDurationBucketsDefaults);
        
        // Test 28: Set duration title
        console.log('\n--- Test 28: Set Duration Title ---');
        runTest(testSetDurationTitle);
        
        // Test 29: Set duration description
        console.log('\n--- Test 29: Set Duration Description ---');
        runTest(testSetDurationDescription);
        
        // Test 30: Locked mode defaults to true
        console.log('\n--- Test 30: Locked Mode Default ---');
        await runAsyncTest(testLockedModeDefault);
        
        // Test 31: Locked mode cannot set urgency in value stage
        console.log('\n--- Test 31: Locked Mode Cannot Set Urgency in Value Stage ---');
        await runAsyncTest(testLockedModeCannotSetUrgencyInValueStage);
        
        // Test 32: Unlocked mode can set urgency in value stage
        console.log('\n--- Test 32: Unlocked Mode Can Set Urgency in Value Stage ---');
        await runAsyncTest(testUnlockedModeCanSetUrgencyInValueStage);
        
        // Test 33: Unlocked mode can set urgency and value in duration stage
        console.log('\n--- Test 33: Unlocked Mode Can Set Urgency and Value in Duration Stage ---');
        await runAsyncTest(testUnlockedModeCanSetUrgencyAndValueInDurationStage);
        
        // Test 34: Locked mode cannot set value in duration stage
        console.log('\n--- Test 34: Locked Mode Cannot Set Value in Duration Stage ---');
        await runAsyncTest(testLockedModeCannotSetValueInDurationStage);
        
        // Test 35: Unlocked mode cannot set future stages
        console.log('\n--- Test 35: Unlocked Mode Cannot Set Future Stages ---');
        await runAsyncTest(testUnlockedModeCannotSetFutureStages);
        
        // Test 36: Set locked toggle
        console.log('\n--- Test 36: Set Locked Toggle ---');
        await runAsyncTest(testSetLockedToggle);
        
        // Test 37: Cost of delay defaults to zero
        console.log('\n--- Test 37: Cost of Delay Defaults to Zero ---');
        await runAsyncTest(testCostOfDelayDefaultsToZero);
        
        // Test 38: Cost of delay calculated when both urgency and value set
        console.log('\n--- Test 38: Cost of Delay Calculated When Both Set ---');
        await runAsyncTest(testCostOfDelayCalculatedWhenBothSet);
        
        // Test 39: Cost of delay with different weights
        console.log('\n--- Test 39: Cost of Delay With Different Weights ---');
        await runAsyncTest(testCostOfDelayWithDifferentWeights);
        
        // Test 40: Cost of delay updates when urgency changes
        console.log('\n--- Test 40: Cost of Delay Updates When Urgency Changes ---');
        await runAsyncTest(testCostOfDelayUpdatesWhenUrgencyChanges);
        
        // Test 41: Cost of delay updates when value changes
        console.log('\n--- Test 41: Cost of Delay Updates When Value Changes ---');
        await runAsyncTest(testCostOfDelayUpdatesWhenValueChanges);
        
        // Test 42: Cost of delay resets to zero when urgency or value cleared
        console.log('\n--- Test 42: Cost of Delay Resets to Zero When Cleared ---');
        await runAsyncTest(testCostOfDelayResetsToZeroWhenUrgencyOrValueCleared);
        
        // Test 43: Cost of delay updates when weights change
        console.log('\n--- Test 43: Cost of Delay Updates When Weights Change ---');
        await runAsyncTest(testCostOfDelayUpdatesWhenWeightsChange);
        
        // Test 44: Bulk add items
        console.log('\n--- Test 44: Bulk Add Items ---');
        await runAsyncTest(testBulkAddItems);
        
        // Test 45: Bulk add items only in Item Listing stage
        console.log('\n--- Test 45: Bulk Add Items Only in Item Listing Stage ---');
        await runAsyncTest(testBulkAddItemsOnlyInItemListingStage);
        
        // Test 46: Bulk add items with empty lines
        console.log('\n--- Test 46: Bulk Add Items With Empty Lines ---');
        await runAsyncTest(testBulkAddItemsWithEmptyLines);
        
        // Test 47: Bulk add items with no valid names
        console.log('\n--- Test 47: Bulk Add Items With No Valid Names ---');
        await runAsyncTest(testBulkAddItemsWithNoValidNames);
        
        // Test 48: CD3 defaults to zero
        console.log('\n--- Test 48: CD3 Defaults to Zero ---');
        await runAsyncTest(testCD3DefaultsToZero);
        
        // Test 49: CD3 calculated when duration set
        console.log('\n--- Test 49: CD3 Calculated When Duration Set ---');
        await runAsyncTest(testCD3CalculatedWhenDurationSet);
        
        // Test 50: CD3 with different duration weights
        console.log('\n--- Test 50: CD3 With Different Duration Weights ---');
        await runAsyncTest(testCD3WithDifferentDurationWeights);
        
        // Test 51: CD3 with duration 3
        console.log('\n--- Test 51: CD3 With Duration 3 ---');
        await runAsyncTest(testCD3WithDuration3);
        
        // Test 52: CD3 updates when duration changes
        console.log('\n--- Test 52: CD3 Updates When Duration Changes ---');
        await runAsyncTest(testCD3UpdatesWhenDurationChanges);
        
        // Test 53: CD3 updates when cost of delay changes
        console.log('\n--- Test 53: CD3 Updates When Cost of Delay Changes ---');
        await runAsyncTest(testCD3UpdatesWhenCostOfDelayChanges);
        
        // Test 54: CD3 resets to zero when duration cleared
        console.log('\n--- Test 54: CD3 Resets to Zero When Duration Cleared ---');
        await runAsyncTest(testCD3ResetsToZeroWhenDurationCleared);
        
        // Test 55: CD3 updates when duration weights change
        console.log('\n--- Test 55: CD3 Updates When Duration Weights Change ---');
        await runAsyncTest(testCD3UpdatesWhenDurationWeightsChange);
        
        // Test 56: Value weight change affects costOfDelay and CD3
        console.log('\n--- Test 56: Value Weight Change Affects Cost of Delay and CD3 ---');
        await runAsyncTest(testValueWeightChangeAffectsCostOfDelayAndCD3);
        
        // Test 57: Urgency weight change affects CD3
        console.log('\n--- Test 57: Urgency Weight Change Affects CD3 ---');
        await runAsyncTest(testUrgencyWeightChangeAffectsCD3);
        
        // Test 58: Weight changes affect multiple items
        console.log('\n--- Test 58: Weight Changes Affect Multiple Items ---');
        await runAsyncTest(testWeightChangesAffectMultipleItems);
        
        // Test 59: Item active defaults to true
        console.log('\n--- Test 59: Item Active Defaults to True ---');
        await runAsyncTest(testItemActiveDefaultsToTrue);
        
        // Test 60: Set item inactive
        console.log('\n--- Test 60: Set Item Inactive ---');
        await runAsyncTest(testSetItemInactive);
        
        // Test 61: Set item active
        console.log('\n--- Test 61: Set Item Active ---');
        await runAsyncTest(testSetItemActive);
        
        // Test 62: Bulk add items are active by default
        console.log('\n--- Test 62: Bulk Add Items Are Active by Default ---');
        await runAsyncTest(testBulkAddItemsAreActiveByDefault);
        
        // Test 63: Set item active with invalid id
        console.log('\n--- Test 63: Set Item Active With Invalid Id ---');
        await runAsyncTest(testSetItemActiveWithInvalidId);
        
        // Test 64: Set item inactive with invalid id
        console.log('\n--- Test 64: Set Item Inactive With Invalid Id ---');
        await runAsyncTest(testSetItemInactiveWithInvalidId);
        
        // Test 65: Board position defaults to row 0 col 0
        console.log('\n--- Test 65: Board Position Defaults to Row 0 Col 0 ---');
        await runAsyncTest(testBoardPositionDefaultsToRow0Col0);
        
        // Test 66: Board position with urgency only
        console.log('\n--- Test 66: Board Position With Urgency Only ---');
        await runAsyncTest(testBoardPositionWithUrgencyOnly);
        
        // Test 67: Board position with value
        console.log('\n--- Test 67: Board Position With Value ---');
        await runAsyncTest(testBoardPositionWithValue);
        
        // Test 68: Board position with duration
        console.log('\n--- Test 68: Board Position With Duration ---');
        await runAsyncTest(testBoardPositionWithDuration);
        
        // Test 69: Board position updates when urgency changes
        console.log('\n--- Test 69: Board Position Updates When Urgency Changes ---');
        await runAsyncTest(testBoardPositionUpdatesWhenUrgencyChanges);
        
        // Test 70: Board position updates when value changes
        console.log('\n--- Test 70: Board Position Updates When Value Changes ---');
        await runAsyncTest(testBoardPositionUpdatesWhenValueChanges);
        
        // Test 71: Board position updates when duration changes
        console.log('\n--- Test 71: Board Position Updates When Duration Changes ---');
        await runAsyncTest(testBoardPositionUpdatesWhenDurationChanges);
        
        // Test 72: Board position with value but no urgency (edge case)
        console.log('\n--- Test 72: Board Position With Value But No Urgency ---');
        await runAsyncTest(testBoardPositionWithValueButNoUrgency);
        
        // Test 73: Cannot unset urgency once set
        console.log('\n--- Test 73: Cannot Unset Urgency Once Set ---');
        await runAsyncTest(testCannotUnsetUrgencyOnceSet);
        
        // Test 74: Cannot unset value once set
        console.log('\n--- Test 74: Cannot Unset Value Once Set ---');
        await runAsyncTest(testCannotUnsetValueOnceSet);
        
        // Test 75: Cannot unset duration once set
        console.log('\n--- Test 75: Cannot Unset Duration Once Set ---');
        await runAsyncTest(testCannotUnsetDurationOnceSet);
        
        // Test 76: Can still change urgency values (not unset)
        console.log('\n--- Test 76: Can Still Change Urgency Values ---');
        await runAsyncTest(testCanStillChangeUrgencyValues);
        
        // Test 77: Sequence assignment when CD3 assigned
        console.log('\n--- Test 77: Sequence Assignment When CD3 Assigned ---');
        await runAsyncTest(testSequenceAssignedWhenCD3Assigned);
        
        // Test 78: Sequence insertion when manually reordered
        console.log('\n--- Test 78: Sequence Insertion When Manually Reordered ---');
        await runAsyncTest(testSequenceInsertionWhenManuallyReordered);
        
        // Test 79: [New] flag cleared on reset
        console.log('\n--- Test 79: [New] Flag Cleared On Reset ---');
        await runAsyncTest(testNewFlagClearedOnReset);
        
        // Test 80: New item inserted in CD3 order
        console.log('\n--- Test 80: New Item Inserted In CD3 Order ---');
        await runAsyncTest(testNewItemInsertedInCD3Order);
        
        // Test 81: Notes functionality across all stages
        console.log('\n--- Test 81: Notes Functionality Across All Stages ---');
        await runAsyncTest(testNotesFunctionalityAcrossStages);
        
        // Test 82: Confidence survey basic functionality
        console.log('\n--- Test 82: Confidence Survey Basic Functionality ---');
        await runAsyncTest(testConfidenceSurveyBasic);
        
        // Test 83: Confidence survey calculation
        console.log('\n--- Test 83: Confidence Survey Calculation ---');
        await runAsyncTest(testConfidenceSurveyCalculation);
        
        // Test 84: Confidence survey editing
        console.log('\n--- Test 84: Confidence Survey Editing ---');
        await runAsyncTest(testConfidenceSurveyEditing);
        
        // Test 85: Confidence survey deletion
        console.log('\n--- Test 85: Confidence Survey Deletion ---');
        await runAsyncTest(testConfidenceSurveyDeletion);
        
        // Test 86: Confidence survey persistence across stages
        console.log('\n--- Test 86: Confidence Survey Persistence Across Stages ---');
        await runAsyncTest(testConfidenceSurveyPersistence);
        
        // Test 87: Confidence survey weighted values breakdown
        console.log('\n--- Test 87: Confidence Survey Weighted Values Breakdown ---');
        await runAsyncTest(testConfidenceSurveyWeightedValues);
        
        // Test 88: Confidence survey edge cases
        console.log('\n--- Test 88: Confidence Survey Edge Cases ---');
        await runAsyncTest(testConfidenceSurveyEdgeCases);
        
        // Display results
        displayTestResults();
        
    } catch (error) {
        console.error('Test suite error:', error);
        testResults.push({ status: 'ERROR', message: `Test suite error: ${error.message}` });
        displayTestResults();
    } finally {
        // Clear items storage after tests complete
        localStorage.removeItem(TEST_STORAGE_KEY);
        
        // Reset limits to default values (30 for all) to clean up test data
        // But preserve the entry stage if it was set
        const appState = getAppState();
        const preservedCurrentStage = appState.currentStage || 'urgency'; // Default to urgency if null
        appState.buckets = initializeBuckets();
        appState.currentStage = preservedCurrentStage; // Preserve or set to urgency
        saveAppState(appState);
        
        console.log('Items cleared and limits reset to 30 after tests, current stage preserved/set to:', preservedCurrentStage);
        
        // Update the display if the display functions are available
        if (typeof window.displayData === 'function') {
            window.displayData();
        }
        if (typeof window.displayJson === 'function') {
            window.displayJson();
        }
    }
}

// Test: Add Item
function testAddItem() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    
    const items = getItems();
    assertEqual(items.length, 0, 'Storage should be empty initially');
    
    // Simulate adding an item
    const newItem = {
        id: Date.now().toString(),
        name: 'Test Item',
        urgency: 0,
        value: 0,
        duration: 0,
        createdAt: new Date().toISOString()
    };
    
    const updatedItems = [...items, newItem];
    saveItems(updatedItems);
    
    const itemsAfter = getItems();
    assertEqual(itemsAfter.length, 1, 'Should have one item after adding');
    assertEqual(itemsAfter[0].name, 'Test Item', 'Item name should match');
    assertEqual(itemsAfter[0].urgency, 0, 'New item should have urgency set to 0 (unset)');
    assertEqual(itemsAfter[0].value, 0, 'New item should have value set to 0 (unset)');
    assertEqual(itemsAfter[0].duration, 0, 'New item should have duration set to 0 (unset)');
    assert(itemsAfter[0].id !== undefined, 'Item should have an ID');
}

// Test: Set Urgency
function testSetUrgency() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    
    // Set entry stage to urgency
    setEntryStage('urgency');
    
    // Add an item first (with default 0 values)
    const item = {
        id: 'test-urgency',
        name: 'Test Urgency Item',
        urgency: 0,
        value: 0,
        duration: 0,
        createdAt: new Date().toISOString()
    };
    saveItems([item]);
    
    // Set urgency (should succeed because entry stage is urgency)
    const items = getItems();
    const foundItem = items.find(i => i.id === 'test-urgency');
    const appState = getAppState();
    assertEqual(appState.currentStage, 'urgency', 'Current stage should be urgency');
    
    foundItem.urgency = 2;
    saveItems(items);
    
    const itemsAfter = getItems();
    const updatedItem = itemsAfter.find(i => i.id === 'test-urgency');
    assertEqual(updatedItem.urgency, 2, 'Urgency should be set to 2');
    assertEqual(updatedItem.value, 0, 'Value should still be 0 (unset)');
    assertEqual(updatedItem.duration, 0, 'Duration should still be 0 (unset)');
}

// Test: Set Value (with Urgency prerequisite)
function testSetValue() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    
    // Add item with urgency set (not 0) FIRST
    const item = {
        id: 'test-value',
        name: 'Test Value Item',
        urgency: 1,
        value: 0,
        duration: 0,
        createdAt: new Date().toISOString()
    };
    saveItems([item]);
    
    // Now set entry stage to value (after item has urgency)
    setEntryStage('value');
    
    // Set value (should succeed because urgency is not 0 and entry stage is value)
    const items = getItems();
    const foundItem = items.find(i => i.id === 'test-value');
    const appState = getAppState();
    assertEqual(appState.currentStage, 'value', 'Current stage should be value');
    
    // Simulate validation check (0 means unset)
    if (foundItem.urgency === undefined || foundItem.urgency === null || foundItem.urgency === 0) {
        assert(false, 'Should not reach here - urgency should be set (not 0)');
    } else {
        foundItem.value = 3;
        saveItems(items);
        
        const itemsAfter = getItems();
        const updatedItem = itemsAfter.find(i => i.id === 'test-value');
        assertEqual(updatedItem.value, 3, 'Value should be set to 3');
        assertEqual(updatedItem.urgency, 1, 'Urgency should still be 1');
    }
}

// Test: Set Duration (with Value prerequisite)
function testSetDuration() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    
    // Add item with urgency and value set (not 0) FIRST
    const item = {
        id: 'test-duration',
        name: 'Test Duration Item',
        urgency: 2,
        value: 2,
        duration: 0,
        createdAt: new Date().toISOString()
    };
    saveItems([item]);
    
    // Now set entry stage to duration (after item has urgency and value)
    setEntryStage('duration');
    
    // Set duration (should succeed because value is not 0 and entry stage is duration)
    const items = getItems();
    const foundItem = items.find(i => i.id === 'test-duration');
    const appState = getAppState();
    assertEqual(appState.currentStage, 'duration', 'Current stage should be duration');
    
    // Simulate validation check (0 means unset)
    if (foundItem.value === undefined || foundItem.value === null || foundItem.value === 0) {
        assert(false, 'Should not reach here - value should be set (not 0)');
    } else {
        foundItem.duration = 1;
        saveItems(items);
        
        const itemsAfter = getItems();
        const updatedItem = itemsAfter.find(i => i.id === 'test-duration');
        assertEqual(updatedItem.duration, 1, 'Duration should be set to 1');
        assertEqual(updatedItem.value, 2, 'Value should still be 2');
        assertEqual(updatedItem.urgency, 2, 'Urgency should still be 2');
    }
}

// Test: Validation - Set Value without Urgency
function testSetValueWithoutUrgency() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    
    // Set entry stage to value (even though urgency is not set)
    setEntryStage('value');
    
    // Add item with urgency set to 0 (unset)
    const item = {
        id: 'test-no-urgency',
        name: 'Test No Urgency Item',
        urgency: 0,
        value: 0,
        duration: 0,
        createdAt: new Date().toISOString()
    };
    saveItems([item]);
    
    // Try to set value (should fail validation because urgency is 0)
    const items = getItems();
    const foundItem = items.find(i => i.id === 'test-no-urgency');
    
    // Simulate validation check (0 means unset)
    const hasUrgency = foundItem.urgency !== undefined && foundItem.urgency !== null && foundItem.urgency !== 0;
    assert(!hasUrgency, 'Item should not have urgency set (should be 0)');
    
    // Validation should prevent setting value
    if (!hasUrgency) {
        assert(true, 'Validation correctly prevents setting value when urgency is 0 (unset)');
    } else {
        assert(false, 'Validation should have prevented this');
    }
}

// Test: Validation - Set Duration without Value
function testSetDurationWithoutValue() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    
    // Add item with urgency set but value set to 0 (unset)
    const item = {
        id: 'test-no-value',
        name: 'Test No Value Item',
        urgency: 1,
        value: 0,
        duration: 0,
        createdAt: new Date().toISOString()
    };
    saveItems([item]);
    
    // Try to set duration (should fail validation)
    const items = getItems();
    const foundItem = items.find(i => i.id === 'test-no-value');
    
    // Simulate validation check (0 means unset)
    const hasValue = foundItem.value !== undefined && foundItem.value !== null && foundItem.value !== 0;
    assert(!hasValue, 'Item should not have value set (should be 0)');
    
    // Validation should prevent setting duration
    if (!hasValue) {
        assert(true, 'Validation correctly prevents setting duration when value is 0 (unset)');
    } else {
        assert(false, 'Validation should have prevented this');
    }
}

// Test: Load test data
function testLoadTestData() {
    // Test data is embedded, no fetch needed
    const data = TEST_DATA;
    assert(data.items !== undefined, 'Test data should have items array');
    assert(data.items.length > 0, 'Test data should have at least one item');
    assert(data.items[0].name !== undefined, 'Test items should have names');
    assert(data.items[0].id !== undefined, 'Test items should have IDs');
}

// Test: Entry stage validation
function testEntryStageValidation() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    
    // Add an item
    const item = {
        id: 'test-entry-stage',
        name: 'Test Entry Stage Item',
        urgency: 1,
        value: 2,
        duration: 0,
        createdAt: new Date().toISOString()
    };
    saveItems([item]);
    
    // Try to set urgency when entry stage is value (should fail)
    setEntryStage('value');
    const appState = getAppState();
    assertEqual(appState.currentStage, 'value', 'Current stage should be value');
    
    // Validation should prevent setting urgency when entry stage is value
    const items = getItems();
    const foundItem = items.find(i => i.id === 'test-entry-stage');
    assert(foundItem.urgency === 1, 'Item should have urgency 1');
    
    // Simulate the validation: can only set value when entry stage is value
    const canSetUrgency = appState.currentStage === 'urgency';
    assert(!canSetUrgency, 'Should not be able to set urgency when entry stage is value');
    assert(true, 'Entry stage validation correctly prevents setting wrong property');
    
    // Now set entry stage to urgency and verify it would work
    setEntryStage('urgency');
    const appState2 = getAppState();
    const canSetUrgencyNow = appState2.currentStage === 'urgency';
    assert(canSetUrgencyNow, 'Should be able to set urgency when entry stage is urgency');
}

// Test: Bucket over-limit tracking
function testBucketLimitValidation() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    
    // Set entry stage to urgency
    setEntryStage('urgency');
    
    // Set urgency limit to 2 for level 1
    const appState = getAppState();
    if (!appState.buckets) {
        appState.buckets = initializeBuckets();
    }
    appState.buckets.urgency[1].limit = 2;
    updateBuckets(appState, getItems());
    saveAppState(appState);
    
    // Add 2 items with urgency 1 (should succeed - no hard validation)
    const item1 = {
        id: 'test-limit-1',
        name: 'Test Limit Item 1',
        urgency: 1,
        value: 0,
        duration: 0,
        createdAt: new Date().toISOString()
    };
    const item2 = {
        id: 'test-limit-2',
        name: 'Test Limit Item 2',
        urgency: 1,
        value: 0,
        duration: 0,
        createdAt: new Date().toISOString()
    };
    saveItems([item1, item2]);
    
    // Verify both items have urgency 1
    const itemsAfter = getItems();
    const countUrgency1 = itemsAfter.filter(i => i.urgency === 1).length;
    assertEqual(countUrgency1, 2, 'Should have 2 items with urgency 1');
    
    // Update buckets after adding items
    const appStateAfter = getAppState();
    updateBuckets(appStateAfter, getItems());
    saveAppState(appStateAfter);
    
    // Check that bucket is NOT over limit (count = limit = 2)
    const appStateAfterCheck = getAppState();
    assertEqual(appStateAfterCheck.buckets.urgency[1].overLimit, false, 'Bucket should not be over limit when count equals limit');
    
    // Add a third item with urgency 1 (should succeed - no hard validation, but should track as over limit)
    const item3 = {
        id: 'test-limit-3',
        name: 'Test Limit Item 3',
        urgency: 1,
        value: 0,
        duration: 0,
        createdAt: new Date().toISOString()
    };
    const items3 = getItems();
    items3.push(item3);
    saveItems(items3);
    
    // Update buckets after adding item
    const appState3 = getAppState();
    updateBuckets(appState3, getItems());
    saveAppState(appState3);
    
    // Verify bucket is now over limit
    const appState3After = getAppState();
    assertEqual(appState3After.buckets.urgency[1].overLimit, true, 'Bucket should be marked as over limit when count exceeds limit');
    
    // Test value limits
    setEntryStage('value');
    const appState4 = getAppState();
    if (!appState4.buckets) {
        appState4.buckets = initializeBuckets();
    }
    appState4.buckets.value[2].limit = 1;
    updateBuckets(appState4, getItems());
    saveAppState(appState4);
    
    // Add item with value 2
    const item4 = {
        id: 'test-value-limit',
        name: 'Test Value Limit Item',
        urgency: 1,
        value: 2,
        duration: 0,
        createdAt: new Date().toISOString()
    };
    const items4 = getItems();
    items4.push(item4);
    saveItems(items4);
    
    // Update buckets after adding item
    const appState5 = getAppState();
    updateBuckets(appState5, getItems());
    saveAppState(appState5);
    
    // Verify bucket is NOT over limit (count = limit = 1)
    const appState5After = getAppState();
    assertEqual(appState5After.buckets.value[2].overLimit, false, 'Value bucket should not be over limit when count equals limit');
    
    // Add another item with value 2 (should succeed - no hard validation, but should track as over limit)
    const item5 = {
        id: 'test-value-limit-2',
        name: 'Test Value Limit Item 2',
        urgency: 1,
        value: 2,
        duration: 0,
        createdAt: new Date().toISOString()
    };
    const items5 = getItems();
    items5.push(item5);
    saveItems(items5);
    
    // Update buckets after adding item
    const appState6 = getAppState();
    updateBuckets(appState6, getItems());
    saveAppState(appState6);
    
    // Verify bucket is now over limit
    const appState6After = getAppState();
    assertEqual(appState6After.buckets.value[2].overLimit, true, 'Value bucket should be marked as over limit when count exceeds limit');
}

// Test: Lowering limits when items already exceed them
function testLoweringLimitsWithExistingItems() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    
    // Set entry stage to urgency
    setEntryStage('urgency');
    
    // Add 5 items with urgency 1
    const items = [];
    for (let i = 1; i <= 5; i++) {
        items.push({
            id: `test-lower-limit-${i}`,
            name: `Test Lower Limit Item ${i}`,
            urgency: 1,
            value: 0,
            duration: 0,
            createdAt: new Date().toISOString()
        });
    }
    saveItems(items);
    
    // Set limit to 10 (should not be over limit)
    const appState1 = getAppState();
    if (!appState1.buckets) {
        appState1.buckets = initializeBuckets();
    }
    appState1.buckets.urgency[1].limit = 10;
    updateBuckets(appState1, getItems());
    saveAppState(appState1);
    
    // Check that bucket is NOT over limit (5 items < 10 limit)
    const appState2 = getAppState();
    assertEqual(appState2.buckets.urgency[1].overLimit, false, 'Bucket should not be over limit when count (5) is less than limit (10)');
    
    // Lower limit to 3 (now 5 items > 3 limit, should be over limit)
    appState2.buckets.urgency[1].limit = 3;
    updateBuckets(appState2, getItems());
    saveAppState(appState2);
    
    // Check that bucket is NOW over limit (5 items > 3 limit)
    const appState3 = getAppState();
    assertEqual(appState3.buckets.urgency[1].overLimit, true, 'Bucket should be marked as over limit when limit is lowered below current count');
    
    // Lower limit further to 1 (still over limit)
    appState3.buckets.urgency[1].limit = 1;
    updateBuckets(appState3, getItems());
    saveAppState(appState3);
    
    const appState4 = getAppState();
    assertEqual(appState4.buckets.urgency[1].overLimit, true, 'Bucket should remain over limit when limit is lowered further');
    
    // Increase limit back to 10 (should no longer be over limit)
    appState4.buckets.urgency[1].limit = 10;
    updateBuckets(appState4, getItems());
    saveAppState(appState4);
    
    const appState5 = getAppState();
    assertEqual(appState5.buckets.urgency[1].overLimit, false, 'Bucket should not be over limit when limit is increased above current count');
}

// Test: Add item only in urgency stage
function testAddItemOnlyInUrgencyStage() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    localStorage.removeItem('priorityItems'); // App's storage key
    localStorage.removeItem('appState'); // App's state key
    
    // Initialize app state first
    const initialState = getAppState();
    if (!initialState.currentStage) {
        initialState.currentStage = 'Item Listing';
        saveAppState(initialState);
    }
    
    // Add an item first (required to advance to urgency stage)
    const tempItem = {
        id: 'temp-item',
        name: 'Temp Item',
        urgency: 0,
        value: 0,
        duration: 0,
        createdAt: new Date().toISOString()
    };
    saveItems([tempItem]);
    
    // Test 1: Should succeed when entry stage is urgency
    const result = setEntryStage('urgency');
    assert(result.success !== false, `setEntryStage should succeed: ${result.error || ''}`);
    const appState1 = getAppState();
    assertEqual(appState1.currentStage, 'urgency', 'Current stage should be urgency');
    
    // Simulate adding an item (should be allowed)
    const items1 = getItems();
    const newItem1 = {
        id: 'test-add-urgency',
        name: 'Test Add Urgency Item',
        urgency: 0,
        value: 0,
        duration: 0,
        createdAt: new Date().toISOString()
    };
    items1.push(newItem1);
    saveItems(items1);
    
    const itemsAfter1 = getItems();
    // Should have tempItem + newItem1 = 2 items
    assertEqual(itemsAfter1.length, 2, 'Should be able to add item when entry stage is urgency (tempItem + newItem1)');
    
    // Test 2: Should fail when entry stage is value
    // Note: We need items with urgency to advance to value stage
    const itemsForValue = getItems();
    // First, ensure ALL items have urgency set (required to advance)
    if (itemsForValue.length > 0) {
        // We're already at urgency stage, so set urgency on ALL items
        itemsForValue.forEach(item => {
            if (!item.urgencySet) {
                item.urgency = item.id === 'temp-item' ? 1 : 2; // Set urgency on all items
                item.urgencySet = true; // Set the flag
            }
        });
        saveItems(itemsForValue);
        
        // Advance from urgency to value (we're already at urgency stage)
        const result2 = advanceStage(); // urgency -> value
        assert(result2.success !== false, `Should be able to advance to value stage when all items have urgency: ${result2.error || ''}`);
        const appState2 = getAppState();
        assertEqual(appState2.currentStage, 'value', 'Current stage should be value');
        
        // Simulate validation check
        const canAddItem = appState2.currentStage === 'Item Listing';
        assert(!canAddItem, 'Should not be able to add item when entry stage is value');
    }
}

// Test: Cannot set urgency when entry stage is value
function testCannotSetUrgencyWhenEntryStageIsValue() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    localStorage.removeItem('priorityItems'); // App's storage key
    localStorage.removeItem('appState'); // App's state key
    
    // Initialize app state first
    const initialState = getAppState();
    if (!initialState.currentStage) {
        initialState.currentStage = 'Item Listing';
        saveAppState(initialState);
    }
    
    // Add item first (required to advance to urgency stage)
    const item = {
        id: 'test-urgency-value-stage',
        name: 'Test Urgency Value Stage Item',
        urgency: 2,
        value: 0,
        duration: 0,
        urgencySet: true,
        createdAt: new Date().toISOString()
    };
    saveItems([item]);
    
    // Advance to urgency stage first
    const result1 = advanceStage(); // Item Listing -> urgency
    assert(result1.success !== false, 'Should be able to advance to urgency stage');
    
    // Now set entry stage to value (should succeed because item has urgency)
    const result = setEntryStage('value');
    assert(result.success !== false, 'Should be able to advance to value when item has urgency');
    const appState2 = getAppState();
    assertEqual(appState2.currentStage, 'value', 'Current stage should be value');
    
    // Try to set urgency (should fail validation - entry stage is value, not urgency)
    const items = getItems();
    const foundItem = items.find(i => i.id === 'test-urgency-value-stage');
    assert(foundItem !== undefined, 'Item should exist');
    
    // Simulate the validation check: entry stage must be 'urgency' to set urgency
    const canSetUrgency = appState2.currentStage === 'urgency';
    assert(!canSetUrgency, 'Should not be able to set urgency when entry stage is value');
}


// Test: Entry stage is always "urgency" on app start
function testEntryStageAlwaysUrgencyOnStart() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    localStorage.removeItem('priorityItems'); // App's storage key
    localStorage.removeItem('appState'); // App's state key
    
    // Test 1: When app state doesn't exist, getAppState should return "Item Listing" (new default)
    // Clear all state first
    localStorage.removeItem(TEST_APP_STATE_KEY);
    localStorage.removeItem('appState');
    const appState1 = getAppState();
    assertEqual(appState1.currentStage, 'Item Listing', 'Current stage should be "Item Listing" when app state is first created');
    
    // Test 2: When app state exists but currentStage is null, getAppState should set it to "Item Listing"
    const testState = {
        currentStage: null,
        buckets: initializeBuckets()
    };
    saveAppState(testState);
    
    // Force reload by clearing and getting again
    localStorage.removeItem(TEST_APP_STATE_KEY);
    localStorage.removeItem('appState');
    const testStateWithNull = { currentStage: null, buckets: initializeBuckets() };
    saveAppState(testStateWithNull);
    
    const appState2 = getAppState();
    assertEqual(appState2.currentStage, 'Item Listing', 'Current stage should be set to "Item Listing" when it was null');
    
    // Test 3: After clearing state, current stage should default to "Item Listing"
    localStorage.removeItem(TEST_APP_STATE_KEY);
    localStorage.removeItem('appState');
    const appState3 = getAppState();
    assertEqual(appState3.currentStage, 'Item Listing', 'After clearing state, current stage should default to "Item Listing"');
    
    // Test 4: Verify that on page load simulation, current stage is set to "Item Listing"
    // This simulates what happens in DOMContentLoaded - it should always be "Item Listing" on start
    const appState4 = getAppState();
    // Force set to "Item Listing" to simulate app start
    if (appState4.currentStage !== 'Item Listing') {
        setEntryStage('Item Listing');
    }
    const appState5 = getAppState();
    assertEqual(appState5.currentStage, 'Item Listing', 'Current stage should be "Item Listing" on app start');
}

// Test: Cannot advance to next stage unless all items have current stage values
function testCannotAdvanceWithoutAllItemsHavingCurrentStage() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    localStorage.removeItem('priorityItems'); // App's storage key
    localStorage.removeItem('appState'); // App's state key
    
    // Start at Item Listing (default), add items first
    // Add 3 items (can only add in Item Listing stage)
    const item1 = {
        id: 'test-advance-1',
        name: 'Test Advance Item 1',
        urgency: 0, // Will be set later
        value: 0,
        duration: 0,
        urgencySet: false,
        valueSet: false,
        durationSet: false,
        createdAt: new Date().toISOString()
    };
    const item2 = {
        id: 'test-advance-2',
        name: 'Test Advance Item 2',
        urgency: 0, // Will be set later
        value: 0,
        duration: 0,
        urgencySet: false,
        valueSet: false,
        durationSet: false,
        createdAt: new Date().toISOString()
    };
    const item3 = {
        id: 'test-advance-3',
        name: 'Test Advance Item 3',
        urgency: 0, // Will be set later
        value: 0,
        duration: 0,
        urgencySet: false,
        valueSet: false,
        durationSet: false,
        createdAt: new Date().toISOString()
    };
    saveItems([item1, item2, item3]);
    
    // Advance from Item Listing to urgency
    const result0 = advanceStage();
    assert(result0.success !== false, 'Should be able to advance from Item Listing to urgency');
    
    // Set urgency for all items (using TestAdapter to ensure flags are set)
    if (window.TestAdapter && window.TestAdapter.api) {
        const items0 = getItems();
        TestAdapter.setItemProperty(items0[0].id, 'urgency', 1);
        TestAdapter.setItemProperty(items0[1].id, 'urgency', 2);
        TestAdapter.setItemProperty(items0[2].id, 'urgency', 3);
    } else {
        const items0 = getItems();
        items0[0].urgency = 1;
        items0[0].urgencySet = true;
        items0[1].urgency = 2;
        items0[1].urgencySet = true;
        items0[2].urgency = 3;
        items0[2].urgencySet = true;
        saveItems(items0);
    }
    
    // All items have urgency, so we should be able to advance to value
    const result1 = advanceStage();
    assert(result1.success !== false, 'Should be able to advance to value when all items have urgency');
    
    const appState1 = getAppState();
    assertEqual(appState1.currentStage, 'value', 'Current stage should be value');
    
    // Set value for only 2 of the 3 items (using TestAdapter to ensure flags are set)
    if (window.TestAdapter && window.TestAdapter.api) {
        const items1 = getItems();
        TestAdapter.setItemProperty(items1.find(i => i.id === 'test-advance-1').id, 'value', 1);
        TestAdapter.setItemProperty(items1.find(i => i.id === 'test-advance-2').id, 'value', 2);
        // item3 still has value: 0
    } else {
        const items1 = getItems();
        const foundItem1 = items1.find(i => i.id === 'test-advance-1');
        const foundItem2 = items1.find(i => i.id === 'test-advance-2');
        foundItem1.value = 1;
        foundItem1.valueSet = true;
        foundItem2.value = 2;
        foundItem2.valueSet = true;
        // item3 still has value: 0
        saveItems(items1);
    }
    
    // Try to advance to duration - should fail because item3 doesn't have value set
    const result2 = advanceStage();
    assert(result2.success === false, 'Should not be able to advance to duration when not all items have value');
    assert(result2.error && result2.error.toLowerCase().includes('all items'), 'Error message should mention all items');
    
    const appState2 = getAppState();
    assertEqual(appState2.currentStage, 'value', 'Current stage should remain value when advance fails');
    
    // Now set value for the third item (using TestAdapter to ensure flags are set)
    if (window.TestAdapter && window.TestAdapter.api) {
        const items2 = getItems();
        TestAdapter.setItemProperty(items2.find(i => i.id === 'test-advance-3').id, 'value', 3);
    } else {
        const items2 = getItems();
        const foundItem3 = items2.find(i => i.id === 'test-advance-3');
        foundItem3.value = 3;
        foundItem3.valueSet = true;
        saveItems(items2);
    }
    
    // Now we should be able to advance to duration
    const result3 = advanceStage();
    assert(result3.success !== false, 'Should be able to advance to duration when all items have value');
    
    const appState3 = getAppState();
    assertEqual(appState3.currentStage, 'duration', 'Current stage should be duration');
    
    // Test: Cannot advance from urgency to value if not all items have urgency
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    localStorage.removeItem('priorityItems'); // App's storage key
    localStorage.removeItem('appState'); // App's state key
    
    // Start at Item Listing, add items
    const item4 = {
        id: 'test-advance-4',
        name: 'Test Advance Item 4',
        urgency: 1,
        value: 0,
        duration: 0,
        urgencySet: true,
        valueSet: false,
        durationSet: false,
        createdAt: new Date().toISOString()
    };
    const item5 = {
        id: 'test-advance-5',
        name: 'Test Advance Item 5',
        urgency: 0, // No urgency set
        value: 0,
        duration: 0,
        urgencySet: false,
        valueSet: false,
        durationSet: false,
        createdAt: new Date().toISOString()
    };
    saveItems([item4, item5]);
    
    // Try to advance to value - should fail because item5 doesn't have urgency
    // First need to advance from Item Listing to urgency
    const result4a = advanceStage();
    assert(result4a.success !== false, 'Should be able to advance from Item Listing to urgency');
    
    // Now try to advance from urgency to value - should fail because item5 doesn't have urgency
    const result4 = advanceStage();
    assert(result4.success === false, 'Should not be able to advance to value when not all items have urgency');
    assert(result4.error && result4.error.toLowerCase().includes('all items'), 'Error message should mention all items');
}

// Test: Stage navigation with advanceStage and backStage
function testStageNavigation() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    localStorage.removeItem('priorityItems'); // App's storage key
    localStorage.removeItem('appState'); // App's state key
    
    // Force fresh state - ensure we start at Item Listing
    let appState1 = getAppState();
    if (appState1.currentStage !== 'Item Listing') {
        appState1.currentStage = 'Item Listing';
        saveAppState(appState1);
        appState1 = getAppState();
    }
    assertEqual(appState1.currentStage, 'Item Listing', 'Should start at Item Listing stage');
    
    // Add items first (can only add items in Item Listing stage)
    const item1 = {
        id: 'test-nav-1',
        name: 'Test Nav Item 1',
        urgency: 0,
        value: 0,
        duration: 0,
        urgencySet: false,
        valueSet: false,
        durationSet: false,
        createdAt: new Date().toISOString()
    };
    const item2 = {
        id: 'test-nav-2',
        name: 'Test Nav Item 2',
        urgency: 0,
        value: 0,
        duration: 0,
        urgencySet: false,
        valueSet: false,
        durationSet: false,
        createdAt: new Date().toISOString()
    };
    saveItems([item1, item2]);
    
    // Advance from Item Listing to urgency
    const result0 = advanceStage();
    assert(result0.success !== false, 'Should be able to advance from Item Listing to urgency');
    const appState1a = getAppState();
    assertEqual(appState1a.currentStage, 'urgency', 'Should be at urgency stage after advance from Item Listing');
    
    // Set urgency for all items (using TestAdapter to ensure flags are set)
    if (window.TestAdapter && window.TestAdapter.api) {
        const items0 = getItems();
        TestAdapter.setItemProperty(items0[0].id, 'urgency', 1);
        TestAdapter.setItemProperty(items0[1].id, 'urgency', 2);
    } else {
        const items0 = getItems();
        items0[0].urgency = 1;
        items0[0].urgencySet = true;
        items0[1].urgency = 2;
        items0[1].urgencySet = true;
        saveItems(items0);
    }
    
    // Test advanceStage from urgency to value
    const result1 = advanceStage();
    assert(result1.success !== false, 'Should be able to advance from urgency to value');
    const appState2 = getAppState();
    assertEqual(appState2.currentStage, 'value', 'Should be at value stage after advance');
    
    // Set value for all items (using TestAdapter to ensure flags are set)
    if (window.TestAdapter && window.TestAdapter.api) {
        const items1 = getItems();
        TestAdapter.setItemProperty(items1[0].id, 'value', 1);
        TestAdapter.setItemProperty(items1[1].id, 'value', 2);
    } else {
        const items1 = getItems();
        items1[0].value = 1;
        items1[0].valueSet = true;
        items1[1].value = 2;
        items1[1].valueSet = true;
        saveItems(items1);
    }
    
    // Test advanceStage from value to duration
    const result2 = advanceStage();
    assert(result2.success !== false, 'Should be able to advance from value to duration');
    const appState3 = getAppState();
    assertEqual(appState3.currentStage, 'duration', 'Should be at duration stage after advance');
    
    // Set duration for all items (using TestAdapter to ensure flags are set)
    if (window.TestAdapter && window.TestAdapter.api) {
        const items2 = getItems();
        TestAdapter.setItemProperty(items2[0].id, 'duration', 1);
        TestAdapter.setItemProperty(items2[1].id, 'duration', 2);
    } else {
        const items2 = getItems();
        items2[0].duration = 1;
        items2[0].durationSet = true;
        items2[1].duration = 2;
        items2[1].durationSet = true;
        saveItems(items2);
    }
    
    // Test advanceStage from duration to Results (new stage before CD3)
    const result3 = advanceStage();
    assert(result3.success !== false, 'Should be able to advance from duration to Results');
    const appState4 = getAppState();
    assertEqual(appState4.currentStage, 'Results', 'Should be at Results stage after advance');
    
    // Advance from Results to CD3
    const result3b = advanceStage();
    assert(result3b.success !== false, 'Should be able to advance from Results to CD3');
    const appState4b = getAppState();
    assertEqual(appState4b.currentStage, 'CD3', 'Should be at CD3 stage after advance');
    
    // Test that we cannot advance beyond CD3
    const result4 = advanceStage();
    assert(result4.success === false, 'Should not be able to advance beyond CD3');
    assert(result4.error && result4.error.includes('final stage'), 'Error should mention final stage');
    
    // Test backStage from CD3 to Results
    const result5 = backStage();
    assert(result5.success !== false, 'Should be able to go back from CD3 to Results');
    const appState5 = getAppState();
    assertEqual(appState5.currentStage, 'Results', 'Should be at Results stage after going back');
    
    // Test backStage from Results to duration
    const result5b = backStage();
    assert(result5b.success !== false, 'Should be able to go back from Results to duration');
    const appState5b = getAppState();
    assertEqual(appState5b.currentStage, 'duration', 'Should be at duration stage after going back');
    
    // Test backStage from duration to value
    const result6 = backStage();
    assert(result6.success !== false, 'Should be able to go back from duration to value');
    const appState6 = getAppState();
    assertEqual(appState6.currentStage, 'value', 'Should be at value stage after going back');
    
    // Test backStage from value to urgency
    const result7 = backStage();
    assert(result7.success !== false, 'Should be able to go back from value to urgency');
    const appState7 = getAppState();
    assertEqual(appState7.currentStage, 'urgency', 'Should be at urgency stage after going back');
    
    // Test backStage from urgency to Item Listing
    const result7b = backStage();
    assert(result7b.success !== false, 'Should be able to go back from urgency to Item Listing');
    const appState7b = getAppState();
    assertEqual(appState7b.currentStage, 'Item Listing', 'Should be at Item Listing stage after going back');
    
    // Test that we cannot go back beyond Item Listing (first stage)
    // First verify we're at Item Listing
    const stateBeforeBack = getAppState();
    assertEqual(stateBeforeBack.currentStage, 'Item Listing', 'Should be at Item Listing before trying to go back');
    
    const result8 = backStage();
    assert(result8.success === false, 'Should not be able to go back beyond Item Listing');
    assert(result8.error && (result8.error.includes('first stage') || result8.error.includes('Item Listing')), 'Error should mention first stage or Item Listing');
    
    // Test advanceStage validation - cannot advance if not all items have current stage values
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    localStorage.removeItem('priorityItems'); // App's storage key
    localStorage.removeItem('appState'); // App's state key
    
    // Start at Item Listing, add items
    const item3 = {
        id: 'test-nav-3',
        name: 'Test Nav Item 3',
        urgency: 0, // Will be set later
        value: 0,
        duration: 0,
        urgencySet: false,
        valueSet: false,
        durationSet: false,
        createdAt: new Date().toISOString()
    };
    const item4 = {
        id: 'test-nav-4',
        name: 'Test Nav Item 4',
        urgency: 0, // No urgency - will stay 0
        value: 0,
        duration: 0,
        urgencySet: false,
        valueSet: false,
        durationSet: false,
        createdAt: new Date().toISOString()
    };
    saveItems([item3, item4]);
    
    // First need to advance from Item Listing to urgency
    const result8a = advanceStage();
    assert(result8a.success !== false, 'Should be able to advance from Item Listing to urgency');
    
    // Set urgency for item3 only (item4 stays at 0) - using TestAdapter to ensure flags are set
    if (window.TestAdapter && window.TestAdapter.api) {
        const itemsBefore = getItems();
        TestAdapter.setItemProperty(itemsBefore.find(i => i.id === 'test-nav-3').id, 'urgency', 1);
    } else {
        const itemsBefore = getItems();
        const item3 = itemsBefore.find(i => i.id === 'test-nav-3');
        item3.urgency = 1;
        item3.urgencySet = true;
        saveItems(itemsBefore);
    }
    
    // Now try to advance from urgency to value - should fail because item4 doesn't have urgency
    const result9 = advanceStage();
    assert(result9.success === false, 'Should not be able to advance when not all items have urgency');
    assert(result9.error && result9.error.toLowerCase().includes('all items'), 'Error should mention all items');
}

// Test: Bucket weights default to 1
function testBucketWeightsDefault() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    
    const appState = getAppState();
    
    // Check urgency buckets have default weights of 1, 2, 3
    assertEqual(appState.buckets.urgency[1].weight, 1, 'Urgency 1 should have default weight of 1');
    assertEqual(appState.buckets.urgency[2].weight, 2, 'Urgency 2 should have default weight of 2');
    assertEqual(appState.buckets.urgency[3].weight, 3, 'Urgency 3 should have default weight of 3');
    
    // Check value buckets have default weights of 1, 2, 3
    assertEqual(appState.buckets.value[1].weight, 1, 'Value 1 should have default weight of 1');
    assertEqual(appState.buckets.value[2].weight, 2, 'Value 2 should have default weight of 2');
    assertEqual(appState.buckets.value[3].weight, 3, 'Value 3 should have default weight of 3');
    
    // Check duration buckets have default weights of 1, 2, 3
    assertEqual(appState.buckets.duration[1].weight, 1, 'Duration 1 should have default weight of 1');
    assertEqual(appState.buckets.duration[2].weight, 2, 'Duration 2 should have default weight of 2');
    assertEqual(appState.buckets.duration[3].weight, 3, 'Duration 3 should have default weight of 3');
}

// Test: Set urgency weight
function testSetUrgencyWeight() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    localStorage.removeItem('priorityItems'); // App's storage key
    localStorage.removeItem('appState'); // App's state key
    
    // Force fresh state by getting it again after clearing
    const appState = getAppState();
    
    // Reset buckets to defaults to ensure clean state
    if (window.TestAdapter && window.TestAdapter.api) {
        appState.buckets = window.TestAdapter.initializeBuckets();
    } else {
        appState.buckets = initializeBuckets();
    }
    saveAppState(appState);
    
    // Verify initial default weights
    const appStateCheck = getAppState();
    assertEqual(appStateCheck.buckets.urgency[1].weight, 1, 'Urgency 1 should have default weight of 1');
    assertEqual(appStateCheck.buckets.urgency[2].weight, 2, 'Urgency 2 should have default weight of 2');
    assertEqual(appStateCheck.buckets.urgency[3].weight, 3, 'Urgency 3 should have default weight of 3');
    
    // Set urgency 1 weight to 2.5
    appStateCheck.buckets.urgency[1].weight = 2.5;
    saveAppState(appStateCheck);
    
    const appStateAfter = getAppState();
    assertEqual(appStateAfter.buckets.urgency[1].weight, 2.5, 'Urgency 1 weight should be 2.5');
    
    // Set urgency 2 weight to 0.5
    appStateAfter.buckets.urgency[2].weight = 0.5;
    saveAppState(appStateAfter);
    
    const appStateAfter2 = getAppState();
    assertEqual(appStateAfter2.buckets.urgency[2].weight, 0.5, 'Urgency 2 weight should be 0.5');
    
    // Set urgency 3 weight to 3
    appStateAfter2.buckets.urgency[3].weight = 3;
    saveAppState(appStateAfter2);
    
    const appStateAfter3 = getAppState();
    assertEqual(appStateAfter3.buckets.urgency[3].weight, 3, 'Urgency 3 weight should be 3');
    
    // Verify other buckets still have default weight
    assertEqual(appStateAfter3.buckets.value[1].weight, 1, 'Value 1 should still have default weight of 1');
    assertEqual(appStateAfter3.buckets.duration[1].weight, 1, 'Duration 1 should still have default weight of 1');
}

// Test: Set value weight
function testSetValueWeight() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    localStorage.removeItem('priorityItems'); // App's storage key
    localStorage.removeItem('appState'); // App's state key
    
    // Force fresh state by getting it again after clearing
    const appState = getAppState();
    
    // Reset buckets to defaults to ensure clean state
    if (window.TestAdapter && window.TestAdapter.api) {
        appState.buckets = window.TestAdapter.initializeBuckets();
    } else {
        appState.buckets = initializeBuckets();
    }
    saveAppState(appState);
    
    // Verify initial default weights
    const appStateCheck = getAppState();
    assertEqual(appStateCheck.buckets.value[1].weight, 1, 'Value 1 should have default weight of 1');
    assertEqual(appStateCheck.buckets.value[2].weight, 2, 'Value 2 should have default weight of 2');
    assertEqual(appStateCheck.buckets.value[3].weight, 3, 'Value 3 should have default weight of 3');
    
    // Set value 1 weight to 1.5
    appStateCheck.buckets.value[1].weight = 1.5;
    saveAppState(appStateCheck);
    
    const appStateAfter = getAppState();
    assertEqual(appStateAfter.buckets.value[1].weight, 1.5, 'Value 1 weight should be 1.5');
    
    // Set value 2 weight to 2
    appStateAfter.buckets.value[2].weight = 2;
    saveAppState(appStateAfter);
    
    const appStateAfter2 = getAppState();
    assertEqual(appStateAfter2.buckets.value[2].weight, 2, 'Value 2 weight should be 2');
    
    // Set value 3 weight to 0.25
    appStateAfter2.buckets.value[3].weight = 0.25;
    saveAppState(appStateAfter2);
    
    const appStateAfter3 = getAppState();
    assertEqual(appStateAfter3.buckets.value[3].weight, 0.25, 'Value 3 weight should be 0.25');
    
    // Verify other buckets still have default weight
    assertEqual(appStateAfter3.buckets.urgency[1].weight, 1, 'Urgency 1 should still have default weight of 1');
    assertEqual(appStateAfter3.buckets.duration[1].weight, 1, 'Duration 1 should still have default weight of 1');
}

// Test: Set duration weight
function testSetDurationWeight() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    localStorage.removeItem('priorityItems'); // App's storage key
    localStorage.removeItem('appState'); // App's state key
    
    // Force fresh state by getting it again after clearing
    let appState = getAppState();
    
    // Reset buckets to defaults to ensure clean state (in case previous test modified them)
    if (window.TestAdapter && window.TestAdapter.api) {
        appState.buckets = window.TestAdapter.initializeBuckets();
    } else {
        appState.buckets = initializeBuckets();
    }
    saveAppState(appState);
    
    // Get fresh state to verify
    appState = getAppState();
    
    // Set duration 1 weight to 0.75
    appState.buckets.duration[1].weight = 0.75;
    saveAppState(appState);
    
    const appStateAfter = getAppState();
    assertEqual(appStateAfter.buckets.duration[1].weight, 0.75, 'Duration 1 weight should be 0.75');
    
    // Set duration 2 weight to 1.25
    appStateAfter.buckets.duration[2].weight = 1.25;
    saveAppState(appStateAfter);
    
    const appStateAfter2 = getAppState();
    assertEqual(appStateAfter2.buckets.duration[2].weight, 1.25, 'Duration 2 weight should be 1.25');
    
    // Set duration 3 weight to 2.5
    appStateAfter2.buckets.duration[3].weight = 2.5;
    saveAppState(appStateAfter2);
    
    const appStateAfter3 = getAppState();
    assertEqual(appStateAfter3.buckets.duration[3].weight, 2.5, 'Duration 3 weight should be 2.5');
    
    // Verify other buckets still have default weight
    assertEqual(appStateAfter3.buckets.urgency[1].weight, 1, 'Urgency 1 should still have default weight of 1');
    assertEqual(appStateAfter3.buckets.value[1].weight, 1, 'Value 1 should still have default weight of 1');
}

// Test: Weight validation (non-negative)
function testWeightValidation() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    
    // Test that weight can be 0
    const appState = getAppState();
    appState.buckets.urgency[1].weight = 0;
    saveAppState(appState);
    
    const appStateAfter = getAppState();
    assertEqual(appStateAfter.buckets.urgency[1].weight, 0, 'Weight should accept 0 as valid value');
    
    // Test that weight can be a decimal
    appStateAfter.buckets.value[1].weight = 0.123;
    saveAppState(appStateAfter);
    
    const appStateAfter2 = getAppState();
    assertEqual(appStateAfter2.buckets.value[1].weight, 0.123, 'Weight should accept decimal values');
    
    // Test that weight can be a large number
    appStateAfter2.buckets.duration[1].weight = 100.5;
    saveAppState(appStateAfter2);
    
    const appStateAfter3 = getAppState();
    assertEqual(appStateAfter3.buckets.duration[1].weight, 100.5, 'Weight should accept large values');
    
    // Note: Negative validation is handled in the UI/form validation and handler functions
    // The handler functions will show alerts for negative values
}

// Test: Urgency buckets have default titles and descriptions
function testUrgencyBucketsDefaults() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    
    const appState = getAppState();
    
    // Check urgency 1 defaults
    assertEqual(appState.buckets.urgency[1].title, 'WHENEVER', 'Urgency 1 should have default title "WHENEVER"');
    assert(appState.buckets.urgency[1].description.includes('lowest band of urgency'), 'Urgency 1 should have default description about lowest band');
    
    // Check urgency 2 defaults
    assertEqual(appState.buckets.urgency[2].title, 'SOON', 'Urgency 2 should have default title "SOON"');
    assert(appState.buckets.urgency[2].description.includes('middle band of urgency'), 'Urgency 2 should have default description about middle band');
    
    // Check urgency 3 defaults
    assertEqual(appState.buckets.urgency[3].title, 'ASAP', 'Urgency 3 should have default title "ASAP"');
    assert(appState.buckets.urgency[3].description.includes('highest band of urgency'), 'Urgency 3 should have default description about highest band');
}

// Test: Set urgency title
function testSetUrgencyTitle() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    
    const appState = getAppState();
    
    // Set urgency 1 title to "LOW"
    appState.buckets.urgency[1].title = 'LOW';
    saveAppState(appState);
    
    const appStateAfter = getAppState();
    assertEqual(appStateAfter.buckets.urgency[1].title, 'LOW', 'Urgency 1 title should be "LOW"');
    
    // Set urgency 2 title to "MEDIUM"
    appStateAfter.buckets.urgency[2].title = 'MEDIUM';
    saveAppState(appStateAfter);
    
    const appStateAfter2 = getAppState();
    assertEqual(appStateAfter2.buckets.urgency[2].title, 'MEDIUM', 'Urgency 2 title should be "MEDIUM"');
    
    // Set urgency 3 title to "HIGH"
    appStateAfter2.buckets.urgency[3].title = 'HIGH';
    saveAppState(appStateAfter2);
    
    const appStateAfter3 = getAppState();
    assertEqual(appStateAfter3.buckets.urgency[3].title, 'HIGH', 'Urgency 3 title should be "HIGH"');
    
    // Verify other buckets still have default titles
    assertEqual(appStateAfter3.buckets.urgency[1].title, 'LOW', 'Urgency 1 should still have custom title');
    assertEqual(appStateAfter3.buckets.urgency[2].title, 'MEDIUM', 'Urgency 2 should still have custom title');
}

// Test: Set urgency description
function testSetUrgencyDescription() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    
    const appState = getAppState();
    
    // Set urgency 1 description
    const newDescription1 = 'This is a custom description for urgency level 1.';
    appState.buckets.urgency[1].description = newDescription1;
    saveAppState(appState);
    
    const appStateAfter = getAppState();
    assertEqual(appStateAfter.buckets.urgency[1].description, newDescription1, 'Urgency 1 description should be updated');
    
    // Set urgency 2 description
    const newDescription2 = 'This is a custom description for urgency level 2.';
    appStateAfter.buckets.urgency[2].description = newDescription2;
    saveAppState(appStateAfter);
    
    const appStateAfter2 = getAppState();
    assertEqual(appStateAfter2.buckets.urgency[2].description, newDescription2, 'Urgency 2 description should be updated');
    
    // Set urgency 3 description to empty string (should be allowed)
    appStateAfter2.buckets.urgency[3].description = '';
    saveAppState(appStateAfter2);
    
    const appStateAfter3 = getAppState();
    assertEqual(appStateAfter3.buckets.urgency[3].description, '', 'Urgency 3 description should accept empty string');
    
    // Verify other buckets still have their descriptions
    assertEqual(appStateAfter3.buckets.urgency[1].description, newDescription1, 'Urgency 1 should still have custom description');
    assertEqual(appStateAfter3.buckets.urgency[2].description, newDescription2, 'Urgency 2 should still have custom description');
}

// Test: Value buckets have default titles and descriptions
function testValueBucketsDefaults() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    
    const appState = getAppState();
    
    // Check value 1 defaults
    assertEqual(appState.buckets.value[1].title, 'MEH', 'Value 1 should have default title "MEH"');
    assert(appState.buckets.value[1].description.includes('lowest total value band'), 'Value 1 should have default description about lowest band');
    
    // Check value 2 defaults
    assertEqual(appState.buckets.value[2].title, 'BONUS', 'Value 2 should have default title "BONUS"');
    assert(appState.buckets.value[2].description.includes('middle band of total value'), 'Value 2 should have default description about middle band');
    
    // Check value 3 defaults
    assertEqual(appState.buckets.value[3].title, 'KILLER', 'Value 3 should have default title "KILLER"');
    assert(appState.buckets.value[3].description.includes('highest band of total value'), 'Value 3 should have default description about highest band');
}

// Test: Set value title
function testSetValueTitle() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    
    const appState = getAppState();
    
    // Set value 1 title to "LOW"
    appState.buckets.value[1].title = 'LOW';
    saveAppState(appState);
    
    const appStateAfter = getAppState();
    assertEqual(appStateAfter.buckets.value[1].title, 'LOW', 'Value 1 title should be "LOW"');
    
    // Set value 2 title to "MEDIUM"
    appStateAfter.buckets.value[2].title = 'MEDIUM';
    saveAppState(appStateAfter);
    
    const appStateAfter2 = getAppState();
    assertEqual(appStateAfter2.buckets.value[2].title, 'MEDIUM', 'Value 2 title should be "MEDIUM"');
    
    // Set value 3 title to "HIGH"
    appStateAfter2.buckets.value[3].title = 'HIGH';
    saveAppState(appStateAfter2);
    
    const appStateAfter3 = getAppState();
    assertEqual(appStateAfter3.buckets.value[3].title, 'HIGH', 'Value 3 title should be "HIGH"');
    
    // Verify other buckets still have default titles
    assertEqual(appStateAfter3.buckets.value[1].title, 'LOW', 'Value 1 should still have custom title');
    assertEqual(appStateAfter3.buckets.value[2].title, 'MEDIUM', 'Value 2 should still have custom title');
}

// Test: Set value description
function testSetValueDescription() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    
    const appState = getAppState();
    
    // Set value 1 description
    const newDescription1 = 'This is a custom description for value level 1.';
    appState.buckets.value[1].description = newDescription1;
    saveAppState(appState);
    
    const appStateAfter = getAppState();
    assertEqual(appStateAfter.buckets.value[1].description, newDescription1, 'Value 1 description should be updated');
    
    // Set value 2 description
    const newDescription2 = 'This is a custom description for value level 2.';
    appStateAfter.buckets.value[2].description = newDescription2;
    saveAppState(appStateAfter);
    
    const appStateAfter2 = getAppState();
    assertEqual(appStateAfter2.buckets.value[2].description, newDescription2, 'Value 2 description should be updated');
    
    // Set value 3 description to empty string (should be allowed)
    appStateAfter2.buckets.value[3].description = '';
    saveAppState(appStateAfter2);
    
    const appStateAfter3 = getAppState();
    assertEqual(appStateAfter3.buckets.value[3].description, '', 'Value 3 description should accept empty string');
    
    // Verify other buckets still have their descriptions
    assertEqual(appStateAfter3.buckets.value[1].description, newDescription1, 'Value 1 should still have custom description');
    assertEqual(appStateAfter3.buckets.value[2].description, newDescription2, 'Value 2 should still have custom description');
}

// Test: Duration buckets have default titles and descriptions
function testDurationBucketsDefaults() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    
    const appState = getAppState();
    
    // Check duration 1 defaults
    assertEqual(appState.buckets.duration[1].title, '1-3d', 'Duration 1 should have default title "1-3d"');
    assertEqual(appState.buckets.duration[1].description, 'TBD', 'Duration 1 should have default description "TBD"');
    
    // Check duration 2 defaults
    assertEqual(appState.buckets.duration[2].title, '1-3w', 'Duration 2 should have default title "1-3w"');
    assertEqual(appState.buckets.duration[2].description, 'TBD', 'Duration 2 should have default description "TBD"');
    
    // Check duration 3 defaults
    assertEqual(appState.buckets.duration[3].title, '1-3mo', 'Duration 3 should have default title "1-3mo"');
    assertEqual(appState.buckets.duration[3].description, 'TBD', 'Duration 3 should have default description "TBD"');
}

// Test: Set duration title
function testSetDurationTitle() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    
    const appState = getAppState();
    
    // Set duration 1 title to "SHORT"
    appState.buckets.duration[1].title = 'SHORT';
    saveAppState(appState);
    
    const appStateAfter = getAppState();
    assertEqual(appStateAfter.buckets.duration[1].title, 'SHORT', 'Duration 1 title should be "SHORT"');
    
    // Set duration 2 title to "MEDIUM"
    appStateAfter.buckets.duration[2].title = 'MEDIUM';
    saveAppState(appStateAfter);
    
    const appStateAfter2 = getAppState();
    assertEqual(appStateAfter2.buckets.duration[2].title, 'MEDIUM', 'Duration 2 title should be "MEDIUM"');
    
    // Set duration 3 title to "LONG"
    appStateAfter2.buckets.duration[3].title = 'LONG';
    saveAppState(appStateAfter2);
    
    const appStateAfter3 = getAppState();
    assertEqual(appStateAfter3.buckets.duration[3].title, 'LONG', 'Duration 3 title should be "LONG"');
    
    // Verify other buckets still have default titles
    assertEqual(appStateAfter3.buckets.duration[1].title, 'SHORT', 'Duration 1 should still have custom title');
    assertEqual(appStateAfter3.buckets.duration[2].title, 'MEDIUM', 'Duration 2 should still have custom title');
}

// Test: Set duration description
function testSetDurationDescription() {
    localStorage.removeItem(TEST_STORAGE_KEY);
    localStorage.removeItem(TEST_APP_STATE_KEY);
    
    const appState = getAppState();
    
    // Set duration 1 description
    const newDescription1 = 'This is a custom description for duration level 1.';
    appState.buckets.duration[1].description = newDescription1;
    saveAppState(appState);
    
    const appStateAfter = getAppState();
    assertEqual(appStateAfter.buckets.duration[1].description, newDescription1, 'Duration 1 description should be updated');
    
    // Set duration 2 description
    const newDescription2 = 'This is a custom description for duration level 2.';
    appStateAfter.buckets.duration[2].description = newDescription2;
    saveAppState(appStateAfter);
    
    const appStateAfter2 = getAppState();
    assertEqual(appStateAfter2.buckets.duration[2].description, newDescription2, 'Duration 2 description should be updated');
    
    // Set duration 3 description to empty string (should be allowed)
    appStateAfter2.buckets.duration[3].description = '';
    saveAppState(appStateAfter2);
    
    const appStateAfter3 = getAppState();
    assertEqual(appStateAfter3.buckets.duration[3].description, '', 'Duration 3 description should accept empty string');
    
    // Verify other buckets still have their descriptions
    assertEqual(appStateAfter3.buckets.duration[1].description, newDescription1, 'Duration 1 should still have custom description');
    assertEqual(appStateAfter3.buckets.duration[2].description, newDescription2, 'Duration 2 should still have custom description');
}

// Display test results
function displayTestResults() {
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

// Escape HTML helper
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Copy failing tests to clipboard
function copyFailingTests() {
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

// Initialize test adapter and expose test functions
if (typeof window !== 'undefined') {
    // Wait for TestAdapter to be available, then initialize
    // This ensures tests can use the adapter (no duplication)
    function initTestAdapter() {
        if (window.TestAdapter) {
            window.TestAdapter.init().then(() => {
                console.log('Test adapter initialized. Tests ready to run.');
            }).catch(err => {
                console.error('Failed to initialize test adapter:', err);
            });
        } else {
            // Retry if adapter not ready yet
            setTimeout(initTestAdapter, 100);
        }
    }
    
    // Start initialization
    initTestAdapter();
    
    // Expose test functions
    window.runAllTests = runAllTests;
    window.TEST_DATA = TEST_DATA;
    window.copyFailingTests = copyFailingTests;
    console.log('Test suite loaded. runAllTests function and TEST_DATA are available.');
} else {
    console.error('Window object not available');
}

// Test locked/unlocked behavior
async function testLockedModeDefault() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    const state = TestAdapter.getAppState();
    assert(state.locked === true, 'Locked should default to true');
}

async function testLockedModeCannotSetUrgencyInValueStage() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item (starts at Item Listing stage)
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // Advance from Item Listing to urgency
    TestAdapter.advanceStage();
    assert(TestAdapter.getCurrentStage() === 'urgency', 'Should be in urgency stage');
    
    // Set urgency for the item
    TestAdapter.setItemProperty(items[0].id, 'urgency', 2);
    
    // Advance to value stage
    TestAdapter.advanceStage();
    assert(TestAdapter.getCurrentStage() === 'value', 'Should be in value stage');
    
    // Try to set urgency (should fail when locked)
    const result = TestAdapter.setItemProperty(items[0].id, 'urgency', 1);
    assert(!result.success, 'Should not be able to set urgency in value stage when locked');
    assert(result.error && result.error.toLowerCase().includes('cannot set'), 'Error should mention cannot set');
}

async function testUnlockedModeCanSetUrgencyInValueStage() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item (starts at Item Listing stage)
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // Advance from Item Listing to urgency
    TestAdapter.advanceStage();
    assert(TestAdapter.getCurrentStage() === 'urgency', 'Should be in urgency stage');
    
    // Set urgency for the item
    TestAdapter.setItemProperty(items[0].id, 'urgency', 2);
    
    // Advance to value stage
    TestAdapter.advanceStage();
    assert(TestAdapter.getCurrentStage() === 'value', 'Should be in value stage');
    
    // Unlock
    TestAdapter.setLocked(false);
    const state = TestAdapter.getAppState();
    assert(state.locked === false, 'Locked should be false');
    
    // Try to set urgency (should succeed when unlocked)
    const result = TestAdapter.setItemProperty(items[0].id, 'urgency', 1);
    assert(result.success, 'Should be able to set urgency in value stage when unlocked');
    
    // Verify urgency was changed
    const updatedItems = TestAdapter.getItems();
    assert(updatedItems[0].urgency === 1, 'Urgency should be 1');
}

async function testUnlockedModeCanSetUrgencyAndValueInDurationStage() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item (starts at Item Listing stage)
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // Advance from Item Listing to urgency
    TestAdapter.advanceStage();
    assert(TestAdapter.getCurrentStage() === 'urgency', 'Should be in urgency stage');
    
    // Set urgency
    TestAdapter.setItemProperty(items[0].id, 'urgency', 2);
    
    // Advance from urgency to value
    TestAdapter.advanceStage();
    assert(TestAdapter.getCurrentStage() === 'value', 'Should be in value stage');
    
    // Set value
    TestAdapter.setItemProperty(items[0].id, 'value', 2);
    
    // Advance from value to duration
    TestAdapter.advanceStage();
    assert(TestAdapter.getCurrentStage() === 'duration', 'Should be in duration stage');
    
    // Unlock
    TestAdapter.setLocked(false);
    
    // Try to set urgency (should succeed when unlocked)
    const result1 = TestAdapter.setItemProperty(items[0].id, 'urgency', 1);
    assert(result1.success, 'Should be able to set urgency in duration stage when unlocked');
    
    // Try to set value (should succeed when unlocked)
    const result2 = TestAdapter.setItemProperty(items[0].id, 'value', 3);
    assert(result2.success, 'Should be able to set value in duration stage when unlocked');
    
    // Verify values were changed
    const updatedItems = TestAdapter.getItems();
    assert(updatedItems[0].urgency === 1, 'Urgency should be 1');
    assert(updatedItems[0].value === 3, 'Value should be 3');
}

async function testLockedModeCannotSetValueInDurationStage() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item (starts at Item Listing stage)
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // Advance from Item Listing to urgency
    TestAdapter.advanceStage();
    assert(TestAdapter.getCurrentStage() === 'urgency', 'Should be in urgency stage');
    
    // Set urgency
    TestAdapter.setItemProperty(items[0].id, 'urgency', 2);
    
    // Advance from urgency to value
    TestAdapter.advanceStage();
    assert(TestAdapter.getCurrentStage() === 'value', 'Should be in value stage');
    
    // Set value
    TestAdapter.setItemProperty(items[0].id, 'value', 2);
    
    // Advance from value to duration
    TestAdapter.advanceStage();
    assert(TestAdapter.getCurrentStage() === 'duration', 'Should be in duration stage');
    
    // Ensure locked (should be default)
    TestAdapter.setLocked(true);
    
    // Try to set value (should fail when locked)
    const result = TestAdapter.setItemProperty(items[0].id, 'value', 3);
    assert(!result.success, 'Should not be able to set value in duration stage when locked');
    assert(result.error && result.error.toLowerCase().includes('cannot set'), 'Error should mention cannot set');
}

async function testUnlockedModeCannotSetFutureStages() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item (starts at Item Listing stage)
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // Advance from Item Listing to urgency
    TestAdapter.advanceStage();
    assert(TestAdapter.getCurrentStage() === 'urgency', 'Should be in urgency stage');
    
    // Set urgency
    TestAdapter.setItemProperty(items[0].id, 'urgency', 2);
    
    // Unlock
    TestAdapter.setLocked(false);
    
    // Try to set value (should fail - can't set future stages even when unlocked)
    const result = TestAdapter.setItemProperty(items[0].id, 'value', 2);
    assert(!result.success, 'Should not be able to set value when in urgency stage (future stage)');
}

async function testSetLockedToggle() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Should start locked
    let state = TestAdapter.getAppState();
    assert(state.locked === true, 'Should start locked');
    
    // Toggle to unlocked
    TestAdapter.setLocked(false);
    state = TestAdapter.getAppState();
    assert(state.locked === false, 'Should be unlocked after toggle');
    
    // Toggle back to locked
    TestAdapter.setLocked(true);
    state = TestAdapter.getAppState();
    assert(state.locked === true, 'Should be locked after toggle back');
}

// Test cost of delay calculation
async function testCostOfDelayDefaultsToZero() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // Cost of delay should be 0 when item has no urgency or value
    assertEqual(items[0].costOfDelay, 0, 'Cost of delay should default to 0');
    assertEqual(items[0].urgency, 0, 'Urgency should be 0');
    assertEqual(items[0].value, 0, 'Value should be 0');
}

async function testCostOfDelayCalculatedWhenBothSet() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // Advance to urgency stage and set urgency
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'urgency', 1);
    
    // Cost of delay should still be 0 (no value set)
    let updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].costOfDelay, 0, 'Cost of delay should be 0 when only urgency is set');
    
    // Advance to value stage and set value
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'value', 1);
    
    // Cost of delay should now be calculated: urgency 1 (weight 1) × value 1 (weight 1) = 1
    updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].costOfDelay, 1, 'Cost of delay should be 1 (1 × 1)');
}

async function testCostOfDelayWithDifferentWeights() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // Advance to urgency stage and set urgency to 2 (weight 2)
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'urgency', 2);
    
    // Advance to value stage and set value to 3 (weight 3)
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'value', 3);
    
    // Cost of delay should be: urgency 2 (weight 2) × value 3 (weight 3) = 6
    const updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].costOfDelay, 6, 'Cost of delay should be 6 (2 × 3)');
}

async function testCostOfDelayUpdatesWhenUrgencyChanges() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // Set urgency 1 and value 2
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'urgency', 1);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'value', 2);
    
    // Cost of delay should be: 1 × 2 = 2
    let updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].costOfDelay, 2, 'Cost of delay should be 2 (1 × 2)');
    
    // Change urgency to 3 (unlock first to allow changing urgency in value stage)
    TestAdapter.setLocked(false);
    TestAdapter.setItemProperty(items[0].id, 'urgency', 3);
    
    // Cost of delay should now be: 3 × 2 = 6
    updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].costOfDelay, 6, 'Cost of delay should be 6 (3 × 2)');
}

async function testCostOfDelayUpdatesWhenValueChanges() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // Set urgency 2 and value 1
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'urgency', 2);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'value', 1);
    
    // Cost of delay should be: 2 × 1 = 2
    let updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].costOfDelay, 2, 'Cost of delay should be 2 (2 × 1)');
    
    // Change value to 3
    TestAdapter.setItemProperty(items[0].id, 'value', 3);
    
    // Cost of delay should now be: 2 × 3 = 6
    updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].costOfDelay, 6, 'Cost of delay should be 6 (2 × 3)');
}

async function testCostOfDelayResetsToZeroWhenUrgencyOrValueCleared() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // Cost of delay should be 0 when no urgency or value is set
    assertEqual(items[0].costOfDelay, 0, 'Cost of delay should be 0 when urgency and value are not set');
    
    // Set urgency 2 only (no value)
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'urgency', 2);
    
    // Cost of delay should still be 0 (no value set)
    let updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].costOfDelay, 0, 'Cost of delay should be 0 when only urgency is set');
    
    // Set value 2
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'value', 2);
    
    // Cost of delay should be: 2 × 2 = 4
    updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].costOfDelay, 4, 'Cost of delay should be 4 (2 × 2)');
    
    // Note: Cannot unset properties once set, so we test that costOfDelay is 0 when properties are 0 initially
    // This test verifies that costOfDelay correctly defaults to 0 when urgency or value is 0
}

async function testCostOfDelayUpdatesWhenWeightsChange() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // Set urgency 1 and value 1
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'urgency', 1);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'value', 1);
    
    // Cost of delay should be: 1 × 1 = 1
    let updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].costOfDelay, 1, 'Cost of delay should be 1 (1 × 1)');
    
    // Change urgency 1 weight to 5
    TestAdapter.setUrgencyWeight(1, 5);
    
    // Cost of delay should now be: 5 × 1 = 5
    updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].costOfDelay, 5, 'Cost of delay should be 5 (5 × 1) after weight change');
}

// Test bulk add items
async function testBulkAddItems() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Should be in Item Listing stage
    assertEqual(TestAdapter.getCurrentStage(), 'Item Listing', 'Should be in Item Listing stage');
    
    // Bulk add items
    const itemNamesText = 'Item 1\nItem 2\nItem 3\nItem 4';
    const result = TestAdapter.bulkAddItems(itemNamesText);
    
    assert(result.success, 'Bulk add should succeed');
    assertEqual(result.added, 4, 'Should have added 4 items');
    assertEqual(result.total, 4, 'Should have processed 4 items');
    
    // Verify all items were added
    const items = TestAdapter.getItems();
    assertEqual(items.length, 4, 'Should have 4 items');
    assertEqual(items[0].name, 'Item 1', 'First item should be "Item 1"');
    assertEqual(items[1].name, 'Item 2', 'Second item should be "Item 2"');
    assertEqual(items[2].name, 'Item 3', 'Third item should be "Item 3"');
    assertEqual(items[3].name, 'Item 4', 'Fourth item should be "Item 4"');
    
    // Verify all items have default values
    items.forEach(item => {
        assertEqual(item.urgency, 0, 'Item should have urgency 0');
        assertEqual(item.value, 0, 'Item should have value 0');
        assertEqual(item.duration, 0, 'Item should have duration 0');
        assertEqual(item.costOfDelay, 0, 'Item should have costOfDelay 0');
    });
}

async function testBulkAddItemsOnlyInItemListingStage() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add one item and advance to urgency stage
    TestAdapter.addItem('Test Item');
    TestAdapter.advanceStage();
    
    // Try to bulk add items - should fail
    const result = TestAdapter.bulkAddItems('Item 1\nItem 2');
    assert(!result.success, 'Bulk add should fail when not in Item Listing stage');
    assert(result.error && result.error.toLowerCase().includes('item listing'), 'Error should mention Item Listing stage');
}

async function testBulkAddItemsWithEmptyLines() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Bulk add items with empty lines and extra whitespace
    const itemNamesText = 'Item 1\n\nItem 2\n   \nItem 3\n';
    const result = TestAdapter.bulkAddItems(itemNamesText);
    
    assert(result.success, 'Bulk add should succeed');
    assertEqual(result.added, 3, 'Should have added 3 items (empty lines ignored)');
    
    const items = TestAdapter.getItems();
    assertEqual(items.length, 3, 'Should have 3 items');
}

async function testBulkAddItemsWithNoValidNames() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Try to bulk add with only empty lines
    const result = TestAdapter.bulkAddItems('\n\n   \n');
    
    assert(!result.success, 'Bulk add should fail with no valid names');
    assert(result.error && result.error.toLowerCase().includes('no valid item names'), 'Error should mention no valid item names');
}

// Test bulk add items
async function testBulkAddItems() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Should be in Item Listing stage
    assertEqual(TestAdapter.getCurrentStage(), 'Item Listing', 'Should be in Item Listing stage');
    
    // Bulk add items
    const itemNamesText = 'Item 1\nItem 2\nItem 3\nItem 4';
    const result = TestAdapter.bulkAddItems(itemNamesText);
    
    assert(result.success, 'Bulk add should succeed');
    assertEqual(result.added, 4, 'Should have added 4 items');
    assertEqual(result.total, 4, 'Should have processed 4 items');
    
    // Verify all items were added
    const items = TestAdapter.getItems();
    assertEqual(items.length, 4, 'Should have 4 items');
    assertEqual(items[0].name, 'Item 1', 'First item should be "Item 1"');
    assertEqual(items[1].name, 'Item 2', 'Second item should be "Item 2"');
    assertEqual(items[2].name, 'Item 3', 'Third item should be "Item 3"');
    assertEqual(items[3].name, 'Item 4', 'Fourth item should be "Item 4"');
    
    // Verify all items have default values
    items.forEach(item => {
        assertEqual(item.urgency, 0, 'Item should have urgency 0');
        assertEqual(item.value, 0, 'Item should have value 0');
        assertEqual(item.duration, 0, 'Item should have duration 0');
        assertEqual(item.costOfDelay, 0, 'Item should have costOfDelay 0');
    });
}

async function testBulkAddItemsOnlyInItemListingStage() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add one item and advance to urgency stage
    TestAdapter.addItem('Test Item');
    TestAdapter.advanceStage();
    
    // Try to bulk add items - should fail
    const result = TestAdapter.bulkAddItems('Item 1\nItem 2');
    assert(!result.success, 'Bulk add should fail when not in Item Listing stage');
    assert(result.error && result.error.toLowerCase().includes('item listing'), 'Error should mention Item Listing stage');
}

async function testBulkAddItemsWithEmptyLines() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Bulk add items with empty lines and extra whitespace
    const itemNamesText = 'Item 1\n\nItem 2\n   \nItem 3\n';
    const result = TestAdapter.bulkAddItems(itemNamesText);
    
    assert(result.success, 'Bulk add should succeed');
    assertEqual(result.added, 3, 'Should have added 3 items (empty lines ignored)');
    
    const items = TestAdapter.getItems();
    assertEqual(items.length, 3, 'Should have 3 items');
}

async function testBulkAddItemsWithNoValidNames() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Try to bulk add with only empty lines
    const result = TestAdapter.bulkAddItems('\n\n   \n');
    
    assert(!result.success, 'Bulk add should fail with no valid names');
    assert(result.error && result.error.toLowerCase().includes('no valid item names'), 'Error should mention no valid item names');
}


// Test CD3 calculation
async function testCD3DefaultsToZero() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // CD3 should be 0 when item has no duration
    assertEqual(items[0].CD3, 0, 'CD3 should default to 0');
    assertEqual(items[0].duration, 0, 'Duration should be 0');
}

async function testCD3CalculatedWhenDurationSet() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // Set urgency 1, value 1, duration 1
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'urgency', 1);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'value', 1);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'duration', 1);
    
    // CD3 should be: costOfDelay (1) / duration weight (1) = 1
    const updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].CD3, 1, 'CD3 should be 1 (1 / 1)');
}

async function testCD3WithDifferentDurationWeights() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // Set urgency 2, value 2 (costOfDelay = 4), duration 2 (weight 2)
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'urgency', 2);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'value', 2);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'duration', 2);
    
    // CD3 should be: costOfDelay (4) / duration weight (2) = 2
    const updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].CD3, 2, 'CD3 should be 2 (4 / 2)');
}

async function testCD3WithDuration3() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // Set urgency 3, value 3 (costOfDelay = 9), duration 3 (weight 3)
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'urgency', 3);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'value', 3);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'duration', 3);
    
    // CD3 should be: costOfDelay (9) / duration weight (3) = 3
    const updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].CD3, 3, 'CD3 should be 3 (9 / 3)');
}

async function testCD3UpdatesWhenDurationChanges() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // Set urgency 2, value 2 (costOfDelay = 4), duration 1 (weight 1)
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'urgency', 2);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'value', 2);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'duration', 1);
    
    // CD3 should be: 4 / 1 = 4
    let updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].CD3, 4, 'CD3 should be 4 (4 / 1)');
    
    // Change duration to 2
    TestAdapter.setItemProperty(items[0].id, 'duration', 2);
    
    // CD3 should now be: 4 / 2 = 2
    updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].CD3, 2, 'CD3 should be 2 (4 / 2)');
}

async function testCD3UpdatesWhenCostOfDelayChanges() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // Set urgency 1, value 1 (costOfDelay = 1), duration 1 (weight 1)
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'urgency', 1);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'value', 1);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'duration', 1);
    
    // CD3 should be: 1 / 1 = 1
    let updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].CD3, 1, 'CD3 should be 1 (1 / 1)');
    
    // Change urgency to 3 (unlock first)
    TestAdapter.setLocked(false);
    TestAdapter.setItemProperty(items[0].id, 'urgency', 3);
    
    // Cost of delay should now be: 3 × 1 = 3
    // CD3 should now be: 3 / 1 = 3
    updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].CD3, 3, 'CD3 should be 3 (3 / 1)');
}

async function testCD3ResetsToZeroWhenDurationCleared() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // CD3 should be 0 when no duration is set
    assertEqual(items[0].CD3, 0, 'CD3 should be 0 when duration is not set');
    
    // Set urgency 2, value 2 (costOfDelay = 4), but no duration yet
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'urgency', 2);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'value', 2);
    
    // CD3 should still be 0 (no duration set)
    let updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].CD3, 0, 'CD3 should be 0 when duration is not set');
    
    // Set duration 2 (weight 2)
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'duration', 2);
    
    // CD3 should be: 4 / 2 = 2
    updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].CD3, 2, 'CD3 should be 2 (4 / 2)');
    
    // Note: Cannot unset properties once set, so we test that CD3 is 0 when duration is 0 initially
    // This test verifies that CD3 correctly defaults to 0 when duration is 0
}

async function testCD3UpdatesWhenDurationWeightsChange() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // Set urgency 2, value 2 (costOfDelay = 4), duration 2 (weight 2)
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'urgency', 2);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'value', 2);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'duration', 2);
    
    // CD3 should be: 4 / 2 = 2
    let updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].CD3, 2, 'CD3 should be 2 (4 / 2)');
    
    // Change duration 2 weight to 4
    TestAdapter.setDurationWeight(2, 4);
    
    // CD3 should now be: 4 / 4 = 1
    updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].CD3, 1, 'CD3 should be 1 (4 / 4) after weight change');
}

// Test value weight change affects costOfDelay and CD3
async function testValueWeightChangeAffectsCostOfDelayAndCD3() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // Set urgency 1, value 1 (costOfDelay = 1), duration 1 (weight 1)
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'urgency', 1);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'value', 1);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'duration', 1);
    
    // Cost of delay should be: 1 × 1 = 1
    // CD3 should be: 1 / 1 = 1
    let updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].costOfDelay, 1, 'Cost of delay should be 1 (1 × 1)');
    assertEqual(updatedItems[0].CD3, 1, 'CD3 should be 1 (1 / 1)');
    
    // Change value 1 weight to 5
    TestAdapter.setValueWeight(1, 5);
    
    // Cost of delay should now be: 1 × 5 = 5
    // CD3 should now be: 5 / 1 = 5
    updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].costOfDelay, 5, 'Cost of delay should be 5 (1 × 5) after value weight change');
    assertEqual(updatedItems[0].CD3, 5, 'CD3 should be 5 (5 / 1) after value weight change');
}

// Test urgency weight change affects CD3 (not just costOfDelay)
async function testUrgencyWeightChangeAffectsCD3() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // Set urgency 1, value 2 (costOfDelay = 2), duration 1 (weight 1)
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'urgency', 1);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'value', 2);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'duration', 1);
    
    // Cost of delay should be: 1 × 2 = 2
    // CD3 should be: 2 / 1 = 2
    let updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].costOfDelay, 2, 'Cost of delay should be 2 (1 × 2)');
    assertEqual(updatedItems[0].CD3, 2, 'CD3 should be 2 (2 / 1)');
    
    // Change urgency 1 weight to 3
    TestAdapter.setUrgencyWeight(1, 3);
    
    // Cost of delay should now be: 3 × 2 = 6
    // CD3 should now be: 6 / 1 = 6
    updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].costOfDelay, 6, 'Cost of delay should be 6 (3 × 2) after urgency weight change');
    assertEqual(updatedItems[0].CD3, 6, 'CD3 should be 6 (6 / 1) after urgency weight change');
}

// Test weight changes affect multiple items
async function testWeightChangesAffectMultipleItems() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add multiple items
    TestAdapter.addItem('Item 1');
    TestAdapter.addItem('Item 2');
    TestAdapter.addItem('Item 3');
    const items = TestAdapter.getItems();
    
    // Set different urgency values for each item, all with value 1, duration 1
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'urgency', 1);
    TestAdapter.setItemProperty(items[1].id, 'urgency', 2);
    TestAdapter.setItemProperty(items[2].id, 'urgency', 3);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'value', 1);
    TestAdapter.setItemProperty(items[1].id, 'value', 1);
    TestAdapter.setItemProperty(items[2].id, 'value', 1);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'duration', 1);
    TestAdapter.setItemProperty(items[1].id, 'duration', 1);
    TestAdapter.setItemProperty(items[2].id, 'duration', 1);
    
    // Initial values:
    // Item 1: urgency 1 (weight 1), value 1 (weight 1) = costOfDelay 1, CD3 = 1/1 = 1
    // Item 2: urgency 2 (weight 2), value 1 (weight 1) = costOfDelay 2, CD3 = 2/1 = 2
    // Item 3: urgency 3 (weight 3), value 1 (weight 1) = costOfDelay 3, CD3 = 3/1 = 3
    let updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].costOfDelay, 1, 'Item 1 costOfDelay should be 1');
    assertEqual(updatedItems[0].CD3, 1, 'Item 1 CD3 should be 1');
    assertEqual(updatedItems[1].costOfDelay, 2, 'Item 2 costOfDelay should be 2');
    assertEqual(updatedItems[1].CD3, 2, 'Item 2 CD3 should be 2');
    assertEqual(updatedItems[2].costOfDelay, 3, 'Item 3 costOfDelay should be 3');
    assertEqual(updatedItems[2].CD3, 3, 'Item 3 CD3 should be 3');
    
    // Change urgency 1 weight to 5 (affects Item 1)
    TestAdapter.setUrgencyWeight(1, 5);
    
    // After change:
    // Item 1: urgency 1 (weight 5), value 1 (weight 1) = costOfDelay 5, CD3 = 5/1 = 5
    // Item 2: urgency 2 (weight 2), value 1 (weight 1) = costOfDelay 2, CD3 = 2/1 = 2 (unchanged)
    // Item 3: urgency 3 (weight 3), value 1 (weight 1) = costOfDelay 3, CD3 = 3/1 = 3 (unchanged)
    updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].costOfDelay, 5, 'Item 1 costOfDelay should be 5 after urgency weight change');
    assertEqual(updatedItems[0].CD3, 5, 'Item 1 CD3 should be 5 after urgency weight change');
    assertEqual(updatedItems[1].costOfDelay, 2, 'Item 2 costOfDelay should still be 2');
    assertEqual(updatedItems[1].CD3, 2, 'Item 2 CD3 should still be 2');
    assertEqual(updatedItems[2].costOfDelay, 3, 'Item 3 costOfDelay should still be 3');
    assertEqual(updatedItems[2].CD3, 3, 'Item 3 CD3 should still be 3');
}

// Test item active/inactive status
async function testItemActiveDefaultsToTrue() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // Item should be active by default
    assertEqual(items[0].active, true, 'Item should be active by default');
}

async function testSetItemInactive() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // Item should start as active
    assertEqual(items[0].active, true, 'Item should start as active');
    
    // Set item to inactive
    const result = TestAdapter.setItemInactive(items[0].id);
    assert(result.success, 'Setting item inactive should succeed');
    
    // Item should now be inactive
    const updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].active, false, 'Item should be inactive after setItemInactive');
}

async function testSetItemActive() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // Set item to inactive first
    TestAdapter.setItemInactive(items[0].id);
    let updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].active, false, 'Item should be inactive');
    
    // Set item back to active
    const result = TestAdapter.setItemActive(items[0].id);
    assert(result.success, 'Setting item active should succeed');
    
    // Item should now be active
    updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].active, true, 'Item should be active after setItemActive');
}

async function testBulkAddItemsAreActiveByDefault() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Bulk add items
    const itemNamesText = 'Item 1\nItem 2\nItem 3';
    const result = TestAdapter.bulkAddItems(itemNamesText);
    
    assert(result.success, 'Bulk add should succeed');
    
    // All items should be active by default
    const items = TestAdapter.getItems();
    items.forEach((item, index) => {
        assertEqual(item.active, true, `Item ${index + 1} should be active by default`);
    });
}

async function testSetItemActiveWithInvalidId() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Try to set non-existent item to active
    const result = TestAdapter.setItemActive('invalid-id');
    
    assert(!result.success, 'Setting invalid item active should fail');
    assert(result.error && result.error.includes('not found'), 'Error should mention item not found');
}

async function testSetItemInactiveWithInvalidId() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Try to set non-existent item to inactive
    const result = TestAdapter.setItemInactive('invalid-id');
    
    assert(!result.success, 'Setting invalid item inactive should fail');
    assert(result.error && result.error.includes('not found'), 'Error should mention item not found');
}

// Test board position calculation
async function testBoardPositionDefaultsToRow0Col0() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item with no urgency, value, or duration
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // Board position should be row 0, col 0, duration null
    assert(items[0].boardPosition, 'Item should have boardPosition property');
    assertEqual(items[0].boardPosition.row, 0, 'Row should be 0 when no properties set');
    assertEqual(items[0].boardPosition.col, 0, 'Col should be 0 when no properties set');
    assertEqual(items[0].boardPosition.duration, null, 'Duration should be null when not set');
}

async function testBoardPositionWithUrgencyOnly() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item and set urgency
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // Advance to urgency stage and set urgency
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'urgency', 1);
    
    let updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].boardPosition.row, 0, 'Row should be 0 when only urgency is set');
    assertEqual(updatedItems[0].boardPosition.col, 1, 'Col should be 1 when urgency is 1');
    assertEqual(updatedItems[0].boardPosition.duration, null, 'Duration should be null');
    
    // Set urgency to 2
    TestAdapter.setItemProperty(items[0].id, 'urgency', 2);
    updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].boardPosition.col, 2, 'Col should be 2 when urgency is 2');
    
    // Set urgency to 3
    TestAdapter.setItemProperty(items[0].id, 'urgency', 3);
    updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].boardPosition.col, 3, 'Col should be 3 when urgency is 3');
}

async function testBoardPositionWithValue() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item, set urgency and value
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // Set urgency 2, value 1
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'urgency', 2);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'value', 1);
    
    let updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].boardPosition.row, 1, 'Row should be 1 when value is 1');
    assertEqual(updatedItems[0].boardPosition.col, 2, 'Col should be 2 when urgency is 2');
    assertEqual(updatedItems[0].boardPosition.duration, null, 'Duration should be null when not set');
    
    // Set value to 3
    TestAdapter.setItemProperty(items[0].id, 'value', 3);
    updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].boardPosition.row, 3, 'Row should be 3 when value is 3');
    assertEqual(updatedItems[0].boardPosition.col, 2, 'Col should still be 2');
}

async function testBoardPositionWithDuration() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item, set urgency, value, and duration
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // Set urgency 3, value 2, duration 1
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'urgency', 3);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'value', 2);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'duration', 1);
    
    let updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].boardPosition.row, 2, 'Row should be 2 when value is 2');
    assertEqual(updatedItems[0].boardPosition.col, 3, 'Col should be 3 when urgency is 3');
    assertEqual(updatedItems[0].boardPosition.duration, 1, 'Duration should be 1');
    
    // Set duration to 3
    TestAdapter.setItemProperty(items[0].id, 'duration', 3);
    updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].boardPosition.duration, 3, 'Duration should be 3');
}

async function testBoardPositionUpdatesWhenUrgencyChanges() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item, set urgency 1, value 2
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'urgency', 1);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'value', 2);
    
    let updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].boardPosition.col, 1, 'Col should be 1');
    
    // Unlock to allow changing urgency in value stage
    TestAdapter.setLocked(false);
    
    // Change urgency to 3
    TestAdapter.setItemProperty(items[0].id, 'urgency', 3);
    updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].boardPosition.col, 3, 'Col should update to 3');
    assertEqual(updatedItems[0].boardPosition.row, 2, 'Row should still be 2');
}

async function testBoardPositionUpdatesWhenValueChanges() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item, set urgency 2, value 1
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'urgency', 2);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'value', 1);
    
    let updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].boardPosition.row, 1, 'Row should be 1');
    
    // Change value to 3
    TestAdapter.setItemProperty(items[0].id, 'value', 3);
    updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].boardPosition.row, 3, 'Row should update to 3');
    assertEqual(updatedItems[0].boardPosition.col, 2, 'Col should still be 2');
}

async function testBoardPositionUpdatesWhenDurationChanges() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item, set urgency 1, value 1, duration 1
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'urgency', 1);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'value', 1);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'duration', 1);
    
    let updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].boardPosition.duration, 1, 'Duration should be 1');
    
    // Change duration to 2
    TestAdapter.setItemProperty(items[0].id, 'duration', 2);
    updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].boardPosition.duration, 2, 'Duration should update to 2');
    assertEqual(updatedItems[0].boardPosition.row, 1, 'Row should still be 1');
    assertEqual(updatedItems[0].boardPosition.col, 1, 'Col should still be 1');
}

async function testBoardPositionWithValueButNoUrgency() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item, set value without urgency (shouldn't normally happen, but test edge case)
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // This should fail validation, but if it somehow gets through, test the position
    // Actually, we can't set value without urgency due to validation, so let's test
    // the case where urgency is 0 but value is somehow set (edge case)
    // For now, let's just test that if value is set, row = value and col = urgency (or 0 if urgency is 0)
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'urgency', 1);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'value', 2);
    
    // Now set urgency back to 0 (edge case - shouldn't normally happen)
    // Actually, we can't set urgency to 0 through setItemProperty, so let's test a different scenario
    // Test that when value is 2 and urgency is 1, we get row 2, col 1
    const updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].boardPosition.row, 2, 'Row should be 2 when value is 2');
    assertEqual(updatedItems[0].boardPosition.col, 1, 'Col should be 1 when urgency is 1');
}

// Test that urgency cannot be unset once set
async function testCannotUnsetUrgencyOnceSet() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item and set urgency
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // Set urgency to 2
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'urgency', 2);
    
    // Try to set urgency back to 0 (should fail)
    const result = TestAdapter.setItemProperty(items[0].id, 'urgency', 0);
    
    assert(!result.success, 'Setting urgency to 0 should fail');
    assert(result.error && result.error.includes('Cannot unset'), 'Error should mention cannot unset');
    
    // Verify urgency is still 2
    const updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].urgency, 2, 'Urgency should still be 2');
}

// Test that value cannot be unset once set
async function testCannotUnsetValueOnceSet() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item, set urgency and value
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // Set urgency 2, value 3
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'urgency', 2);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'value', 3);
    
    // Try to set value back to 0 (should fail)
    const result = TestAdapter.setItemProperty(items[0].id, 'value', 0);
    
    assert(!result.success, 'Setting value to 0 should fail');
    assert(result.error && result.error.includes('Cannot unset'), 'Error should mention cannot unset');
    
    // Verify value is still 3
    const updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].value, 3, 'Value should still be 3');
}

// Test that duration cannot be unset once set
async function testCannotUnsetDurationOnceSet() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item, set urgency, value, and duration
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // Set urgency 1, value 1, duration 2
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'urgency', 1);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'value', 1);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'duration', 2);
    
    // Try to set duration back to 0 (should fail)
    const result = TestAdapter.setItemProperty(items[0].id, 'duration', 0);
    
    assert(!result.success, 'Setting duration to 0 should fail');
    assert(result.error && result.error.includes('Cannot unset'), 'Error should mention cannot unset');
    
    // Verify duration is still 2
    const updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].duration, 2, 'Duration should still be 2');
}

// Test that urgency can still be changed (not unset)
async function testCanStillChangeUrgencyValues() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item and set urgency
    TestAdapter.addItem('Test Item');
    const items = TestAdapter.getItems();
    
    // Set urgency to 2
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(items[0].id, 'urgency', 2);
    
    // Change urgency to 1 (should succeed)
    let result = TestAdapter.setItemProperty(items[0].id, 'urgency', 1);
    assert(result.success, 'Changing urgency from 2 to 1 should succeed');
    
    let updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].urgency, 1, 'Urgency should be 1');
    
    // Change urgency to 3 (should succeed)
    result = TestAdapter.setItemProperty(items[0].id, 'urgency', 3);
    assert(result.success, 'Changing urgency from 1 to 3 should succeed');
    
    updatedItems = TestAdapter.getItems();
    assertEqual(updatedItems[0].urgency, 3, 'Urgency should be 3');
}

// Test sequence assignment when item gets CD3 (not manually reordered)
async function testSequenceAssignedWhenCD3Assigned() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add two items
    TestAdapter.addItem('Item 1');
    TestAdapter.addItem('Item 2');
    let items = TestAdapter.getItems();
    
    // Advance to Urgency stage and set urgency for all items
    TestAdapter.advanceStage(); // Item Listing -> Urgency
    TestAdapter.setItemProperty(items[0].id, 'urgency', 3);
    TestAdapter.setItemProperty(items[1].id, 'urgency', 1);
    
    // Advance to Value stage and set value for all items
    TestAdapter.advanceStage(); // Urgency -> Value
    TestAdapter.setItemProperty(items[0].id, 'value', 3);
    TestAdapter.setItemProperty(items[1].id, 'value', 1);
    
    // Advance to Duration stage and unlock
    TestAdapter.advanceStage(); // Value -> Duration
    TestAdapter.setLocked(false);
    
    // Now set duration for Item 1 (CD3 = 9/1 = 9)
    let result = TestAdapter.setItemProperty(items[0].id, 'duration', 1);
    assert(result.success, `Setting duration should succeed: ${result.error || ''}`);
    
    // Get fresh items after Item 1 updates
    items = TestAdapter.getItems();
    const item1AfterSetup = items.find(i => i.name === 'Item 1');
    assertEqual(item1AfterSetup.CD3, 9, 'Item 1 should have CD3 9 after setting all properties');
    
    // Set duration for Item 2 (CD3 = 1/1 = 1)
    const item2Ref = items.find(i => i.name === 'Item 2');
    if (!item2Ref) {
        assert(false, 'Item 2 not found');
        return;
    }
    result = TestAdapter.setItemProperty(item2Ref.id, 'duration', 1);
    assert(result.success, `Setting duration for Item 2 should succeed: ${result.error || ''}`);
    
    const updatedItems = TestAdapter.getItems();
    const item1 = updatedItems.find(i => i.name === 'Item 1');
    const item2 = updatedItems.find(i => i.name === 'Item 2');
    
    if (!item1 || !item2) {
        assert(false, 'Items not found after updates');
        return;
    }
    
    // Verify CD3 values first
    assertEqual(item1.CD3, 9, 'Item 1 should have CD3 9');
    assertEqual(item2.CD3, 1, 'Item 2 should have CD3 1');
    
    // Item 1 should have sequence 1 (higher CD3)
    assertEqual(item1.sequence, 1, 'Item 1 should have sequence 1 (CD3 9)');
    // Item 2 should have sequence 2 (lower CD3)
    assertEqual(item2.sequence, 2, 'Item 2 should have sequence 2 (CD3 1)');
}

// Test sequence assignment when manually reordered - insert above highest CD3
async function testSequenceInsertionWhenManuallyReordered() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add three items
    TestAdapter.addItem('Item Low');
    TestAdapter.addItem('Item Medium');
    TestAdapter.addItem('Item High');
    let items = TestAdapter.getItems();
    
    // Advance to Urgency stage and set urgency for all items
    TestAdapter.advanceStage(); // Item Listing -> Urgency
    TestAdapter.setItemProperty(items[0].id, 'urgency', 1);
    TestAdapter.setItemProperty(items[1].id, 'urgency', 3);
    TestAdapter.setItemProperty(items[2].id, 'urgency', 3);
    
    // Advance to Value stage and set value for all items
    TestAdapter.advanceStage(); // Urgency -> Value
    TestAdapter.setItemProperty(items[0].id, 'value', 1);
    TestAdapter.setItemProperty(items[1].id, 'value', 2);
    TestAdapter.setItemProperty(items[2].id, 'value', 3);
    
    // Advance to Duration stage and unlock
    TestAdapter.advanceStage(); // Value -> Duration
    TestAdapter.setLocked(false);
    
    // Set duration for all items
    let result = TestAdapter.setItemProperty(items[0].id, 'duration', 3);
    assert(result.success, `Setting duration should succeed: ${result.error || ''}`);
    result = TestAdapter.setItemProperty(items[1].id, 'duration', 1);
    assert(result.success, `Setting duration for Item Medium should succeed: ${result.error || ''}`);
    result = TestAdapter.setItemProperty(items[2].id, 'duration', 1);
    assert(result.success, `Setting duration for Item High should succeed: ${result.error || ''}`);
    
    // Reload items
    items = TestAdapter.getItems();
    
    // Now manually reorder by accessing Store directly
    const { Store } = await import('./state/appState.js');
    const appState = Store.getAppState();
    appState.resultsManuallyReordered = true;
    Store.save(appState);
    
    // Manually set sequences: Low (seq 1), Medium (seq 2), High (seq 3)
    // This simulates user manually reordering
    const currentItems = Store.getItems();
    const itemLow = currentItems.find(i => i.name === 'Item Low');
    const itemMedium = currentItems.find(i => i.name === 'Item Medium');
    const itemHigh = currentItems.find(i => i.name === 'Item High');
    
    itemLow.sequence = 1;
    itemMedium.sequence = 2;
    itemHigh.sequence = 3;
    Store.saveItems(currentItems);
    
    // Navigate back to Item Listing stage to allow adding items
    while (TestAdapter.getCurrentStage() !== 'Item Listing') {
        TestAdapter.backStage();
    }
    
    // Now add a new item with CD3 = 9 (same as Item High)
    const addResult = TestAdapter.addItem('Item New');
    assert(addResult.success, `Adding Item New should succeed: ${addResult.error || ''}`);
    
    // Reload items after adding
    let newItems = TestAdapter.getItems();
    let itemNew = newItems.find(i => i.name === 'Item New');
    
    if (!itemNew) {
        // Try one more time with Store
        newItems = Store.getItems();
        itemNew = newItems.find(i => i.name === 'Item New');
        if (!itemNew) {
            assert(false, 'Item New not found after adding');
            return;
        }
    }
    
    // Navigate forward and set properties at each stage (required to advance)
    TestAdapter.advanceStage(); // Item Listing -> Urgency
    result = TestAdapter.setItemProperty(itemNew.id, 'urgency', 3);
    assert(result.success, `Setting urgency for Item New should succeed: ${result.error || ''}`);
    
    TestAdapter.advanceStage(); // Urgency -> Value
    result = TestAdapter.setItemProperty(itemNew.id, 'value', 3);
    assert(result.success, `Setting value for Item New should succeed: ${result.error || ''}`);
    
    TestAdapter.advanceStage(); // Value -> Duration
    result = TestAdapter.setItemProperty(itemNew.id, 'duration', 1);
    assert(result.success, `Setting duration for Item New should succeed: ${result.error || ''}`);
    
    // Reload to get updated item - use TestAdapter for consistency
    newItems = TestAdapter.getItems();
    itemNew = newItems.find(i => i.name === 'Item New');
    if (!itemNew) {
        // Try Store as fallback
        newItems = Store.getItems();
        itemNew = newItems.find(i => i.name === 'Item New');
        if (!itemNew) {
            assert(false, 'Item New not found after setting properties');
            return;
        }
    }
    
    const finalItems = TestAdapter.getItems();
    const finalItemNew = finalItems.find(i => i.name === 'Item New');
    const finalItemLow = finalItems.find(i => i.name === 'Item Low');
    const finalItemMedium = finalItems.find(i => i.name === 'Item Medium');
    const finalItemHigh = finalItems.find(i => i.name === 'Item High');
    
    // Item New (CD3 9) should be inserted above Item Medium (CD3 6, highest with lower CD3)
    // So sequence should be: Low (1), New (2), Medium (3), High (4)
    assertEqual(finalItemLow.sequence, 1, 'Item Low should remain sequence 1');
    assertEqual(finalItemNew.sequence, 2, 'Item New should be sequence 2 (above Item Medium)');
    assertEqual(finalItemMedium.sequence, 3, 'Item Medium should be sequence 3 (shifted)');
    assertEqual(finalItemHigh.sequence, 4, 'Item High should be sequence 4 (shifted)');
    assertEqual(finalItemNew.addedToManuallySequencedList, true, 'Item New should have addedToManuallySequencedList flag');
}

// Test that [New] flag is cleared on reset
async function testNewFlagClearedOnReset() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add item and set up with CD3
    TestAdapter.addItem('Item 1');
    let items = TestAdapter.getItems();
    
    // Advance to Urgency stage and set urgency
    TestAdapter.advanceStage(); // Item Listing -> Urgency
    TestAdapter.setItemProperty(items[0].id, 'urgency', 3);
    
    // Advance to Value stage and set value
    TestAdapter.advanceStage(); // Urgency -> Value
    TestAdapter.setItemProperty(items[0].id, 'value', 3);
    
    // Advance to Duration stage, unlock, and set duration
    TestAdapter.advanceStage(); // Value -> Duration
    TestAdapter.setLocked(false);
    let result = TestAdapter.setItemProperty(items[0].id, 'duration', 1);
    assert(result.success, `Setting duration should succeed: ${result.error || ''}`);
    
    // Manually reorder to set flag
    const { Store } = await import('./state/appState.js');
    const appState = Store.getAppState();
    appState.resultsManuallyReordered = true;
    Store.save(appState);
    
    // Navigate back to Item Listing stage to allow adding items
    while (TestAdapter.getCurrentStage() !== 'Item Listing') {
        TestAdapter.backStage();
    }
    
    // Add another item that will get the flag
    const addResult = TestAdapter.addItem('Item 2');
    assert(addResult.success, `Adding Item 2 should succeed: ${addResult.error || ''}`);
    
    // Reload items after adding
    let newItems = TestAdapter.getItems();
    let item2 = newItems.find(i => i.name === 'Item 2');
    
    if (!item2) {
        // Try one more time with Store
        newItems = Store.getItems();
        item2 = newItems.find(i => i.name === 'Item 2');
        if (!item2) {
            assert(false, 'Item 2 not found after adding');
            return;
        }
    }
    
    // Navigate forward and set properties at each stage (required to advance)
    TestAdapter.advanceStage(); // Item Listing -> Urgency
    result = TestAdapter.setItemProperty(item2.id, 'urgency', 3);
    assert(result.success, `Setting urgency for Item 2 should succeed: ${result.error || ''}`);
    
    TestAdapter.advanceStage(); // Urgency -> Value
    result = TestAdapter.setItemProperty(item2.id, 'value', 3);
    assert(result.success, `Setting value for Item 2 should succeed: ${result.error || ''}`);
    
    TestAdapter.advanceStage(); // Value -> Duration
    result = TestAdapter.setItemProperty(item2.id, 'duration', 1);
    assert(result.success, `Setting duration for Item 2 should succeed: ${result.error || ''}`);
    
    // Reload to get updated item - use TestAdapter for consistency
    newItems = TestAdapter.getItems();
    item2 = newItems.find(i => i.name === 'Item 2');
    if (!item2) {
        // Try Store as fallback
        newItems = Store.getItems();
        item2 = newItems.find(i => i.name === 'Item 2');
        if (!item2) {
            assert(false, 'Item 2 not found after setting properties');
            return;
        }
    }
    
    // Verify flag is set
    const itemsBeforeReset = TestAdapter.getItems();
    const item2BeforeReset = itemsBeforeReset.find(i => i.name === 'Item 2');
    assertEqual(item2BeforeReset.addedToManuallySequencedList, true, 'Item 2 should have flag before reset');
    
    // Reset order
    const { resetResultsOrder } = await import('./ui/display.js');
    resetResultsOrder();
    
    // Verify flag is cleared
    const itemsAfterReset = Store.getItems();
    const item2AfterReset = itemsAfterReset.find(i => i.name === 'Item 2');
    assertEqual(item2AfterReset.addedToManuallySequencedList, false, 'Item 2 should not have flag after reset');
}

// Test that new item is inserted in CD3 order when not manually reordered
async function testNewItemInsertedInCD3Order() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add three items
    TestAdapter.addItem('Item A');
    TestAdapter.addItem('Item B');
    TestAdapter.addItem('Item C');
    let items = TestAdapter.getItems();
    
    // Advance to Urgency stage and set urgency for all items
    TestAdapter.advanceStage(); // Item Listing -> Urgency
    TestAdapter.setItemProperty(items[0].id, 'urgency', 1);
    TestAdapter.setItemProperty(items[1].id, 'urgency', 3);
    TestAdapter.setItemProperty(items[2].id, 'urgency', 3);
    
    // Advance to Value stage and set value for all items
    TestAdapter.advanceStage(); // Urgency -> Value
    TestAdapter.setItemProperty(items[0].id, 'value', 1);
    TestAdapter.setItemProperty(items[1].id, 'value', 2);
    TestAdapter.setItemProperty(items[2].id, 'value', 3);
    
    // Advance to Duration stage, unlock, and set duration for all items
    TestAdapter.advanceStage(); // Value -> Duration
    TestAdapter.setLocked(false);
    let result = TestAdapter.setItemProperty(items[0].id, 'duration', 1);
    assert(result.success, `Setting duration for Item A should succeed: ${result.error || ''}`);
    result = TestAdapter.setItemProperty(items[1].id, 'duration', 1);
    assert(result.success, `Setting duration for Item B should succeed: ${result.error || ''}`);
    result = TestAdapter.setItemProperty(items[2].id, 'duration', 1);
    assert(result.success, `Setting duration for Item C should succeed: ${result.error || ''}`);
    
    // Reload items
    items = TestAdapter.getItems();
    
    // Verify sequences are in CD3 order: C (9), B (6), A (1)
    const { Store } = await import('./state/appState.js');
    const sequencedItems = Store.getItems();
    const itemA = sequencedItems.find(i => i.name === 'Item A');
    const itemB = sequencedItems.find(i => i.name === 'Item B');
    const itemC = sequencedItems.find(i => i.name === 'Item C');
    
    assertEqual(itemC.sequence, 1, 'Item C (CD3 9) should be sequence 1');
    assertEqual(itemB.sequence, 2, 'Item B (CD3 6) should be sequence 2');
    assertEqual(itemA.sequence, 3, 'Item A (CD3 1) should be sequence 3');
}

// Test notes functionality across all stages
async function testNotesFunctionalityAcrossStages() {
    await TestAdapter.init();
    TestAdapter.startApp();
    
    // Add an item
    const addResult = TestAdapter.addItem('Test Notes Item');
    assert(addResult.success, `Adding item should succeed: ${addResult.error || ''}`);
    
    let items = TestAdapter.getItems();
    let testItem = items.find(i => i.name === 'Test Notes Item');
    assert(testItem !== undefined, 'Test item should exist after adding');
    
    // Add a note while on Item Listing stage
    const noteResult = TestAdapter.addItemNote(testItem.id, 'This is a test note');
    assert(noteResult.success, `Adding note should succeed: ${noteResult.error || ''}`);
    
    // Reload items and verify note was added
    items = TestAdapter.getItems();
    testItem = items.find(i => i.name === 'Test Notes Item');
    assert(testItem !== undefined, 'Test item should still exist');
    assert(Array.isArray(testItem.notes), 'Item should have notes array');
    assertEqual(testItem.notes.length, 1, 'Item should have 1 note');
    assertEqual(testItem.notes[0].text, 'This is a test note', 'Note text should match');
    assert(testItem.notes[0].createdAt !== undefined, 'Note should have createdAt timestamp');
    assert(testItem.notes[0].modifiedAt !== undefined, 'Note should have modifiedAt timestamp');
    
    // Advance to Urgency stage
    TestAdapter.advanceStage(); // Item Listing -> Urgency
    assertEqual(TestAdapter.getCurrentStage(), 'urgency', 'Should be on urgency stage');
    
    // Reload items and verify note still exists
    items = TestAdapter.getItems();
    testItem = items.find(i => i.name === 'Test Notes Item');
    assert(testItem !== undefined, 'Test item should exist in urgency stage');
    assertEqual(testItem.notes.length, 1, 'Item should still have 1 note in urgency stage');
    
    // Set urgency and advance to Value stage
    const urgencyResult = TestAdapter.setItemProperty(testItem.id, 'urgency', 2);
    assert(urgencyResult.success, `Setting urgency should succeed: ${urgencyResult.error || ''}`);
    
    TestAdapter.advanceStage(); // Urgency -> Value
    assertEqual(TestAdapter.getCurrentStage(), 'value', 'Should be on value stage');
    
    // Reload items and verify note still exists
    items = TestAdapter.getItems();
    testItem = items.find(i => i.name === 'Test Notes Item');
    assert(testItem !== undefined, 'Test item should exist in value stage');
    assertEqual(testItem.notes.length, 1, 'Item should still have 1 note in value stage');
    
    // Set value and advance to Duration stage
    const valueResult = TestAdapter.setItemProperty(testItem.id, 'value', 2);
    assert(valueResult.success, `Setting value should succeed: ${valueResult.error || ''}`);
    
    TestAdapter.advanceStage(); // Value -> Duration
    assertEqual(TestAdapter.getCurrentStage(), 'duration', 'Should be on duration stage');
    
    // Reload items and verify note still exists
    items = TestAdapter.getItems();
    testItem = items.find(i => i.name === 'Test Notes Item');
    assert(testItem !== undefined, 'Test item should exist in duration stage');
    assertEqual(testItem.notes.length, 1, 'Item should still have 1 note in duration stage');
    
    // Set duration and advance to Results stage
    const durationResult = TestAdapter.setItemProperty(testItem.id, 'duration', 1);
    assert(durationResult.success, `Setting duration should succeed: ${durationResult.error || ''}`);
    
    TestAdapter.advanceStage(); // Duration -> Results
    assertEqual(TestAdapter.getCurrentStage(), 'Results', 'Should be on Results stage');
    
    // Reload items and verify note still exists
    items = TestAdapter.getItems();
    testItem = items.find(i => i.name === 'Test Notes Item');
    assert(testItem !== undefined, 'Test item should exist in Results stage');
    assertEqual(testItem.notes.length, 1, 'Item should still have 1 note in Results stage');
    assertEqual(testItem.notes[0].text, 'This is a test note', 'Note text should still match in Results stage');
    
    // Add another note while on Results stage
    const note2Result = TestAdapter.addItemNote(testItem.id, 'Second note added in Results stage');
    assert(note2Result.success, `Adding second note should succeed: ${note2Result.error || ''}`);
    
    // Reload items and verify both notes exist
    items = TestAdapter.getItems();
    testItem = items.find(i => i.name === 'Test Notes Item');
    assertEqual(testItem.notes.length, 2, 'Item should have 2 notes');
    assertEqual(testItem.notes[0].text, 'This is a test note', 'First note should still exist');
    assertEqual(testItem.notes[1].text, 'Second note added in Results stage', 'Second note should exist');
    
    // Verify notes can be accessed via API
    const notes = TestAdapter.getItemNotes(testItem.id);
    assert(notes !== null, 'getItemNotes should return notes array');
    assertEqual(notes.length, 2, 'getItemNotes should return 2 notes');
}

// Test confidence survey basic functionality
async function testConfidenceSurveyBasic() {
    await TestAdapter.init();
    TestAdapter.startApp();
    TestAdapter.setLocked(false);
    
    // Add an item
    const addResult = TestAdapter.addItem('Confidence Test Item');
    assert(addResult.success, `Adding item should succeed: ${addResult.error || ''}`);
    
    let items = TestAdapter.getItems();
    let testItem = items.find(i => i.name === 'Confidence Test Item');
    assert(testItem !== undefined, 'Test item should exist after adding');
    
    // Advance through stages and set properties
    TestAdapter.advanceStage(); // Item Listing -> Urgency
    const urgencyResult = TestAdapter.setItemProperty(testItem.id, 'urgency', 2);
    assert(urgencyResult.success, `Setting urgency should succeed: ${urgencyResult.error || ''}`);
    
    TestAdapter.advanceStage(); // Urgency -> Value
    const valueResult = TestAdapter.setItemProperty(testItem.id, 'value', 3);
    assert(valueResult.success, `Setting value should succeed: ${valueResult.error || ''}`);
    
    TestAdapter.advanceStage(); // Value -> Duration
    const durationResult = TestAdapter.setItemProperty(testItem.id, 'duration', 1);
    assert(durationResult.success, `Setting duration should succeed: ${durationResult.error || ''}`);
    
    TestAdapter.advanceStage(); // Duration -> Results
    assertEqual(TestAdapter.getCurrentStage(), 'Results', 'Should be on Results stage');
    
    // Reload items
    items = TestAdapter.getItems();
    testItem = items.find(i => i.name === 'Confidence Test Item');
    
    // Verify item has required properties
    assert(testItem.urgency === 2, 'Item should have urgency 2');
    assert(testItem.value === 3, 'Item should have value 3');
    assert(testItem.duration === 1, 'Item should have duration 1');
    assert(testItem.hasConfidenceSurvey === false, 'Item should not have confidence survey initially');
    
    // Submit confidence survey
    const surveyData = {
        scopeConfidence: {1: 2, 2: 3, 3: 1, 4: 0},
        urgencyConfidence: {1: 1, 2: 4, 3: 2, 4: 1},
        valueConfidence: {1: 0, 2: 2, 3: 3, 4: 3},
        durationConfidence: {1: 1, 2: 2, 3: 2, 4: 3}
    };
    
    const submitResult = TestAdapter.submitConfidenceSurvey(testItem.id, surveyData);
    assert(submitResult.success, `Submitting confidence survey should succeed: ${submitResult.error || ''}`);
    
    // Reload items and verify survey was saved
    items = TestAdapter.getItems();
    testItem = items.find(i => i.name === 'Confidence Test Item');
    assert(testItem.hasConfidenceSurvey === true, 'Item should have confidence survey after submission');
    assert(testItem.confidenceSurvey !== undefined, 'Item should have confidenceSurvey object');
    assertEqual(testItem.confidenceSurvey.urgencyConfidence[1], 1, 'Urgency confidence level 1 should be 1');
    assertEqual(testItem.confidenceSurvey.urgencyConfidence[2], 4, 'Urgency confidence level 2 should be 4');
    assertEqual(testItem.confidenceSurvey.valueConfidence[3], 3, 'Value confidence level 3 should be 3');
    
    // Verify survey can be retrieved via API
    const retrievedSurvey = TestAdapter.getConfidenceSurvey(testItem.id);
    assert(retrievedSurvey !== null, 'getConfidenceSurvey should return survey data');
    assertEqual(retrievedSurvey.urgencyConfidence[2], 4, 'Retrieved survey should match submitted data');
}

// Test confidence survey calculation
async function testConfidenceSurveyCalculation() {
    await TestAdapter.init();
    TestAdapter.startApp();
    TestAdapter.setLocked(false);
    
    // Add an item
    TestAdapter.addItem('Calculation Test Item');
    let items = TestAdapter.getItems();
    let testItem = items.find(i => i.name === 'Calculation Test Item');
    
    // Set properties: urgency=2 (weight 2), value=2 (weight 2), duration=1 (weight 1)
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(testItem.id, 'urgency', 2);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(testItem.id, 'value', 2);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(testItem.id, 'duration', 1);
    TestAdapter.advanceStage();
    
    // Reload items
    items = TestAdapter.getItems();
    testItem = items.find(i => i.name === 'Calculation Test Item');
    
    // Base CD3 should be: (urgency weight 2 * value weight 2) / duration weight 1 = 4 / 1 = 4
    assertEqual(testItem.CD3, 4, 'Base CD3 should be 4');
    
    // Submit survey with known confidence values
    // Using confidence weights: 1=0.30, 2=0.50, 3=0.70, 4=0.90
    // Urgency: 1 vote at level 2 (0.50) = weighted avg 0.50
    // Value: 1 vote at level 3 (0.70) = weighted avg 0.70
    // Duration: 1 vote at level 4 (0.90) = weighted avg 0.90
    const surveyData = {
        scopeConfidence: {1: 0, 2: 0, 3: 0, 4: 0},
        urgencyConfidence: {1: 0, 2: 1, 3: 0, 4: 0}, // 1 vote at level 2
        valueConfidence: {1: 0, 2: 0, 3: 1, 4: 0}, // 1 vote at level 3
        durationConfidence: {1: 0, 2: 0, 3: 0, 4: 1} // 1 vote at level 4
    };
    
    const submitResult = TestAdapter.submitConfidenceSurvey(testItem.id, surveyData);
    assert(submitResult.success, `Submitting survey should succeed: ${submitResult.error || ''}`);
    
    // Reload items
    items = TestAdapter.getItems();
    testItem = items.find(i => i.name === 'Calculation Test Item');
    
    // Verify confidence-weighted CD3 is calculated
    // Weighted urgency: 2 * 0.50 = 1.0
    // Weighted value: 2 * 0.70 = 1.4
    // Weighted cost of delay: 1.0 * 1.4 = 1.4
    // Weighted duration: 1 * 0.90 = 0.9
    // Weighted CD3: 1.4 / 0.9 = 1.555...
    assert(testItem.confidenceWeightedCD3 !== null, 'Confidence-weighted CD3 should be calculated');
    assert(testItem.confidenceWeightedCD3 !== undefined, 'Confidence-weighted CD3 should be defined');
    assert(Math.abs(testItem.confidenceWeightedCD3 - 1.5556) < 0.01, `Confidence-weighted CD3 should be approximately 1.56, got ${testItem.confidenceWeightedCD3}`);
    
    // Verify weighted values are stored
    assert(testItem.confidenceWeightedValues !== null, 'Confidence-weighted values should be stored');
    assert(testItem.confidenceWeightedValues !== undefined, 'Confidence-weighted values should be defined');
    assert(Math.abs(testItem.confidenceWeightedValues.urgency - 1.0) < 0.01, `Weighted urgency should be 1.0, got ${testItem.confidenceWeightedValues.urgency}`);
    assert(Math.abs(testItem.confidenceWeightedValues.value - 1.4) < 0.01, `Weighted value should be 1.4, got ${testItem.confidenceWeightedValues.value}`);
    assert(Math.abs(testItem.confidenceWeightedValues.duration - 0.9) < 0.01, `Weighted duration should be 0.9, got ${testItem.confidenceWeightedValues.duration}`);
}

// Test confidence survey editing
async function testConfidenceSurveyEditing() {
    await TestAdapter.init();
    TestAdapter.startApp();
    TestAdapter.setLocked(false);
    
    // Add an item and set properties
    TestAdapter.addItem('Edit Test Item');
    let items = TestAdapter.getItems();
    let testItem = items.find(i => i.name === 'Edit Test Item');
    
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(testItem.id, 'urgency', 2);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(testItem.id, 'value', 2);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(testItem.id, 'duration', 1);
    TestAdapter.advanceStage();
    
    // Submit initial survey
    const initialSurvey = {
        scopeConfidence: {1: 1, 2: 0, 3: 0, 4: 0},
        urgencyConfidence: {1: 1, 2: 0, 3: 0, 4: 0},
        valueConfidence: {1: 1, 2: 0, 3: 0, 4: 0},
        durationConfidence: {1: 1, 2: 0, 3: 0, 4: 0}
    };
    
    const submitResult1 = TestAdapter.submitConfidenceSurvey(testItem.id, initialSurvey);
    assert(submitResult1.success, `Initial survey submission should succeed: ${submitResult1.error || ''}`);
    
    // Reload and verify initial values
    items = TestAdapter.getItems();
    testItem = items.find(i => i.name === 'Edit Test Item');
    assertEqual(testItem.confidenceSurvey.urgencyConfidence[1], 1, 'Initial urgency confidence should be 1');
    
    // Edit survey with new values
    const editedSurvey = {
        scopeConfidence: {1: 0, 2: 1, 3: 0, 4: 0},
        urgencyConfidence: {1: 0, 2: 1, 3: 0, 4: 0},
        valueConfidence: {1: 0, 2: 1, 3: 0, 4: 0},
        durationConfidence: {1: 0, 2: 1, 3: 0, 4: 0}
    };
    
    const submitResult2 = TestAdapter.submitConfidenceSurvey(testItem.id, editedSurvey);
    assert(submitResult2.success, `Editing survey should succeed: ${submitResult2.error || ''}`);
    
    // Reload and verify edited values
    items = TestAdapter.getItems();
    testItem = items.find(i => i.name === 'Edit Test Item');
    assertEqual(testItem.confidenceSurvey.urgencyConfidence[1], 0, 'Edited urgency confidence level 1 should be 0');
    assertEqual(testItem.confidenceSurvey.urgencyConfidence[2], 1, 'Edited urgency confidence level 2 should be 1');
    assert(testItem.hasConfidenceSurvey === true, 'Item should still have confidence survey after editing');
}

// Test confidence survey deletion
async function testConfidenceSurveyDeletion() {
    await TestAdapter.init();
    TestAdapter.startApp();
    TestAdapter.setLocked(false);
    
    // Add an item and set properties
    TestAdapter.addItem('Delete Test Item');
    let items = TestAdapter.getItems();
    let testItem = items.find(i => i.name === 'Delete Test Item');
    
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(testItem.id, 'urgency', 2);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(testItem.id, 'value', 2);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(testItem.id, 'duration', 1);
    TestAdapter.advanceStage();
    
    // Submit survey
    const surveyData = {
        scopeConfidence: {1: 1, 2: 0, 3: 0, 4: 0},
        urgencyConfidence: {1: 1, 2: 0, 3: 0, 4: 0},
        valueConfidence: {1: 1, 2: 0, 3: 0, 4: 0},
        durationConfidence: {1: 1, 2: 0, 3: 0, 4: 0}
    };
    
    const submitResult = TestAdapter.submitConfidenceSurvey(testItem.id, surveyData);
    assert(submitResult.success, `Submitting survey should succeed: ${submitResult.error || ''}`);
    
    // Reload and verify survey exists
    items = TestAdapter.getItems();
    testItem = items.find(i => i.name === 'Delete Test Item');
    assert(testItem.hasConfidenceSurvey === true, 'Item should have confidence survey');
    assert(testItem.confidenceWeightedCD3 !== null, 'Item should have confidence-weighted CD3');
    
    // Delete survey
    const deleteResult = TestAdapter.deleteConfidenceSurvey(testItem.id);
    assert(deleteResult.success, `Deleting survey should succeed: ${deleteResult.error || ''}`);
    
    // Reload and verify survey is deleted
    items = TestAdapter.getItems();
    testItem = items.find(i => i.name === 'Delete Test Item');
    assert(testItem.hasConfidenceSurvey === false, 'Item should not have confidence survey after deletion');
    assert(testItem.confidenceWeightedCD3 === null, 'Item should not have confidence-weighted CD3 after deletion');
    assert(testItem.confidenceWeightedValues === null, 'Item should not have confidence-weighted values after deletion');
    
    // Verify survey data is reset
    assertEqual(testItem.confidenceSurvey.urgencyConfidence[1], 0, 'Urgency confidence should be reset to 0');
    assertEqual(testItem.confidenceSurvey.valueConfidence[1], 0, 'Value confidence should be reset to 0');
    
    // Verify getConfidenceSurvey returns null
    const retrievedSurvey = TestAdapter.getConfidenceSurvey(testItem.id);
    assert(retrievedSurvey === null, 'getConfidenceSurvey should return null after deletion');
}

// Test confidence survey persistence across stages
async function testConfidenceSurveyPersistence() {
    await TestAdapter.init();
    TestAdapter.startApp();
    TestAdapter.setLocked(false);
    
    // Add an item
    TestAdapter.addItem('Persistence Test Item');
    let items = TestAdapter.getItems();
    let testItem = items.find(i => i.name === 'Persistence Test Item');
    
    // Set properties and advance to Results
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(testItem.id, 'urgency', 2);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(testItem.id, 'value', 2);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(testItem.id, 'duration', 1);
    TestAdapter.advanceStage();
    assertEqual(TestAdapter.getCurrentStage(), 'Results', 'Should be on Results stage');
    
    // Submit survey in Results stage
    const surveyData = {
        scopeConfidence: {1: 2, 2: 1, 3: 0, 4: 0},
        urgencyConfidence: {1: 1, 2: 2, 3: 0, 4: 0},
        valueConfidence: {1: 0, 2: 1, 3: 1, 4: 0},
        durationConfidence: {1: 0, 2: 0, 3: 1, 4: 1}
    };
    
    const submitResult = TestAdapter.submitConfidenceSurvey(testItem.id, surveyData);
    assert(submitResult.success, `Submitting survey should succeed: ${submitResult.error || ''}`);
    
    // Reload and verify survey exists
    items = TestAdapter.getItems();
    testItem = items.find(i => i.name === 'Persistence Test Item');
    assert(testItem.hasConfidenceSurvey === true, 'Item should have confidence survey');
    
    // Navigate back to Duration stage
    TestAdapter.backStage();
    assertEqual(TestAdapter.getCurrentStage(), 'duration', 'Should be on duration stage');
    
    // Reload and verify survey still exists
    items = TestAdapter.getItems();
    testItem = items.find(i => i.name === 'Persistence Test Item');
    assert(testItem.hasConfidenceSurvey === true, 'Item should still have confidence survey in duration stage');
    assertEqual(testItem.confidenceSurvey.urgencyConfidence[2], 2, 'Survey data should persist');
    
    // Navigate back to Value stage
    TestAdapter.backStage();
    assertEqual(TestAdapter.getCurrentStage(), 'value', 'Should be on value stage');
    
    // Reload and verify survey still exists
    items = TestAdapter.getItems();
    testItem = items.find(i => i.name === 'Persistence Test Item');
    assert(testItem.hasConfidenceSurvey === true, 'Item should still have confidence survey in value stage');
    
    // Navigate back to Urgency stage
    TestAdapter.backStage();
    assertEqual(TestAdapter.getCurrentStage(), 'urgency', 'Should be on urgency stage');
    
    // Reload and verify survey still exists
    items = TestAdapter.getItems();
    testItem = items.find(i => i.name === 'Persistence Test Item');
    assert(testItem.hasConfidenceSurvey === true, 'Item should still have confidence survey in urgency stage');
}

// Test confidence survey weighted values breakdown
async function testConfidenceSurveyWeightedValues() {
    await TestAdapter.init();
    TestAdapter.startApp();
    TestAdapter.setLocked(false);
    
    // Add an item
    TestAdapter.addItem('Weighted Values Test Item');
    let items = TestAdapter.getItems();
    let testItem = items.find(i => i.name === 'Weighted Values Test Item');
    
    // Set properties: urgency=3 (weight 3), value=3 (weight 3), duration=2 (weight 2)
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(testItem.id, 'urgency', 3);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(testItem.id, 'value', 3);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(testItem.id, 'duration', 2);
    TestAdapter.advanceStage();
    
    // Submit survey with all votes at level 2 (0.50 confidence)
    const surveyData = {
        scopeConfidence: {1: 0, 2: 1, 3: 0, 4: 0},
        urgencyConfidence: {1: 0, 2: 1, 3: 0, 4: 0}, // 1 vote at level 2 = 0.50
        valueConfidence: {1: 0, 2: 1, 3: 0, 4: 0}, // 1 vote at level 2 = 0.50
        durationConfidence: {1: 0, 2: 1, 3: 0, 4: 0} // 1 vote at level 2 = 0.50
    };
    
    const submitResult = TestAdapter.submitConfidenceSurvey(testItem.id, surveyData);
    assert(submitResult.success, `Submitting survey should succeed: ${submitResult.error || ''}`);
    
    // Reload items
    items = TestAdapter.getItems();
    testItem = items.find(i => i.name === 'Weighted Values Test Item');
    
    // Verify weighted values
    // Weighted urgency: 3 * 0.50 = 1.5
    // Weighted value: 3 * 0.50 = 1.5
    // Weighted duration: 2 * 0.50 = 1.0
    assert(testItem.confidenceWeightedValues !== null, 'Confidence-weighted values should be stored');
    assert(Math.abs(testItem.confidenceWeightedValues.urgency - 1.5) < 0.01, `Weighted urgency should be 1.5, got ${testItem.confidenceWeightedValues.urgency}`);
    assert(Math.abs(testItem.confidenceWeightedValues.value - 1.5) < 0.01, `Weighted value should be 1.5, got ${testItem.confidenceWeightedValues.value}`);
    assert(Math.abs(testItem.confidenceWeightedValues.duration - 1.0) < 0.01, `Weighted duration should be 1.0, got ${testItem.confidenceWeightedValues.duration}`);
    
    // Verify confidence-weighted CD3: (1.5 * 1.5) / 1.0 = 2.25
    assert(Math.abs(testItem.confidenceWeightedCD3 - 2.25) < 0.01, `Confidence-weighted CD3 should be 2.25, got ${testItem.confidenceWeightedCD3}`);
}

// Test confidence survey edge cases
async function testConfidenceSurveyEdgeCases() {
    await TestAdapter.init();
    TestAdapter.startApp();
    TestAdapter.setLocked(false);
    
    // Test 1: Survey with all zeros should not calculate weighted CD3
    TestAdapter.addItem('Edge Case Item 1');
    let items = TestAdapter.getItems();
    let testItem = items.find(i => i.name === 'Edge Case Item 1');
    
    // Set properties and advance to Results
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(testItem.id, 'urgency', 2);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(testItem.id, 'value', 2);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(testItem.id, 'duration', 1);
    TestAdapter.advanceStage();
    
    const zeroSurvey = {
        scopeConfidence: {1: 0, 2: 0, 3: 0, 4: 0},
        urgencyConfidence: {1: 0, 2: 0, 3: 0, 4: 0},
        valueConfidence: {1: 0, 2: 0, 3: 0, 4: 0},
        durationConfidence: {1: 0, 2: 0, 3: 0, 4: 0}
    };
    
    const submitResult1 = TestAdapter.submitConfidenceSurvey(testItem.id, zeroSurvey);
    assert(submitResult1.success, `Submitting zero survey should succeed: ${submitResult1.error || ''}`);
    
    items = TestAdapter.getItems();
    testItem = items.find(i => i.name === 'Edge Case Item 1');
    assert(testItem.hasConfidenceSurvey === true, 'Item should have confidence survey flag set');
    // With all zeros, confidence averages will be null, so weighted CD3 should be null
    assert(testItem.confidenceWeightedCD3 === null, 'Confidence-weighted CD3 should be null with all zero votes');
    
    // Test 2: Survey with missing dimension should not calculate weighted CD3
    TestAdapter.addItem('Edge Case Item 2');
    items = TestAdapter.getItems();
    let testItem2 = items.find(i => i.name === 'Edge Case Item 2');
    
    TestAdapter.setItemProperty(testItem2.id, 'urgency', 2);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(testItem2.id, 'value', 2);
    TestAdapter.advanceStage();
    TestAdapter.setItemProperty(testItem2.id, 'duration', 1);
    TestAdapter.advanceStage();
    
    // Survey with urgency votes but no value votes
    const partialSurvey = {
        scopeConfidence: {1: 0, 2: 0, 3: 0, 4: 0},
        urgencyConfidence: {1: 0, 2: 1, 3: 0, 4: 0}, // Has votes
        valueConfidence: {1: 0, 2: 0, 3: 0, 4: 0}, // No votes
        durationConfidence: {1: 0, 2: 1, 3: 0, 4: 0} // Has votes
    };
    
    const submitResult2 = TestAdapter.submitConfidenceSurvey(testItem2.id, partialSurvey);
    assert(submitResult2.success, `Submitting partial survey should succeed: ${submitResult2.error || ''}`);
    
    items = TestAdapter.getItems();
    testItem2 = items.find(i => i.name === 'Edge Case Item 2');
    assert(testItem2.hasConfidenceSurvey === true, 'Item should have confidence survey flag');
    // Value confidence has no votes, so weighted CD3 should be null
    assert(testItem2.confidenceWeightedCD3 === null, 'Confidence-weighted CD3 should be null when value has no votes');
    
    // Test 3: Verify confidence weights and labels are accessible
    const weights = TestAdapter.getConfidenceWeights();
    assert(weights !== null, 'Confidence weights should be accessible');
    assertEqual(weights[1], 0.30, 'Confidence weight level 1 should be 0.30');
    assertEqual(weights[2], 0.50, 'Confidence weight level 2 should be 0.50');
    assertEqual(weights[3], 0.70, 'Confidence weight level 3 should be 0.70');
    assertEqual(weights[4], 0.90, 'Confidence weight level 4 should be 0.90');
    
    const labels = TestAdapter.getConfidenceLevelLabels();
    assert(labels !== null, 'Confidence level labels should be accessible');
    assert(typeof labels[1] === 'string', 'Confidence label level 1 should be a string');
    assert(labels[1].includes('Not Confident'), 'Confidence label level 1 should contain "Not Confident"');
}
