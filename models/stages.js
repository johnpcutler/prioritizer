import { CATEGORIES, LEVELS } from './constants.js';

// Stage order
export const STAGE_ORDER = ['Item Listing', 'urgency', 'value', 'duration', 'Results', 'CD3'];

// Declarative Stage Validation Rules
export const STAGE_RULES = {
    'Item Listing': [
        items => items.length > 0 || 'You must have at least one item before advancing to Urgency stage.'
    ],
    'urgency': [
        items => items.every(i => i.urgencySet) || 'All items need urgency set before advancing to Value stage.'
    ],
    'value': [
        items => items.every(i => i.valueSet) || 'All items need value set before advancing to Duration stage.'
    ],
    'duration': [
        items => items.every(i => i.duration && i.duration > 0) || 'All items need duration set before advancing to Results.'
    ],
    'Results': [],
    'CD3': []
};

// Validate stage requirements
export function validateStage(stage, items) {
    const rules = STAGE_RULES[stage] || [];
    for (const rule of rules) {
        const result = rule(items);
        if (result !== true) {
            return { valid: false, reason: result };
        }
    }
    return { valid: true };
}

// Stage Controller
export const STAGE_CONTROLLER = {
    getCurrentStage: (state) => state.currentStage || 'Item Listing',
    
    setCurrentStage: (state, stage) => {
        state.currentStage = stage;
    },
    
    getNextStage: (currentStage) => {
        const currentIndex = STAGE_ORDER.indexOf(currentStage);
        if (currentIndex === -1 || currentIndex >= STAGE_ORDER.length - 1) {
            return null;
        }
        return STAGE_ORDER[currentIndex + 1];
    },
    
    getPreviousStage: (currentStage) => {
        const currentIndex = STAGE_ORDER.indexOf(currentStage);
        if (currentIndex <= 0) {
            return null;
        }
        return STAGE_ORDER[currentIndex - 1];
    },
    
    canAdvance: (currentStage, items) => {
        const nextStage = STAGE_CONTROLLER.getNextStage(currentStage);
        if (!nextStage) {
            return { canAdvance: false, reason: 'Already at the final stage' };
        }
        
        // Special case: Item Listing -> Urgency: Must have at least one item
        if (currentStage === 'Item Listing') {
            if (items.length === 0) {
                return {
                    canAdvance: false,
                    reason: 'You must have at least one item before advancing to Urgency stage.'
                };
            }
            return { canAdvance: true };
        }
        
        // Use declarative validation for other stages
        const validation = validateStage(currentStage, items);
        if (!validation.valid) {
            return {
                canAdvance: false,
                reason: validation.reason
            };
        }
        
        return { canAdvance: true };
    },
    
    canGoBack: (currentStage) => {
        const previousStage = STAGE_CONTROLLER.getPreviousStage(currentStage);
        if (!previousStage) {
            return { canGoBack: false, reason: 'Already at the first stage' };
        }
        return { canGoBack: true };
    },
    
    getButtonStates: (currentStage, items) => {
        const advanceState = STAGE_CONTROLLER.canAdvance(currentStage, items);
        const backState = STAGE_CONTROLLER.canGoBack(currentStage);
        
        return {
            canAdvance: advanceState.canAdvance,
            advanceReason: advanceState.reason || '',
            canGoBack: backState.canGoBack,
            backReason: backState.reason || ''
        };
    },
    
    // Get stage display name
    getStageDisplayName: (stage) => {
        const displayNames = {
            'Item Listing': 'Items',
            'urgency': 'Urgency',
            'value': 'Value',
            'duration': 'Duration',
            'Results': 'Results',
            'CD3': 'CD3'
        };
        return displayNames[stage] || stage;
    },
    
    // Get stage navigation state
    getStageNavigationState: (currentStage, visitedStages, items) => {
        const currentIndex = STAGE_ORDER.indexOf(currentStage);
        const stages = STAGE_ORDER.map((stage, index) => {
            const isCurrent = stage === currentStage;
            const isVisited = visitedStages.includes(stage);
            const isBeforeCurrent = index < currentIndex;
            
            let status;
            let canNavigate = false;
            let reason = '';
            
            if (isCurrent) {
                status = 'current';
                canNavigate = false;
            } else if (isVisited && isBeforeCurrent) {
                // Previously visited stage - can always go back
                status = 'visited';
                canNavigate = true;
            } else if (isBeforeCurrent) {
                // Stage before current but not visited (shouldn't happen, but handle it)
                status = 'visited';
                canNavigate = true;
            } else {
                // Future stage - check if prerequisites are met
                const targetIndex = index;
                const canReach = STAGE_CONTROLLER.canNavigateToStage(stage, currentStage, visitedStages, items);
                
                if (canReach.canNavigate) {
                    status = 'future';
                    canNavigate = true;
                } else {
                    status = 'locked';
                    canNavigate = false;
                    reason = canReach.reason || 'Prerequisites not met';
                }
            }
            
            return {
                name: stage,
                displayName: STAGE_CONTROLLER.getStageDisplayName(stage),
                status: status,
                canNavigate: canNavigate,
                reason: reason
            };
        });
        
        return {
            currentStage: currentStage,
            stages: stages
        };
    },
    
    // Check if can navigate to a target stage
    canNavigateToStage: (targetStage, currentStage, visitedStages, items) => {
        if (!STAGE_ORDER.includes(targetStage)) {
            return { canNavigate: false, reason: 'Invalid stage' };
        }
        
        const targetIndex = STAGE_ORDER.indexOf(targetStage);
        const currentIndex = STAGE_ORDER.indexOf(currentStage);
        
        // Same stage
        if (targetIndex === currentIndex) {
            return { canNavigate: false, reason: 'Already at this stage' };
        }
        
        // Can always go back to visited stages
        if (targetIndex < currentIndex && visitedStages.includes(targetStage)) {
            return { canNavigate: true };
        }
        
        // Can't go back to unvisited stages
        if (targetIndex < currentIndex && !visitedStages.includes(targetStage)) {
            return { canNavigate: false, reason: 'Stage not yet visited' };
        }
        
        // Going forward - check prerequisites for each stage we need to pass through
        if (targetIndex > currentIndex) {
            // Check if we can reach this stage by validating all intermediate stages
            for (let i = currentIndex; i < targetIndex; i++) {
                const stageToValidate = STAGE_ORDER[i];
                const validation = validateStage(stageToValidate, items);
                if (!validation.valid) {
                    return { canNavigate: false, reason: validation.reason };
                }
            }
            return { canNavigate: true };
        }
        
        return { canNavigate: false, reason: 'Unknown navigation error' };
    },
    
    // Navigate to a stage
    navigateToStage: (targetStage, currentStage, visitedStages, items) => {
        const canNavigate = STAGE_CONTROLLER.canNavigateToStage(targetStage, currentStage, visitedStages, items);
        
        if (!canNavigate.canNavigate) {
            return {
                success: false,
                error: canNavigate.reason || 'Cannot navigate to this stage'
            };
        }
        
        const targetIndex = STAGE_ORDER.indexOf(targetStage);
        const currentIndex = STAGE_ORDER.indexOf(currentStage);
        
        // Update visitedStages if navigating forward
        let updatedVisitedStages = [...visitedStages];
        if (targetIndex > currentIndex) {
            // Add all stages from current to target to visitedStages
            for (let i = currentIndex; i <= targetIndex; i++) {
                const stage = STAGE_ORDER[i];
                if (!updatedVisitedStages.includes(stage)) {
                    updatedVisitedStages.push(stage);
                }
            }
        }
        
        return {
            success: true,
            visitedStages: updatedVisitedStages
        };
    }
};



