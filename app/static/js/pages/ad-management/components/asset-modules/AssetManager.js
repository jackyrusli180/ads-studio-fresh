/**
 * Asset Manager Module
 * Handles asset-related operations in the drag and drop interface
 */

/**
 * Extract asset data from a drop event
 * @param {DragEvent} e - The drop event
 * @returns {Object|null} - The extracted asset data or null if none found
 */
export function extractAssetData(e) {
    console.log('Extracting asset data from drop event');
    
    // Try different methods to get asset data
    let assetData = null;
    
    // Method 1: Try application/json format (preferred)
    try {
        if (e.dataTransfer.types.includes('application/json')) {
            const jsonText = e.dataTransfer.getData('application/json');
            console.log('Found application/json data:', jsonText);
            assetData = JSON.parse(jsonText);
        }
    } catch (err) {
        console.warn('Error parsing application/json data:', err);
    }
    
    // Method 2: Try text/plain format as fallback
    if (!assetData) {
        try {
            if (e.dataTransfer.types.includes('text/plain')) {
                const plainText = e.dataTransfer.getData('text/plain');
                console.log('Found text/plain data:', plainText);
                assetData = JSON.parse(plainText);
            }
        } catch (err) {
            console.warn('Error parsing text/plain data:', err);
        }
    }
    
    // Method 3: Try to get data from the currently dragged element
    if (!assetData) {
        const draggedElem = document.querySelector('.dragging');
        if (draggedElem) {
            console.log('Getting data from element with .dragging class');
            assetData = {
                id: draggedElem.dataset.id,
                type: draggedElem.dataset.type || 'image',
                url: draggedElem.dataset.url || draggedElem.querySelector('img')?.src,
                name: draggedElem.dataset.name || `Asset ${draggedElem.dataset.id}`
            };
        }
    }
    
    // Validate the asset data
    if (!assetData || !assetData.id) {
        console.error('No valid asset data could be extracted');
        return null;
    }
    
    // Ensure all required fields exist
    assetData.type = assetData.type || 'image';
    assetData.name = assetData.name || `Asset ${assetData.id}`;
    
    console.log('Successfully extracted asset data:', assetData);
    return assetData;
}

/**
 * Create a preview element for an asset
 * @param {Object} assetData - The asset data object
 * @returns {HTMLElement} - The preview element
 */
export function createAssetPreview(assetData) {
    console.log('Creating asset preview for type:', assetData.type);
    
    // Create the preview container
    const previewContainer = document.createElement('div');
    previewContainer.className = 'asset-preview-container';
    previewContainer.style.position = 'relative';
    previewContainer.style.display = 'flex';
    previewContainer.style.flexDirection = 'column';
    previewContainer.style.alignItems = 'center';
    previewContainer.style.justifyContent = 'center';
    previewContainer.style.margin = '5px';
    previewContainer.style.padding = '4px';
    previewContainer.style.borderRadius = '4px';
    // Remove white background
    previewContainer.style.backgroundColor = 'transparent'; 
    previewContainer.style.boxShadow = 'none';
    previewContainer.style.width = '100%';
    previewContainer.style.maxWidth = '120px';
    previewContainer.dataset.assetId = assetData.id;
    
    // Create the appropriate preview based on asset type
    let preview;
    if (assetData.type === 'video') {
        preview = document.createElement('video');
        preview.controls = true;
        preview.muted = true;
        preview.style.maxHeight = '100px';
        preview.style.maxWidth = '100%';
        preview.style.borderRadius = '4px';
        preview.style.boxShadow = '0 1px 3px rgba(0,0,0,0.12)';
        
        const source = document.createElement('source');
        source.src = assetData.url;
        source.type = 'video/mp4'; // Default to mp4, might need adjustment
        
        preview.appendChild(source);
        preview.load();
    } else {
        // Default to image preview
        preview = document.createElement('img');
        preview.src = assetData.url;
        preview.alt = assetData.name || 'Asset preview';
        preview.style.maxHeight = '100px';
        preview.style.maxWidth = '100%';
        preview.style.objectFit = 'contain';
        preview.style.borderRadius = '4px';
        preview.style.boxShadow = '0 1px 3px rgba(0,0,0,0.12)';
    }
    
    // Add the preview to the container
    previewContainer.appendChild(preview);
    
    // Create label for the asset name (smaller and more compact)
    const nameLabel = document.createElement('div');
    nameLabel.className = 'asset-name';
    nameLabel.textContent = assetData.name || `Asset ${assetData.id}`;
    nameLabel.style.fontSize = '0.7rem';
    nameLabel.style.marginTop = '3px';
    nameLabel.style.textAlign = 'center';
    nameLabel.style.width = '100%';
    nameLabel.style.overflow = 'hidden';
    nameLabel.style.textOverflow = 'ellipsis';
    nameLabel.style.whiteSpace = 'nowrap';
    nameLabel.style.color = '#666';
    previewContainer.appendChild(nameLabel);
    
    // Add a remove button
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-asset-btn';
    removeBtn.innerHTML = '&times;';
    removeBtn.style.position = 'absolute';
    removeBtn.style.top = '-8px';
    removeBtn.style.right = '-8px';
    removeBtn.style.backgroundColor = '#ff4d4f';
    removeBtn.style.color = 'white';
    removeBtn.style.border = 'none';
    removeBtn.style.borderRadius = '50%';
    removeBtn.style.width = '20px';
    removeBtn.style.height = '20px';
    removeBtn.style.display = 'flex';
    removeBtn.style.justifyContent = 'center';
    removeBtn.style.alignItems = 'center';
    removeBtn.style.fontSize = '12px';
    removeBtn.style.cursor = 'pointer';
    removeBtn.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    removeBtn.style.zIndex = '10'; // Ensure it's above other elements
    
    // Add event listener to remove button
    removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // Find parent drop zone and asset grid container
        const assetContainer = previewContainer.closest('.assets-grid-container');
        const dropZone = previewContainer.closest('.asset-drop-zone');
        
        if (dropZone && dropZone.dataset.assets) {
            try {
                // Remove this asset from drop zone's stored assets
                const storedAssets = JSON.parse(dropZone.dataset.assets);
                const updatedAssets = storedAssets.filter(asset => 
                    asset.id !== assetData.id || 
                    asset.url !== assetData.url
                );
                
                if (updatedAssets.length === 0) {
                    // This was the last asset, revert the drop zone to empty state
                    dropZone.innerHTML = '';
                    dropZone.classList.remove('has-asset');
                    
                    // Add back the placeholder
                    const placeholder = document.createElement('div');
                    placeholder.className = 'drop-placeholder';
                    placeholder.innerHTML = `
                        <i class="fas fa-plus-circle"></i>
                        <div>Drag asset here</div>
                    `;
                    dropZone.appendChild(placeholder);
                } else {
                    // Update the stored assets
                    dropZone.dataset.assets = JSON.stringify(updatedAssets);
                    
                    // Remove just this preview
                    previewContainer.remove();
                }
                
                // Decrement the usage count for this asset
                if (typeof decrementUsageCount === 'function') {
                    decrementUsageCount(assetData.id);
                }
                
                // Dispatch event for asset removed
                const assetRemovedEvent = new CustomEvent('asset-removed', {
                    detail: {
                        assetId: assetData.id,
                        dropZoneId: dropZone.dataset.adsetId
                    }
                });
                document.dispatchEvent(assetRemovedEvent);
                
            } catch (err) {
                console.error('Error removing asset:', err);
            }
        } else {
            // Just remove the preview if we can't find proper containers
            previewContainer.remove();
        }
    });
    
    previewContainer.appendChild(removeBtn);
    
    return previewContainer;
}

/**
 * Increment the usage counter for an asset
 * @param {string} assetId - The asset ID
 */
export function incrementUsageCount(assetId) {
    const assetItem = document.querySelector(`.preview-item[data-id="${assetId}"]`);
    if (!assetItem) return;
    
    let usageCounter = assetItem.querySelector('.usage-counter');
    
    if (!usageCounter) {
        // Create a new counter if it doesn't exist
        usageCounter = document.createElement('div');
        usageCounter.className = 'usage-counter';
        usageCounter.style.position = 'absolute';
        usageCounter.style.top = '-5px';
        usageCounter.style.right = '-5px';
        usageCounter.style.backgroundColor = '#3498db';
        usageCounter.style.color = 'white';
        usageCounter.style.borderRadius = '50%';
        usageCounter.style.width = '22px';
        usageCounter.style.height = '22px';
        usageCounter.style.display = 'flex';
        usageCounter.style.alignItems = 'center';
        usageCounter.style.justifyContent = 'center';
        usageCounter.style.fontSize = '12px';
        usageCounter.style.fontWeight = 'bold';
        usageCounter.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.2)';
        usageCounter.style.zIndex = '5';
        usageCounter.dataset.count = '0';
        assetItem.appendChild(usageCounter);
    }
    
    // Increment the counter
    let count = parseInt(usageCounter.dataset.count || '0') + 1;
    usageCounter.dataset.count = count.toString();
    usageCounter.textContent = count;
    
    // Only display if count > 0
    if (count > 0) {
        usageCounter.style.display = 'flex';
    } else {
        usageCounter.style.display = 'none';
    }
}

/**
 * Decrement the usage counter for an asset
 * @param {string} assetId - The asset ID
 */
export function decrementUsageCount(assetId) {
    const assetItem = document.querySelector(`.preview-item[data-id="${assetId}"]`);
    if (!assetItem) return;
    
    const usageCounter = assetItem.querySelector('.usage-counter');
    if (!usageCounter) return;
    
    // Decrement the counter
    let count = Math.max(0, parseInt(usageCounter.dataset.count || '0') - 1);
    usageCounter.dataset.count = count.toString();
    usageCounter.textContent = count;
    
    // Hide if count is 0
    if (count === 0) {
        usageCounter.style.display = 'none';
    }
}

// Add to window object for global access
window.incrementUsageCount = incrementUsageCount;
window.decrementUsageCount = decrementUsageCount;

/**
 * Remove asset from the assets panel
 * @param {string} assetId - The asset ID to remove
 * @param {Object} state - Application state object
 */
export function removeAssetFromPanel(assetId, state) {
    console.log('removeAssetFromPanel called with ID:', assetId);
    
    // Find the assets panel
    const assetsPanel = document.querySelector('.assets-panel');
    if (!assetsPanel) {
        console.error('Could not find assets panel (.assets-panel)');
        return;
    }
    console.log('Found assets panel:', assetsPanel);
    
    // Find the asset element by ID
    const assetElement = assetsPanel.querySelector(`.preview-item[data-id="${assetId}"]`);
    console.log('Asset element search result:', assetElement);
    
    if (assetElement) {
        console.log('Found asset element to remove:', assetElement);
        
        // Add fade out animation
        assetElement.style.transition = 'opacity 0.3s, transform 0.3s';
        assetElement.style.opacity = '0';
        assetElement.style.transform = 'scale(0.8)';
        
        // Remove after animation completes
        setTimeout(() => {
            try {
                console.log('Removing asset element from DOM');
                assetElement.remove();
                
                // Update state
                if (state.selectedAssets) {
                    const index = state.selectedAssets.indexOf(assetId);
                    if (index !== -1) {
                        state.selectedAssets.splice(index, 1);
                        console.log('Removed asset from selectedAssets state array');
                    } else {
                        console.warn('Asset ID not found in selectedAssets state array');
                    }
                } else {
                    console.warn('state.selectedAssets is not defined');
                }
                
                // Show empty message if no assets left
                const assetsContainer = assetsPanel.querySelector('.assets-container');
                if (assetsContainer && assetsContainer.children.length === 0) {
                    console.log('No assets left, adding empty message');
                    const emptyMessage = document.createElement('div');
                    emptyMessage.className = 'empty-panel-message';
                    emptyMessage.textContent = 'No assets selected. Click "Select Assets" to choose from library.';
                    assetsContainer.appendChild(emptyMessage);
                }
            } catch (error) {
                console.error('Error removing asset element:', error);
            }
        }, 300);
    } else {
        console.warn(`Asset element with ID ${assetId} not found in assets panel`);
        
        // Try alternative selectors to find the asset
        const anyAssetWithId = document.querySelector(`[data-id="${assetId}"]`);
        if (anyAssetWithId) {
            console.log('Found asset elsewhere in the document:', anyAssetWithId);
        } else {
            console.warn('Asset not found anywhere in the document');
        }
    }
}

/**
 * Return asset to the assets panel
 * @param {Object} assetData - The asset data to return
 * @param {Object} state - Application state object
 */
export function returnAssetToPanel(assetData, state) {
    const assetsPanel = document.querySelector('.assets-panel');
    if (!assetsPanel) return;
    
    const assetsContainer = assetsPanel.querySelector('.assets-container');
    if (!assetsContainer) return;
    
    // Remove any empty message
    const emptyMessage = assetsContainer.querySelector('.empty-panel-message');
    if (emptyMessage) {
        emptyMessage.remove();
    }
    
    // Check if asset already exists in panel
    if (assetsContainer.querySelector(`.preview-item[data-id="${assetData.id}"]`)) {
        console.log(`Asset ${assetData.id} already exists in assets panel`);
        return;
    }
    
    // Create the preview item
    const previewItem = document.createElement('div');
    previewItem.className = 'preview-item';
    previewItem.setAttribute('draggable', 'true');
    previewItem.dataset.id = assetData.id;
    previewItem.dataset.type = assetData.type;
    
    // Add asset based on type
    if (assetData.type === 'image') {
        const img = document.createElement('img');
        img.src = assetData.url || assetData.thumbnail_url;
        img.alt = assetData.name || 'Asset';
        img.className = 'preview-img';
        previewItem.appendChild(img);
    } else if (assetData.type === 'video') {
        const video = document.createElement('video');
        video.src = assetData.url;
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
        e.stopPropagation();
        previewItem.remove();
        
        // Update state
        if (state.selectedAssets) {
            const index = state.selectedAssets.indexOf(assetData.id);
            if (index !== -1) {
                state.selectedAssets.splice(index, 1);
            }
        }
        
        // Show empty message if no assets left
        if (assetsContainer.children.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-panel-message';
            emptyMessage.textContent = 'No assets selected. Click "Select Assets" to choose from library.';
            assetsContainer.appendChild(emptyMessage);
        }
    });
    previewItem.appendChild(removeBtn);
    
    // Add drag event listeners
    previewItem.addEventListener('dragstart', function(e) {
        const assetDataJson = JSON.stringify(assetData);
        e.dataTransfer.setData('application/json', assetDataJson);
        e.dataTransfer.setData('text/plain', assetDataJson);
        e.dataTransfer.setData('text/uri-list', assetData.url || assetData.thumbnail_url);
        
        previewItem.classList.add('dragging');
        document.body.classList.add('dragging');
    });
    
    previewItem.addEventListener('dragend', function() {
        previewItem.classList.remove('dragging');
        document.body.classList.remove('dragging');
    });
    
    // Add to panel with animation
    previewItem.style.opacity = '0';
    previewItem.style.transform = 'scale(0.8)';
    assetsContainer.appendChild(previewItem);
    
    // Add to state if it doesn't exist
    if (state.selectedAssets && !state.selectedAssets.includes(assetData.id)) {
        state.selectedAssets.push(assetData.id);
    }
    
    // Trigger animation
    setTimeout(() => {
        previewItem.style.transition = 'opacity 0.3s, transform 0.3s';
        previewItem.style.opacity = '1';
        previewItem.style.transform = 'scale(1)';
    }, 10);
} 