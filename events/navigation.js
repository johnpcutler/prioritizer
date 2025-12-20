// Navigation event listeners - stage navigation and stage step clicks

import { initMobileNav } from '../ui/navigation/mobileNav.js';
import { getNavigationCoordinator } from '../ui/navigation/navigationCoordinator.js';

// Store cleanup function for mobile nav
let mobileNavCleanup = null;

// Setup navigation event listeners
// Accepts navigateToStage function as a dependency
// Returns cleanup function for proper resource management
export function setupNavigationListeners(navigateToStage) {
    // Initialize navigation coordinator with navigateToStage
    const coordinator = getNavigationCoordinator(navigateToStage);
    
    // Stage navigation - make stage steps clickable (desktop)
    // Use event delegation on the parent container for dynamic updates
    const stageStepsContainer = document.querySelector('.stage-steps');
    if (stageStepsContainer) {
        stageStepsContainer.addEventListener('click', (e) => {
            const step = e.target.closest('.stage-step');
            if (step) {
                // Only attempt navigation if the step is clickable
                if (!step.classList.contains('clickable')) {
                    return; // Silently ignore - tooltip already explains why
                }
                
                const targetStage = step.getAttribute('data-stage');
                if (targetStage) {
                    const result = navigateToStage(targetStage);
                    // Navigation should only be attempted on clickable stages
                    // If it fails, it's a bug, not a user error
                    if (!result.success) {
                        console.warn('Navigation failed:', result.error);
                    }
                }
            }
        });
    }
    
    // Initialize mobile navigation (hamburger menu and workflow dropdown)
    mobileNavCleanup = initMobileNav(navigateToStage);
    
    // Return cleanup function
    return () => {
        if (mobileNavCleanup) {
            mobileNavCleanup();
            mobileNavCleanup = null;
        }
    };
}

