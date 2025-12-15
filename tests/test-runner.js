// Test runner module - imports and executes all test suites
// This module loads all test suites and provides the runAllTests function

import { basicItemsTests } from './suites/basic-items.js';
import { stagesTests } from './suites/stages.js';
import { bucketsTests } from './suites/buckets.js';
import { lockedModeTests } from './suites/locked-mode.js';
import { costOfDelayTests } from './suites/cost-of-delay.js';
import { bulkOperationsTests } from './suites/bulk-operations.js';
import { cd3Tests } from './suites/cd3.js';
import { itemStateTests } from './suites/item-state.js';
import { boardPositionTests } from './suites/board-position.js';
import { propertyValidationTests } from './suites/property-validation.js';
import { sequenceTests } from './suites/sequence.js';
import { notesTests } from './suites/notes.js';
import { confidenceSurveyTests } from './suites/confidence-survey.js';
import { csvExportTests } from './suites/csv-export.js';
import { enhancedItemListingTests } from './suites/enhanced-item-listing.js';

// Import test infrastructure
import {
    TEST_STORAGE_KEY,
    TEST_APP_STATE_KEY,
    testResults,
    resetTestCounters,
    runTest,
    runAsyncTest,
    displayTestResults,
    getAppState,
    saveAppState,
    initializeBuckets,
    copyFailingTests
} from './test-core.js';

// Collect all test suites
const allTestSuites = [
    basicItemsTests,
    stagesTests,
    bucketsTests,
    lockedModeTests,
    costOfDelayTests,
    bulkOperationsTests,
    cd3Tests,
    itemStateTests,
    boardPositionTests,
    propertyValidationTests,
    sequenceTests,
    notesTests,
    confidenceSurveyTests,
    csvExportTests,
    enhancedItemListingTests
];

// Flatten all tests into a single array
const allTests = allTestSuites.flat();

// Run all tests
export async function runAllTests() {
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
        
        // Run all tests in order
        for (const test of allTests) {
            console.log(`\n--- Test ${test.number}: ${test.name} ---`);
            if (test.fn.constructor.name === 'AsyncFunction') {
                await runAsyncTest(test.fn, test.name);
            } else {
                runTest(test.fn, test.name);
            }
        }
        
        // Display results
        displayTestResults();
        
    } catch (error) {
        console.error('Test suite error:', error);
        testResults.push({ status: 'ERROR', message: `Test suite error: ${error.message}` });
        displayTestResults();
    } finally {
        // Clear all test data from storage after tests complete
        localStorage.removeItem(TEST_STORAGE_KEY);
        localStorage.removeItem(TEST_APP_STATE_KEY);
        localStorage.removeItem('priorityItems'); // Clear app's items storage
        localStorage.removeItem('appState'); // Clear app's state storage
        
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

// Expose to window for non-module scripts
if (typeof window !== 'undefined') {
    window.runAllTests = runAllTests;
    window.copyFailingTests = copyFailingTests;
    console.log('Test runner loaded. All tests ready from suites.');
}

