/**
 * Adset Drop Zones Module
 * Sets up drop zones within adsets for drag and drop functionality
 */

import { setupDropZone } from './DropZoneUtils.js';
import { handleDragEnter, handleDragOver, handleDragLeave, createDropHandler } from './DragEventHandlers.js';

/**
 * Initialize drop zones for adsets
 * @param {Object} state - Application state
 */
export function initAdsetDropZones(state) {
    console.log('Initializing adset drop zones');
    
    // First clean up any duplicate Ad Name or Headline inputs
    cleanupDuplicateInputs();
    
    // Create a drop handler with the current state
    const handleDrop = createDropHandler(state);
    
    // Find all adset elements
    const adsetItems = document.querySelectorAll('.adset-item');
    console.log(`Found ${adsetItems.length} adsets for drop zones`);
    
    adsetItems.forEach(adsetItem => {
        // Find or create the adset content
        let adsetContent = adsetItem.querySelector('.adset-content');
        if (!adsetContent) {
            console.warn('No adset content found, creating one');
            adsetContent = document.createElement('div');
            adsetContent.className = 'adset-content';
            adsetItem.appendChild(adsetContent);
        }
        
        // Create or find ad creation container
        let adCreationContainer = adsetContent.querySelector('.ad-creation-container');
        if (!adCreationContainer) {
            adCreationContainer = document.createElement('div');
            adCreationContainer.className = 'ad-creation-container';
            adsetContent.appendChild(adCreationContainer);
        }
        
        // Create or find ad name input field - ensure it exists and is preserved
        let adNameInput = adCreationContainer.querySelector('.ad-name-input');
        if (!adNameInput) {
            adNameInput = document.createElement('div');
            adNameInput.className = 'ad-name-input';
            adNameInput.style.marginBottom = '10px';
            adNameInput.style.width = '100%';
            adNameInput.innerHTML = `
                <label for="ad-name-${adsetItem.dataset.adsetId || adsetItem.dataset.id}" style="display: block; margin-bottom: 5px; font-weight: 500; color: #444;">Ad Name</label>
                <input type="text" 
                       id="ad-name-${adsetItem.dataset.adsetId || adsetItem.dataset.id}" 
                       name="ad_name" 
                       class="form-control" 
                       placeholder="Enter ad name"
                       style="width: 100%; padding: 8px 12px; border: 1px solid #ced4da; border-radius: 4px; font-size: 14px;">
            `;
            // Insert at the top of the container
            adCreationContainer.insertBefore(adNameInput, adCreationContainer.firstChild);
            console.log('Created ad name input');
        }
        
        // Immediately create and insert the headline field after the ad name field
        // ALWAYS create a new one to ensure it's properly positioned
        const existingHeadline = adCreationContainer.querySelector('.headline-input');
        if (existingHeadline) {
            // If it exists but is not in the right place, remove it
            existingHeadline.remove();
            console.log('Removed existing headline input to reposition it');
        }
        
        // First, look for the existing structure we expect (div.ad-name-input)
        let adNameContainer = adCreationContainer.querySelector('.ad-name-input');
        let adNameIsDirectInput = false;
        
        // If we don't find the wrapper div, check if there's a direct input element with ad-name-input class
        if (!adNameContainer) {
            const directInput = adCreationContainer.querySelector('input.ad-name-input');
            if (directInput) {
                // We found direct input, wrap it in a container for consistent structure
                adNameIsDirectInput = true;
                adNameContainer = document.createElement('div');
                adNameContainer.className = 'ad-name-input-wrapper';
                directInput.parentNode.insertBefore(adNameContainer, directInput);
                adNameContainer.appendChild(directInput);
                console.log('Wrapped direct ad-name-input in container for consistent structure');
            }
        }
        
        // Create new headline input
        const headlineInput = document.createElement('div');
        headlineInput.className = 'headline-input';
        headlineInput.id = `headline-container-${adsetItem.dataset.adsetId || adsetItem.dataset.id}`;
        headlineInput.style.display = 'block !important';
        headlineInput.style.marginBottom = '15px';
        headlineInput.style.marginTop = '10px';
        headlineInput.style.width = '100%';
        headlineInput.style.paddingBottom = '10px';
        headlineInput.style.position = 'relative';
        headlineInput.style.zIndex = '100';
        headlineInput.innerHTML = `
            <label for="headline-${adsetItem.dataset.adsetId || adsetItem.dataset.id}" style="display: block !important; margin-bottom: 5px; font-weight: 500; color: #444;">Headline</label>
            <input type="text" 
                   id="headline-${adsetItem.dataset.adsetId || adsetItem.dataset.id}" 
                   name="headline" 
                   class="form-control headline-field" 
                   placeholder="Enter ad headline"
                   style="width: 100%; display: block !important; padding: 8px 12px; border: 1px solid #ced4da; border-radius: 4px; font-size: 14px; background-color: white;">
        `;
        
        // Insert the headline input field in the right place
        if (adNameIsDirectInput) {
            // If we wrapped a direct input, insert after our wrapper
            adNameContainer.parentNode.insertBefore(headlineInput, adNameContainer.nextSibling);
            console.log('Inserted headline after wrapped ad-name-input');
        } else if (adNameContainer) {
            // If we found the regular container, insert after it
            adCreationContainer.insertBefore(headlineInput, adNameContainer.nextSibling);
            console.log('Inserted headline after ad-name-input container');
        } else {
            // Fallback: insert at the beginning of the container
            adCreationContainer.insertBefore(headlineInput, adCreationContainer.firstChild);
            console.log('Inserted headline at the beginning of container (no ad-name-input found)');
        }
        
        console.log('Created and inserted headline input with ID:', headlineInput.id);
        
        // Create or find drop zone within the ad creation container
        let dropZone = adCreationContainer.querySelector('.asset-drop-zone');
        
        if (!dropZone) {
            // Create drop zone
            dropZone = document.createElement('div');
            dropZone.className = 'asset-drop-zone';
            
            // Set data attributes from the adset
            dropZone.dataset.adsetId = adsetItem.dataset.adsetId || adsetItem.dataset.id;
            dropZone.dataset.platform = adsetItem.dataset.platform;
            dropZone.dataset.accountId = adsetItem.dataset.accountId;
            
            // Add placeholder content
            const placeholder = document.createElement('div');
            placeholder.className = 'drop-placeholder';
            placeholder.innerHTML = `
                <i class="fas fa-cloud-upload-alt" style="font-size: 1.5rem; margin-bottom: 8px;"></i>
                <div>Drag assets here to create ads</div>
            `;
            
            dropZone.appendChild(placeholder);
            adCreationContainer.appendChild(dropZone);
            
            console.log(`Created drop zone for adset ${dropZone.dataset.adsetId}`);
        } else {
            // Make sure the asset drop zone doesn't get too large
            dropZone.style.maxHeight = 'unset'; // Reset any previous max-height
            
            // Ensure assets don't get oversized when switching steps
            const assetPreviews = dropZone.querySelectorAll('.asset-preview-container');
            assetPreviews.forEach(preview => {
                // Reset the preview container styles
                preview.style.maxWidth = '120px';
                preview.style.margin = '5px';
                
                const img = preview.querySelector('img');
                if (img) {
                    img.style.maxHeight = '100px';
                    img.style.maxWidth = '100%';
                    img.style.objectFit = 'contain';
                }
                
                const video = preview.querySelector('video');
                if (video) {
                    video.style.maxHeight = '100px';
                    video.style.maxWidth = '100%';
                }
            });
            
            // Also ensure the asset grid container has correct styling
            const gridContainer = dropZone.querySelector('.assets-grid-container');
            if (gridContainer) {
                gridContainer.style.display = 'grid';
                gridContainer.style.gridTemplateColumns = 'repeat(5, 1fr)';
                gridContainer.style.gap = '10px';
                gridContainer.style.paddingTop = '10px';
                gridContainer.style.maxHeight = '300px';
                gridContainer.style.overflowY = 'auto';
                gridContainer.style.justifyItems = 'center';
                gridContainer.style.alignItems = 'center';
                
                // Force resize all images in the grid to prevent them from being too large
                const allGridImages = gridContainer.querySelectorAll('img');
                allGridImages.forEach(img => {
                    img.style.maxHeight = '100px';
                    img.style.maxWidth = '100%';
                    img.style.objectFit = 'contain';
                });
            }
        }
        
        // Set up the drop zone with event handlers
        setupDropZone(dropZone, handleDragOver, handleDragEnter, handleDragLeave, handleDrop);
        
        // Also add drop handlers to the ad creation container
        adCreationContainer.addEventListener('dragover', e => {
            e.preventDefault();
            if (dropZone) dropZone.classList.add('drag-over');
        });
        
        adCreationContainer.addEventListener('dragleave', e => {
            const rect = adCreationContainer.getBoundingClientRect();
            if (
                e.clientX < rect.left || 
                e.clientX >= rect.right || 
                e.clientY < rect.top || 
                e.clientY >= rect.bottom
            ) {
                if (dropZone) dropZone.classList.remove('drag-over');
            }
        });
        
        adCreationContainer.addEventListener('drop', handleDrop);
    });
    
    // Observer for dynamically added adsets
    setupAdsetObserver(state);
    
    return {
        refreshDropZones: () => refreshDropZones(state)
    };
}

/**
 * Set up an observer to watch for new adsets
 * @param {Object} state - Application state
 */
function setupAdsetObserver(state) {
    const adsetContainer = document.querySelector('.adsets-container');
    if (!adsetContainer) return;
    
    const observer = new MutationObserver(mutations => {
        let newAdsets = false;
        
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('adset-item')) {
                    newAdsets = true;
                }
            });
        });
        
        if (newAdsets) {
            console.log('New adsets detected, refreshing drop zones');
            refreshDropZones(state);
        }
    });
    
    observer.observe(adsetContainer, { childList: true });
}

/**
 * Refresh drop zones for all adsets
 * @param {Object} state - Application state
 */
function refreshDropZones(state) {
    const handleDrop = createDropHandler(state);
    
    document.querySelectorAll('.asset-drop-zone').forEach(dropZone => {
        setupDropZone(dropZone, handleDragOver, handleDragEnter, handleDragLeave, handleDrop);
    });
}

// Function to create or find the Ad Creation Container
function createOrFindAdCreationContainer(dropZone) {
    // Check if the drop zone already has an ad-creation-container parent
    let adCreationContainer = dropZone.closest('.ad-creation-container');
    
    // If not, create a new one and wrap the drop zone with it
    if (!adCreationContainer) {
        adCreationContainer = document.createElement('div');
        adCreationContainer.className = 'ad-creation-container';
        
        // Get the parent of the drop zone
        const dropZoneParent = dropZone.parentElement;
        
        // Insert the container in place of the drop zone
        dropZoneParent.insertBefore(adCreationContainer, dropZone);
        
        // Move the drop zone inside the container
        adCreationContainer.appendChild(dropZone);
        
        // Create and add the Ad Name input
        const timestamp = Date.now();
        const adNameInput = document.createElement('div');
        adNameInput.className = 'ad-name-input';
        adNameInput.style.marginBottom = '10px';
        adNameInput.style.width = '100%';
        adNameInput.innerHTML = `
            <label for="ad-name-${timestamp}" style="display: block; margin-bottom: 5px; font-weight: 500; color: #444;">Ad Name</label>
            <input type="text" 
                   id="ad-name-${timestamp}" 
                   name="ad_name" 
                   class="form-control" 
                   placeholder="Enter ad name"
                   style="width: 100%; padding: 8px 12px; border: 1px solid #ced4da; border-radius: 4px; font-size: 14px;">
        `;
        
        // Insert the ad name input before the drop zone
        adCreationContainer.insertBefore(adNameInput, dropZone);
        
        // Create and add the Headline input
        const headlineInput = document.createElement('div');
        headlineInput.className = 'headline-input';
        headlineInput.style.display = 'block';
        headlineInput.style.marginBottom = '15px';
        headlineInput.style.width = '100%';
        headlineInput.innerHTML = `
            <label for="headline-${timestamp}" style="display: block; margin-bottom: 5px; font-weight: 500; color: #444;">Headline</label>
            <input type="text" 
                   id="headline-${timestamp}" 
                   name="headline" 
                   class="form-control headline-field" 
                   placeholder="Enter ad headline"
                   style="width: 100%; padding: 8px 12px; border: 1px solid #ced4da; border-radius: 4px; font-size: 14px; background-color: white;">
        `;
        
        // Insert the headline input after the ad name input but before the drop zone
        adCreationContainer.insertBefore(headlineInput, dropZone);
        
        console.log('Created new ad creation container with Ad Name and Headline inputs');
    }
    
    return adCreationContainer;
}

// Function to create dropzones for adsets
function createAdsetDropZone(adsetItem, platform = null) {
    console.log('Creating drop zone for adset:', adsetItem);
    
    // Create the drop zone element
    const dropZone = document.createElement('div');
    dropZone.className = 'asset-drop-zone';
    dropZone.dataset.adsetId = adsetItem.dataset.id || adsetItem.dataset.adsetId;
    dropZone.dataset.platform = platform || adsetItem.dataset.platform;
    dropZone.dataset.accountId = adsetItem.dataset.accountId;
    
    // Create and add the placeholder content
    const placeholder = document.createElement('div');
    placeholder.className = 'drop-placeholder';
    placeholder.innerHTML = `
        <i class="fas fa-cloud-upload-alt" style="font-size: 1.5rem; margin-bottom: 8px;"></i>
        <div>Drag assets here to create ads</div>
    `;
    dropZone.appendChild(placeholder);
    
    // Append the drop zone to the adset item
    adsetItem.appendChild(dropZone);
    
    // Ensure the drop zone has Ad Name and Headline inputs by wrapping it in an ad creation container
    createOrFindAdCreationContainer(dropZone);
    
    // Return the created drop zone
    return dropZone;
}

/**
 * Clean up any duplicate Ad Name or Headline inputs in drop zones
 */
function cleanupDuplicateInputs() {
    console.log('Cleaning up duplicate Ad Name and Headline inputs');
    
    // Find all asset drop zones
    const dropZones = document.querySelectorAll('.asset-drop-zone');
    
    dropZones.forEach(dropZone => {
        // Find any Ad Name inputs directly inside drop zones - these are duplicates
        const adNameInputs = dropZone.querySelectorAll(':scope > .ad-name-input, :scope > input.ad-name-input');
        if (adNameInputs.length > 0) {
            console.log(`Removing ${adNameInputs.length} duplicate Ad Name inputs from drop zone`);
            adNameInputs.forEach(input => input.remove());
        }
        
        // Find any Headline inputs directly inside drop zones - these are duplicates
        const headlineInputs = dropZone.querySelectorAll(':scope > .headline-input');
        if (headlineInputs.length > 0) {
            console.log(`Removing ${headlineInputs.length} duplicate Headline inputs from drop zone`);
            headlineInputs.forEach(input => input.remove());
        }
    });
    
    // Also find all asset-drop-zone has-asset that might contain duplicates
    const activeDropZones = document.querySelectorAll('.asset-drop-zone.has-asset');
    activeDropZones.forEach(dropZone => {
        // These should not have Ad Name or Headline inputs directly inside them
        const adNameInputs = dropZone.querySelectorAll('.ad-name-input, input.ad-name-input');
        const headlineInputs = dropZone.querySelectorAll('.headline-input');
        
        adNameInputs.forEach(input => {
            console.log('Removing duplicate Ad Name input from active drop zone');
            input.remove();
        });
        
        headlineInputs.forEach(input => {
            console.log('Removing duplicate Headline input from active drop zone');
            input.remove();
        });
    });
}

// Export the createAdsetDropZone function
export { createAdsetDropZone }; 