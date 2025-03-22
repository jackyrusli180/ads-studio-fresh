/**
 * Asset Manager Module
 * Handles asset-related operations in the drag and drop interface
 */

/**
 * Determine the MIME type based on video file extension
 * @param {string} url - The URL of the video
 * @returns {string} - The MIME type
 */
function getVideoMimeType(url) {
    if (!url) return 'video/mp4'; // Default if no URL
    
    const extension = url.split('.').pop().toLowerCase();
    switch (extension) {
        case 'mp4': return 'video/mp4';
        case 'webm': return 'video/webm';
        case 'ogg': case 'ogv': return 'video/ogg';
        case 'mov': case 'qt': return 'video/quicktime';
        case 'avi': return 'video/x-msvideo';
        case 'm3u8': return 'application/x-mpegURL';
        case 'mpd': return 'application/dash+xml';
        default: return 'video/mp4'; // Default to mp4
    }
}

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
                
                // Check if this is a URL string - allow both HTTP and local paths starting with /
                if ((plainText.startsWith('http') || plainText.startsWith('/')) && 
                    (plainText.match(/\.(mp4|mov|avi|webm|jpg|jpeg|png|gif)$/i) || 
                     plainText.includes('video') || plainText.includes('image'))) {
                    
                    // Create simple asset data from URL
                    const isVideo = plainText.match(/\.(mp4|mov|avi|webm)$/i) || plainText.includes('video');
                    assetData = {
                        id: `url-${Date.now()}`,
                        type: isVideo ? 'video' : 'image',
                        url: plainText,
                        name: plainText.split('/').pop()
                    };
                    console.log('Created asset data from URL string:', assetData);
                } else {
                    // Try to parse as JSON
                    assetData = JSON.parse(plainText);
                }
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
                name: draggedElem.dataset.name || `Asset ${draggedElem.dataset.id}`,
                width: parseInt(draggedElem.dataset.width) || 0,
                height: parseInt(draggedElem.dataset.height) || 0
            };
        }
    }
    
    // Method 4: Check for URL in dataTransfer directly
    if (!assetData && e.dataTransfer.getData('URL')) {
        const url = e.dataTransfer.getData('URL');
        if (url && url.startsWith('http')) {
            console.log('Found URL in dataTransfer:', url);
            const isVideo = url.match(/\.(mp4|mov|avi|webm)$/i) || url.includes('video');
            assetData = {
                id: `url-${Date.now()}`,
                type: isVideo ? 'video' : 'image',
                url: url,
                name: url.split('/').pop()
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
    
    // If asset is a video but missing dimensions, try to get dimensions
    if (assetData.type === 'video' && (!assetData.width || !assetData.height || assetData.width <= 0 || assetData.height <= 0)) {
        // Check if the asset already has a valid URL
        if (assetData.url && assetData.url.trim() !== '') {
            // We have a URL, try to load the video to get dimensions
            return new Promise((resolve) => {
                console.log('Loading video to determine dimensions:', assetData.url);
                
                const videoElement = document.createElement('video');
                videoElement.style.display = 'none';
                document.body.appendChild(videoElement);
                
                let timeoutId;
                
                // Function to clean up resources
                const cleanup = () => {
                    if (timeoutId) clearTimeout(timeoutId);
                    if (document.body.contains(videoElement)) {
                        document.body.removeChild(videoElement);
                    }
                };
                
                // Set up cross-origin attributes for remote videos
                videoElement.crossOrigin = 'anonymous';
                videoElement.preload = 'metadata';
                
                // Set up event listeners
                videoElement.addEventListener('loadedmetadata', () => {
                    if (videoElement.videoWidth && videoElement.videoHeight) {
                        assetData.width = videoElement.videoWidth;
                        assetData.height = videoElement.videoHeight;
                        console.log(`Successfully determined video dimensions: ${assetData.width}x${assetData.height}`);
                        cleanup();
                        resolve(assetData);
                    } else {
                        console.warn('Video loaded but dimensions not available');
                        cleanup();
                        resolve(assetData);
                    }
                });
                
                // Handle video loading failure
                videoElement.addEventListener('error', (err) => {
                    console.error('Error loading video to determine dimensions:', err);
                    // Use default dimensions for any video
                    console.log('Using default dimensions for video');
                    assetData.width = 1080;
                    assetData.height = 1920;  // Default to TikTok-compatible 9:16 format
                    cleanup();
                    resolve(assetData);
                });
                
                // Set a timeout in case the video never loads
                timeoutId = setTimeout(() => {
                    console.warn('Timed out waiting for video dimensions');
                    // Use default dimensions for any video type
                    console.log('Using fallback dimensions for video');
                    assetData.width = 1080;
                    assetData.height = 1920;  // Default to TikTok-compatible 9:16 vertical format
                    
                    cleanup();
                    resolve(assetData);
                }, 3000);  // Reduced timeout to avoid long waits
                
                // Set the source and load the video
                videoElement.src = assetData.url;
                videoElement.load();
            }).catch(err => {
                console.error('Error in video dimensions promise:', err);
                return assetData;
            });
        } else {
            // Try to find a matching video element on the page
            const videoElements = document.querySelectorAll('video');
            for (const videoElement of videoElements) {
                if (videoElement.dataset && videoElement.dataset.id === assetData.id) {
                    if (videoElement.videoWidth && videoElement.videoHeight) {
                        assetData.width = videoElement.videoWidth;
                        assetData.height = videoElement.videoHeight;
                        assetData.url = videoElement.src || assetData.url;
                        console.log(`Found dimensions from existing video element: ${assetData.width}x${assetData.height}`);
                        break;
                    }
                }
            }
        }
    }
    
    // If asset is a video but still missing a URL, log warning
    if (assetData.type === 'video' && (!assetData.url || assetData.url.trim() === '')) {
        console.warn('Video asset has no URL, cannot determine dimensions');
    }
    
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
        // Create video element
        preview = document.createElement('video');
        preview.controls = true;
        preview.muted = true;
        preview.style.maxHeight = '100px';
        preview.style.maxWidth = '100%';
        preview.style.borderRadius = '4px';
        preview.style.boxShadow = '0 1px 3px rgba(0,0,0,0.12)';
        
        // Set cross-origin attributes for remote videos
        preview.crossOrigin = 'anonymous';
        preview.preload = 'metadata';
        
        // Create fallback UI in case video fails to load
        const fallbackUI = document.createElement('div');
        fallbackUI.style.display = 'none';
        fallbackUI.style.width = '100%';
        fallbackUI.style.height = '100px';
        fallbackUI.style.backgroundColor = '#f0f0f0';
        fallbackUI.style.borderRadius = '4px';
        fallbackUI.style.display = 'flex';
        fallbackUI.style.flexDirection = 'column';
        fallbackUI.style.alignItems = 'center';
        fallbackUI.style.justifyContent = 'center';
        fallbackUI.style.color = '#666';
        fallbackUI.style.padding = '8px';
        fallbackUI.style.textAlign = 'center';
        fallbackUI.innerHTML = `
            <i class="fas fa-video" style="font-size: 24px; margin-bottom: 8px;"></i>
            <div style="font-size: 12px;">Remote Video</div>
            <div style="font-size: 10px; overflow: hidden; text-overflow: ellipsis; max-width: 100%;">${assetData.url.split('/').pop()}</div>
        `;
        
        // Handle video loading success
        preview.addEventListener('loadeddata', () => {
            preview.style.display = 'block';
            fallbackUI.style.display = 'none';
        });
        
        // Handle video loading failure
        preview.addEventListener('error', () => {
            preview.style.display = 'none';
            fallbackUI.style.display = 'flex';
            console.warn('Video failed to load in preview, showing fallback UI');
        });
        
        // Add source to video
        const source = document.createElement('source');
        source.src = assetData.url;
        source.type = getVideoMimeType(assetData.url);
        
        preview.appendChild(source);
        previewContainer.appendChild(preview);
        previewContainer.appendChild(fallbackUI);
        
        // Initially hide the video until it loads
        preview.style.display = 'none';
        fallbackUI.style.display = 'flex';
        
        // Start loading the video
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
        
        // Create fallback for images
        const fallbackUI = document.createElement('div');
        fallbackUI.style.display = 'none';
        fallbackUI.style.width = '100%';
        fallbackUI.style.height = '100px';
        fallbackUI.style.backgroundColor = '#f0f0f0';
        fallbackUI.style.borderRadius = '4px';
        fallbackUI.style.display = 'flex';
        fallbackUI.style.flexDirection = 'column';
        fallbackUI.style.alignItems = 'center';
        fallbackUI.style.justifyContent = 'center';
        fallbackUI.style.color = '#666';
        fallbackUI.innerHTML = `
            <i class="fas fa-image" style="font-size: 24px; margin-bottom: 8px;"></i>
            <div style="font-size: 12px;">Remote Image</div>
        `;
        
        // Handle image loading success
        preview.addEventListener('load', () => {
            preview.style.display = 'block';
            fallbackUI.style.display = 'none';
        });
        
        // Handle image loading failure
        preview.addEventListener('error', () => {
            preview.style.display = 'none';
            fallbackUI.style.display = 'flex';
        });
        
        // Add both to container
        previewContainer.appendChild(preview);
        previewContainer.appendChild(fallbackUI);
        
        // Initially hide the image until it loads
        preview.style.display = 'none';
        fallbackUI.style.display = 'flex';
    }
    
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

/**
 * Add sample TikTok videos from the SDK to the asset library
 * This is a helper function to test the drag and drop functionality
 */
export function addSampleTikTokVideos() {
    console.log('Adding sample TikTok videos to asset library');
    
    // Sample video URLs from the SDK - using public URLs
    const sampleVideos = [
        {
            url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
            name: "Big Buck Bunny (16:9)",
            type: "video",
            width: 1920,
            height: 1080
        },
        {
            url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
            name: "Elephant's Dream (16:9)",
            type: "video",
            width: 1920,
            height: 1080
        },
        {
            url: "https://assets.mixkit.co/videos/preview/mixkit-young-woman-sitting-on-the-floor-and-painting-with-a-roller-39894-large.mp4",
            name: "Woman Painting (9:16)",
            type: "video",
            width: 720,
            height: 1280
        },
        {
            url: "https://assets.mixkit.co/videos/preview/mixkit-portrait-of-a-fashion-woman-with-silver-makeup-39875-large.mp4",
            name: "Fashion Portrait (9:16)",
            type: "video",
            width: 720,
            height: 1280
        },
        {
            url: "https://assets.mixkit.co/videos/preview/mixkit-woman-runs-past-the-camera-in-the-forest-32809-large.mp4",
            name: "Woman Running (1:1)",
            type: "video",
            width: 1080,
            height: 1080
        }
    ];
    
    // Find asset library container
    const assetLibrary = document.querySelector('.asset-library');
    if (!assetLibrary) {
        console.error('Asset library container not found');
        return;
    }
    
    // Find or create a section for sample videos
    let sampleSection = assetLibrary.querySelector('.sample-videos-section');
    if (!sampleSection) {
        sampleSection = document.createElement('div');
        sampleSection.className = 'sample-videos-section';
        sampleSection.innerHTML = `
            <h3 style="margin: 10px 0; padding: 5px; background-color: #f0f0f0; border-radius: 4px;">
                Sample TikTok Videos
            </h3>
            <div class="sample-videos-container" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;"></div>
        `;
        assetLibrary.appendChild(sampleSection);
    }
    
    const videosContainer = sampleSection.querySelector('.sample-videos-container');
    if (videosContainer) {
        // Clear existing videos first
        videosContainer.innerHTML = '';
    }
    
    // Add each sample video
    sampleVideos.forEach((video, index) => {
        // Create asset data
        const assetData = {
            id: `sample-video-${index}`,
            type: 'video',
            url: video.url,
            name: video.name,
            width: video.width,
            height: video.height
        };
        
        // Create preview
        const previewContainer = createAssetPreview(assetData);
        
        // Make it draggable
        previewContainer.draggable = true;
        previewContainer.dataset.id = assetData.id;
        previewContainer.dataset.type = assetData.type;
        previewContainer.dataset.url = assetData.url;
        previewContainer.dataset.name = assetData.name;
        previewContainer.dataset.width = assetData.width;
        previewContainer.dataset.height = assetData.height;
        
        // Add drag start event
        previewContainer.addEventListener('dragstart', (e) => {
            console.log('Drag started for sample video:', assetData);
            
            // Set the dragging class
            previewContainer.classList.add('dragging');
            
            // Set data in the drag event
            e.dataTransfer.setData('application/json', JSON.stringify(assetData));
            e.dataTransfer.setData('text/plain', JSON.stringify(assetData));
            e.dataTransfer.effectAllowed = 'copy';
        });
        
        // Add drag end event
        previewContainer.addEventListener('dragend', (e) => {
            previewContainer.classList.remove('dragging');
        });
        
        // Add to container
        videosContainer.appendChild(previewContainer);
    });
} 