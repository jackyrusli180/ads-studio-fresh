/**
 * Handle drag start event for asset items
 * Adds necessary data to the drag event
 * 
 * @param {DragEvent} e - The drag start event
 * @returns {void}
 */
function handleDragStart(e) {
    // Extract asset data from the element
    const assetElement = e.target.closest('.asset-item, .preview-item');
    if (!assetElement) return;
    
    // Mark the element as being dragged
    assetElement.classList.add('dragging');
    
    // Get the asset data from the element's data attributes
    const assetId = assetElement.dataset.id;
    const assetType = assetElement.dataset.type || 'image';
    const assetName = assetElement.dataset.name || `Asset ${assetId}`;
    let assetUrl = assetElement.dataset.url;
    let width = parseInt(assetElement.dataset.width) || 0;
    let height = parseInt(assetElement.dataset.height) || 0;
    
    // For video elements, try to get the actual dimensions from the video element
    if (assetType === 'video') {
        // Find the video element within the asset item
        const videoElement = assetElement.querySelector('video');
        
        // If we have a video element with natural dimensions, use those
        if (videoElement) {
            // If the video metadata is already loaded, get dimensions directly
            if (videoElement.videoWidth && videoElement.videoHeight) {
                width = videoElement.videoWidth;
                height = videoElement.videoHeight;
                assetUrl = assetUrl || videoElement.src || videoElement.querySelector('source')?.src;
                console.log(`Using loaded video dimensions: ${width}x${height}`);
            } 
            // If the URL is available but dimensions aren't loaded yet
            else if ((videoElement.src || videoElement.querySelector('source')?.src) && !e.dataTransfer.getData('text/plain')) {
                // Get the URL from the video element
                assetUrl = assetUrl || videoElement.src || videoElement.querySelector('source')?.src;
                
                console.log(`Video dimensions not yet available for ${assetUrl}, metadata not loaded`);
                
                // Create a temporary video element to get dimensions
                const tempVideo = document.createElement('video');
                tempVideo.style.display = 'none';
                
                // Set up event listeners
                tempVideo.addEventListener('loadedmetadata', () => {
                    // Once metadata is loaded, get the dimensions
                    if (tempVideo.videoWidth && tempVideo.videoHeight) {
                        // Create or update the data in dataTransfer
                        const updatedAssetData = {
                            id: assetId,
                            type: assetType,
                            name: assetName,
                            url: assetUrl,
                            width: tempVideo.videoWidth,
                            height: tempVideo.videoHeight
                        };
                        
                        console.log(`Determined video dimensions: ${updatedAssetData.width}x${updatedAssetData.height}`);
                        
                        // Store updated data as a data attribute on the element for future drag operations
                        assetElement.dataset.width = updatedAssetData.width;
                        assetElement.dataset.height = updatedAssetData.height;
                        
                        // Clean up
                        if (document.body.contains(tempVideo)) {
                            document.body.removeChild(tempVideo);
                        }
                    }
                });
                
                tempVideo.addEventListener('error', () => {
                    console.error(`Error loading video to determine dimensions: ${assetUrl}`);
                    if (document.body.contains(tempVideo)) {
                        document.body.removeChild(tempVideo);
                    }
                });
                
                // Add to DOM temporarily
                document.body.appendChild(tempVideo);
                
                // Set source and load
                tempVideo.src = assetUrl;
                tempVideo.load();
                
                // Set a timeout to remove the element if metadata doesn't load
                setTimeout(() => {
                    if (document.body.contains(tempVideo)) {
                        document.body.removeChild(tempVideo);
                    }
                }, 3000);
            }
        }
    }
    // For image elements, try to get dimensions from the img element
    else if (assetType === 'image') {
        const imgElement = assetElement.querySelector('img');
        if (imgElement && imgElement.naturalWidth && imgElement.naturalHeight) {
            width = imgElement.naturalWidth;
            height = imgElement.naturalHeight;
            assetUrl = assetUrl || imgElement.src;
            console.log(`Using natural image dimensions: ${width}x${height}`);
        }
    }
    
    // Check if we have a URL, if not try to find one
    if (!assetUrl) {
        const mediaElement = assetElement.querySelector('img, video, source');
        assetUrl = mediaElement ? (mediaElement.src || '') : '';
    }
    
    // Create the asset data object
    const assetData = {
        id: assetId,
        type: assetType,
        name: assetName,
        url: assetUrl,
        width: width,
        height: height
    };
    
    console.log('Dragging asset with data:', assetData);
    
    // Set the drag effect
    e.dataTransfer.effectAllowed = 'copy';
    
    // Add the asset data to the drag event in multiple formats for better compatibility
    try {
        // Set as JSON data
        const jsonData = JSON.stringify(assetData);
        e.dataTransfer.setData('application/json', jsonData);
        e.dataTransfer.setData('text/plain', jsonData);
        
        // Set drag image (optional)
        if (assetType === 'image' && assetElement.querySelector('img')) {
            const img = assetElement.querySelector('img');
            e.dataTransfer.setDragImage(img, 10, 10);
        } else if (assetType === 'video' && assetElement.querySelector('video')) {
            const video = assetElement.querySelector('video');
            e.dataTransfer.setDragImage(video, 10, 10);
        }
    } catch (err) {
        console.error('Error setting drag data:', err);
    }
} 