// Navigation Coordinator
// Centralized interface for updating both desktop and mobile navigation
// Provides a single source of truth for navigation state updates

import { updateMobileWorkflowDropdown } from './mobileNav.js';

/**
 * Navigation update coordinator
 * Handles updates to both desktop and mobile navigation displays
 */
export class NavigationCoordinator {
    constructor(navigateToStage) {
        this.navigateToStage = navigateToStage;
    }
    
    /**
     * Update mobile navigation display
     * Desktop navigation is updated separately by updateStageNavigation()
     */
    updateMobile() {
        if (this.navigateToStage) {
            updateMobileWorkflowDropdown(this.navigateToStage);
        }
    }
    
    /**
     * Update all navigation displays (desktop and mobile)
     * @param {Function} updateDesktopNav - Function to update desktop navigation (optional)
     */
    updateAll(updateDesktopNav) {
        // Update desktop navigation if provided
        if (updateDesktopNav && typeof updateDesktopNav === 'function') {
            updateDesktopNav();
        }
        
        // Always update mobile navigation
        this.updateMobile();
    }
    
    /**
     * Set the navigateToStage function
     * @param {Function} navigateToStage - Function to call for navigation
     */
    setNavigateToStage(navigateToStage) {
        this.navigateToStage = navigateToStage;
    }
}

// Singleton instance (optional - can be instantiated per app)
let coordinatorInstance = null;

/**
 * Get or create navigation coordinator instance
 * @param {Function} navigateToStage - Function to call for navigation
 * @returns {NavigationCoordinator} - Coordinator instance
 */
export function getNavigationCoordinator(navigateToStage) {
    if (!coordinatorInstance) {
        coordinatorInstance = new NavigationCoordinator(navigateToStage);
    } else if (navigateToStage) {
        coordinatorInstance.setNavigateToStage(navigateToStage);
    }
    return coordinatorInstance;
}

/**
 * Reset coordinator instance (useful for testing)
 */
export function resetNavigationCoordinator() {
    coordinatorInstance = null;
}

