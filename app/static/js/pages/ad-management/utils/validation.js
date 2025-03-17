/**
 * Validation Utilities
 * Contains functions for validating different form steps
 */

import { showToast } from '../../../utils/common.js';

/**
 * Validate Step 1 (Platform & Account Selection)
 * @param {Object} state - Application state
 * @param {Object} elements - DOM elements
 * @returns {boolean} - Whether the step is valid
 */
export function validateStep1(state, elements) {
    const hasSelectedPlatforms = state.selectedPlatforms.length > 0;
    const hasSelectedAccounts = state.advertiserAccounts.length > 0;
    
    const isValid = hasSelectedPlatforms && hasSelectedAccounts;
    if (elements.step1NextBtn) {
        elements.step1NextBtn.disabled = !isValid;
    }
    
    return isValid;
}

/**
 * Validate Step 2 (Campaign & Ad Set Selection)
 * @param {Object} state - Application state
 * @param {Object} elements - DOM elements
 * @returns {boolean} - Whether the step is valid
 */
export function validateStep2(state, elements) {
    let isValid = false;
    
    // Check if at least one campaign is selected (from any platform)
    if (state.selectedPlatforms.includes('meta') && state.campaignSelections.meta.campaigns.length > 0) {
        isValid = true;
    }
    
    if (state.selectedPlatforms.includes('tiktok') && state.campaignSelections.tiktok.campaigns.length > 0) {
        isValid = true;
    }
    
    if (elements.step2NextBtn) {
        elements.step2NextBtn.disabled = !isValid;
    }
    
    return isValid;
}

/**
 * Validate Step 3 (Creative Selection)
 * @param {Object} state - Application state
 * @param {Object} elements - DOM elements
 * @returns {boolean} - Whether the step is valid
 */
export function validateStep3(state, elements) {
    // Check if we have selected assets in the state
    const hasSelectedAssets = Array.isArray(state.selectedAssets) && state.selectedAssets.length > 0;
    
    if (elements.step3NextBtn) {
        elements.step3NextBtn.disabled = !hasSelectedAssets;
    }
    
    return hasSelectedAssets;
}

/**
 * Validate the form before submission
 * @param {Object} state - Application state
 * @param {Object} elements - DOM elements
 * @returns {boolean} - Whether the form is valid
 */
export function validateFormData(state, elements) {
    // Check platform selection
    if (state.selectedPlatforms.length === 0) {
        showToast('Please select at least one platform', 'error');
        return false;
    }
    
    // Check account selection
    if (state.advertiserAccounts.length === 0) {
        showToast('Please select at least one advertiser account', 'error');
        return false;
    }
    
    // Check platform-specific selections
    if (state.selectedPlatforms.includes('meta')) {
        if (state.campaignSelections.meta.campaigns.length === 0) {
            showToast('Please select at least one Meta campaign', 'error');
            return false;
        }
    }
    
    if (state.selectedPlatforms.includes('tiktok')) {
        if (state.campaignSelections.tiktok.campaigns.length === 0) {
            showToast('Please select at least one TikTok campaign', 'error');
            return false;
        }
    }
    
    // Check asset selection
    if (!Array.isArray(state.selectedAssets) || state.selectedAssets.length === 0) {
        showToast('Please select at least one asset', 'error');
        return false;
    }
    
    return true;
}

/**
 * Validate a specific step
 * @param {number} step - The step number to validate
 * @param {Object} state - Application state
 * @param {Object} elements - DOM elements
 * @returns {boolean} - Whether the step is valid
 */
export function validateStep(step, state, elements) {
    switch (step) {
        case 1:
            return validateStep1(state, elements);
        case 2:
            return validateStep2(state, elements);
        case 3:
            return validateStep3(state, elements);
        case 4:
            return true; // Summary step is always valid
        default:
            return false;
    }
} 