// Command handlers - define validation, mutation, analytics, and refresh for each command
// This file will be populated incrementally as commands are migrated

// Import dependencies that handlers will need
import { Store, persistAndRefresh } from '../state/appState.js';
import { StateStore } from '../state/StateStore.js';
import { Persistence } from '../state/persistence/index.js';
import { COMMAND_TYPES } from './commandTypes.js';
import { PROPERTY_META, CATEGORIES, LEVELS, STORAGE_KEY, APP_STATE_KEY } from '../models/constants.js';
import { STAGE_CONTROLLER, STAGE_ORDER } from '../models/stages.js';
import { updateItemProperty, insertItemIntoSequence, calculateConfidenceWeightedCD3, createItem, recomputeItemMetrics, removeItem as removeItemModel, isValidUrl, addItemNote, updateItemNote, deleteItemNote, getItemsSortedByCD3 } from '../models/items.js';
import { BucketActions } from '../models/bucketActions.js';
import { initializeBuckets } from '../models/buckets.js';
import { populateSettings, displayJson, updateStageNavigation, updateLockedDisplay, updateUrgencyView, updateValueView, updateDurationView, updateResultsView, updateItemListingView } from '../ui/display/index.js';
import { analytics } from '../analytics/analytics.js';

/**
 * Command handlers structure:
 * {
 *   COMMAND_TYPE: {
 *     validate(state, items, payload) {
 *       // Return { valid: boolean, error?: string }
 *     },
 *     apply(state, items, payload) {
 *       // Mutate state/items via Store
 *       // Return { success: boolean, error?: string }
 *     },
 *     analytics(payload, state, items) {
 *       // Track analytics event
 *     },
 *     refresh: true | false | function
 *   }
 * }
 */

export const COMMAND_HANDLERS = {
  [COMMAND_TYPES.ADD_ITEM]: {
    validate(state, items, payload) {
      const { name } = payload;
      
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return { valid: false, error: 'Item name is required' };
      }
      
      const currentStage = STAGE_CONTROLLER.getCurrentStage(state);
      if (currentStage !== 'Item Listing') {
        return {
          valid: false,
          error: `Error: Cannot add item. Current stage is "${currentStage}". You must be on the "Item Listing" stage to add new items. Use "Back Stage" command to return to Item Listing stage.`
        };
      }
      
      return { valid: true };
    },
    
    apply(state, items, payload) {
      const { name } = payload;
      
      // Check if any existing items have urgency set (prioritization has started)
      const hasPrioritizedItems = items.some(item => item.urgency && item.urgency > 0);
      
      const newItem = createItem(name);
      // Mark as new if other items have been prioritized
      if (hasPrioritizedItems) {
        newItem.isNewItem = true;
      }
      recomputeItemMetrics(newItem, state.buckets);
      
      items.push(newItem);
      Store.saveItems(items);
      
      const appStateAfter = Store.getAppState();
      persistAndRefresh(appStateAfter, items);
      
      return { success: true };
    },
    
    analytics(payload, state, items) {
      analytics.trackEvent('Add Item', {
        itemsCount: items.length
      });
    },
    
    refresh: true
  },
  
  [COMMAND_TYPES.REMOVE_ITEM]: {
    validate(state, items, payload) {
      const { itemId } = payload;
      
      const item = items.find(i => i.id === itemId);
      if (!item) {
        return { valid: false, error: 'Item not found' };
      }
      
      return { valid: true };
    },
    
    apply(state, items, payload) {
      const { itemId } = payload;
      
      const result = removeItemModel(itemId, items);
      if (!result.success) {
        return result;
      }
      
      Store.saveItems(items);
      
      const appState = Store.getAppState();
      persistAndRefresh(appState, items);
      
      return { success: true };
    },
    
    refresh: true
  },
  
  [COMMAND_TYPES.BULK_ADD_ITEMS]: {
    validate(state, items, payload) {
      const { itemNamesText } = payload;
      
      const currentStage = STAGE_CONTROLLER.getCurrentStage(state);
      if (currentStage !== 'Item Listing') {
        return {
          valid: false,
          error: `Error: Cannot bulk add items. Current stage is "${currentStage}". You must be on the "Item Listing" stage to add new items. Use "Back Stage" command to return to Item Listing stage.`
        };
      }
      
      if (!itemNamesText || typeof itemNamesText !== 'string') {
        return {
          valid: false,
          error: 'Error: Invalid input. Please provide item names separated by newlines.'
        };
      }
      
      const lines = itemNamesText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      if (lines.length === 0) {
        return {
          valid: false,
          error: 'Error: No valid item names found. Please enter at least one item name.'
        };
      }
      
      return { valid: true };
    },
    
    apply(state, items, payload) {
      const { itemNamesText } = payload;
      
      const lines = itemNamesText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      // Check if any existing items have urgency set (prioritization has started)
      const hasPrioritizedItems = items.some(item => item.urgency && item.urgency > 0);
      
      let added = 0;
      let itemsWithLinksCount = 0;
      const errors = [];
      
      lines.forEach((line, index) => {
        // Parse line: "Item Name, https://example.com" or just "Item Name"
        let itemName = line;
        let itemLink = null;
        
        // Check if line contains a comma (potential separator for link)
        const commaIndex = line.lastIndexOf(',');
        if (commaIndex > 0) {
          // Split on last comma to handle item names that might contain commas
          const potentialName = line.substring(0, commaIndex).trim();
          const potentialLink = line.substring(commaIndex + 1).trim();
          
          // If the part after comma looks like a URL, treat it as a link
          if (potentialLink && isValidUrl(potentialLink)) {
            itemName = potentialName;
            itemLink = potentialLink;
          }
          // Otherwise, treat the whole line as the item name
        }
        
        if (itemName.length === 0) {
          errors.push(`Line ${index + 1}: Empty item name`);
          return;
        }
        
        const newItem = createItem(itemName, itemLink);
        // Mark as new if other items have been prioritized
        if (hasPrioritizedItems) {
          newItem.isNewItem = true;
        }
        recomputeItemMetrics(newItem, state.buckets);
        items.push(newItem);
        added++;
        
        // Count items with hyperlinks
        if (itemLink) {
          itemsWithLinksCount++;
        }
      });
      
      Store.saveItems(items);
      const appStateAfter = Store.getAppState();
      persistAndRefresh(appStateAfter, items);
      
      return {
        success: true,
        added: added,
        total: lines.length,
        errors: errors
      };
    },
    
    analytics(payload, state, items) {
      // Analytics will be called with result from apply
      // We need to track this after apply completes
      // For now, we'll track in the apply function result
    },
    
    refresh: true
  },
  
  [COMMAND_TYPES.SET_ITEM_ACTIVE]: {
    validate(state, items, payload) {
      const { itemId } = payload;
      
      const item = items.find(i => i.id === itemId);
      if (!item) {
        return { valid: false, error: 'Item not found' };
      }
      
      return { valid: true };
    },
    
    apply(state, items, payload) {
      const { itemId } = payload;
      
      const item = items.find(i => i.id === itemId);
      if (!item) {
        return { success: false, error: 'Item not found' };
      }
      
      item.active = true;
      recomputeItemMetrics(item, state.buckets);
      Store.saveItems(items);
      
      return { success: true };
    },
    
    refresh: true
  },
  
  [COMMAND_TYPES.SET_ITEM_INACTIVE]: {
    validate(state, items, payload) {
      const { itemId } = payload;
      
      const item = items.find(i => i.id === itemId);
      if (!item) {
        return { valid: false, error: 'Item not found' };
      }
      
      return { valid: true };
    },
    
    apply(state, items, payload) {
      const { itemId } = payload;
      
      const item = items.find(i => i.id === itemId);
      if (!item) {
        return { success: false, error: 'Item not found' };
      }
      
      item.active = false;
      recomputeItemMetrics(item, state.buckets);
      Store.saveItems(items);
      
      return { success: true };
    },
    
    refresh: true
  },
  
  [COMMAND_TYPES.SET_ITEM_PROPERTY]: {
    validate(state, items, payload) {
      const { itemId, property, value } = payload;
      
      // Find item
      const item = items.find(i => i.id === itemId);
      if (!item) {
        return { valid: false, error: 'Item not found' };
      }
      
      // Validate property
      const meta = PROPERTY_META[property];
      if (!meta) {
        return { valid: false, error: `Invalid property: ${property}` };
      }
      
      // Check current stage and locked setting
      const currentStage = STAGE_CONTROLLER.getCurrentStage(state);
      const isLocked = state.locked !== false;
      
      if (isLocked) {
        if (currentStage !== meta.stage) {
          return {
            valid: false,
            error: `Error: Cannot set ${property.charAt(0).toUpperCase() + property.slice(1)}. Current stage is "${currentStage}". You must be on the "${meta.stage}" stage to set ${property} values. Use "Advance Stage" or "Back Stage" commands to navigate.`
          };
        }
      } else {
        const currentStageIndex = STAGE_ORDER.indexOf(currentStage);
        const propertyStageIndex = STAGE_ORDER.indexOf(meta.stage);
        if (propertyStageIndex > currentStageIndex) {
          return {
            valid: false,
            error: `Error: Cannot set ${property.charAt(0).toUpperCase() + property.slice(1)}. Current stage is "${currentStage}". You must be on the "${meta.stage}" stage or later to set ${property} values. Use "Advance Stage" command to navigate.`
          };
        }
      }
      
      return { valid: true };
    },
    
    apply(state, items, payload) {
      const { itemId, property, value } = payload;
      const item = items.find(i => i.id === itemId);
      
      // Store old CD3 before update to detect transition
      const oldCD3 = item.CD3 || 0;
      
      // Use unified update function
      const result = updateItemProperty(item, property, value, state.buckets);
      if (!result.valid) {
        return { success: false, error: result.error };
      }
      
      // Check if CD3 transitioned from 0 to >0
      const newCD3 = item.CD3 || 0;
      if (oldCD3 === 0 && newCD3 > 0) {
        // Item just got CD3 - insert into sequence
        insertItemIntoSequence(item, items, state);
      }
      
      // Recalculate confidence-weighted CD3 if survey exists
      if (item.hasConfidenceSurvey && (property === 'urgency' || property === 'value' || property === 'duration')) {
        calculateConfidenceWeightedCD3(item, state);
      }
      
      Store.saveItems(items);
      persistAndRefresh(state, items);
      
      return { success: true };
    },
    
    analytics(payload, state, items) {
      const { itemId, property, value } = payload;
      
      // Track analytics events for property changes
      if (property === 'urgency' || property === 'value' || property === 'duration') {
        const bucket = value;
        const bucketName = state.buckets[property] && state.buckets[property][bucket] 
          ? state.buckets[property][bucket].title 
          : `Bucket ${bucket}`;
        
        const eventName = property === 'urgency' ? 'Set Urgency' 
          : property === 'value' ? 'Set Value' 
          : 'Set Duration';
        
        analytics.trackEvent(eventName, {
          bucket: bucket,
          bucketName: bucketName,
          itemId: itemId
        });
      }
    },
    
    refresh: true  // Full refresh
  },
  
  [COMMAND_TYPES.NAVIGATE_TO_STAGE]: {
    validate(state, items, payload) {
      const { targetStage } = payload;
      const currentStage = STAGE_CONTROLLER.getCurrentStage(state);
      const visitedStages = state.visitedStages || ['Item Listing'];
      
      const navigationResult = STAGE_CONTROLLER.navigateToStage(targetStage, currentStage, visitedStages, items);
      if (!navigationResult.success) {
        return {
          valid: false,
          error: navigationResult.error || 'Cannot navigate to this stage'
        };
      }
      
      return { valid: true };
    },
    
    apply(state, items, payload) {
      const { targetStage } = payload;
      const currentStage = STAGE_CONTROLLER.getCurrentStage(state);
      const visitedStages = state.visitedStages || ['Item Listing'];
      
      const navigationResult = STAGE_CONTROLLER.navigateToStage(targetStage, currentStage, visitedStages, items);
      
      // Update stage and visitedStages
      STAGE_CONTROLLER.setCurrentStage(state, targetStage);
      if (navigationResult.visitedStages) {
        state.visitedStages = navigationResult.visitedStages;
      }
      Store.save(state);
      
      return { success: true };
    },
    
    refresh: true
  },
  
  [COMMAND_TYPES.ADVANCE_STAGE]: {
    validate(state, items, payload) {
      const currentStage = STAGE_CONTROLLER.getCurrentStage(state);
      
      const validation = STAGE_CONTROLLER.canAdvance(currentStage, items);
      if (!validation.canAdvance) {
        return {
          valid: false,
          error: `Error: Cannot advance stage. ${validation.reason}`
        };
      }
      
      const nextStage = STAGE_CONTROLLER.getNextStage(currentStage);
      if (!nextStage) {
        return {
          valid: false,
          error: 'Error: Already at the final stage (CD3). Cannot advance further.'
        };
      }
      
      return { valid: true };
    },
    
    apply(state, items, payload) {
      const currentStage = STAGE_CONTROLLER.getCurrentStage(state);
      const nextStage = STAGE_CONTROLLER.getNextStage(currentStage);
      
      STAGE_CONTROLLER.setCurrentStage(state, nextStage);
      Store.save(state);
      
      return { success: true };
    },
    
    refresh: true
  },
  
  [COMMAND_TYPES.BACK_STAGE]: {
    validate(state, items, payload) {
      const currentStage = STAGE_CONTROLLER.getCurrentStage(state);
      
      const canGoBackResult = STAGE_CONTROLLER.canGoBack(currentStage);
      if (!canGoBackResult.canGoBack) {
        return {
          valid: false,
          error: `Error: Already at the first stage (Item Listing). Cannot go back further.`
        };
      }
      
      return { valid: true };
    },
    
    apply(state, items, payload) {
      const currentStage = STAGE_CONTROLLER.getCurrentStage(state);
      const previousStage = STAGE_CONTROLLER.getPreviousStage(currentStage);
      
      STAGE_CONTROLLER.setCurrentStage(state, previousStage);
      Store.save(state);
      
      return { success: true };
    },
    
    refresh: true
  },
  
  [COMMAND_TYPES.SET_CURRENT_STAGE]: {
    validate(state, items, payload) {
      const { stage } = payload;
      
      if (!STAGE_ORDER.includes(stage)) {
        return {
          valid: false,
          error: `Invalid stage: ${stage}. Must be one of: ${STAGE_ORDER.join(', ')}`
        };
      }
      
      const currentStage = STAGE_CONTROLLER.getCurrentStage(state);
      const visitedStages = state.visitedStages || ['Item Listing'];
      
      const navigationResult = STAGE_CONTROLLER.navigateToStage(stage, currentStage, visitedStages, items);
      if (!navigationResult.success) {
        return {
          valid: false,
          error: navigationResult.error || 'Cannot navigate to this stage'
        };
      }
      
      return { valid: true };
    },
    
    apply(state, items, payload) {
      const { stage } = payload;
      const currentStage = STAGE_CONTROLLER.getCurrentStage(state);
      const visitedStages = state.visitedStages || ['Item Listing'];
      
      const navigationResult = STAGE_CONTROLLER.navigateToStage(stage, currentStage, visitedStages, items);
      
      // Update stage and visitedStages
      STAGE_CONTROLLER.setCurrentStage(state, stage);
      if (navigationResult.visitedStages) {
        state.visitedStages = navigationResult.visitedStages;
      }
      Store.save(state);
      
      return { success: true };
    },
    
    refresh: true
  },
  
  // Bucket commands - all follow similar pattern using BucketActions
  [COMMAND_TYPES.SET_URGENCY_LIMIT]: {
    validate(state, items, payload) {
      const { level, limit } = payload;
      if (!LEVELS.includes(level)) {
        return { valid: false, error: `Invalid level: ${level}. Must be 1, 2, or 3.` };
      }
      if (typeof limit !== 'number' || limit < 0) {
        return { valid: false, error: 'Limit must be a non-negative number' };
      }
      return { valid: true };
    },
    apply(state, items, payload) {
      return BucketActions.setLimit('urgency', payload.level, payload.limit);
    },
    refresh: true
  },
  
  [COMMAND_TYPES.SET_VALUE_LIMIT]: {
    validate(state, items, payload) {
      const { level, limit } = payload;
      if (!LEVELS.includes(level)) {
        return { valid: false, error: `Invalid level: ${level}. Must be 1, 2, or 3.` };
      }
      if (typeof limit !== 'number' || limit < 0) {
        return { valid: false, error: 'Limit must be a non-negative number' };
      }
      return { valid: true };
    },
    apply(state, items, payload) {
      return BucketActions.setLimit('value', payload.level, payload.limit);
    },
    refresh: true
  },
  
  [COMMAND_TYPES.SET_URGENCY_WEIGHT]: {
    validate(state, items, payload) {
      const { level, weight } = payload;
      if (!LEVELS.includes(level)) {
        return { valid: false, error: `Invalid level: ${level}. Must be 1, 2, or 3.` };
      }
      if (typeof weight !== 'number' || weight < 0) {
        return { valid: false, error: 'Weight must be a non-negative number' };
      }
      return { valid: true };
    },
    apply(state, items, payload) {
      return BucketActions.setWeight('urgency', payload.level, payload.weight);
    },
    refresh: true
  },
  
  [COMMAND_TYPES.SET_VALUE_WEIGHT]: {
    validate(state, items, payload) {
      const { level, weight } = payload;
      if (!LEVELS.includes(level)) {
        return { valid: false, error: `Invalid level: ${level}. Must be 1, 2, or 3.` };
      }
      if (typeof weight !== 'number' || weight < 0) {
        return { valid: false, error: 'Weight must be a non-negative number' };
      }
      return { valid: true };
    },
    apply(state, items, payload) {
      return BucketActions.setWeight('value', payload.level, payload.weight);
    },
    refresh: true
  },
  
  [COMMAND_TYPES.SET_DURATION_WEIGHT]: {
    validate(state, items, payload) {
      const { level, weight } = payload;
      if (!LEVELS.includes(level)) {
        return { valid: false, error: `Invalid level: ${level}. Must be 1, 2, or 3.` };
      }
      if (typeof weight !== 'number' || weight < 0) {
        return { valid: false, error: 'Weight must be a non-negative number' };
      }
      return { valid: true };
    },
    apply(state, items, payload) {
      return BucketActions.setWeight('duration', payload.level, payload.weight);
    },
    refresh: true
  },
  
  [COMMAND_TYPES.SET_URGENCY_TITLE]: {
    validate(state, items, payload) {
      const { level, title } = payload;
      if (!LEVELS.includes(level)) {
        return { valid: false, error: `Invalid level: ${level}. Must be 1, 2, or 3.` };
      }
      if (typeof title !== 'string') {
        return { valid: false, error: 'Title must be a string' };
      }
      return { valid: true };
    },
    apply(state, items, payload) {
      return BucketActions.setTitle('urgency', payload.level, payload.title);
    },
    refresh: true
  },
  
  [COMMAND_TYPES.SET_URGENCY_DESCRIPTION]: {
    validate(state, items, payload) {
      const { level, description } = payload;
      if (!LEVELS.includes(level)) {
        return { valid: false, error: `Invalid level: ${level}. Must be 1, 2, or 3.` };
      }
      if (typeof description !== 'string') {
        return { valid: false, error: 'Description must be a string' };
      }
      return { valid: true };
    },
    apply(state, items, payload) {
      return BucketActions.setDescription('urgency', payload.level, payload.description);
    },
    refresh: true
  },
  
  [COMMAND_TYPES.SET_VALUE_TITLE]: {
    validate(state, items, payload) {
      const { level, title } = payload;
      if (!LEVELS.includes(level)) {
        return { valid: false, error: `Invalid level: ${level}. Must be 1, 2, or 3.` };
      }
      if (typeof title !== 'string') {
        return { valid: false, error: 'Title must be a string' };
      }
      return { valid: true };
    },
    apply(state, items, payload) {
      return BucketActions.setTitle('value', payload.level, payload.title);
    },
    refresh: true
  },
  
  [COMMAND_TYPES.SET_VALUE_DESCRIPTION]: {
    validate(state, items, payload) {
      const { level, description } = payload;
      if (!LEVELS.includes(level)) {
        return { valid: false, error: `Invalid level: ${level}. Must be 1, 2, or 3.` };
      }
      if (typeof description !== 'string') {
        return { valid: false, error: 'Description must be a string' };
      }
      return { valid: true };
    },
    apply(state, items, payload) {
      return BucketActions.setDescription('value', payload.level, payload.description);
    },
    refresh: true
  },
  
  [COMMAND_TYPES.SET_DURATION_TITLE]: {
    validate(state, items, payload) {
      const { level, title } = payload;
      if (!LEVELS.includes(level)) {
        return { valid: false, error: `Invalid level: ${level}. Must be 1, 2, or 3.` };
      }
      if (typeof title !== 'string') {
        return { valid: false, error: 'Title must be a string' };
      }
      return { valid: true };
    },
    apply(state, items, payload) {
      return BucketActions.setTitle('duration', payload.level, payload.title);
    },
    refresh: true
  },
  
  [COMMAND_TYPES.SET_DURATION_DESCRIPTION]: {
    validate(state, items, payload) {
      const { level, description } = payload;
      if (!LEVELS.includes(level)) {
        return { valid: false, error: `Invalid level: ${level}. Must be 1, 2, or 3.` };
      }
      if (typeof description !== 'string') {
        return { valid: false, error: 'Description must be a string' };
      }
      return { valid: true };
    },
    apply(state, items, payload) {
      return BucketActions.setDescription('duration', payload.level, payload.description);
    },
    refresh: true
  },
  
  [COMMAND_TYPES.ADD_ITEM_NOTE]: {
    validate(state, items, payload) {
      const { itemId, noteText } = payload;
      
      const item = items.find(i => i.id === itemId);
      if (!item) {
        return { valid: false, error: 'Item not found' };
      }
      
      if (!noteText || typeof noteText !== 'string' || noteText.trim().length === 0) {
        return { valid: false, error: 'Note text is required' };
      }
      
      return { valid: true };
    },
    
    apply(state, items, payload) {
      const { itemId, noteText } = payload;
      const item = items.find(i => i.id === itemId);
      
      const result = addItemNote(item, noteText);
      if (!result.success) {
        return result;
      }
      
      Store.saveItems(items);
      const appState = Store.getAppState();
      persistAndRefresh(appState, items);
      
      return { success: true };
    },
    
    refresh: true
  },
  
  [COMMAND_TYPES.UPDATE_ITEM_NOTE]: {
    validate(state, items, payload) {
      const { itemId, noteIndex, noteText } = payload;
      
      const item = items.find(i => i.id === itemId);
      if (!item) {
        return { valid: false, error: 'Item not found' };
      }
      
      if (noteIndex === undefined || noteIndex === null || typeof noteIndex !== 'number') {
        return { valid: false, error: 'Note index is required' };
      }
      
      if (!item.notes || !Array.isArray(item.notes) || noteIndex < 0 || noteIndex >= item.notes.length) {
        return { valid: false, error: 'Invalid note index' };
      }
      
      if (!noteText || typeof noteText !== 'string' || noteText.trim().length === 0) {
        return { valid: false, error: 'Note text is required' };
      }
      
      return { valid: true };
    },
    
    apply(state, items, payload) {
      const { itemId, noteIndex, noteText } = payload;
      const item = items.find(i => i.id === itemId);
      
      const result = updateItemNote(item, noteIndex, noteText);
      if (!result.success) {
        return result;
      }
      
      Store.saveItems(items);
      const appState = Store.getAppState();
      persistAndRefresh(appState, items);
      
      return { success: true };
    },
    
    refresh: true
  },
  
  [COMMAND_TYPES.DELETE_ITEM_NOTE]: {
    validate(state, items, payload) {
      const { itemId, noteIndex } = payload;
      
      const item = items.find(i => i.id === itemId);
      if (!item) {
        return { valid: false, error: 'Item not found' };
      }
      
      if (noteIndex === undefined || noteIndex === null || typeof noteIndex !== 'number') {
        return { valid: false, error: 'Note index is required' };
      }
      
      if (!item.notes || !Array.isArray(item.notes) || noteIndex < 0 || noteIndex >= item.notes.length) {
        return { valid: false, error: 'Invalid note index' };
      }
      
      return { valid: true };
    },
    
    apply(state, items, payload) {
      const { itemId, noteIndex } = payload;
      const item = items.find(i => i.id === itemId);
      
      const result = deleteItemNote(item, noteIndex);
      if (!result.success) {
        return result;
      }
      
      Store.saveItems(items);
      const appState = Store.getAppState();
      persistAndRefresh(appState, items);
      
      return { success: true };
    },
    
    refresh: true
  },
  
  [COMMAND_TYPES.OPEN_CONFIDENCE_SURVEY]: {
    validate(state, items, payload) {
      const { itemId } = payload;
      
      const item = items.find(i => i.id === itemId);
      if (!item) {
        return { valid: false, error: 'Item not found' };
      }
      
      // Check if item has required properties
      if (!item.urgency || item.urgency === 0 || !item.value || item.value === 0 || !item.duration || item.duration === 0) {
        return { valid: false, error: 'Item must have urgency, value, and duration set before running confidence survey' };
      }
      
      return { valid: true };
    },
    
    apply(state, items, payload) {
      const { itemId } = payload;
      
      // Find and show the survey form
      const surveyForm = document.querySelector(`.confidence-survey-form[data-item-id="${itemId}"]`);
      if (surveyForm) {
        surveyForm.style.display = 'block';
      }
      
      return { success: true };
    },
    
    analytics(payload, state, items) {
      const { itemId } = payload;
      const item = items.find(i => i.id === itemId);
      
      // Calculate sequence for analytics
      let sequence = null;
      if (item.sequence !== null && item.sequence !== undefined) {
        sequence = item.sequence;
      } else {
        // Calculate from sorted results list
        const itemsWithSequence = items.filter(i => i.sequence !== null && i.sequence !== undefined);
        if (itemsWithSequence.length > 0) {
          const sortedItems = [...items].sort((a, b) => {
            const seqA = a.sequence !== null && a.sequence !== undefined ? a.sequence : 9999;
            const seqB = b.sequence !== null && b.sequence !== undefined ? b.sequence : 9999;
            return seqA - seqB;
          });
          const itemIndex = sortedItems.findIndex(i => i.id === itemId);
          sequence = itemIndex >= 0 ? itemIndex + 1 : null;
        } else {
          // No items with sequence, use CD3 sorted position
          const sortedItems = getItemsSortedByCD3(items);
          const itemIndex = sortedItems.findIndex(i => i.id === itemId);
          sequence = itemIndex >= 0 ? itemIndex + 1 : null;
        }
      }
      
      analytics.trackEvent('Run Confidence Survey', {
        itemId: itemId,
        sequence: sequence
      });
    },
    
    refresh: false  // No refresh needed, just shows form
  },
  
  [COMMAND_TYPES.SUBMIT_CONFIDENCE_SURVEY]: {
    validate(state, items, payload) {
      const { itemId, surveyData } = payload;
      
      const item = items.find(i => i.id === itemId);
      if (!item) {
        return { valid: false, error: 'Item not found' };
      }
      
      // Validate survey data
      if (!surveyData || typeof surveyData !== 'object') {
        return { valid: false, error: 'Invalid survey data' };
      }
      
      const requiredDimensions = [
        { key: 'scopeConfidence', name: 'Scope Confidence' },
        { key: 'urgencyConfidence', name: 'Urgency Confidence' },
        { key: 'valueConfidence', name: 'Value Confidence' },
        { key: 'durationConfidence', name: 'Duration Confidence' }
      ];
      
      // First pass: validate structure and normalize data
      for (const { key } of requiredDimensions) {
        if (!surveyData[key] || typeof surveyData[key] !== 'object') {
          return { valid: false, error: `Missing or invalid ${key} data` };
        }
        for (let level = 1; level <= 4; level++) {
          const count = surveyData[key][level];
          if (count === undefined || count === null) {
            surveyData[key][level] = 0;
          } else {
            const numCount = parseInt(count);
            if (isNaN(numCount) || numCount < 0) {
              return { valid: false, error: `Invalid vote count for ${key} level ${level}` };
            }
            surveyData[key][level] = numCount;
          }
        }
      }
      
      // Validate that each dimension has at least one vote
      const missingDimensions = [];
      for (const { key, name } of requiredDimensions) {
        const votes = surveyData[key];
        const totalVotes = Object.values(votes).reduce((sum, count) => sum + (parseInt(count) || 0), 0);
        if (totalVotes === 0) {
          missingDimensions.push(name);
        }
      }
      
      if (missingDimensions.length > 0) {
        return {
          valid: false,
          error: `Please enter at least one vote in each section. Missing votes in: ${missingDimensions.join(', ')}`
        };
      }
      
      return { valid: true };
    },
    
    apply(state, items, payload) {
      const { itemId, surveyData } = payload;
      const item = items.find(i => i.id === itemId);
      
      // Normalize survey data (already validated)
      const requiredDimensions = ['scopeConfidence', 'urgencyConfidence', 'valueConfidence', 'durationConfidence'];
      let selectionsCount = 0;
      
      for (const key of requiredDimensions) {
        for (let level = 1; level <= 4; level++) {
          const count = surveyData[key][level];
          if (count > 0) {
            selectionsCount++;
          }
        }
      }
      
      // Save survey data
      item.confidenceSurvey = surveyData;
      item.hasConfidenceSurvey = true;
      
      // Calculate confidence-weighted CD3
      calculateConfidenceWeightedCD3(item, state);
      
      // Hide the survey form
      const surveyForm = document.querySelector(`.confidence-survey-form[data-item-id="${itemId}"]`);
      if (surveyForm) {
        surveyForm.style.display = 'none';
      }
      
      Store.saveItems(items);
      persistAndRefresh(state, items);
      
      return { success: true, selectionsCount };
    },
    
    analytics(payload, state, items) {
      // Analytics is tracked in apply since we need selectionsCount
      // This will be called after apply, but we'll track it in apply itself
    },
    
    refresh: true
  },
  
  [COMMAND_TYPES.DELETE_CONFIDENCE_SURVEY]: {
    validate(state, items, payload) {
      const { itemId } = payload;
      
      const item = items.find(i => i.id === itemId);
      if (!item) {
        return { valid: false, error: 'Item not found' };
      }
      
      return { valid: true };
    },
    
    apply(state, items, payload) {
      const { itemId } = payload;
      const item = items.find(i => i.id === itemId);
      
      // Remove survey data
      item.hasConfidenceSurvey = false;
      item.confidenceSurvey = {
        scopeConfidence: {1: 0, 2: 0, 3: 0, 4: 0},
        urgencyConfidence: {1: 0, 2: 0, 3: 0, 4: 0},
        valueConfidence: {1: 0, 2: 0, 3: 0, 4: 0},
        durationConfidence: {1: 0, 2: 0, 3: 0, 4: 0}
      };
      item.confidenceWeightedCD3 = null;
      item.confidenceWeightedValues = null;
      
      // Hide the survey form if open
      const surveyForm = document.querySelector(`.confidence-survey-form[data-item-id="${itemId}"]`);
      if (surveyForm) {
        surveyForm.style.display = 'none';
      }
      
      Store.saveItems(items);
      persistAndRefresh(state, items);
      
      return { success: true };
    },
    
    analytics(payload, state, items) {
      const { itemId } = payload;
      analytics.trackEvent('Delete Survey', {
        itemId: itemId
      });
    },
    
    refresh: true
  },
  
  [COMMAND_TYPES.CANCEL_CONFIDENCE_SURVEY]: {
    validate(state, items, payload) {
      const { itemId } = payload;
      
      const item = items.find(i => i.id === itemId);
      if (!item) {
        return { valid: false, error: 'Item not found' };
      }
      
      return { valid: true };
    },
    
    apply(state, items, payload) {
      const { itemId } = payload;
      
      // Hide the survey form
      const surveyForm = document.querySelector(`.confidence-survey-form[data-item-id="${itemId}"]`);
      if (surveyForm) {
        surveyForm.style.display = 'none';
      }
      
      return { success: true };
    },
    
    refresh: false  // No refresh needed, just hides form
  },
  
  [COMMAND_TYPES.START_APP]: {
    validate(state, items, payload) {
      // No validation needed - always allowed
      return { valid: true };
    },
    
    apply(state, items, payload) {
      // Clear persistence
      Persistence.clear();
      
      // Clear StateStore
      StateStore.clear();
      
      // Create new default state (with all required fields)
      const appState = {
        currentStage: 'Item Listing',
        visitedStages: ['Item Listing'],
        buckets: initializeBuckets(),
        locked: true,
        resultsManuallyReordered: false,
        confidenceWeights: {
          1: 0.30,
          2: 0.50,
          3: 0.70,
          4: 0.90
        },
        confidenceLevelLabels: {
          1: "Not Confident (rarely, unlikely, low probability)",
          2: "Somewhat Confident (maybe, possibly, moderate probability)",
          3: "Confident (likely, probably, high probability)",
          4: "Very Confident (almost certainly, almost always, certainly)"
        }
      };
      
      // Initialize StateStore with empty items and new state
      StateStore.init(appState, []);
      
      // Save to persistence
      Persistence.saveState(appState);
      Persistence.saveItems([]);
      
      console.log('App started - all data cleared');
      
      return { success: true };
    },
    
    refresh: () => {
      // Custom refresh for startApp - doesn't need all views
      displayJson();
      updateStageNavigation();
      updateLockedDisplay();
    }
  },
  
  [COMMAND_TYPES.CLEAR_ITEM_DATA_ONLY]: {
    validate(state, items, payload) {
      // No validation needed - always allowed
      return { valid: true };
    },
    
    apply(state, items, payload) {
      // Clear items from persistence
      Persistence.clearItems();
      
      // Clear items from StateStore
      StateStore.setItems([]);
      
      // Get current app state (or create new one)
      const appState = Store.getAppState() || {
        currentStage: 'Item Listing',
        buckets: initializeBuckets(),
        locked: true,
        visitedStages: ['Item Listing']
      };
      
      // Reset stage and visited stages, but keep buckets
      appState.currentStage = 'Item Listing';
      appState.visitedStages = ['Item Listing'];
      
      // Update StateStore and persistence
      StateStore.setState(appState);
      Persistence.saveState(appState);
      
      console.log('Item data cleared, settings preserved');
      
      return { success: true };
    },
    
    refresh: () => {
      // Custom refresh for clearItemDataOnly
      populateSettings();
      displayJson();
      updateStageNavigation();
      updateLockedDisplay();
      updateUrgencyView();
      updateValueView();
      updateDurationView();
      updateResultsView();
      updateItemListingView();
    }
  },
  
  [COMMAND_TYPES.CLEAR_ALL_DATA]: {
    validate(state, items, payload) {
      // No validation needed - always allowed
      return { valid: true };
    },
    
    apply(state, items, payload) {
      const { clearSettings = false } = payload;
      
      // Clear persistence
      Persistence.clear();
      
      // Clear StateStore
      StateStore.clear();
      
      // Reinitialize app state
      const appState = {
        currentStage: 'Item Listing',
        buckets: clearSettings ? initializeBuckets() : (state?.buckets || initializeBuckets()),
        locked: true,
        visitedStages: ['Item Listing']
      };
      
      // Initialize StateStore with new state and empty items
      StateStore.init(appState, []);
      
      // Save to persistence
      Persistence.saveState(appState);
      Persistence.saveItems([]);
      
      console.log('All data cleared');
      
      return { success: true };
    },
    
    refresh: () => {
      // Custom refresh for clearAllData
      populateSettings();
      displayJson();
      updateStageNavigation();
      updateLockedDisplay();
      updateUrgencyView();
      updateValueView();
      updateDurationView();
      updateResultsView();
      updateItemListingView();
    }
  }
};

