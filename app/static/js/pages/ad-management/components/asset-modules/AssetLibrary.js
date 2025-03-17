/**
 * Asset Library Module
 * Handles asset library browsing and selection functionality
 */

/**
 * Initialize the Asset Library module
 * @param {Object} elements - DOM elements object
 * @param {Object} state - Application state object
 * @param {Function} validateStep - Function to validate the step
 * @returns {Object} - AssetLibrary methods
 */
export function initAssetLibrary(elements, state, validateStep) {
    // Variables for drag selection
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let selectionBox = null;
    
    /**
     * Create selection box for drag-select functionality
     */
    function createSelectionBox() {
        // Remove any existing selection box
        const existingBox = document.getElementById('asset-selection-box');
        if (existingBox) existingBox.remove();
        
        // Create a new selection box
        selectionBox = document.createElement('div');
        selectionBox.id = 'asset-selection-box';
        selectionBox.style.position = 'absolute';
        selectionBox.style.border = '2px dashed #007bff';
        selectionBox.style.backgroundColor = 'rgba(0, 123, 255, 0.1)';
        selectionBox.style.pointerEvents = 'none';
        selectionBox.style.zIndex = '1000';
        selectionBox.style.display = 'none';
        
        // Add it to the library assets container
        if (elements.libraryAssets) {
            elements.libraryAssets.appendChild(selectionBox);
        }
    }
    
    /**
     * Set up selection events for the library assets
     */
    function setupDragSelection() {
        if (!elements.libraryAssets) return;
        
        // Add styles for selected assets
        const style = document.createElement('style');
        style.textContent = `
            .library-asset.selected {
                outline: 3px solid #007bff !important;
                outline-offset: 2px;
                position: relative;
                z-index: 10;
            }
        `;
        document.head.appendChild(style);
        
        // We don't need the complex drag selection system
        // Instead, we'll just handle keyboard modifiers for multi-select
    }
    
    /**
     * Open the asset library modal
     */
    function openAssetLibrary() {
        if (elements.assetSelectorModal) {
            // Reset CSS on the libraryAssets element to ensure grid layout works
            if (elements.libraryAssets) {
                elements.libraryAssets.style.display = 'grid';
                elements.libraryAssets.style.gridTemplateColumns = 'repeat(5, 1fr)';
                elements.libraryAssets.style.gap = '15px';
                elements.libraryAssets.style.width = '100%';
                elements.libraryAssets.style.position = 'relative';
                
                // Reset any conflicting styles that might be applied
                elements.libraryAssets.style.flexDirection = 'unset';
                elements.libraryAssets.style.flexWrap = 'unset';
            }
            
            // Make sure the modal body has enough height
            const modalBody = elements.assetSelectorModal.querySelector('.modal-body');
            if (modalBody) {
                modalBody.style.minHeight = '500px';
                modalBody.style.maxHeight = '60vh';
                modalBody.style.overflow = 'auto';
            }
            
            // Display the modal
            elements.assetSelectorModal.style.display = 'block';
            
            // Load assets if not already loaded
            if (!state.allLibraryAssets || state.allLibraryAssets.length === 0) {
                loadLibraryAssets();
            }
            
            // Set up drag selection for the library
            setupDragSelection();
        }
    }
    
    /**
     * Close all modals
     */
    function closeAllModals() {
        if (elements.assetSelectorModal) {
            elements.assetSelectorModal.style.display = 'none';
        }
    }
    
    /**
     * Load assets from the library API
     */
    async function loadLibraryAssets() {
        if (!elements.libraryAssets) return;
        
        try {
            elements.libraryAssets.innerHTML = '<div class="loading">Loading assets...</div>';
            
            // Look for assets in the uploads directory instead of output
            const uploadsDir = '/static/uploads/';
            
            // Fetch the directory listing or use a predefined list of assets
            const assetFiles = []; // We'll populate this with assets
            
            // Get files from the uploads directory
            const response = await fetch('/static/uploads/');
            
            if (!response.ok) {
                // If we can't get a directory listing, create assets from known files
                // Use the file names from the directory listing the user shared
                const fileNames = [
                    // Thumbnail images (smaller)
                    'thumb_regenerated_20250304_130144_8fb048f9.jpg',
                    'thumb_regenerated_20250304_082049_790e5301.jpg',
                    'thumb_regenerated_20250304_083302_000a8216.jpg',
                    'thumb_regenerated_20250304_124519_128d9773.jpg',
                    'thumb_regenerated_20250304_080436_2cdcaf7b.jpg',
                    'thumb_regenerated_20250304_081729_c11a774b.jpg',
                    'thumb_regenerated_20250304_081804_2ef76429.jpg',
                    'thumb_regenerated_20250304_074545_21510093.jpg',
                    'thumb_regenerated_20250304_080038_249461b5.jpg',
                    'thumb_regenerated_20250304_080129_8359cfb6.jpg',
                    'thumb_regenerated_20250304_080242_6675330a.jpg',
                    'thumb_branded_resubmit_20250304_081141_f12c40b5.jpg',
                    'thumb_regenerated_20250304_073345_01b4bb27.jpg',
                    'thumb_regenerated_20250304_073533_de538542.jpg',
                    
                    // PNG thumbnails
                    'thumb_20250304_130111_a_futuristic__dark_metallic_security_robot_stands____.png',
                    'thumb_20250304_140444_arm_holding_a_modern_iphone_pro_facing_the_viewer____.png',
                    'thumb_20250304_152633_arm_holding_a_modern_iphone_pro_facing_the_viewer____.png',
                    'thumb_20250304_080304_professional_photography_of_a_premium_black_coffee___.png',
                    'thumb_20250304_125705_a_futuristic__dark_metallic_security_robot_stands____.png',
                    'thumb_20250304_125824_a_futuristic__dark_metallic_security_robot_stands____.png',
                    'thumb_20250227_192136_pi_token_in_a_futuristic_scene__designed_in_a_high___.png',
                    'thumb_20250227_192234_pi_token_in_a_futuristic_scene__designed_in_a_high___.png',
                    'thumb_20250303_190026_a_futuristic__dark_metallic_security_robot_stands____.png',
                    
                    // Full-sized images
                    'aigc_20250304_171938.jpg',
                    'aigc_20250304_152616.jpg',
                    'aigc_20250304_140411.jpg',
                    'aigc_20250304_130143.jpg',
                    'aigc_20250304_125652.jpg',
                    'aigc_20250304_125413.jpg',
                    'aigc_20250304_124517.jpg',
                    'aigc_20250304_124306.jpg',
                    'aigc_20250304_083300.jpg',
                    'aigc_20250304_082047.jpg',
                    'aigc_20250304_081802.jpg',
                    'aigc_20250304_081727.jpg',
                    'aigc_20250304_081412.jpg',
                    'aigc_20250304_081118.jpg',
                    'aigc_20250304_080434.jpg',
                    'aigc_20250304_080240.jpg'
                ];
                
                // Create asset objects for each file
                fileNames.forEach((fileName, index) => {
                    // Create a more user-friendly name by removing prefixes and timestamps
                    let displayName = fileName;
                    
                    // Remove only the prefix portion from the filename
                    if (fileName.startsWith('thumb_')) {
                        displayName = fileName.replace('thumb_', '');
                    } else if (fileName.startsWith('aigc_')) {
                        displayName = fileName.replace('aigc_', '');
                    } else if (fileName.startsWith('regenerated_')) {
                        displayName = fileName.replace('regenerated_', '');
                    } else if (fileName.startsWith('temp_')) {
                        displayName = fileName.replace('temp_', '');
                    }
                    
                    // Don't remove date/time stamps - retain them as requested
                    
                    // Replace underscores with spaces and remove file extension
                    displayName = displayName
                        .replace(/\.\w+$/, '') // Remove file extension
                        .replace(/_/g, ' '); // Replace underscores with spaces
                    
                    // Truncate very long filenames (if description)
                    if (displayName.length > 60) {
                        displayName = displayName.substring(0, 60) + '...';
                    }
                    
                    assetFiles.push({
                        id: `asset-${index + 1}`,
                        name: displayName,
                        type: fileName.endsWith('.jpg') || fileName.endsWith('.png') ? 'image' : 'video',
                        url: `${uploadsDir}${fileName}`,
                        status: 'approved',
                        creation_date: new Date().toISOString(),
                        file_path: `${uploadsDir}${fileName}`
                    });
                });
            }
            
            // Set the assets to state
            state.allLibraryAssets = assetFiles;
            
            renderLibraryAssets(state.allLibraryAssets);
        } catch (error) {
            console.error('Error loading assets:', error);
            elements.libraryAssets.innerHTML = '<div class="error">Failed to load assets</div>';
        }
    }
    
    /**
     * Filter library assets based on type and search
     */
    function filterAssetLibrary() {
        if (!elements.libraryTypeFilter || !elements.librarySearch) return;
        
        const typeFilter = elements.libraryTypeFilter.value;
        const searchTerm = elements.librarySearch.value.trim().toLowerCase();
        
        let filteredAssets = state.allLibraryAssets;
        
        // Apply type filter
        if (typeFilter !== 'all') {
            filteredAssets = filteredAssets.filter(asset => asset.type === typeFilter);
        }
        
        // Apply search filter
        if (searchTerm) {
            filteredAssets = filteredAssets.filter(asset => 
                asset.name.toLowerCase().includes(searchTerm) ||
                (asset.description && asset.description.toLowerCase().includes(searchTerm))
            );
        }
        
        // Reset pagination to first page when filters change
        if (state.assetPagination) {
            state.assetPagination.currentPage = 1;
        }
        
        renderLibraryAssets(filteredAssets);
    }
    
    /**
     * Render assets in the library modal with pagination
     * @param {Object[]} assets - The assets to render
     */
    function renderLibraryAssets(assets) {
        if (!elements.libraryAssets) return;
        
        // Important: The libraryAssets element itself has a "library-grid" class
        // but we want to ensure it works as a grid container
        elements.libraryAssets.style.display = 'grid';
        elements.libraryAssets.style.gridTemplateColumns = 'repeat(5, 1fr)';
        elements.libraryAssets.style.gap = '15px';
        elements.libraryAssets.style.width = '100%';
        elements.libraryAssets.style.position = 'relative';
        
        // Clear the element
        elements.libraryAssets.innerHTML = '';
        
        // Add selection instructions at the top
        const instructionsContainer = document.createElement('div');
        instructionsContainer.className = 'selection-instructions';
        instructionsContainer.style.gridColumn = '1 / -1';
        instructionsContainer.style.marginBottom = '15px';
        instructionsContainer.style.padding = '10px 15px';
        instructionsContainer.style.backgroundColor = '#f8f9fa';
        instructionsContainer.style.borderRadius = '5px';
        instructionsContainer.style.border = '1px solid #e9ecef';
        
        instructionsContainer.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 5px; color: #333;">Multi-select assets:</div>
            <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #555;">
                <li><b>Ctrl+click</b> (or <b>Command+click</b> on Mac) to select multiple individual assets</li>
                <li><b>Shift+click</b> to select a range of assets</li>
                <li>Click without modifier keys to select a single asset</li>
            </ul>
        `;
        
        elements.libraryAssets.appendChild(instructionsContainer);
        
        if (!assets || assets.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty';
            emptyMessage.textContent = 'No assets found';
            emptyMessage.style.gridColumn = '1 / -1';
            elements.libraryAssets.appendChild(emptyMessage);
            return;
        }
        
        // Pagination settings
        const itemsPerPage = 20; // 4 rows of 5 columns
        
        // Get current page from state or default to 1
        if (!state.assetPagination) {
            state.assetPagination = {
                currentPage: 1,
                totalPages: Math.ceil(assets.length / itemsPerPage)
            };
        } else {
            state.assetPagination.totalPages = Math.ceil(assets.length / itemsPerPage);
            // Ensure current page is valid
            if (state.assetPagination.currentPage > state.assetPagination.totalPages) {
                state.assetPagination.currentPage = 1;
            }
        }
        
        const currentPage = state.assetPagination.currentPage;
        const totalPages = state.assetPagination.totalPages;
        
        // Calculate assets for current page
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, assets.length);
        const currentPageAssets = assets.slice(startIndex, endIndex);
        
        // Last clicked asset for shift+click range selection
        let lastClickedAsset = null;
        
        // Create grid items directly in the libraryAssets element
        currentPageAssets.forEach(asset => {
            const assetItem = document.createElement('div');
            assetItem.className = 'library-asset';
            assetItem.dataset.id = asset.id;
            assetItem.dataset.type = asset.type;
            assetItem.dataset.url = asset.url;
            assetItem.dataset.name = asset.name;
            
            // All assets are selectable
            assetItem.classList.add('selectable');
            assetItem.addEventListener('click', (e) => {
                // Check if shift key is pressed for range multi-select
                if (e.shiftKey && lastClickedAsset) {
                    // Get all assets
                    const allAssets = Array.from(document.querySelectorAll('.library-asset'));
                    // Find indices
                    const lastIndex = allAssets.indexOf(lastClickedAsset);
                    const currentIndex = allAssets.indexOf(assetItem);
                    // Determine range
                    const start = Math.min(lastIndex, currentIndex);
                    const end = Math.max(lastIndex, currentIndex);
                    // Select range
                    for (let i = start; i <= end; i++) {
                        allAssets[i].classList.add('selected');
                    }
                } else if (e.ctrlKey || e.metaKey) {
                    // Ctrl/Cmd key allows toggling individual items
                    assetItem.classList.toggle('selected');
                    lastClickedAsset = assetItem;
                } else {
                    // Clear all selections if no modifier key
                    document.querySelectorAll('.library-asset.selected').forEach(item => {
                        if (item !== assetItem) item.classList.remove('selected');
                    });
                    assetItem.classList.toggle('selected');
                    lastClickedAsset = assetItem.classList.contains('selected') ? assetItem : null;
                }
            });
            
            const thumbnail = document.createElement('div');
            thumbnail.className = 'asset-thumbnail';
            
            if (asset.type === 'image') {
                const img = document.createElement('img');
                img.src = asset.url;
                img.alt = asset.name;
                img.onerror = () => {
                    console.error(`Failed to load image: ${asset.url}`);
                    // Create a text indicator instead of using a placeholder image
                    const textIndicator = document.createElement('div');
                    textIndicator.className = 'image-error';
                    textIndicator.textContent = 'Image unavailable';
                    textIndicator.style.display = 'flex';
                    textIndicator.style.alignItems = 'center';
                    textIndicator.style.justifyContent = 'center';
                    textIndicator.style.height = '100%';
                    textIndicator.style.backgroundColor = '#f8f9fa';
                    textIndicator.style.color = '#6c757d';
                    textIndicator.style.fontSize = '0.75rem';
                    textIndicator.style.textAlign = 'center';
                    textIndicator.style.padding = '10px';
                    
                    // Replace the image with the text indicator
                    img.replaceWith(textIndicator);
                };
                thumbnail.appendChild(img);
            } else if (asset.type === 'video') {
                const video = document.createElement('video');
                video.src = asset.url || asset.file_path;
                video.muted = true;
                video.addEventListener('mouseover', () => video.play());
                video.addEventListener('mouseout', () => video.pause());
                video.onerror = () => {
                    console.error(`Failed to load video: ${asset.url || asset.file_path}`);
                    // Create a text indicator instead of using a placeholder
                    const textIndicator = document.createElement('div');
                    textIndicator.className = 'video-error';
                    textIndicator.textContent = 'Video unavailable';
                    textIndicator.style.display = 'flex';
                    textIndicator.style.alignItems = 'center';
                    textIndicator.style.justifyContent = 'center';
                    textIndicator.style.height = '100%';
                    textIndicator.style.backgroundColor = '#f8f9fa';
                    textIndicator.style.color = '#6c757d';
                    textIndicator.style.fontSize = '0.75rem';
                    textIndicator.style.textAlign = 'center';
                    textIndicator.style.padding = '10px';
                    
                    // Replace the video with the text indicator
                    video.replaceWith(textIndicator);
                };
                thumbnail.appendChild(video);
            }
            
            const assetInfo = document.createElement('div');
            assetInfo.className = 'asset-info';
            assetInfo.innerHTML = `<div class="asset-name">${asset.name}</div>`;
            
            assetItem.appendChild(thumbnail);
            assetItem.appendChild(assetInfo);
            elements.libraryAssets.appendChild(assetItem);
        });
        
        // Create pagination container
        const paginationContainer = document.createElement('div');
        paginationContainer.className = 'pagination-container';
        paginationContainer.style.gridColumn = '1 / -1'; // Make pagination span all columns
        
        // Create pagination controls if more than one page
        if (totalPages > 1) {
            // Previous page button
            const prevButton = document.createElement('button');
            prevButton.className = 'pagination-btn prev';
            prevButton.innerHTML = '&laquo; Previous';
            prevButton.disabled = currentPage === 1;
            prevButton.addEventListener('click', () => {
                if (currentPage > 1) {
                    state.assetPagination.currentPage--;
                    renderLibraryAssets(assets);
                }
            });
            
            // Next page button
            const nextButton = document.createElement('button');
            nextButton.className = 'pagination-btn next';
            nextButton.innerHTML = 'Next &raquo;';
            nextButton.disabled = currentPage === totalPages;
            nextButton.addEventListener('click', () => {
                if (currentPage < totalPages) {
                    state.assetPagination.currentPage++;
                    renderLibraryAssets(assets);
                }
            });
            
            // Page info
            const pageInfo = document.createElement('div');
            pageInfo.className = 'page-info';
            pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
            
            // Add buttons to container
            paginationContainer.appendChild(prevButton);
            paginationContainer.appendChild(pageInfo);
            paginationContainer.appendChild(nextButton);
            
            // Add to DOM
            elements.libraryAssets.appendChild(paginationContainer);
        }
    }
    
    /**
     * Select assets from the library and add them to the selected assets preview
     */
    function selectAssetsFromLibrary() {
        const selectedAssets = document.querySelectorAll('.library-asset.selected');
        
        if (selectedAssets.length === 0) {
            // Show error message if no assets selected
            const errorMsg = document.createElement('div');
            errorMsg.className = 'alert alert-danger';
            errorMsg.textContent = 'Please select at least one asset';
            
            // Check if error already exists and remove if so
            const existingError = elements.assetSelectorModal.querySelector('.alert');
            if (existingError) {
                existingError.remove();
            }
            
            // Add error below the filters
            elements.libraryTypeFilter.parentElement.after(errorMsg);
            
            // Auto-remove after 3 seconds
            setTimeout(() => errorMsg.remove(), 3000);
            
            return;
        }
        
        // Clear modal and hide it
        elements.assetSelectorModal.style.display = 'none';
        
        // Get selected asset IDs and find them in the state
        const selectedAssetIds = Array.from(selectedAssets).map(el => el.dataset.id);
        
        // Add selected assets to the state
        if (!state.selectedAssets) {
            state.selectedAssets = [];
        }
        
        // Add assets to state if not already there
        selectedAssetIds.forEach(id => {
            if (!state.selectedAssets.includes(id)) {
                state.selectedAssets.push(id);
            }
        });
        
        // Find the assets container inside the assets panel
        const assetsPanel = document.querySelector('.assets-panel');
        if (!assetsPanel) {
            console.error('Assets panel not found');
            return;
        }
        
        const assetsContainer = assetsPanel.querySelector('.assets-container');
        if (!assetsContainer) {
            console.error('Assets container not found');
            return;
        }
        
        // Clear any empty message
        const emptyMessage = assetsContainer.querySelector('.empty-panel-message');
        if (emptyMessage) {
            emptyMessage.remove();
        }
        
        // Add selected assets to the preview
        selectedAssetIds.forEach(id => {
            const asset = state.allLibraryAssets.find(a => a.id === id);
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
                
                // Remove from state
                const index = state.selectedAssets.indexOf(asset.id);
                if (index !== -1) {
                    state.selectedAssets.splice(index, 1);
                }
                
                // Add empty message if no assets left
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
                e.dataTransfer.setData('application/json', JSON.stringify({
                    id: asset.id,
                    type: asset.type,
                    url: asset.url,
                    name: asset.name
                }));
                
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
        
        validateStep();
    }
    
    return {
        openAssetLibrary,
        closeAllModals,
        loadLibraryAssets,
        filterAssetLibrary,
        renderLibraryAssets,
        selectAssetsFromLibrary
    };
} 