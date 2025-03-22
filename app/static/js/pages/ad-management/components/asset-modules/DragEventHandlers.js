/**
 * Drag Event Handlers Module
 * Handles drag and drop events for assets
 */

import { findDropZone, setupDropZone } from './DropZoneUtils.js';
import { extractAssetData, createAssetPreview, incrementUsageCount, decrementUsageCount } from './AssetManager.js';
import { showToast } from '../../../../utils/common.js';
import { 
    createAdContainer, 
    createAdNameInput, 
    createDeleteButton,
    getOrCreateAdsContainer
} from './UIComponents.js';

// Global drop event tracking
const DROP_DEBOUNCE_MS = 500; // Changed from 2000ms to 500ms to reduce waiting time between drops
let isProcessingDrop = false;

// Global map to track the last drop time for each asset-dropzone combination
const lastDropTimeMap = new Map();

/**
 * Generate a unique key for a drop event
 * @param {Object} assetData - The asset data being dropped
 * @param {HTMLElement} dropZone - The drop zone element
 * @returns {string} - A unique key for this drop event
 */
function generateDropKey(assetData, dropZone) {
    const dropZoneId = dropZone.dataset.adsetId || 'unknown';
    return `${assetData.id}-${dropZoneId}`;
}

/**
 * Determines if a drop event should be processed by checking
 * if it's a valid asset for the target drop zone
 * 
 * @param {Object} assetData - The data of the asset being dropped
 * @param {HTMLElement} dropZone - The drop zone element
 * @returns {boolean} - True if the drop should be processed
 */
export function shouldProcessDrop(assetData, dropZone) {
    console.log('Checking if drop should be processed:', assetData, dropZone);
    
    // Handle Promise-like objects - this should never be called directly with a Promise
    // Because handleDrop should await the Promise resolution before calling this function
    if (assetData instanceof Promise || (assetData && typeof assetData.then === 'function')) {
        console.warn('shouldProcessDrop received a Promise object directly - this should be awaited before validation');
        return false;
    }
    
    // Handle case where assetData could be just a URL string
    if (typeof assetData === 'string') {
        // Convert simple URL to asset data object
        assetData = {
            id: `url-${Date.now()}`,
            type: assetData.match(/\.(mp4|mov|avi|webm)$/i) ? 'video' : 'image',
            url: assetData,
            name: assetData.split('/').pop()
        };
    }
    
    // If no asset data, reject the drop
    if (!assetData || !assetData.id) {
        console.warn('No asset data available, rejecting drop');
        return false;
    }
    
    // Get the platform and asset type from the drop zone
    const platform = dropZone.dataset.platform;
    const acceptsType = dropZone.dataset.accepts;
    
    console.log(`Drop zone accepts ${acceptsType} for ${platform}`);
    
    // Check if the asset type is accepted by this drop zone
    if (assetData.type && acceptsType && !acceptsType.includes(assetData.type)) {
        console.warn(`Asset type ${assetData.type} not accepted by this drop zone`);
        showDropRejectionMessage(`This drop zone only accepts ${acceptsType}`);
        return false;
    }
    
    // For videos, check if URL exists (but don't validate specific URL format)
    if (assetData.type === 'video' && !assetData.url) {
        console.warn('Video asset has no URL');
        showDropRejectionMessage('Video has no URL');
        return false;
    }
    
    // Special case for TikTok video ads - removed detailed validation
    if (platform === 'tiktok' && assetData.type === 'video') {
        console.log(`TikTok video dimensions: ${assetData.width}x${assetData.height}`);
        
        // Accept all videos regardless of dimensions or other validation
        // We'll let the user see errors on Step 4 instead
        console.log('Allowing TikTok video without validation');
        return true;
    }
    
    return true;
}

/**
 * Shows a message to the user when a drop is rejected
 * @param {string} message - The message to display
 */
function showDropRejectionMessage(message) {
    console.warn(`Drop rejected: ${message}`);
    
    // Create notification element if it doesn't exist
    let notification = document.getElementById('drop-rejection-notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'drop-rejection-notification';
        notification.style.position = 'fixed';
        notification.style.bottom = '20px';
        notification.style.right = '20px';
        notification.style.backgroundColor = '#f44336';
        notification.style.color = 'white';
        notification.style.padding = '10px 20px';
        notification.style.borderRadius = '4px';
        notification.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        notification.style.zIndex = '9999';
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s ease';
        document.body.appendChild(notification);
    }
    
    // Set message and show notification
    notification.textContent = message;
    requestAnimationFrame(() => {
        notification.style.opacity = '1';
        
        // Hide after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    });
}

/**
 * Handle dragenter event for drop zones
 * @param {DragEvent} e - The drag event
 */
export function handleDragEnter(e) {
    e.preventDefault();
    console.log('Drag enter on drop zone');
    
    // Add drag-over class for visual feedback
    this.classList.add('drag-over');
    
    // Update the placeholder text
    const dropPlaceholder = this.querySelector('.drop-placeholder');
    if (dropPlaceholder) {
        dropPlaceholder.innerHTML = `
            <i class="fas fa-cloud-upload-alt"></i>
            <div>Drop to add asset</div>
        `;
    }
    
    // Ensure the drop zone is visible
    this.style.display = 'flex';
}

/**
 * Handle dragover event for drop zones
 * @param {DragEvent} e - The drag event
 */
export function handleDragOver(e) {
    e.preventDefault(); // Required for drop to work
    e.dataTransfer.dropEffect = 'copy';
    
    // Ensure drop zone is visible
    if (this.style.display !== 'flex') {
        this.style.display = 'flex';
    }
    
    // Add drag-over class
    this.classList.add('drag-over');
}

/**
 * Handle dragleave event for drop zones
 * @param {DragEvent} e - The drag event
 */
export function handleDragLeave(e) {
    e.preventDefault();
    
    // Get mouse position relative to the drop zone
    const rect = this.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    // Only remove styles if the mouse has actually left the drop zone
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
        this.classList.remove('drag-over');
        
        // Reset the placeholder
        const dropPlaceholder = this.querySelector('.drop-placeholder');
        if (dropPlaceholder) {
            dropPlaceholder.innerHTML = `
                <i class="fas fa-plus-circle"></i>
                <div>Drag asset here</div>
            `;
        }
    }
}

/**
 * Create handleDrop function with state
 * @param {Object} state - Application state
 * @returns {Function} - The drop event handler function
 */
export function createDropHandler(state) {
    // Variable to track the last processed drop
    let lastProcessedDrop = null;
    
    /**
     * Handle drop events on asset drop zones
     * @param {DragEvent} e - The drop event
     */
    return async function handleDrop(e) {
        console.log('*** Drop event detected ***');
        console.log('Drop event dataTransfer items:', Array.from(e.dataTransfer.items).map(item => item.type));
        console.log('Drop event dataTransfer types:', e.dataTransfer.types);
        e.preventDefault();
        e.stopPropagation();
        
        // Global flag to prevent simultaneous processing
        if (isProcessingDrop) {
            console.log('Already processing a drop, ignoring this one');
            return;
        }
        
        // Set processing flag
        isProcessingDrop = true;
        
        try {
            // Find the drop zone (may be the element or a parent)
            const dropZone = findDropZone(e.target);
            if (!dropZone) {
                console.error('No valid drop zone found');
                isProcessingDrop = false;
                return;
            }
            
            // Reset all drop zones' drag-over states
            document.querySelectorAll('.asset-drop-zone').forEach(zone => {
                zone.classList.remove('drag-over');
            });
            
            // Extract asset data from the drop event
            let assetData = extractAssetData(e);
            
            // If assetData is a Promise, wait for it to resolve
            if (assetData instanceof Promise) {
                console.log('Waiting for asset data Promise to resolve...');
                try {
                    assetData = await assetData;
                    console.log('Asset data Promise resolved:', assetData);
                } catch (err) {
                    console.error('Error resolving asset data Promise:', err);
                    isProcessingDrop = false;
                    return;
                }
            }
            
            if (!assetData) {
                console.error('Could not extract asset data from drop');
                isProcessingDrop = false;
                return;
            }
            
            console.log('Processing drop with asset data:', assetData);
            
            // Use the new function to check if we should process this drop
            if (!shouldProcessDrop(assetData, dropZone)) {
                console.log('Drop rejected by shouldProcessDrop check');
                isProcessingDrop = false;
                return;
            }
            
            // Get the adset container
            const adsetItem = dropZone.closest('.adset-item');
            if (!adsetItem) {
                console.error('Could not find parent adset item');
                isProcessingDrop = false;
                return;
            }
            
            // Get the ad creation container
            const adCreationContainer = dropZone.closest('.ad-creation-container');
            if (!adCreationContainer) {
                console.error('Could not find ad creation container');
                isProcessingDrop = false;
                return;
            }
            
            // Remove all TikTok validation code - we'll only do validation in Step 4
            // Don't show TikTok video requirements or validation messages in Step 3
            
            // Initialize assets grid container if it doesn't exist
            let assetsGridContainer = dropZone.querySelector('.assets-grid-container');
            if (!assetsGridContainer) {
                // First asset in this drop zone - set up the structure
                // If drop zone has placeholder, remove it
                if (dropZone.querySelector('.drop-placeholder')) {
                    dropZone.innerHTML = '';
                }
                
                // Don't add an ad name input inside the drop zone - it should only be in the parent container
                // Skip this section that creates the duplicate ad-name-input
                /*
                // Create ad name input if it doesn't exist
                if (!dropZone.querySelector('.ad-name-input')) {
                    const adNameInput = document.createElement('input');
                    adNameInput.type = 'text';
                    adNameInput.className = 'ad-name-input';
                    adNameInput.placeholder = 'Ad Name';
                    adNameInput.value = `New Ad ${new Date().toISOString().slice(0,10)}`;
                    dropZone.appendChild(adNameInput);
                }
                */
                
                // Create assets grid container
                assetsGridContainer = document.createElement('div');
                assetsGridContainer.className = 'assets-grid-container';
                assetsGridContainer.style.display = 'grid';
                assetsGridContainer.style.gridTemplateColumns = 'repeat(3, 1fr)';
                assetsGridContainer.style.gap = '10px';
                assetsGridContainer.style.width = '100%';
                assetsGridContainer.style.marginTop = '10px';
                assetsGridContainer.style.justifyItems = 'center';
                assetsGridContainer.style.alignItems = 'center';
                assetsGridContainer.style.padding = '10px';
                assetsGridContainer.style.backgroundColor = '#f7fafc';
                assetsGridContainer.style.borderRadius = '4px';
                dropZone.appendChild(assetsGridContainer);
                
                // Mark the drop zone as having assets
                dropZone.classList.add('has-asset');
            }
            
            // Create the asset preview and add it to the grid
            const assetPreview = createAssetPreview(assetData);
            assetsGridContainer.appendChild(assetPreview);
            
            // Store asset data in the drop zone for persistence
            let storedAssets = [];
            try {
                if (dropZone.dataset.assets) {
                    storedAssets = JSON.parse(dropZone.dataset.assets);
                }
                
                // Double check to avoid duplication
                const isDuplicate = storedAssets.some(asset => 
                    asset.id === assetData.id && asset.url === assetData.url
                );
                
                if (!isDuplicate) {
                    storedAssets.push({
                        id: assetData.id,
                        type: assetData.type,
                        url: assetData.url || '',
                        name: assetData.name || ''
                    });
                    
                    dropZone.dataset.assets = JSON.stringify(storedAssets);
                    console.log('Stored asset data in drop zone:', dropZone.dataset);
                } else {
                    console.warn('Prevented duplicate asset storage');
                }
            } catch (err) {
                console.warn('Failed to store asset data in drop zone:', err);
            }
            
            // If this is the first asset, create a new drop zone for additional ads
            if (storedAssets.length === 1) {
                // First, create a container for the new ad inputs and drop zone
                const newAdContainer = document.createElement('div');
                newAdContainer.className = 'ad-creation-container';
                newAdContainer.style.marginTop = '20px';
                newAdContainer.style.paddingTop = '20px';
                newAdContainer.style.borderTop = '1px solid #e2e8f0';
                
                // Create Ad Name input field
                const adNameInput = document.createElement('div');
                adNameInput.className = 'ad-name-input';
                adNameInput.style.marginBottom = '10px';
                adNameInput.style.width = '100%';
                adNameInput.innerHTML = `
                    <label for="ad-name-${Date.now()}" style="font-weight: 500; font-size: 13px; color: #444; margin-bottom: 5px; display: block;">Ad Name</label>
                    <input type="text" 
                        id="ad-name-${Date.now()}" 
                        name="tiktok_ad_names[${adsetItem.dataset.adsetId || adsetItem.id}][0]" 
                        class="form-control" 
                        placeholder="Enter ad name" style="font-size: 13px;">
                `;
                newAdContainer.appendChild(adNameInput);
                
                // Create Headline input field
                const headlineInput = document.createElement('div');
                headlineInput.className = 'headline-input';
                headlineInput.style.display = 'block';
                headlineInput.style.marginBottom = '15px';
                headlineInput.style.width = '100%';
                headlineInput.innerHTML = `
                    <label for="headline-${Date.now()}" style="font-weight: 500; font-size: 13px; color: #444; margin-bottom: 5px; display: block;">Ad Text</label>
                    <input type="text" 
                        id="headline-${Date.now()}" 
                        name="tiktok_ad_headlines[${adsetItem.dataset.adsetId || adsetItem.id}][0]" 
                        class="form-control headline-field" 
                        placeholder="Enter ad text" style="font-size: 13px;">
                `;
                newAdContainer.appendChild(headlineInput);
                
                // Create a new drop zone for additional ads
                const newDropZone = document.createElement('div');
                newDropZone.className = 'asset-drop-zone new-drop-zone';
                newDropZone.dataset.adsetId = adsetItem.dataset.adsetId || adsetItem.dataset.id;
                newDropZone.dataset.platform = adsetItem.dataset.platform;
                newDropZone.dataset.accountId = adsetItem.dataset.accountId;
                
                // Add placeholder content to the new drop zone
                const placeholder = document.createElement('div');
                placeholder.className = 'drop-placeholder';
                placeholder.innerHTML = `
                    <i class="fas fa-cloud-upload-alt" style="font-size: 1.5rem; margin-bottom: 8px;"></i>
                    <div>Drag assets here to create another ad</div>
                `;
                newDropZone.appendChild(placeholder);
                
                // Add the drop zone to the container
                newAdContainer.appendChild(newDropZone);
                
                // Add the new container after the current ad creation container
                const parentContainer = adCreationContainer.parentElement;
                if (parentContainer) {
                    parentContainer.appendChild(newAdContainer);
                } else {
                    // Fallback if no parent container
                    adCreationContainer.insertAdjacentElement('afterend', newAdContainer);
                }
                
                // Set up the new drop zone with event handlers
                if (typeof setupDropZone === 'function') {
                    setupDropZone(newDropZone, handleDragOver, handleDragEnter, handleDragLeave, handleDrop);
                } else {
                    // Fallback if setupDropZone is not available
                    newDropZone.addEventListener('dragover', handleDragOver);
                    newDropZone.addEventListener('dragenter', handleDragEnter);
                    newDropZone.addEventListener('dragleave', handleDragLeave);
                    newDropZone.addEventListener('drop', handleDrop);
                }
            }
            
            // Update the usage counter for this asset - ONLY ONCE
            if (typeof incrementUsageCount === 'function' && assetData.id) {
                console.log(`Incrementing usage count for asset ${assetData.id}`);
                incrementUsageCount(assetData.id);
            } else {
                console.warn('incrementUsageCount function not available');
                // Fallback - try to access via window object
                if (window.incrementUsageCount) {
                    window.incrementUsageCount(assetData.id);
                }
            }
            
            // Update application state with the new ad/asset
            updateAppState(state, adsetItem, assetData, dropZone.querySelector('.ad-name-input')?.value);
            
            console.log('Drop successfully processed');
            
            // Set global flag that drop occurred (for cleanup in global handlers)
            window.dropOccurred = true;
        } finally {
            // Reset processing flag after a delay to prevent duplicate processing
            setTimeout(() => {
                isProcessingDrop = false;
                console.log(`Last drop times tracked: ${lastDropTimeMap.size}`);
            }, DROP_DEBOUNCE_MS);
        }
    };
}

/**
 * Update application state with the new asset
 * @param {Object} state - Application state
 * @param {HTMLElement} adsetItem - The adset DOM element
 * @param {Object} assetData - The asset data
 * @param {string} adName - The name of the ad
 */
function updateAppState(state, adsetItem, assetData, adName) {
    // Get data attributes
    const platform = adsetItem.dataset.platform;
    const adsetId = adsetItem.dataset.adsetId || adsetItem.dataset.id;
    
    if (!platform || !adsetId) {
        console.error('Missing platform or adsetId data attributes');
        return;
    }
    
    // Initialize the newAds object if needed
    if (!state.newAds) state.newAds = {};
    if (!state.newAds[platform]) state.newAds[platform] = {};
    if (!state.newAds[platform][adsetId]) {
        state.newAds[platform][adsetId] = {
            name: adName || `New Ad ${new Date().toISOString().slice(0,10)}`,
            assets: []
        };
    }
    
    // Add the asset to the state
    if (!state.newAds[platform][adsetId].assets.includes(assetData.id)) {
        state.newAds[platform][adsetId].assets.push(assetData.id);
        console.log(`Added asset ${assetData.id} to adset ${adsetId} for platform ${platform}`);
    }
    
    // Trigger a custom event to notify of ad creation
    const adCreatedEvent = new CustomEvent('ad-created', {
        detail: {
            platform,
            adsetId,
            assetId: assetData.id,
            adName
        }
    });
    document.dispatchEvent(adCreatedEvent);
}

/**
 * Handle drop event on a drop zone
 * @param {DragEvent} e - The drop event
 */
function handleDrop(e) {
    console.log('*** Drop event detected ***');
    
    // Cancel the default browser behavior
    e.preventDefault();
    
    // Prevent duplicate processing with global debouncing
    if (window.isProcessingDrop) {
        console.log('Already processing a drop, ignoring this one');
        return;
    }
    
    window.isProcessingDrop = true;
    setTimeout(() => { window.isProcessingDrop = false; }, 100);
    
    // Find the drop zone
    const dropZone = getDropZoneFromEvent(e);
    if (!dropZone) {
        console.log('No drop zone found');
        return;
    }
    
    // Extract asset data from the drag event
    let assetData = extractAssetData(e);
    if (!assetData) {
        console.log('No asset data found in drop');
        return;
    }
    
    // Process the drop
    processAssetDrop(dropZone, assetData);
    
    // Set a flag so dragend event knows a drop occurred
    window.dropOccurred = true;
}

/**
 * Process an asset drop on a drop zone
 * @param {HTMLElement} dropZone - The drop zone element
 * @param {Object} assetData - The asset data
 */
function processAssetDrop(dropZone, assetData) {
    console.log('Processing drop with asset data:', assetData);
    
    // Remove drop-over class
    dropZone.classList.remove('drag-over');
    
    // Add has-asset class to indicate the drop zone has an asset
    dropZone.classList.add('has-asset');
    
    // Get existing assets or initialize array
    let assets = [];
    if (dropZone.dataset.assets) {
        try {
            assets = JSON.parse(dropZone.dataset.assets);
        } catch (err) {
            console.error('Error parsing existing assets data:', err);
        }
    }
    
    // Check if this asset already exists in this drop zone
    const assetExists = assets.some(asset => 
        asset.id === assetData.id && asset.url === assetData.url
    );
    
    if (assetExists) {
        console.log('Asset already exists in this drop zone, not adding again');
        return;
    }
    
    // Create the asset preview element
    const assetPreview = createAssetPreview(assetData);
    
    // Find or create a grid container for the assets
    let assetGrid = dropZone.querySelector('.assets-grid-container');
    if (!assetGrid) {
        assetGrid = document.createElement('div');
        assetGrid.className = 'assets-grid-container';
        
        // Clear the drop zone first (remove placeholder)
        dropZone.innerHTML = '';
        
        // Add the grid container
        dropZone.appendChild(assetGrid);
    }
    
    // Add the preview to the grid
    assetGrid.appendChild(assetPreview);
    
    // Update the stored assets data
    assets.push(assetData);
    dropZone.dataset.assets = JSON.stringify(assets);
    console.log('Stored asset data in drop zone:', dropZone.dataset);
    
    // Ensure the drop zone is set up for future drops
    setupDropZone(dropZone, handleDragOver, handleDragEnter, handleDragLeave, handleDrop);
    
    // Check if adset container has input fields
    ensureInputFields(dropZone);
    
    // Increment usage count for the asset
    incrementAssetUsage(assetData.id);
    
    // Find the adset ID and platform for logging
    const adsetId = dropZone.dataset.adsetId;
    const platform = dropZone.dataset.platform;
    
    // Log the action
    console.log(`Added asset ${assetData.id} to adset ${adsetId} for platform ${platform}`);
    
    // Special handling for TikTok to check if we've fixed a warning
    if (platform === 'tiktok') {
        checkTikTokImageRequirement(dropZone, assets);
    }
    
    // Ensure we refresh the application state (if available)
    if (window.refreshAppState && typeof window.refreshAppState === 'function') {
        window.refreshAppState();
    }
    
    console.log('Drop successfully processed');
}

/**
 * Ensure the adset has proper input fields
 * @param {HTMLElement} dropZone - The drop zone element
 */
function ensureInputFields(dropZone) {
    // Get the adset ID from the drop zone
    const adsetId = dropZone.dataset.adsetId;
    const platform = dropZone.dataset.platform || 'tiktok';
    
    // Check if there's a parent ad creation container
    let adContainer = dropZone.closest('.ad-creation-container');
    
    // If not, create one
    if (!adContainer) {
        // Create the container
        adContainer = document.createElement('div');
        adContainer.className = 'ad-creation-container';
        adContainer.style.marginBottom = '15px';
        adContainer.style.padding = '15px';
        adContainer.style.backgroundColor = '#f9f9f9';
        adContainer.style.borderRadius = '5px';
        adContainer.style.border = '1px solid #eee';
        
        // Insert it before the drop zone
        dropZone.parentNode.insertBefore(adContainer, dropZone);
        
        // Move the drop zone into the container
        adContainer.appendChild(dropZone);
        
        // Create the Ad Name input field
        const adNameInput = document.createElement('div');
        adNameInput.className = 'ad-name-input';
        adNameInput.style.marginBottom = '10px';
        adNameInput.style.width = '100%';
        adNameInput.style.zIndex = '10';
        adNameInput.innerHTML = `
            <label for="ad-name-${Date.now()}" style="font-weight: 500; font-size: 13px; color: #444; margin-bottom: 5px; display: block;">Ad Name</label>
            <input type="text" 
                id="ad-name-${Date.now()}" 
                name="tiktok_ad_names[${adsetId}][0]" 
                class="form-control" 
                placeholder="Enter ad name" style="font-size: 13px;">
        `;
        
        adContainer.insertBefore(adNameInput, dropZone);
        
        // Create the Headline input field
        const headlineInput = document.createElement('div');
        headlineInput.className = 'headline-input';
        headlineInput.style.marginBottom = '10px';
        headlineInput.style.width = '100%';
        headlineInput.style.zIndex = '10';
        headlineInput.innerHTML = `
            <label for="headline-${Date.now()}" style="font-weight: 500; font-size: 13px; color: #444; margin-bottom: 5px; display: block;">Ad Text</label>
            <input type="text" 
                id="headline-${Date.now()}" 
                name="tiktok_ad_headlines[${adsetId}][0]" 
                class="form-control headline-field" 
                placeholder="Enter ad text" style="font-size: 13px;">
        `;
        
        adContainer.insertBefore(headlineInput, dropZone);
    }
    
    return adContainer;
}

/**
 * Check if a TikTok dropzone now meets the image requirement
 * and just log information about it, but don't block proceeding
 * 
 * @param {HTMLElement} dropZone - The drop zone that received an asset
 * @param {Array} assets - The assets in the drop zone
 */
function checkTikTokImageRequirement(dropZone, assets) {
    // Count image assets in this dropzone
    const imageAssets = assets.filter(asset => asset.type === 'image' || !asset.type);
    
    // Just log information about the image count
    if (imageAssets.length === 1) {
        console.log('TikTok dropzone has 1 image - user will get warning at launch time');
    } else if (imageAssets.length >= 2) {
        console.log('TikTok dropzone meets requirement with', imageAssets.length, 'images');
    }
    
    // Remove any class that indicates a warning
    dropZone.classList.remove('needs-more-images');
    
    // No need to check all dropzones or manipulate the Next button
    // Users will see validation errors at launch time if needed
    
    // Ensure we refresh the application state
    if (window.refreshAppState && typeof window.refreshAppState === 'function') {
        window.refreshAppState();
    }
} 