// Test Adapter - Bridges tests to app through the public API
// This adapter allows tests to work with the app without knowing its internals
// Tests use this adapter, which uses the PriorityManagerAPI

(function() {
    'use strict';
    
    // Wait for API to be available
    function waitForAPI(callback, maxAttempts = 50) {
        if (typeof window !== 'undefined' && window.PriorityManagerAPI) {
            callback(window.PriorityManagerAPI);
        } else if (maxAttempts > 0) {
            setTimeout(() => waitForAPI(callback, maxAttempts - 1), 100);
        } else {
            throw new Error('PriorityManagerAPI not available');
        }
    }
    
    // Test adapter that wraps the API
    const TestAdapter = {
        api: null,
        
        init: function() {
            return new Promise((resolve, reject) => {
                waitForAPI((api) => {
                    this.api = api;
                    resolve();
                });
            });
        },
        
        // Data operations
        getItems: function() {
            return this.api.getItems();
        },
        
        addItem: function(name) {
            return this.api.addItem(name);
        },
        
        bulkAddItems: function(itemNamesText) {
            return this.api.bulkAddItems(itemNamesText);
        },
        
        setItemActive: function(itemId) {
            return this.api.setItemActive(itemId);
        },
        
        setItemInactive: function(itemId) {
            return this.api.setItemInactive(itemId);
        },
        
        setItemProperty: function(itemId, property, value) {
            return this.api.setItemProperty(itemId, property, value);
        },
        
        addItemNote: function(itemId, noteText) {
            return this.api.addItemNote(itemId, noteText);
        },
        
        updateItemNote: function(itemId, noteIndex, noteText) {
            return this.api.updateItemNote(itemId, noteIndex, noteText);
        },
        
        deleteItemNote: function(itemId, noteIndex) {
            return this.api.deleteItemNote(itemId, noteIndex);
        },
        
        getItemNotes: function(itemId) {
            return this.api.getItemNotes(itemId);
        },
        
        submitConfidenceSurvey: function(itemId, surveyData) {
            return this.api.submitConfidenceSurvey(itemId, surveyData);
        },
        
        deleteConfidenceSurvey: function(itemId) {
            return this.api.deleteConfidenceSurvey(itemId);
        },
        
        getConfidenceSurvey: function(itemId) {
            return this.api.getConfidenceSurvey(itemId);
        },
        
        getConfidenceWeights: function() {
            return this.api.getConfidenceWeights();
        },
        
        getConfidenceLevelLabels: function() {
            return this.api.getConfidenceLevelLabels();
        },
        
        // Stage operations
        getCurrentStage: function() {
            return this.api.getCurrentStage();
        },
        
        advanceStage: function() {
            return this.api.advanceStage();
        },
        
        backStage: function() {
            return this.api.backStage();
        },
        
        navigateToStage: function(stage) {
            return this.api.navigateToStage(stage);
        },
        
        getStageNavigationState: function() {
            return this.api.getStageNavigationState();
        },
        
        setCurrentStage: function(stage) {
            return this.api.setCurrentStage(stage);
        },
        
        // Bucket operations
        setUrgencyLimit: function(level, limit) {
            return this.api.setUrgencyLimit(level, limit);
        },
        
        setValueLimit: function(level, limit) {
            return this.api.setValueLimit(level, limit);
        },
        
        setUrgencyWeight: function(level, weight) {
            return this.api.setUrgencyWeight(level, weight);
        },
        
        setValueWeight: function(level, weight) {
            return this.api.setValueWeight(level, weight);
        },
        
        setDurationWeight: function(level, weight) {
            return this.api.setDurationWeight(level, weight);
        },
        
        setUrgencyTitle: function(level, title) {
            return this.api.setUrgencyTitle(level, title);
        },
        
        setUrgencyDescription: function(level, description) {
            return this.api.setUrgencyDescription(level, description);
        },
        
        setValueTitle: function(level, title) {
            return this.api.setValueTitle(level, title);
        },
        
        setValueDescription: function(level, description) {
            return this.api.setValueDescription(level, description);
        },
        
        setDurationTitle: function(level, title) {
            return this.api.setDurationTitle(level, title);
        },
        
        setDurationDescription: function(level, description) {
            return this.api.setDurationDescription(level, description);
        },
        
        // State operations
        getAppState: function() {
            return this.api.getAppState();
        },
        
        clearCache: function() {
            return this.api.clearCache();
        },
        
        setLocked: function(locked) {
            return this.api.setLocked(locked);
        },
        
        clearAllData: function() {
            return this.api.clearAllData();
        },
        
        startApp: function() {
            return this.api.startApp();
        },
        
        // Utility operations
        getButtonStates: function() {
            return this.api.getButtonStates();
        },
        
        updateStageNavigation: function() {
            return this.api.updateStageNavigation();
        },
        
        updateStageButtonStates: function() {
            return this.api.updateStageButtonStates();
        },
        
        // Utility functions for tests (to avoid duplication)
        initializeBuckets: function() {
            return this.api.initializeBuckets();
        },
        
        migrateToBuckets: function(state) {
            return this.api.migrateToBuckets(state);
        },
        
        updateBuckets: function(state, items) {
            return this.api.updateBuckets(state, items);
        },
        
        calculateBucketCounts: function(items) {
            return this.api.calculateBucketCounts(items);
        },
        
        calculateCostOfDelay: function(item) {
            return this.api.calculateCostOfDelay(item);
        },
        
        recalculateAllCostOfDelay: function() {
            return this.api.recalculateAllCostOfDelay();
        },
        
        calculateCD3: function(item) {
            return this.api.calculateCD3(item);
        },
        
        recalculateAllCD3: function() {
            return this.api.recalculateAllCD3();
        },
        
        calculateBoardPosition: function(item) {
            return this.api.calculateBoardPosition(item);
        }
    };
    
    // Expose adapter globally for tests
    if (typeof window !== 'undefined') {
        window.TestAdapter = TestAdapter;
    }
})();

