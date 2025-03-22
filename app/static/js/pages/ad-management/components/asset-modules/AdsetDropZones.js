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
    
    // Add class to parent container if multiple adsets are present
    const adsetContainer = document.querySelector('.adsets-container');
    if (adsetContainer && adsetItems.length > 1) {
        adsetContainer.classList.add('multiple-adsets');
        console.log('Added multiple-adsets class to container for responsive grid layout');
    }
    
    // Add campaign group headers if there are multiple campaigns
    organizeAdsetsByCampaign();
    
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
        
        // Add delete button to the ad creation container
        addDeleteButtonToContainer(adCreationContainer);
        
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
                       name="tiktok_ad_names[${adsetItem.dataset.adsetId || adsetItem.dataset.id}][0]" 
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
            <label for="headline-${adsetItem.dataset.adsetId || adsetItem.dataset.id}" style="display: block !important; margin-bottom: 5px; font-weight: 500; color: #444;">Ad Text</label>
            <input type="text" 
                   id="headline-${adsetItem.dataset.adsetId || adsetItem.dataset.id}" 
                   name="tiktok_ad_headlines[${adsetItem.dataset.adsetId || adsetItem.dataset.id}][0]" 
                   class="form-control headline-field" 
                   placeholder="Enter ad text"
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
    
    // Set up drop zones for asset dropping
    document.querySelectorAll('.asset-drop-zone').forEach(dropZone => {
        setupDropZone(dropZone, handleDragOver, handleDragEnter, handleDragLeave, handleDrop);
    });
    
    // Ensure all ad creation containers have delete buttons
    document.querySelectorAll('.ad-creation-container').forEach(container => {
        addDeleteButtonToContainer(container);
    });
}

/**
 * Add a delete button to an ad creation container
 * @param {HTMLElement} container - The ad creation container element
 */
function addDeleteButtonToContainer(container) {
    // Check if the container already has a delete button
    if (container.querySelector('.ad-container-delete-btn')) {
        return;
    }
    
    // Create delete button
    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'ad-container-delete-btn';
    deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
    deleteButton.title = 'Delete this ad';
    
    // Position the button within the container
    deleteButton.style.position = 'absolute';
    deleteButton.style.top = '10px';
    deleteButton.style.right = '10px';
    deleteButton.style.zIndex = '100';
    deleteButton.style.backgroundColor = '#fff';
    deleteButton.style.border = '1px solid #dee2e6';
    deleteButton.style.borderRadius = '50%';
    deleteButton.style.width = '28px';
    deleteButton.style.height = '28px';
    deleteButton.style.display = 'flex';
    deleteButton.style.alignItems = 'center';
    deleteButton.style.justifyContent = 'center';
    deleteButton.style.cursor = 'pointer';
    deleteButton.style.color = '#dc3545';
    deleteButton.style.opacity = '0.7';
    deleteButton.style.transition = 'all 0.2s ease';
    
    // Add hover styles
    deleteButton.addEventListener('mouseover', () => {
        deleteButton.style.opacity = '1';
        deleteButton.style.backgroundColor = '#dc3545';
        deleteButton.style.color = '#fff';
        deleteButton.style.transform = 'scale(1.1)';
    });
    
    deleteButton.addEventListener('mouseout', () => {
        deleteButton.style.opacity = '0.7';
        deleteButton.style.backgroundColor = '#fff';
        deleteButton.style.color = '#dc3545';
        deleteButton.style.transform = 'scale(1)';
    });
    
    // Add click handler to remove the container
    deleteButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Add a fade-out animation
        container.style.transition = 'all 0.3s ease';
        container.style.opacity = '0';
        container.style.transform = 'scale(0.9)';
        container.style.height = '0';
        container.style.overflow = 'hidden';
        
        // Remove the container after animation completes
        setTimeout(() => {
            container.remove();
            
            // Notify the app that assets have changed
            if (window.refreshAppState) {
                window.refreshAppState();
            }
            
            // Dispatch an event that assets have been updated
            document.dispatchEvent(new CustomEvent('assets-updated'));
        }, 300);
    });
    
    // Add the button to the container
    container.appendChild(deleteButton);
    
    // Make sure the container has position relative for absolute positioning of the button
    container.style.position = 'relative';
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
        
        // Get platform and adset ID for input names
        const platform = dropZone.dataset.platform || 'tiktok';
        const adsetId = dropZone.dataset.adsetId || 'default';
        
        // First remove any existing Ad Name inputs with the same name
        const existingAdNameInputs = document.querySelectorAll(`input[name="tiktok_ad_names[${adsetId}][0]"], input[name="ad_name"]`);
        existingAdNameInputs.forEach(input => {
            if (input.closest('.ad-creation-container') !== adCreationContainer) {
                console.log(`Removing existing Ad Name input with same name from another container`, input);
                input.value = '';  // Clear the value to avoid submission
            }
        });
        
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
                   name="tiktok_ad_names[${adsetId}][0]" 
                   class="form-control" 
                   placeholder="Enter ad name"
                   style="width: 100%; padding: 8px 12px; border: 1px solid #ced4da; border-radius: 4px; font-size: 14px;">
        `;
        
        // Insert the ad name input before the drop zone
        adCreationContainer.insertBefore(adNameInput, dropZone);
        
        // First remove any existing Headline inputs with the same name
        const existingHeadlineInputs = document.querySelectorAll(`input[name="tiktok_ad_headlines[${adsetId}][0]"], input[name="headline"]`);
        existingHeadlineInputs.forEach(input => {
            if (input.closest('.ad-creation-container') !== adCreationContainer) {
                console.log(`Removing existing Headline input with same name from another container`, input);
                input.value = '';  // Clear the value to avoid submission
            }
        });
        
        // Create and add the Headline input
        const headlineInput = document.createElement('div');
        headlineInput.className = 'headline-input';
        headlineInput.style.display = 'block';
        headlineInput.style.marginBottom = '15px';
        headlineInput.style.width = '100%';
        headlineInput.innerHTML = `
            <label for="headline-${timestamp}" style="display: block; margin-bottom: 5px; font-weight: 500; color: #444;">Ad Text</label>
            <input type="text" 
                   id="headline-${timestamp}" 
                   name="tiktok_ad_headlines[${adsetId}][0]" 
                   class="form-control headline-field" 
                   placeholder="Enter ad text"
                   style="width: 100%; padding: 8px 12px; border: 1px solid #ced4da; border-radius: 4px; font-size: 14px; background-color: white;">
        `;
        
        // Insert the headline input after the ad name input but before the drop zone
        adCreationContainer.insertBefore(headlineInput, dropZone);
        
        // Add a delete button to the container
        addDeleteButtonToContainer(adCreationContainer);
        
        console.log('Created new ad creation container with Ad Name and Headline inputs');
    }
    
    return adCreationContainer;
}

// Function to create dropzones for adsets
function createAdsetDropZone(adsetItem, platform = null) {
    console.log('Creating drop zone for adset:', adsetItem);
    
    // Debug logs to see what values are in the dataset
    console.log('Dataset values:', {
        id: adsetItem.dataset.id,
        adsetId: adsetItem.dataset.adsetId,
        platform: adsetItem.dataset.platform,
        accountId: adsetItem.dataset.accountId,
        campaignId: adsetItem.dataset.campaignId
    });
    
    // Create the drop zone element
    const dropZone = document.createElement('div');
    dropZone.className = 'asset-drop-zone';
    
    // Look for adset ID in all possible places and use a default if not found
    const adsetId = adsetItem.dataset.id || adsetItem.dataset.adsetId;
    // If still undefined, try to get from campaign ID and append -adset-1 as a fallback
    const finalAdsetId = adsetId !== "undefined" && adsetId ? adsetId : 
                        (adsetItem.dataset.campaignId ? `${adsetItem.dataset.campaignId}-adset-1` : "default-adset");
    
    // Set the data attributes
    dropZone.dataset.adsetId = finalAdsetId;
    dropZone.dataset.platform = platform || adsetItem.dataset.platform;
    dropZone.dataset.accountId = adsetItem.dataset.accountId;
    dropZone.dataset.campaignId = adsetItem.dataset.campaignId; // Make sure we store campaign ID too
    
    console.log(`Set adset ID to: ${finalAdsetId} for drop zone:`, dropZone);
    
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

/**
 * Organize adsets visually by campaign
 * Groups adsets under their respective campaign headers for better organization
 */
function organizeAdsetsByCampaign() {
    const adsetContainer = document.querySelector('.adsets-container');
    if (!adsetContainer) return;
    
    // Get all adset items
    const adsetItems = adsetContainer.querySelectorAll('.adset-item');
    if (adsetItems.length <= 1) return; // No need to organize if there's only one adset
    
    // Create a map to group adsets by campaign
    const campaignMap = new Map();
    
    // First pass: identify unique campaigns
    adsetItems.forEach(adset => {
        const campaignId = adset.dataset.campaignId;
        const campaignName = adset.dataset.campaignName || 'Unknown Campaign';
        
        if (campaignId && !campaignMap.has(campaignId)) {
            campaignMap.set(campaignId, {
                name: campaignName,
                adsets: []
            });
        }
        
        if (campaignId) {
            campaignMap.get(campaignId).adsets.push(adset);
        }
    });
    
    // If we have multiple campaigns, add campaign header sections
    if (campaignMap.size > 1) {
        console.log(`Organizing ${campaignMap.size} campaigns with their adsets`);
        
        // Enable campaign-based collapsible sections for better organization
        adsetContainer.insertAdjacentHTML('afterbegin', `
            <style>
                .campaign-header {
                    background-color: #e9ecef;
                    border-radius: 5px;
                    padding: 8px 15px;
                    margin-bottom: 15px;
                    font-weight: 600;
                    color: #343a40;
                    cursor: pointer;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .campaign-header:hover {
                    background-color: #dee2e6;
                }
                
                .campaign-header i {
                    transition: transform 0.3s ease;
                }
                
                .campaign-header.collapsed i {
                    transform: rotate(-90deg);
                }
                
                .campaign-group {
                    margin-bottom: 20px;
                }
                
                .campaign-group.collapsed .campaign-adsets {
                    display: none;
                }
            </style>
        `);
        
        // Create a document fragment to build the new structure
        const fragment = document.createDocumentFragment();
        
        // Create campaign groups
        campaignMap.forEach((campaign, campaignId) => {
            // Create campaign group container
            const campaignGroup = document.createElement('div');
            campaignGroup.className = 'campaign-group';
            campaignGroup.dataset.campaignId = campaignId;
            
            // Create campaign header
            const campaignHeader = document.createElement('div');
            campaignHeader.className = 'campaign-header';
            campaignHeader.innerHTML = `
                <span>${campaign.name} (${campaign.adsets.length} ad ${campaign.adsets.length === 1 ? 'group' : 'groups'})</span>
                <i class="fas fa-chevron-down"></i>
            `;
            
            // Add click handler to toggle collapse
            campaignHeader.addEventListener('click', function() {
                this.classList.toggle('collapsed');
                this.parentElement.classList.toggle('collapsed');
            });
            
            // Create container for adsets
            const campaignAdsets = document.createElement('div');
            campaignAdsets.className = 'campaign-adsets';
            campaignAdsets.style.display = 'grid';
            campaignAdsets.style.gridTemplateColumns = 'repeat(auto-fill, minmax(350px, 1fr))';
            campaignAdsets.style.gap = '20px';
            campaignAdsets.style.marginTop = '15px';
            
            // Move adsets into this container
            campaign.adsets.forEach(adset => {
                campaignAdsets.appendChild(adset);
            });
            
            // Assemble campaign group
            campaignGroup.appendChild(campaignHeader);
            campaignGroup.appendChild(campaignAdsets);
            
            // Add to fragment
            fragment.appendChild(campaignGroup);
        });
        
        // Replace the children of the adset container with our new organized structure
        // First, store a reference to the adsets we want to keep
        const adsetsToReorganize = Array.from(adsetItems);
        
        // Clear the container
        adsetContainer.innerHTML = '';
        
        // Add our new organized structure
        adsetContainer.appendChild(fragment);
        
        console.log('Reorganized adsets into campaign groups with collapsible headers');
    }
}

// Export the createAdsetDropZone function
export { createAdsetDropZone }; 