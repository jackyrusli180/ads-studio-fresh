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
    // Check for active drop zones with assets
    const dropZones = document.querySelectorAll('.asset-drop-zone');
    let hasAssets = false;
    
    console.log('Validating step 3, checking drop zones:', dropZones.length);
    
    // First, remove all needs-more-images classes from previous validations
    dropZones.forEach(zone => {
        zone.classList.remove('needs-more-images');
    });
    
    // First pass - check if any adset has assets at all
    for (const dropZone of dropZones) {
        if (dropZone.dataset.assets) {
            try {
                const assets = JSON.parse(dropZone.dataset.assets);
                if (assets && assets.length > 0) {
                    hasAssets = true;
                    break; // At least one adset has assets
                }
            } catch (err) {
                console.warn('Error checking assets in drop zone:', err);
            }
        }
    }
    
    // For TikTok adsets, just log information about their images for debugging
    for (const dropZone of dropZones) {
        if (dropZone.dataset.assets && dropZone.dataset.platform === 'tiktok') {
            try {
                const assets = JSON.parse(dropZone.dataset.assets);
                if (assets && assets.length > 0) {
                    const imageAssets = assets.filter(asset => asset.type === 'image' || !asset.type);
                    console.log(`TikTok adset has ${imageAssets.length} images`);
                    
                    // Get adset name for logging
                    const adsetElement = dropZone.closest('.adset-item');
                    let adsetName = '';
                    if (adsetElement) {
                        const adsetNameElement = adsetElement.querySelector('.adset-name');
                        adsetName = adsetNameElement ? adsetNameElement.textContent : dropZone.dataset.adsetId;
                    } else {
                        adsetName = dropZone.dataset.adsetId;
                    }
                    
                    // Just log info but don't block proceeding
                    if (imageAssets.length === 1) {
                        console.log(`TikTok adset "${adsetName}" has only 1 image, user will get warning at launch time`);
                    } else if (imageAssets.length >= 2) {
                        console.log(`TikTok adset "${adsetName}" has ${imageAssets.length} images, requirement met`);
                    }
                }
            } catch (err) {
                console.warn('Error checking assets in drop zone:', err);
            }
        }
    }
    
    // If not, check if we have selected assets in the state as a fallback
    if (!hasAssets) {
        hasAssets = Array.isArray(state.selectedAssets) && state.selectedAssets.length > 0;
    }
    
    // Remove any existing warnings - we'll show these at launch time instead
    const existingWarning = document.getElementById('tiktok-single-image-warning');
    if (existingWarning) {
        existingWarning.remove();
    }
    
    console.log('Step 3 validation result:', hasAssets ? 'passed' : 'failed');
    
    if (elements.step3NextBtn) {
        elements.step3NextBtn.disabled = !hasAssets;
        console.log(`Next button ${hasAssets ? 'enabled' : 'disabled'}`);
    }
    
    return hasAssets;
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
        
        // Validate TikTok ad format restrictions
        const tiktokDropZones = document.querySelectorAll('.asset-drop-zone[data-platform="tiktok"]');
        
        for (const dropZone of tiktokDropZones) {
            if (!dropZone.dataset.assets) {
                continue; // Skip empty drop zones
            }
            
            try {
                const assets = JSON.parse(dropZone.dataset.assets);
                if (assets.length === 0) {
                    continue; // Skip empty asset arrays
                }
                
                // Check for video assets
                const hasVideoAssets = assets.some(asset => asset.type === 'video');
                const hasImageAssets = assets.some(asset => asset.type === 'image');
                
                // Get the adset element for more detailed error message
                const adsetElement = dropZone.closest('.adset-item');
                const adsetName = adsetElement ? 
                    adsetElement.querySelector('.adset-name')?.textContent || 'unknown adset' : 
                    'unknown adset';
                
                // For TikTok SINGLE_VIDEO format, only one video asset is allowed
                if (hasVideoAssets) {
                    const videoCount = assets.filter(asset => asset.type === 'video').length;
                    
                    if (videoCount > 1) {
                        showToast(`TikTok ad "${adsetName}" can only have one video per ad. Please remove extra videos.`, 'error');
                        return false;
                    }
                    
                    if (hasImageAssets) {
                        showToast(`TikTok ad "${adsetName}" cannot mix videos and images in the same ad. Please separate them.`, 'error');
                        return false;
                    }
                }
                
                // For carousel ads, should have at least 2 images and no videos
                if (hasImageAssets && assets.length > 1) {
                    if (hasVideoAssets) {
                        showToast(`TikTok carousel ad "${adsetName}" cannot contain videos. Please use only images or create a separate video ad.`, 'error');
                        return false;
                    }
                }
            } catch (err) {
                console.warn('Error validating TikTok ad format:', err);
            }
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