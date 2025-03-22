/**
 * Asset Selector Component
 * Manages asset library browsing and asset selection for the ad builder
 */

import { get } from '../services/api.js';
import { metaService, tiktokService } from '../services/platformService.js';

// ===========================
// Module imports
// ===========================
import { initAssetLibrary } from './asset-modules/AssetLibrary.js';
import { initAdsetDisplay } from './asset-modules/AdsetDisplay.js';
import { fetchExistingAds, renderAdsList } from './asset-modules/AdDisplay.js';
import { setupDragAndDrop } from './asset-modules/DragDropHandler.js';

/**
 * Initialize the Asset Selector component
 * @param {Object} elements - DOM elements object
 * @param {Object} state - Application state object
 * @param {Function} validateStep - Function to validate the step
 * @returns {Object} - AssetSelector methods
 */
export function initAssetSelector(elements, state, validateStep) {
    // Initialize sub-modules
    const assetLibrary = initAssetLibrary(elements, state, validateStep);
    const adsetDisplay = initAdsetDisplay(elements, state);
    
    /**
     * Set up event listeners for asset selection
     */
    function setupEventListeners() {
        // Open asset library button
        if (elements.selectFromLibraryBtn) {
            elements.selectFromLibraryBtn.addEventListener('click', assetLibrary.openAssetLibrary);
        }
        
        // Asset library filters
        elements.libraryTypeFilter.addEventListener('change', assetLibrary.filterAssetLibrary);
        elements.librarySearch.addEventListener('input', () => {
            // Debounce the search input to prevent excessive filtering
            clearTimeout(state.searchTimeout);
            state.searchTimeout = setTimeout(assetLibrary.filterAssetLibrary, 300);
        });
        
        // Modal close buttons
        elements.closeModalBtns.forEach(btn => {
            btn.addEventListener('click', assetLibrary.closeAllModals);
        });
        
        // The Select Assets button is now created and handled in AssetLibrary.js
        // We no longer need to set up a click handler here
        
        // Make library assets draggable
        if (elements.libraryAssets) {
            makeDraggable(elements.libraryAssets, state);
        }
    }

    /**
     * Get campaign details by ID
     * 
     * @param {string} platformType - 'meta' or 'tiktok'
     * @param {string} campaignId - The campaign ID
     * @returns {Object} - Campaign details with name and other information
     */
    async function getCampaignDetails(platformType, campaignId) {
        try {
            // In a real implementation, you would fetch this from your backend API
            // For now, we'll just try to use what we have in state (from checkboxes)
            if (platformType === 'meta') {
                // Try to find meta campaign checkbox label
                const campaignElement = document.querySelector(`label[for="meta-campaign-${campaignId}"]`);
                if (campaignElement) {
                    return {
                        id: campaignId,
                        name: campaignElement.textContent || `Campaign ${campaignId}`
                    };
                }
            } else if (platformType === 'tiktok') {
                // Try to find tiktok campaign checkbox label
                const campaignElement = document.querySelector(`label[for="tiktok-campaign-${campaignId}"]`);
                if (campaignElement) {
                    return {
                        id: campaignId,
                        name: campaignElement.textContent || `Campaign ${campaignId}`
                    };
                }
            }
            
            // Fallback
            return {
                id: campaignId,
                name: `${platformType.charAt(0).toUpperCase() + platformType.slice(1)} Campaign ${campaignId}`
            };
        } catch (error) {
            console.error(`Error getting campaign details for ${platformType} campaign ${campaignId}:`, error);
            return {
                id: campaignId,
                name: `Campaign ${campaignId}`
            };
        }
    }

    /**
     * Prepare the asset selector for display
     * Fetches and displays adsets and existing ads for selected campaigns
     */
    async function prepare() {
        // Clear previous content
        if (elements.uploadPreview) {
            elements.uploadPreview.innerHTML = '<div class="loading">Loading adsets and ads...</div>';
        }
        
        // Initialize state if needed
        if (!Array.isArray(state.selectedAssets)) {
            state.selectedAssets = [];
        }
        
        // Create split panels container
        const splitPanelsContainer = document.createElement('div');
        splitPanelsContainer.className = 'split-panels-container';
        
        // Create assets panel
        const assetsPanel = document.createElement('div');
        assetsPanel.className = 'assets-panel';
        assetsPanel.innerHTML = `
            <div class="assets-panel-header">
                Selected Assets
            </div>
            <div class="assets-panel-content">
                <div class="assets-help-message">Drag assets to adsets on the right to create ads</div>
                <div class="assets-container"></div>
            </div>
        `;
        
        // Create adsets panel
        const adsetsPanel = document.createElement('div');
        adsetsPanel.className = 'adsets-panel';
        adsetsPanel.innerHTML = `
            <div class="adsets-panel-header">
                <span>Adsets</span>
                <div class="header-controls">
                    <div class="adset-filters">
                        <input type="text" id="adsetSearchInput" class="adset-search" placeholder="Search adsets..." />
                        <select id="adsetStatusFilter" class="adset-status-filter">
                            <option value="all">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="paused">Paused</option>
                            <option value="deleted">Deleted</option>
                            <option value="review">In Review</option>
                            <option value="pending">Pending</option>
                        </select>
                    </div>
                </div>
            </div>
            <div class="adsets-panel-content">
                <div class="adsets-container"></div>
            </div>
        `;
        
        // Add panels to container
        splitPanelsContainer.appendChild(assetsPanel);
        splitPanelsContainer.appendChild(adsetsPanel);
        
        // Get reference to adsets container
        const adsetContainer = adsetsPanel.querySelector('.adsets-container');
        
        // Add event listeners for search and filter
        const adsetSearchInput = adsetsPanel.querySelector('#adsetSearchInput');
        const adsetStatusFilter = adsetsPanel.querySelector('#adsetStatusFilter');
        
        if (adsetSearchInput && adsetStatusFilter) {
            // Function to filter adsets based on search and status
            const filterAdsets = () => {
                const searchTerm = adsetSearchInput.value.toLowerCase().trim();
                const statusFilter = adsetStatusFilter.value;
                
                // Get all adset items
                const adsetItems = adsetContainer.querySelectorAll('.adset-item');
                
                // Loop through each adset and check if it matches the filters
                adsetItems.forEach(adsetItem => {
                    const adsetName = adsetItem.querySelector('.adset-name')?.textContent.toLowerCase() || '';
                    const adsetStatusEl = adsetItem.querySelector('.adset-status');
                    const adsetStatus = adsetStatusEl?.classList.toString().toLowerCase() || '';
                    
                    // Check if the adset matches both search term and status filter
                    const matchesSearch = searchTerm === '' || adsetName.includes(searchTerm);
                    
                    // Check status by looking for specific class names
                    let matchesStatus = statusFilter === 'all';
                    if (!matchesStatus && adsetStatusEl) {
                        // Check for specific status classes to ensure accurate filtering
                        if (statusFilter === 'active' && (adsetStatusEl.classList.contains('active') || adsetStatusEl.classList.contains('status-active'))) {
                            matchesStatus = true;
                        } else if (statusFilter === 'paused' && (adsetStatusEl.classList.contains('paused') || adsetStatusEl.classList.contains('status-paused'))) {
                            matchesStatus = true;
                        } else if (statusFilter === 'deleted' && (adsetStatusEl.classList.contains('deleted') || adsetStatusEl.classList.contains('status-deleted'))) {
                            matchesStatus = true;
                        } else if (statusFilter === 'review' && (adsetStatusEl.classList.contains('review') || adsetStatusEl.classList.contains('status-review'))) {
                            matchesStatus = true;
                        } else if (statusFilter === 'pending' && (adsetStatusEl.classList.contains('pending') || adsetStatusEl.classList.contains('status-pending'))) {
                            matchesStatus = true;
                        }
                    }
                    
                    // Show or hide based on filter results
                    adsetItem.style.display = (matchesSearch && matchesStatus) ? 'block' : 'none';
                });
                
                // Check if there are any visible adsets
                const visibleAdsets = adsetContainer.querySelectorAll('.adset-item[style="display: block;"]');
                if (visibleAdsets.length === 0 && adsetItems.length > 0) {
                    // If no adsets match the filter, show a "no results" message
                    let noResultsMessage = adsetContainer.querySelector('.no-filter-results');
                    if (!noResultsMessage) {
                        noResultsMessage = document.createElement('div');
                        noResultsMessage.className = 'no-filter-results';
                        noResultsMessage.innerHTML = `
                            <div class="empty-panel-message">
                                <i class="fas fa-filter"></i>
                                <div class="message-text">No adsets match your filters</div>
                                <div class="message-subtext">Try adjusting your search or filter criteria</div>
                            </div>
                        `;
                        adsetContainer.appendChild(noResultsMessage);
                    } else {
                        noResultsMessage.style.display = 'block';
                    }
                } else {
                    // Hide the "no results" message if there are visible adsets
                    const noResultsMessage = adsetContainer.querySelector('.no-filter-results');
                    if (noResultsMessage) {
                        noResultsMessage.style.display = 'none';
                    }
                }
            };
            
            // Add event listeners
            adsetSearchInput.addEventListener('input', filterAdsets);
            adsetStatusFilter.addEventListener('change', filterAdsets);
        }
        
        let hasLoadedContent = false;
        
        // Fetch Meta adsets and ads
        if (state.selectedPlatforms.includes('meta') && state.campaignSelections.meta.campaigns.length > 0) {
            hasLoadedContent = await adsetDisplay.displayMetaAdsets(
                adsetContainer, 
                state.campaignSelections.meta.campaigns,
                state.campaignSelections.meta.campaignAccountMap || {},
                getCampaignDetails
            );
        }
        
        // Fetch TikTok adsets and ads
        if (state.selectedPlatforms.includes('tiktok') && state.campaignSelections.tiktok.campaigns.length > 0) {
            const tiktokLoaded = await adsetDisplay.displayTikTokAdsets(
                adsetContainer, 
                state.campaignSelections.tiktok.campaigns,
                state.campaignSelections.tiktok.campaignAccountMap || {},
                getCampaignDetails
            );
            
            hasLoadedContent = hasLoadedContent || tiktokLoaded;
        }
        
        if (elements.uploadPreview) {
            elements.uploadPreview.innerHTML = ''; // Clear loading indicator
            elements.uploadPreview.appendChild(splitPanelsContainer);
            
            // Check if we have content
            if (!hasLoadedContent) {
                const emptyMessage = document.createElement('div');
                emptyMessage.className = 'empty-panel-message';
                emptyMessage.innerHTML = `
                    <i class="fas fa-info-circle"></i>
                    <div class="message-text">No adsets found for the selected campaigns</div>
                    <div class="message-subtext">Select a campaign from Step 2 to see its adsets</div>
                `;
                adsetsPanel.querySelector('.adsets-panel-content').appendChild(emptyMessage);
            }
            
            // Restore any previously selected assets that were not attached to adsets
            if (state.selectedAssets && state.selectedAssets.length > 0) {
                // Make sure we're using the assets panel content container, not the selected-assets-section
                const assetsContainer = assetsPanel.querySelector('.assets-container');
                if (assetsContainer) {
                    restoreSelectedAssets(assetsContainer);
                }
            }
            
            // Initialize drag and drop functionality for assets to adsets
            setupDragAndDrop(elements, state);
            
            // Restore previously attached assets if any
            if (hasLoadedContent) {
                restorePreviouslyAttachedAssets(adsetContainer);
                
                // Re-initialize drop zones after restoring assets
                setTimeout(() => {
                    const dragDropHandler = setupDragAndDrop(elements, state);
                    dragDropHandler.setupDropZones();
                }, 200);
            }
            
            // Make selected assets draggable
            if (elements.uploadPreview) {
                makeDraggable(elements.uploadPreview, state);
            }
        }
        
        // Update validation state
        validateStep();
    }
    
    /**
     * Restore previously attached assets to adsets when returning to Step 3
     * @param {HTMLElement} adsetContainer - The container with all adsets
     */
    function restorePreviouslyAttachedAssets(adsetContainer) {
        // Check if we have any attached assets in state
        if (!state.newAds || Object.keys(state.newAds).length === 0) {
            return;
        }
        
        // Make sure we have library assets loaded
        if (!state.allLibraryAssets || state.allLibraryAssets.length === 0) {
            // Load library assets if not already loaded
            assetLibrary.loadLibraryAssets();
            return; // Will need to wait for assets to load
        }
        
        // For each platform in newAds
        Object.keys(state.newAds).forEach(platform => {
            const platformAdsets = state.newAds[platform];
            
            // For each adset in this platform
            Object.keys(platformAdsets).forEach(adsetId => {
                const adsetData = platformAdsets[adsetId];
                
                // Find the adset's drop zone
                const adsetItem = adsetContainer.querySelector(`.adset-item[data-adset-id="${adsetId}"][data-platform="${platform}"]`);
                if (!adsetItem) return;
                
                // Display the ad creation container 
                const adCreationContainer = adsetItem.querySelector('.ad-creation-container');
                if (adCreationContainer) {
                    adCreationContainer.style.display = 'block';
                }
                
                // Hide the "Create Ad" button since we're already in creation mode
                const createAdBtn = adsetItem.querySelector('.create-ad-btn');
                if (createAdBtn) {
                    createAdBtn.style.display = 'none';
                }
                
                // Set the ad name input value
                const adNameInput = adsetItem.querySelector(`#ad-name-${adsetId}`);
                if (adNameInput) {
                    adNameInput.value = adsetData.name || '';
                }
                
                // Find the drop zone
                const dropZone = adsetItem.querySelector('.asset-drop-zone');
                if (!dropZone) return;
                
                // Remove placeholder if it exists
                const placeholder = dropZone.querySelector('.drop-placeholder');
                if (placeholder) {
                    placeholder.remove();
                }
                
                // For each asset ID in this adset
                adsetData.assets.forEach(assetId => {
                    // Find the asset data from allLibraryAssets
                    const asset = state.allLibraryAssets.find(a => a.id === assetId);
                    if (!asset) return;
                    
                    // Check if asset already exists in this adset
                    if (dropZone.querySelector(`.asset-preview[data-asset-id="${assetId}"]`)) {
                        return;
                    }
                    
                    // Create asset preview element
                    const assetPreview = document.createElement('div');
                    assetPreview.className = 'asset-preview';
                    assetPreview.dataset.assetId = assetId;
                    assetPreview.dataset.adsetId = adsetId;
                    assetPreview.dataset.platform = platform;
                    assetPreview.dataset.adName = adsetData.name || '';
                    
                    // Add content based on asset type
                    if (asset.type === 'image') {
                        const img = document.createElement('img');
                        img.src = asset.url;
                        img.alt = asset.name || 'Asset Preview';
                        assetPreview.appendChild(img);
                    } else if (asset.type === 'video') {
                        const video = document.createElement('video');
                        video.src = asset.url;
                        video.muted = true;
                        video.controls = false;
                        assetPreview.appendChild(video);
                    }
                    
                    // Add remove button
                    const removeBtn = document.createElement('button');
                    removeBtn.className = 'remove-btn';
                    removeBtn.innerHTML = '×';
                    removeBtn.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        assetPreview.remove();
                        
                        // Remove this asset from state.newAds
                        const assetIndex = state.newAds[platform][adsetId].assets.indexOf(assetId);
                        if (assetIndex !== -1) {
                            state.newAds[platform][adsetId].assets.splice(assetIndex, 1);
                        }
                        
                        // Add placeholder if no assets left
                        if (!dropZone.querySelector('.asset-preview')) {
                            const newPlaceholder = document.createElement('div');
                            newPlaceholder.className = 'drop-placeholder';
                            newPlaceholder.innerHTML = 'Drag assets here to create ads';
                            dropZone.appendChild(newPlaceholder);
                        }
                    });
                    
                    assetPreview.appendChild(removeBtn);
                    dropZone.appendChild(assetPreview);
                    
                    // Add hidden input for form submission
                    const hiddenInput = document.createElement('input');
                    hiddenInput.type = 'hidden';
                    hiddenInput.name = `new_ads[${platform}][${adsetId}][assets][]`;
                    hiddenInput.value = assetId;
                    dropZone.appendChild(hiddenInput);
                    
                    // Add hidden input for ad name if it doesn't exist
                    if (!dropZone.querySelector(`input[name="new_ads[${platform}][${adsetId}][name]"]`)) {
                        const nameInput = document.createElement('input');
                        nameInput.type = 'hidden';
                        nameInput.name = `new_ads[${platform}][${adsetId}][name]`;
                        nameInput.value = adsetData.name || '';
                        dropZone.appendChild(nameInput);
                    }
                });
            });
        });
    }
    
    /**
     * Restore previously selected assets that were not attached to adsets
     * @param {HTMLElement} assetsContainer - The container for selected assets
     */
    function restoreSelectedAssets(assetsContainer) {
        // Make sure library assets are loaded
        if (!state.allLibraryAssets || state.allLibraryAssets.length === 0) {
            // Load library assets if not already loaded
            assetLibrary.loadLibraryAssets();
            return; // Will need to wait for assets to load
        }
        
        // Clear the assets container first
        if (assetsContainer) {
            assetsContainer.innerHTML = '';
        } else {
            console.error('Assets container not found for restoring assets');
            return;
        }
        
        // If no assets, show empty message
        if (state.selectedAssets.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-panel-message';
            emptyMessage.textContent = 'No assets selected. Click "Select Assets" to choose from library.';
            assetsContainer.appendChild(emptyMessage);
            return;
        }
        
        // Add each selected asset to the section
        state.selectedAssets.forEach(assetId => {
            // Find the asset data
            const asset = state.allLibraryAssets.find(a => a.id === assetId);
            if (!asset) return;
            
            // Skip if this asset is already in the preview
            if (assetsContainer.querySelector(`.preview-item[data-id="${asset.id}"]`)) {
                return;
            }
            
            // Create preview item
            const previewItem = document.createElement('div');
            previewItem.className = 'preview-item';
            previewItem.dataset.id = asset.id;
            previewItem.dataset.type = asset.type;
            
            // Add asset source and show preview
            if (asset.type === 'image') {
                const img = document.createElement('img');
                img.src = asset.url;
                img.className = 'preview-img';
                previewItem.appendChild(img);
            } else if (asset.type === 'video') {
                const video = document.createElement('video');
                video.src = asset.url;
                video.className = 'preview-video';
                video.controls = true;
                previewItem.appendChild(video);
            }
            
            // Add remove button
            const removeBtn = document.createElement('button');
            removeBtn.className = 'preview-remove';
            removeBtn.innerHTML = '&times;';
            removeBtn.addEventListener('click', function(e) {
                e.preventDefault();
                previewItem.remove();
                
                // Update selected assets
                const index = state.selectedAssets.indexOf(asset.id);
                if (index !== -1) {
                    state.selectedAssets.splice(index, 1);
                }
                
                // Show empty message if no assets left
                if (assetsContainer.querySelectorAll('.preview-item').length === 0) {
                    const emptyMessage = document.createElement('div');
                    emptyMessage.className = 'empty-panel-message';
                    emptyMessage.textContent = 'No assets selected. Click "Select Assets" to choose from library.';
                    assetsContainer.appendChild(emptyMessage);
                }
                
                validateStep();
            });
            
            // Make the asset item draggable for use with adsets
            previewItem.draggable = true;
            previewItem.addEventListener('dragstart', function(e) {
                // Create asset data object
                const assetDataObj = {
                    id: asset.id,
                    type: asset.type,
                    url: asset.url,
                    name: asset.name,
                    mime_type: asset.mime_type || null,
                    thumbnail_url: asset.thumbnail_url || null
                };
                
                // Stringify the data for transfer
                const assetDataJson = JSON.stringify(assetDataObj);
                
                // Set data in multiple formats for maximum compatibility
                e.dataTransfer.setData('application/json', assetDataJson);
                e.dataTransfer.setData('text/plain', assetDataJson); // Fallback format
                
                console.log('Asset drag started:', asset.id);
                console.log('Data formats set:', e.dataTransfer.types);
                
                previewItem.classList.add('dragging');
                document.body.classList.add('dragging');
                
                // Create a custom drag image
                const dragImage = document.createElement('div');
                dragImage.className = 'drag-image';
                dragImage.innerHTML = `<div class="drag-image-content">${asset.type === 'image' ? '<i class="fas fa-image"></i>' : '<i class="fas fa-video"></i>'}</div>`;
                document.body.appendChild(dragImage);
                dragImage.style.position = 'absolute';
                dragImage.style.left = '-9999px';
                e.dataTransfer.setDragImage(dragImage, 20, 20);
                
                // Clean up the drag image element after a short delay
                setTimeout(() => {
                    document.body.removeChild(dragImage);
                }, 100);
            });
            
            previewItem.addEventListener('dragend', function() {
                previewItem.classList.remove('dragging');
                document.body.classList.remove('dragging');
            });
            
            previewItem.appendChild(removeBtn);
            assetsContainer.appendChild(previewItem);
        });
    }
    
    /**
     * Make assets draggable for drag and drop
     * @param {HTMLElement} container - The container with assets
     * @param {Object} state - The application state
     */
    function makeDraggable(container, state) {
        const draggableItems = container.querySelectorAll('.preview-item');
        
        draggableItems.forEach(item => {
            // Ensure the element has draggable attribute
            item.setAttribute('draggable', 'true');
            
            // Set data-id on the item itself
            if (!item.dataset.id) {
                const assetId = item.querySelector('[data-id]')?.dataset.id || 
                                item.querySelector('img')?.dataset.id || 
                                item.querySelector('video')?.dataset.id || 
                                generateUniqueId();
                item.dataset.id = assetId;
            }
            
            // Remove existing listener first to prevent duplicates
            item.removeEventListener('dragstart', handleDragStart);
            
            // Add dragstart listener
            item.addEventListener('dragstart', handleDragStart);
        });
        
        /**
         * Handle dragstart event
         * @param {DragEvent} e - The drag event
         */
        function handleDragStart(e) {
            // Get asset ID
            const assetId = this.dataset.id;
            const assetElement = this.querySelector('img') || this.querySelector('video');
            const assetUrl = assetElement ? assetElement.src : '';
            const assetType = assetElement?.tagName === 'IMG' ? 'image' : 'video';
            
            // Add styling to dragged element
            this.classList.add('dragging');
            
            // Create comprehensive asset data object
            const assetData = {
                id: assetId,
                type: assetType,
                url: assetUrl,
                name: assetId,
                thumbnail_url: assetUrl,
                mime_type: assetType === 'image' ? 'image/jpeg' : 'video/mp4'
            };
            
            console.log('Asset being dragged with data:', assetData);
            
            // Set all possible data formats for maximum compatibility
            try {
                // Set as JSON string (primary format)
                const jsonString = JSON.stringify(assetData);
                e.dataTransfer.setData('application/json', jsonString);
                console.log('Set application/json data:', jsonString);
                
                // Also set as plain text for fallback
                e.dataTransfer.setData('text/plain', jsonString);
                
                // Set a URI list for browsers that support it
                e.dataTransfer.setData('text/uri-list', assetUrl);
                
                // Set HTML with data attributes for another fallback method
                const html = `<div class="asset-preview-drag" data-id="${assetId}" data-type="${assetData.type}">
                    ${assetData.type === 'image' 
                      ? `<img src="${assetUrl}" alt="${assetData.name}" />`
                      : `<video src="${assetUrl}"></video>`}
                    </div>`;
                e.dataTransfer.setData('text/html', html);
                
                // Set effect to copy
                e.dataTransfer.effectAllowed = 'copy';
            } catch (error) {
                console.error('Error setting drag data:', error);
            }
            
            // Make the dragImage look better
            if (e.dataTransfer.setDragImage && assetElement) {
                // Use the actual image/video as the drag image
                e.dataTransfer.setDragImage(assetElement, 50, 50);
            }
            
            // Add dragging class to body for visual cues
            document.body.classList.add('dragging');
            
            console.log('Drag started, dataTransfer set:', e.dataTransfer.types);
        }
        
        // Generate a unique ID for assets that don't have one
        function generateUniqueId() {
            return 'asset_' + Math.random().toString(36).substring(2, 11);
        }
    }
    
    /**
     * Refreshes the adsets for the selected campaigns
     * @param {Object} state - The application state
     * @param {HTMLElement} adsetContainer - The container to render adsets in
     */
    function refreshAdsets(state, adsetContainer) {
        // Show loading state
        adsetContainer.innerHTML = '<div class="loading-adsets"><i class="fas fa-spinner fa-spin"></i> Loading adsets...</div>';
        
        // Get selected campaigns
        const selectedCampaigns = state.selectedCampaigns || [];
        
        if (selectedCampaigns.length === 0) {
            // No campaigns selected, show empty message
            adsetContainer.innerHTML = `
                <div class="empty-panel-message">
                    <i class="fas fa-info-circle"></i>
                    <div class="message-text">No adsets found for the selected campaigns</div>
                    <div class="message-subtext">Select a campaign from Step 2 to see its adsets</div>
                </div>
            `;
            return;
        }
        
        // Fetch adsets for the selected campaigns
        const campaignIds = selectedCampaigns.map(campaign => campaign.id);
        
        // Make API call to get adsets for these campaigns
        fetch('/api/adsets-by-campaigns', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ campaign_ids: campaignIds })
        })
        .then(response => response.json())
        .then(data => {
            if (!data.adsets || data.adsets.length === 0) {
                adsetContainer.innerHTML = `
                    <div class="empty-panel-message">
                        <i class="fas fa-info-circle"></i>
                        <div class="message-text">No adsets found for the selected campaigns</div>
                        <div class="message-subtext">The selected campaigns don't have any adsets</div>
                    </div>
                `;
                return;
            }
            
            // Clear the container
            adsetContainer.innerHTML = '';
            
            // Render each adset
            data.adsets.forEach(adset => {
                renderAdset(adset, adsetContainer, state);
            });
            
            // Setup drag and drop after rendering adsets
            setupDragAndDrop();
        })
        .catch(error => {
            console.error('Error fetching adsets:', error);
            adsetContainer.innerHTML = `
                <div class="empty-panel-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <div class="message-text">Error loading adsets</div>
                    <div class="message-subtext">Please try again later</div>
                </div>
            `;
        });
    }

    return {
        setupEventListeners,
        openAssetLibrary: assetLibrary.openAssetLibrary,
        loadLibraryAssets: assetLibrary.loadLibraryAssets,
        prepare
    };
}

/**
 * Make an element draggable for drag & drop operations
 * @param {HTMLElement} el - The element to make draggable
 */
function makeDraggable(el) {
    if (!el) {
        console.warn('Attempted to make null/undefined element draggable');
        return;
    }
    
    console.log('Making element draggable:', el.dataset.id);
    
    // Make element draggable
    el.setAttribute('draggable', 'true');
    
    // Add event listeners for drag operations
    el.addEventListener('dragstart', function(e) {
        console.log('Drag start event for asset:', this.dataset.id);
        
        try {
            // Add dragging class to element for styling
            this.classList.add('dragging');
            
            // Clear any existing data
            e.dataTransfer.clearData();
            
            // Prepare asset data as object
            const assetData = {
                id: this.dataset.id,
                type: this.dataset.type || 'image',
                url: this.dataset.url || this.querySelector('img')?.src,
                thumbnail: this.dataset.thumbnail || this.querySelector('img')?.src
            };
            
            console.log('Asset data for drag:', assetData);
            
            // Set data in multiple formats for maximum compatibility
            const jsonData = JSON.stringify(assetData);
            
            // Set as application/json (preferred format)
            e.dataTransfer.setData('application/json', jsonData);
            console.log('Set dataTransfer application/json:', jsonData);
            
            // Also set as text/plain for fallback
            e.dataTransfer.setData('text/plain', jsonData);
            console.log('Set dataTransfer text/plain:', jsonData);
            
            // Set drag image if available
            const img = this.querySelector('img');
            if (img) {
                try {
                    const rect = img.getBoundingClientRect();
                    const offsetX = e.clientX - rect.left;
                    const offsetY = e.clientY - rect.top;
                    e.dataTransfer.setDragImage(img, offsetX, offsetY);
                    console.log('Set custom drag image from img element');
                } catch (imgError) {
                    console.warn('Error setting drag image:', imgError);
                }
            }
            
            // Set allowed effects
            e.dataTransfer.effectAllowed = 'copy';
            
            console.log('Drag start successful, dataTransfer set');
        } catch (error) {
            console.error('Error in dragstart event:', error);
        }
    });
    
    el.addEventListener('dragend', function(e) {
        console.log('Drag end event for asset:', this.dataset.id);
        this.classList.remove('dragging');
        
        // Check if drop was successful by looking for dropEffect
        if (e.dataTransfer.dropEffect === 'copy') {
            console.log('Drop was successful (copy effect)');
        } else {
            console.log('Drop effect:', e.dataTransfer.dropEffect);
        }
    });
} 