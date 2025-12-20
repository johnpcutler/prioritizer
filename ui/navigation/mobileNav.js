// Mobile navigation module - handles hamburger menu and mobile workflow dropdown
// Keeps mobile navigation logic decoupled from display

import { STAGE_CONTROLLER } from '../../models/stages.js';
import { Store } from '../../state/appState.js';
import { 
    MOBILE_NAV_SELECTORS, 
    MOBILE_NAV_CLASSES,
    getElementById 
} from './mobileNavConfig.js';

// Store event listeners for cleanup
let clickOutsideHandler = null;
let hamburgerMenuClickHandler = null;
let workflowDropdownChangeHandler = null;

/**
 * Update the mobile workflow dropdown with current stage and available options
 * @param {Function} navigateToStage - Function to call when stage is selected
 */
export function updateMobileWorkflowDropdown(navigateToStage) {
    const dropdown = getElementById('workflowDropdown');
    if (!dropdown) return;
    
    const appState = Store.getAppState();
    const items = Store.getItems();
    const currentStage = STAGE_CONTROLLER.getCurrentStage(appState);
    const visitedStages = appState.visitedStages || ['Item Listing'];
    
    // Get navigation state
    const navState = STAGE_CONTROLLER.getStageNavigationState(currentStage, visitedStages, items);
    
    // Clear existing options
    dropdown.innerHTML = '';
    
    // Add options for each stage
    navState.stages.forEach(stageInfo => {
        const option = document.createElement('option');
        option.value = stageInfo.name;
        option.textContent = stageInfo.displayName;
        
        // Mark current stage
        if (stageInfo.status === 'current') {
            option.selected = true;
        }
        
        // Disable locked stages
        if (!stageInfo.canNavigate) {
            option.disabled = true;
            if (stageInfo.reason) {
                option.title = stageInfo.reason;
            }
        }
        
        dropdown.appendChild(option);
    });
}

/**
 * Initialize mobile navigation (hamburger menu and workflow dropdown)
 * Returns cleanup function for proper resource management
 * @param {Function} navigateToStage - Function to call when stage is selected
 * @returns {Function} - Cleanup function to remove event listeners
 */
export function initMobileNav(navigateToStage) {
    // Cleanup any existing listeners first
    cleanupMobileNav();
    
    // Hamburger menu toggle
    const hamburgerBtn = getElementById('hamburgerBtn');
    const hamburgerMenu = getElementById('hamburgerMenu');
    
    if (hamburgerBtn && hamburgerMenu) {
        const hamburgerBtnClickHandler = (e) => {
            e.stopPropagation();
            toggleHamburgerMenu();
        };
        
        hamburgerBtn.addEventListener('click', hamburgerBtnClickHandler);
        
        // Close menu when clicking outside
        clickOutsideHandler = (e) => {
            if (!hamburgerMenu.contains(e.target) && !hamburgerBtn.contains(e.target)) {
                closeHamburgerMenu();
            }
        };
        document.addEventListener('click', clickOutsideHandler);
        
        // Close menu when clicking on menu items (they handle their own actions)
        hamburgerMenuClickHandler = (e) => {
            // Close menu after a short delay to allow click handlers to fire
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A') {
                setTimeout(() => {
                    closeHamburgerMenu();
                }, 100);
            }
        };
        hamburgerMenu.addEventListener('click', hamburgerMenuClickHandler);
    }
    
    // Workflow dropdown change handler
    const workflowDropdown = getElementById('workflowDropdown');
    if (workflowDropdown) {
        // Initial update of dropdown
        updateMobileWorkflowDropdown(navigateToStage);
        
        workflowDropdownChangeHandler = (e) => {
            const targetStage = e.target.value;
            if (targetStage) {
                const result = navigateToStage(targetStage);
                if (!result.success) {
                    console.warn('Navigation failed:', result.error);
                    // Reset dropdown to current stage
                    updateMobileWorkflowDropdown(navigateToStage);
                }
            }
        };
        workflowDropdown.addEventListener('change', workflowDropdownChangeHandler);
    }
    
    // Return cleanup function
    return cleanupMobileNav;
}

/**
 * Cleanup mobile navigation event listeners
 */
function cleanupMobileNav() {
    if (clickOutsideHandler) {
        document.removeEventListener('click', clickOutsideHandler);
        clickOutsideHandler = null;
    }
    
    const hamburgerMenu = getElementById('hamburgerMenu');
    if (hamburgerMenu && hamburgerMenuClickHandler) {
        hamburgerMenu.removeEventListener('click', hamburgerMenuClickHandler);
        hamburgerMenuClickHandler = null;
    }
    
    const workflowDropdown = getElementById('workflowDropdown');
    if (workflowDropdown && workflowDropdownChangeHandler) {
        workflowDropdown.removeEventListener('change', workflowDropdownChangeHandler);
        workflowDropdownChangeHandler = null;
    }
}

/**
 * Toggle hamburger menu open/closed
 */
function toggleHamburgerMenu() {
    const hamburgerMenu = getElementById('hamburgerMenu');
    if (hamburgerMenu) {
        const isOpen = hamburgerMenu.classList.contains(MOBILE_NAV_CLASSES.open);
        if (isOpen) {
            closeHamburgerMenu();
        } else {
            openHamburgerMenu();
        }
    }
}

/**
 * Open hamburger menu
 */
function openHamburgerMenu() {
    const hamburgerMenu = getElementById('hamburgerMenu');
    const hamburgerBtn = getElementById('hamburgerBtn');
    if (hamburgerMenu && hamburgerBtn) {
        hamburgerMenu.classList.add(MOBILE_NAV_CLASSES.open);
        hamburgerBtn.classList.add(MOBILE_NAV_CLASSES.active);
    }
}

/**
 * Close hamburger menu
 */
function closeHamburgerMenu() {
    const hamburgerMenu = getElementById('hamburgerMenu');
    const hamburgerBtn = getElementById('hamburgerBtn');
    if (hamburgerMenu && hamburgerBtn) {
        hamburgerMenu.classList.remove(MOBILE_NAV_CLASSES.open);
        hamburgerBtn.classList.remove(MOBILE_NAV_CLASSES.active);
    }
}

// Export for external use if needed
export { toggleHamburgerMenu, openHamburgerMenu, closeHamburgerMenu, cleanupMobileNav };
