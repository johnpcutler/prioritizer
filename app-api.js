// Public API for Priority Manager App
// This is the ONLY interface that external code (including tests) should use
// The app and tests are completely decoupled through this API

(function() {
    'use strict';
    
    // Private reference to the app (will be set when app loads)
    let appInstance = null;
    
    // Public API object
    const PriorityManagerAPI = {
        // Initialize the API with the app instance
        init: function(app) {
            appInstance = app;
        },
        
        // Data operations
        getItems: function() {
            return appInstance ? appInstance.getItems() : [];
        },
        
        addItem: function(name) {
            return appInstance ? appInstance.addItem(name) : { success: false, error: 'App not initialized' };
        },
        
        bulkAddItems: function(itemNamesText) {
            return appInstance ? appInstance.bulkAddItems(itemNamesText) : { success: false, error: 'App not initialized' };
        },
        
        removeItem: function(itemId) {
            return appInstance ? appInstance.removeItem(itemId) : { success: false, error: 'App not initialized' };
        },
        
        setItemActive: function(itemId) {
            return appInstance ? appInstance.setItemActive(itemId) : { success: false, error: 'App not initialized' };
        },
        
        setItemInactive: function(itemId) {
            return appInstance ? appInstance.setItemInactive(itemId) : { success: false, error: 'App not initialized' };
        },
        
        setItemProperty: function(itemId, property, value) {
            return appInstance ? appInstance.setItemProperty(itemId, property, value) : { success: false, error: 'App not initialized' };
        },
        
        addItemNote: function(itemId, noteText) {
            return appInstance ? appInstance.addItemNote(itemId, noteText) : { success: false, error: 'App not initialized' };
        },
        
        updateItemNote: function(itemId, noteIndex, noteText) {
            return appInstance ? appInstance.updateItemNote(itemId, noteIndex, noteText) : { success: false, error: 'App not initialized' };
        },
        
        deleteItemNote: function(itemId, noteIndex) {
            return appInstance ? appInstance.deleteItemNote(itemId, noteIndex) : { success: false, error: 'App not initialized' };
        },
        
        getItemNotes: function(itemId) {
            if (!appInstance) return null;
            const items = appInstance.getItems();
            const item = items.find(i => i.id === itemId);
            return item ? item.notes || [] : null;
        },
        
        submitConfidenceSurvey: function(itemId, surveyData) {
            return appInstance ? appInstance.submitConfidenceSurvey(itemId, surveyData) : { success: false, error: 'App not initialized' };
        },
        
        deleteConfidenceSurvey: function(itemId) {
            return appInstance ? appInstance.deleteConfidenceSurvey(itemId) : { success: false, error: 'App not initialized' };
        },
        
        getConfidenceSurvey: function(itemId) {
            return appInstance ? appInstance.getConfidenceSurvey(itemId) : null;
        },
        
        getConfidenceWeights: function() {
            return appInstance ? appInstance.getConfidenceWeights() : null;
        },
        
        getConfidenceLevelLabels: function() {
            return appInstance ? appInstance.getConfidenceLevelLabels() : null;
        },
        
        // Stage operations
        getCurrentStage: function() {
            return appInstance ? appInstance.getCurrentStage() : 'urgency';
        },
        
        advanceStage: function() {
            return appInstance ? appInstance.advanceStage() : { success: false, error: 'App not initialized' };
        },
        
        backStage: function() {
            return appInstance ? appInstance.backStage() : { success: false, error: 'App not initialized' };
        },
        
        navigateToStage: function(stage) {
            return appInstance ? appInstance.navigateToStage(stage) : { success: false, error: 'App not initialized' };
        },
        
        getStageNavigationState: function() {
            return appInstance ? appInstance.getStageNavigationState() : null;
        },
        
        setCurrentStage: function(stage) {
            return appInstance ? appInstance.setCurrentStage(stage) : { success: false, error: 'App not initialized' };
        },
        
        // Bucket operations
        setUrgencyLimit: function(level, limit) {
            return appInstance ? appInstance.setUrgencyLimit(level, limit) : { success: false, error: 'App not initialized' };
        },
        
        setValueLimit: function(level, limit) {
            return appInstance ? appInstance.setValueLimit(level, limit) : { success: false, error: 'App not initialized' };
        },
        
        setUrgencyWeight: function(level, weight) {
            return appInstance ? appInstance.setUrgencyWeight(level, weight) : { success: false, error: 'App not initialized' };
        },
        
        setValueWeight: function(level, weight) {
            return appInstance ? appInstance.setValueWeight(level, weight) : { success: false, error: 'App not initialized' };
        },
        
        setDurationWeight: function(level, weight) {
            return appInstance ? appInstance.setDurationWeight(level, weight) : { success: false, error: 'App not initialized' };
        },
        
        setUrgencyTitle: function(level, title) {
            return appInstance ? appInstance.setUrgencyTitle(level, title) : { success: false, error: 'App not initialized' };
        },
        
        setUrgencyDescription: function(level, description) {
            return appInstance ? appInstance.setUrgencyDescription(level, description) : { success: false, error: 'App not initialized' };
        },
        
        setValueTitle: function(level, title) {
            return appInstance ? appInstance.setValueTitle(level, title) : { success: false, error: 'App not initialized' };
        },
        
        setValueDescription: function(level, description) {
            return appInstance ? appInstance.setValueDescription(level, description) : { success: false, error: 'App not initialized' };
        },
        
        setDurationTitle: function(level, title) {
            return appInstance ? appInstance.setDurationTitle(level, title) : { success: false, error: 'App not initialized' };
        },
        
        setDurationDescription: function(level, description) {
            return appInstance ? appInstance.setDurationDescription(level, description) : { success: false, error: 'App not initialized' };
        },
        
        // State operations
        getAppState: function() {
            return appInstance ? appInstance.getAppState() : null;
        },
        
        clearCache: function() {
            if (appInstance && appInstance.clearCache) {
                appInstance.clearCache();
            }
        },
        
        setLocked: function(locked) {
            return appInstance ? appInstance.setLocked(locked) : { success: false, error: 'App not initialized' };
        },
        
        clearAllData: function() {
            return appInstance ? appInstance.clearAllData() : { success: false, error: 'App not initialized' };
        },
        
        startApp: function() {
            return appInstance ? appInstance.startApp() : { success: false, error: 'App not initialized' };
        },
        
        // Utility operations
        getButtonStates: function() {
            return appInstance ? appInstance.getButtonStates() : { canAdvance: false, canGoBack: false };
        },
        
        updateStageNavigation: function() {
            return appInstance ? appInstance.updateStageNavigation() : undefined;
        },
        
        updateStageButtonStates: function() {
            return appInstance ? appInstance.updateStageButtonStates() : undefined;
        },
        
        // Utility functions for tests (to avoid duplication)
        initializeBuckets: function() {
            return appInstance ? appInstance.initializeBuckets() : null;
        },
        
        migrateToBuckets: function(state) {
            return appInstance ? appInstance.migrateToBuckets(state) : state;
        },
        
        updateBuckets: function(state, items) {
            return appInstance ? appInstance.updateBuckets(state, items) : state;
        },
        
        calculateBucketCounts: function(items) {
            return appInstance ? appInstance.calculateBucketCounts(items) : {};
        },
        
        calculateCostOfDelay: function(item) {
            return appInstance ? appInstance.calculateCostOfDelay(item) : undefined;
        },
        
        recalculateAllCostOfDelay: function() {
            return appInstance ? appInstance.recalculateAllCostOfDelay() : undefined;
        },
        
        calculateCD3: function(item) {
            return appInstance ? appInstance.calculateCD3(item) : undefined;
        },
        
        recalculateAllCD3: function() {
            return appInstance ? appInstance.recalculateAllCD3() : undefined;
        },
        
        calculateBoardPosition: function(item) {
            return appInstance ? appInstance.calculateBoardPosition(item) : null;
        }
    };
    
    // Expose API globally
    if (typeof window !== 'undefined') {
        window.PriorityManagerAPI = PriorityManagerAPI;
    } else if (typeof global !== 'undefined') {
        global.PriorityManagerAPI = PriorityManagerAPI;
    }
    
    // Also expose as module if in module environment
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = PriorityManagerAPI;
    }
})();

