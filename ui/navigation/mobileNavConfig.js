// Mobile Navigation Configuration
// Centralizes selectors, classes, and constants for mobile navigation
// This allows mobile nav to be updated without breaking when HTML/CSS changes

/**
 * Element selectors for mobile navigation components
 * Update these if HTML structure changes
 */
export const MOBILE_NAV_SELECTORS = {
    hamburgerBtn: '#hamburgerBtn',
    hamburgerMenu: '#hamburgerMenu',
    workflowDropdown: '#workflowDropdown',
    settingsBtnMobile: '#settingsBtnMobile',
    clearDataBtnMobile: '#clearDataBtnMobile'
};

/**
 * CSS class names used by mobile navigation
 * Update these if CSS class names change
 */
export const MOBILE_NAV_CLASSES = {
    open: 'open',
    active: 'active'
};

/**
 * Responsive breakpoint (matches CSS media query)
 * Update if breakpoint changes
 */
export const MOBILE_BREAKPOINT = 768;

/**
 * Get element by selector with error handling
 * @param {string} selector - CSS selector
 * @returns {HTMLElement|null} - Element or null if not found
 */
export function getElement(selector) {
    try {
        return document.querySelector(selector);
    } catch (error) {
        console.warn(`Element not found: ${selector}`, error);
        return null;
    }
}

/**
 * Get element by ID with error handling
 * @param {string} id - Element ID
 * @returns {HTMLElement|null} - Element or null if not found
 */
export function getElementById(id) {
    try {
        return document.getElementById(id);
    } catch (error) {
        console.warn(`Element not found: #${id}`, error);
        return null;
    }
}

