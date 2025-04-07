/**
 * Drag Event Handlers Module
 * Handles drag and drop events for assets
 */

import { findDropZone, setupDropZone } from './DropZoneUtils.js';
import { extractAssetData, createAssetPreview, incrementUsageCount, decrementUsageCount } from './AssetManager.js';
import { 
    createAdContainer, 
    createAdNameInput, 
    createDeleteButton,
    getOrCreateAdsContainer
} from './UIComponents.js';

// Global drop event tracking
const DROP_DEBOUNCE_MS = 2000; // Much longer debounce to prevent double counting
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
 * Check if a drop event should be processed or ignored
 * @param {Object} assetData - The asset data being dropped
 * @param {HTMLElement} dropZone - The drop zone element
 * @returns {boolean} - Whether to process the drop
 */
function shouldProcessDrop(assetData, dropZone) {
    if (!assetData || !dropZone) return false;
    
    const now = Date.now();
    const dropKey = generateDropKey(assetData, dropZone);
    
    // Check if this asset is already in this dropzone's assets
    if (dropZone.dataset.assets) {
        try {
            const existingAssets = JSON.parse(dropZone.dataset.assets);
            // Check if this exact asset ID is already in this drop zone
            const assetExists = existingAssets.some(asset => 
                asset.id === assetData.id && 
                asset.url === assetData.url
            );
            
            if (assetExists) {
                console.log('Asset already exists in this drop zone, skipping:', assetData.id);
                return false;
            }
        } catch (err) {
            console.warn('Error checking existing assets:', err);
        }
    }
    
    // Check if a similar drop was processed recently
    if (lastDropTimeMap.has(dropKey)) {
        const lastTime = lastDropTimeMap.get(dropKey);
        if (now - lastTime < DROP_DEBOUNCE_MS) {
            console.log(`Ignoring drop for ${dropKey} - too soon after previous drop (${now - lastTime}ms)`);
            return false;
        }
    }
    
    // Update the last drop time for this asset-dropzone combination
    lastDropTimeMap.set(dropKey, now);
    
    // Clear old entries to prevent memory leaks
    if (lastDropTimeMap.size > 100) {
        const oldestKey = Array.from(lastDropTimeMap.keys())[0];
        lastDropTimeMap.delete(oldestKey);
    }
    
    return true;
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
    return function handleDrop(e) {
        console.log('*** Drop event detected ***');
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
            const assetData = extractAssetData(e);
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
                    <label for="ad-name-new-${Date.now()}" style="display: block; margin-bottom: 5px; font-weight: 500; color: #444;">Ad Name</label>
                    <input type="text" 
                           id="ad-name-new-${Date.now()}" 
                           name="ad_name" 
                           class="form-control" 
                           placeholder="Enter ad name"
                           style="width: 100%; padding: 8px 12px; border: 1px solid #ced4da; border-radius: 4px; font-size: 14px;">
                `;
                newAdContainer.appendChild(adNameInput);
                
                // Create Headline input field
                const headlineInput = document.createElement('div');
                headlineInput.className = 'headline-input';
                headlineInput.style.display = 'block';
                headlineInput.style.marginBottom = '15px';
                headlineInput.style.width = '100%';
                headlineInput.innerHTML = `
                    <label for="headline-new-${Date.now()}" style="display: block; margin-bottom: 5px; font-weight: 500; color: #444;">Headline</label>
                    <input type="text" 
                           id="headline-new-${Date.now()}" 
                           name="headline" 
                           class="form-control headline-field" 
                           placeholder="Enter ad headline"
                           style="width: 100%; padding: 8px 12px; border: 1px solid #ced4da; border-radius: 4px; font-size: 14px; background-color: white;">
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
    
    // Ensure we refresh the application state (if available)
    if (typeof refreshAppState === 'function') {
        refreshAppState();
    }
    
    console.log('Drop successfully processed');
}

/**
 * Ensure the adset has proper input fields
 * @param {HTMLElement} dropZone - The drop zone element
 */
function ensureInputFields(dropZone) {
    // Find the containing ad creation container
    const adCreationContainer = dropZone.closest('.ad-creation-container');
    if (!adCreationContainer) return;
    
    // Find the adset item
    const adsetItem = dropZone.closest('.adset-item');
    if (!adsetItem) return;
    
    // First look for the wrapper div with class ad-name-input in the ad-creation-container
    // NOT in the drop zone itself, to avoid duplicates
    let adNameInput = adCreationContainer.querySelector(':scope > .ad-name-input');
    let adNameIsDirectInput = false;
    
    // If we don't find the wrapper, check for a direct input with class ad-name-input
    if (!adNameInput) {
        const directInput = adCreationContainer.querySelector(':scope > input.ad-name-input');
        if (directInput) {
            adNameIsDirectInput = true;
            // Wrap it in a container for consistency
            adNameInput = document.createElement('div');
            adNameInput.className = 'ad-name-input-wrapper';
            directInput.parentNode.insertBefore(adNameInput, directInput);
            adNameInput.appendChild(directInput);
            console.log('Wrapped existing direct ad-name-input in container');
        }
    }
    
    // If we still don't have an ad name input, create one
    if (!adNameInput) {
        adNameInput = document.createElement('div');
        adNameInput.className = 'ad-name-input';
        adNameInput.style.display = 'block';
        adNameInput.style.marginBottom = '10px';
        adNameInput.style.width = '100%';
        adNameInput.innerHTML = `
            <label for="ad-name-${adsetItem.dataset.adsetId || adsetItem.id}" style="display: block; margin-bottom: 5px; font-weight: 500; color: #444;">Ad Name</label>
            <input type="text" 
                   id="ad-name-${adsetItem.dataset.adsetId || adsetItem.id}" 
                   name="ad_name" 
                   class="form-control" 
                   placeholder="Enter ad name"
                   style="width: 100%; padding: 8px 12px; border: 1px solid #ced4da; border-radius: 4px; font-size: 14px;">
        `;
        
        // Insert at the top of the container
        adCreationContainer.insertBefore(adNameInput, adCreationContainer.firstChild);
        console.log('Created ad name input for adset', adsetItem.dataset.adsetId || adsetItem.id);
    }
    
    // Remove any duplicate ad name inputs inside the drop zone
    const dropZoneAdNameInputs = dropZone.querySelectorAll('.ad-name-input, input.ad-name-input');
    dropZoneAdNameInputs.forEach(duplicateInput => {
        console.log('Removing duplicate ad name input from drop zone');
        duplicateInput.remove();
    });
    
    // Check for headline input in the ad-creation-container, not in the drop zone
    let headlineInput = adCreationContainer.querySelector(':scope > .headline-input');
    if (!headlineInput) {
        headlineInput = document.createElement('div');
        headlineInput.className = 'headline-input';
        headlineInput.style.display = 'block';
        headlineInput.style.marginBottom = '15px';
        headlineInput.style.width = '100%';
        headlineInput.style.paddingBottom = '10px';
        headlineInput.style.borderBottom = '1px solid #eee';
        headlineInput.style.position = 'relative';
        headlineInput.style.zIndex = '10';
        headlineInput.innerHTML = `
            <label for="headline-${adsetItem.dataset.adsetId || adsetItem.id}" style="display: block; margin-bottom: 5px; font-weight: 500; color: #444;">Headline</label>
            <input type="text" 
                   id="headline-${adsetItem.dataset.adsetId || adsetItem.id}" 
                   name="headline" 
                   class="form-control headline-field" 
                   placeholder="Enter ad headline"
                   style="width: 100%; padding: 8px 12px; border: 1px solid #ced4da; border-radius: 4px; font-size: 14px; background-color: white;">
        `;
        
        // Insert after ad name input
        if (adNameIsDirectInput) {
            // If we wrapped a direct input, insert after our wrapper
            adNameInput.parentNode.insertBefore(headlineInput, adNameInput.nextSibling);
            console.log('Inserted headline after wrapped ad-name-input');
        } else {
            // Standard insertion after the ad name input
            adCreationContainer.insertBefore(headlineInput, adNameInput.nextSibling);
            console.log('Created headline input after ad name input for adset', adsetItem.dataset.adsetId || adsetItem.id);
        }
    }
    
    // Remove any duplicate headline inputs inside the drop zone
    const dropZoneHeadlineInputs = dropZone.querySelectorAll('.headline-input');
    dropZoneHeadlineInputs.forEach(duplicateInput => {
        console.log('Removing duplicate headline input from drop zone');
        duplicateInput.remove();
    });
} 