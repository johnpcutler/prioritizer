// Command executor - handles command execution with validation, mutation, analytics, and refresh

import { Store } from '../state/appState.js';
import { displayJson, updateCurrentStageDisplay, updateLockedDisplay, updateStageNavigation, updateUrgencyView, updateValueView, updateDurationView, updateResultsView, updateItemListingView } from '../ui/display/index.js';

// Command history for debugging (optional, can be disabled)
let commandHistoryEnabled = false;
let commandHistory = [];

// Refresh function - will be set by command handlers
let refreshFunction = null;

/**
 * Set the refresh function to use
 * @param {Function} fn - Function to call for UI refresh
 */
export function setRefreshFunction(fn) {
  refreshFunction = fn;
}

/**
 * Default refresh function
 */
function defaultRefresh() {
  displayJson();
  updateStageNavigation();
  updateLockedDisplay();
  updateUrgencyView();
  updateValueView();
  updateDurationView();
  updateResultsView();
  updateItemListingView();
}

/**
 * Execute a command
 * @param {Object} command - Command object with type and payload
 * @param {string} command.type - Command type (from COMMAND_TYPES)
 * @param {Object} command.payload - Command payload
 * @param {Object} options - Execution options
 * @param {boolean} options.dryRun - If true, validate but don't apply
 * @param {boolean} options.skipRefresh - If true, skip UI refresh
 * @param {boolean} options.skipAnalytics - If true, skip analytics
 * @param {Object} options.handlers - Command handlers object (injected to avoid circular dependency)
 * @returns {Object} Result object with success and optional error
 */
export function executeCommand(command, options = {}) {
  const { type, payload } = command;
  const { dryRun = false, skipRefresh = false, skipAnalytics = false, handlers: commandHandlers } = options;
  
  if (!commandHandlers) {
    return {
      success: false,
      error: 'Command handlers not provided'
    };
  }
  
  // Get command handler
  const handler = commandHandlers[type];
  
  if (!handler) {
    return {
      success: false,
      error: `Unknown command type: ${type}`
    };
  }
  
  // Get current state
  const state = Store.getAppState();
  const items = Store.getItems();
  
  // Validate command
  if (handler.validate) {
    const validation = handler.validate(state, items, payload);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error || 'Validation failed'
      };
    }
  }
  
  // Dry-run mode: validate only
  if (dryRun) {
    return {
      success: true,
      wouldApply: true
    };
  }
  
  // Track command in history (if enabled)
  if (commandHistoryEnabled) {
    commandHistory.push({
      type,
      payload,
      timestamp: Date.now()
    });
  }
  
  // Apply mutation
  let result;
  if (handler.apply) {
    result = handler.apply(state, items, payload);
    if (!result || !result.success) {
      return {
        success: false,
        error: result?.error || 'Command application failed'
      };
    }
  } else {
    result = { success: true };
  }
  
  // Analytics (if not skipped)
  if (!skipAnalytics && handler.analytics) {
    try {
      handler.analytics(payload, state, items);
    } catch (error) {
      console.warn('Analytics error:', error);
      // Don't fail command if analytics fails
    }
  }
  
  // UI Refresh (if not skipped)
  if (!skipRefresh) {
    if (handler.refresh === false) {
      // Explicitly no refresh
    } else if (typeof handler.refresh === 'function') {
      // Custom refresh function
      handler.refresh();
    } else {
      // Default: full refresh
      const refresh = refreshFunction || defaultRefresh;
      refresh();
    }
  }
  
  return result || { success: true };
}

/**
 * Execute multiple commands in a batch
 * All commands are validated first, then applied, then a single refresh
 * @param {Array} commands - Array of command objects
 * @param {Object} options - Execution options
 * @param {Object} options.handlers - Command handlers object (injected to avoid circular dependency)
 * @returns {Object} Result object with success, errors array, and results array
 */
export function executeBatch(commands, options = {}) {
  const { skipRefresh = false, skipAnalytics = false, handlers: commandHandlers } = options;
  
  if (!commandHandlers) {
    return {
      success: false,
      error: 'Command handlers not provided'
    };
  }
  
  const state = Store.getAppState();
  const items = Store.getItems();
  
  // Validate all commands first
  const validationErrors = [];
  for (const command of commands) {
    const handler = commandHandlers[command.type];
    if (!handler) {
      validationErrors.push(`Unknown command type: ${command.type}`);
      continue;
    }
    
    if (handler.validate) {
      const validation = handler.validate(state, items, command.payload);
      if (!validation.valid) {
        validationErrors.push(`${command.type}: ${validation.error || 'Validation failed'}`);
      }
    }
  }
  
  if (validationErrors.length > 0) {
    return {
      success: false,
      errors: validationErrors
    };
  }
  
  // Apply all commands
  const results = [];
  for (const command of commands) {
    const handler = commandHandlers[command.type];
    const result = handler.apply(state, items, command.payload);
    results.push(result);
    
    if (!result || !result.success) {
      // Stop on first failure
      return {
        success: false,
        error: result?.error || 'Command application failed',
        results
      };
    }
    
    // Analytics (if not skipped)
    if (!skipAnalytics && handler.analytics) {
      try {
        handler.analytics(command.payload, state, items);
      } catch (error) {
        console.warn('Analytics error:', error);
      }
    }
  }
  
  // Single refresh for all commands
  if (!skipRefresh) {
    const refresh = refreshFunction || defaultRefresh;
    refresh();
  }
  
  return {
    success: true,
    results
  };
}

/**
 * Enable command history tracking
 */
export function enableCommandHistory() {
  commandHistoryEnabled = true;
  commandHistory = [];
}

/**
 * Disable command history tracking
 */
export function disableCommandHistory() {
  commandHistoryEnabled = false;
  commandHistory = [];
}

/**
 * Get command history
 * @returns {Array} Array of executed commands
 */
export function getCommandHistory() {
  return [...commandHistory];
}

/**
 * Clear command history
 */
export function clearCommandHistory() {
  commandHistory = [];
}

