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
            // Prevent background scrolling
            document.body.style.overflow = 'hidden';
            
            // Make sure the modal has proper styling
            elements.assetSelectorModal.style.position = 'fixed';
            elements.assetSelectorModal.style.top = '0';
            elements.assetSelectorModal.style.left = '0';
            elements.assetSelectorModal.style.right = '0';
            elements.assetSelectorModal.style.bottom = '0';
            elements.assetSelectorModal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            elements.assetSelectorModal.style.zIndex = '9999';
            elements.assetSelectorModal.style.display = 'flex';
            elements.assetSelectorModal.style.alignItems = 'center';
            elements.assetSelectorModal.style.justifyContent = 'center';
            elements.assetSelectorModal.style.overflow = 'hidden';
            
            // Style the modal content
            const modalContent = elements.assetSelectorModal.querySelector('.modal-content');
            if (modalContent) {
                modalContent.style.backgroundColor = '#fff';
                modalContent.style.borderRadius = '8px';
                modalContent.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.25)';
                modalContent.style.width = '90%';
                modalContent.style.maxWidth = '1200px';
                modalContent.style.maxHeight = '90vh';
                modalContent.style.display = 'flex';
                modalContent.style.flexDirection = 'column';
                modalContent.style.position = 'relative';
                modalContent.style.overflow = 'hidden';
            }
            
            // Style the modal header
            const modalHeader = elements.assetSelectorModal.querySelector('.modal-header');
            if (modalHeader) {
                modalHeader.style.padding = '16px 24px';
                modalHeader.style.borderBottom = '1px solid #e2e8f0';
                modalHeader.style.display = 'flex';
                modalHeader.style.justifyContent = 'space-between';
                modalHeader.style.alignItems = 'center';
                
                // Style close button if it exists
                const closeBtn = modalHeader.querySelector('.close');
                if (closeBtn) {
                    closeBtn.style.fontSize = '24px';
                    closeBtn.style.fontWeight = '700';
                    closeBtn.style.color = '#64748b';
                    closeBtn.style.cursor = 'pointer';
                    closeBtn.style.border = 'none';
                    closeBtn.style.background = 'none';
                    closeBtn.addEventListener('click', closeAllModals);
                }
            }
            
            // Reset CSS on the libraryAssets element to ensure grid layout works
            if (elements.libraryAssets) {
                elements.libraryAssets.style.display = 'grid';
                elements.libraryAssets.style.gridTemplateColumns = 'repeat(4, 1fr)';
                elements.libraryAssets.style.gap = '20px';
                elements.libraryAssets.style.width = '100%';
                elements.libraryAssets.style.position = 'relative';
                elements.libraryAssets.style.marginTop = '0';
                
                // Reset any conflicting styles that might be applied
                elements.libraryAssets.style.flexDirection = 'unset';
                elements.libraryAssets.style.flexWrap = 'unset';
            }
            
            // Make sure the modal body has enough height and proper padding for the footer
            const modalBody = elements.assetSelectorModal.querySelector('.modal-body');
            if (modalBody) {
                modalBody.style.minHeight = '300px';
                modalBody.style.maxHeight = 'calc(90vh - 160px)'; // Adjusted to leave room for header and footer
                modalBody.style.overflow = 'auto';
                modalBody.style.padding = '20px 24px 80px 24px'; // Add padding for footer
                modalBody.style.scrollBehavior = 'smooth';
                
                // Scroll to top when opening
                modalBody.scrollTop = 0;
            }
            
            // Create or update footer with both buttons
            ensureModalFooter();
            
            // Display the modal
            elements.assetSelectorModal.style.display = 'flex';
            
            // Load assets if not already loaded
            if (!state.allLibraryAssets || state.allLibraryAssets.length === 0) {
                loadLibraryAssets();
            }
            
            // Set up drag selection for the library
            setupDragSelection();
        }
    }
    
    /**
     * Create or update modal footer with properly positioned buttons
     */
    function ensureModalFooter() {
        // Remove any existing footer to recreate it
        const existingFooter = elements.assetSelectorModal.querySelector('.modal-footer');
        if (existingFooter) {
            existingFooter.remove();
        }
        
        // Create new fixed footer
        const footer = document.createElement('div');
        footer.className = 'modal-footer';
        footer.style.position = 'absolute';
        footer.style.bottom = '0';
        footer.style.left = '0';
        footer.style.right = '0';
        footer.style.padding = '16px 24px';
        footer.style.backgroundColor = '#fff';
        footer.style.borderTop = '1px solid #e2e8f0';
        footer.style.display = 'flex';
        footer.style.justifyContent = 'flex-end';
        footer.style.alignItems = 'center';
        footer.style.gap = '12px';
        footer.style.zIndex = '1000';
        footer.style.boxShadow = '0 -4px 6px -1px rgba(0, 0, 0, 0.05)';
        
        // Cancel button
        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.className = 'btn btn-secondary';
        cancelButton.style.padding = '8px 16px';
        cancelButton.style.backgroundColor = '#f1f5f9';
        cancelButton.style.color = '#475569';
        cancelButton.style.border = '1px solid #cbd5e1';
        cancelButton.style.borderRadius = '6px';
        cancelButton.style.fontSize = '14px';
        cancelButton.style.fontWeight = '500';
        cancelButton.style.cursor = 'pointer';
        
        cancelButton.addEventListener('click', closeAllModals);
        
        // Select Assets button
        const selectButton = document.createElement('button');
        selectButton.textContent = 'Select Assets';
        selectButton.className = 'btn btn-primary select-assets-btn';
        selectButton.style.padding = '8px 20px';
        selectButton.style.backgroundColor = '#3b82f6';
        selectButton.style.color = '#ffffff';
        selectButton.style.border = 'none';
        selectButton.style.borderRadius = '6px';
        selectButton.style.fontSize = '14px';
        selectButton.style.fontWeight = '500';
        selectButton.style.cursor = 'pointer';
        
        selectButton.addEventListener('click', selectAssetsFromLibrary);
        
        // Add buttons to footer
        footer.appendChild(cancelButton);
        footer.appendChild(selectButton);
        
        // Add footer to modal
        elements.assetSelectorModal.appendChild(footer);
        
        // Remove any existing select buttons inside the modal content
        const existingSelectBtn = elements.assetSelectorModal.querySelector('.select-assets-btn:not(.modal-footer .select-assets-btn)');
        if (existingSelectBtn) {
            existingSelectBtn.remove();
        }
    }
    
    /**
     * Close all modals
     */
    function closeAllModals() {
        if (elements.assetSelectorModal) {
            elements.assetSelectorModal.style.display = 'none';
            
            // Remove any error messages that might be visible
            const errorMsg = document.querySelector('.alert.alert-danger');
            if (errorMsg) {
                errorMsg.remove();
            }
            
            // Restore page scrolling
            document.body.style.overflow = 'auto';
        }
    }
    
    /**
     * Load assets from the library API
     */
    async function loadLibraryAssets() {
        if (!elements.libraryAssets) return;
        
        try {
            elements.libraryAssets.innerHTML = '<div class="loading">Loading assets...</div>';
            
            // Use the API endpoint with source=adsbuilder parameter to get TikTok URL assets
            const response = await fetch('/api/assets?source=adsbuilder');
            
            if (!response.ok) {
                throw new Error('Failed to load assets from API');
            }
            
            // Parse the response
            const responseData = await response.json();
            
            // Check if we have assets in the response
            if (responseData.success && Array.isArray(responseData.assets)) {
                state.allLibraryAssets = responseData.assets;
            } else {
                console.error('Invalid response format:', responseData);
                state.allLibraryAssets = [];
            }
            
            renderLibraryAssets(state.allLibraryAssets);
        } catch (error) {
            console.error('Error loading assets:', error);
            elements.libraryAssets.innerHTML = '<div class="error">Failed to load assets</div>';
            state.allLibraryAssets = [];
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
        
        // Fix duplicate chevron issue - ensure only one chevron is shown
        const filterButtons = document.querySelectorAll('.filter-dropdown-toggle');
        filterButtons.forEach(button => {
            // Get all icons inside the button
            const icons = button.querySelectorAll('i.fa-chevron-down');
            // If there are multiple, remove all but the first one
            if (icons.length > 1) {
                for (let i = 1; i < icons.length; i++) {
                    icons[i].remove();
                }
            }
        });
    }
    
    /**
     * Render the assets in the library
     * @param {Array} assets - Assets to render
     */
    function renderLibraryAssets(assets) {
        if (!elements.libraryAssets) return;
        
        if (!assets || assets.length === 0) {
            elements.libraryAssets.innerHTML = '<div class="empty-state">No assets found</div>';
            return;
        }
        
        // Set up pagination
        const itemsPerPage = 20;
        const totalAssets = assets.length;
        const totalPages = Math.ceil(totalAssets / itemsPerPage);
        const currentPage = 1; // For now, just show the first page
        
        // Get assets for the current page
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, totalAssets);
        const currentPageAssets = assets.slice(startIndex, endIndex);
        
        // Set styles for the library assets grid
        elements.libraryAssets.style.display = 'grid';
        elements.libraryAssets.style.gridTemplateColumns = 'repeat(auto-fill, minmax(200px, 1fr))';
        elements.libraryAssets.style.gap = '20px';
        elements.libraryAssets.style.padding = '20px';
        elements.libraryAssets.style.margin = '0';
        elements.libraryAssets.style.position = 'relative';
        
        // Clear the element
        elements.libraryAssets.innerHTML = '';
        
        // Add selection instructions at the top
        const instructionsContainer = document.createElement('div');
        instructionsContainer.className = 'selection-instructions';
        instructionsContainer.style.gridColumn = '1 / -1';
        instructionsContainer.style.marginBottom = '15px';
        instructionsContainer.style.padding = '12px 15px';
        instructionsContainer.style.backgroundColor = '#f0f4f8';
        instructionsContainer.style.borderRadius = '6px';
        instructionsContainer.style.border = '1px solid #d1e3f8';
        instructionsContainer.style.color = '#1e3a8a';
        
        instructionsContainer.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 8px; color: #1e3a8a;">Multi-select assets:</div>
            <ul style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.5;">
                <li><b>Ctrl+click</b> (or <b>Command+click</b> on Mac) to select multiple individual assets</li>
                <li><b>Shift+click</b> to select a range of assets</li>
                <li>Click without modifier keys to select a single asset</li>
            </ul>
        `;
        
        elements.libraryAssets.appendChild(instructionsContainer);
        
        // Track all assets for range selection
        const allAssets = [];
        
        // Last clicked asset for shift+click range selection
        let lastClickedAsset = null;
        
        // Create grid items directly in the libraryAssets element
        currentPageAssets.forEach(asset => {
            const assetItem = document.createElement('div');
            assetItem.className = 'library-asset';
            assetItem.dataset.id = asset.id;
            assetItem.dataset.type = asset.type;
            assetItem.dataset.url = asset.file_path; // Use file_path as URL
            assetItem.dataset.name = asset.name;
            
            // All assets are selectable
            assetItem.classList.add('selectable');
            assetItem.style.border = '1px solid #e2e8f0';
            assetItem.style.borderRadius = '8px';
            assetItem.style.overflow = 'hidden';
            assetItem.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            assetItem.style.transition = 'all 0.2s ease';
            assetItem.style.position = 'relative'; // Ensure position context for absolute children
            assetItem.style.display = 'flex';
            assetItem.style.flexDirection = 'column';
            assetItem.style.backgroundColor = '#fff';
            
            // Add hover effect
            assetItem.addEventListener('mouseenter', () => {
                assetItem.style.transform = 'translateY(-4px)';
                assetItem.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)';
            });
            
            assetItem.addEventListener('mouseleave', () => {
                assetItem.style.transform = 'translateY(0)';
                assetItem.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            });
            
            // Click event for selection with keyboard modifiers
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
                        // Apply selected styles without outline overlap
                        allAssets[i].style.backgroundColor = '#ebf5ff';
                        allAssets[i].style.borderColor = '#3b82f6';
                        
                        // Add check indicator
                        if (!allAssets[i].querySelector('.selection-indicator')) {
                            const indicator = document.createElement('div');
                            indicator.className = 'selection-indicator';
                            indicator.style.position = 'absolute';
                            indicator.style.top = '8px';
                            indicator.style.right = '8px';
                            indicator.style.width = '24px';
                            indicator.style.height = '24px';
                            indicator.style.borderRadius = '50%';
                            indicator.style.backgroundColor = '#3b82f6';
                            indicator.style.color = 'white';
                            indicator.style.display = 'flex';
                            indicator.style.alignItems = 'center';
                            indicator.style.justifyContent = 'center';
                            indicator.style.zIndex = '10';
                            indicator.innerHTML = '<i class="fas fa-check"></i>';
                            allAssets[i].appendChild(indicator);
                        }
                    }
                } else if (e.ctrlKey || e.metaKey) {
                    // Ctrl/Cmd key allows toggling individual items
                    assetItem.classList.toggle('selected');
                    if (assetItem.classList.contains('selected')) {
                        // Apply selected style without outline overlap
                        assetItem.style.backgroundColor = '#ebf5ff';
                        assetItem.style.borderColor = '#3b82f6';
                        
                        // Add check indicator if not present
                        if (!assetItem.querySelector('.selection-indicator')) {
                            const indicator = document.createElement('div');
                            indicator.className = 'selection-indicator';
                            indicator.style.position = 'absolute';
                            indicator.style.top = '8px';
                            indicator.style.right = '8px';
                            indicator.style.width = '24px';
                            indicator.style.height = '24px';
                            indicator.style.borderRadius = '50%';
                            indicator.style.backgroundColor = '#3b82f6';
                            indicator.style.color = 'white';
                            indicator.style.display = 'flex';
                            indicator.style.alignItems = 'center';
                            indicator.style.justifyContent = 'center';
                            indicator.style.zIndex = '10';
                            indicator.innerHTML = '<i class="fas fa-check"></i>';
                            assetItem.appendChild(indicator);
                        }
                    } else {
                        // Remove selected styles
                        assetItem.style.backgroundColor = '#fff';
                        assetItem.style.borderColor = '#e2e8f0';
                        
                        // Remove check indicator
                        const indicator = assetItem.querySelector('.selection-indicator');
                        if (indicator) {
                            indicator.remove();
                        }
                    }
                    lastClickedAsset = assetItem;
                } else {
                    // Clear all selections if no modifier key
                    document.querySelectorAll('.library-asset.selected').forEach(item => {
                        item.classList.remove('selected');
                        
                        // Remove selected styles
                        item.style.backgroundColor = '#fff';
                        item.style.borderColor = '#e2e8f0';
                        
                        // Remove check indicator
                        const indicator = item.querySelector('.selection-indicator');
                        if (indicator) {
                            indicator.remove();
                        }
                    });
                    
                    // Select just this item
                    assetItem.classList.add('selected');
                    
                    // Apply selected style
                    assetItem.style.backgroundColor = '#ebf5ff';
                    assetItem.style.borderColor = '#3b82f6';
                    
                    // Add check indicator if not present
                    if (!assetItem.querySelector('.selection-indicator')) {
                        const indicator = document.createElement('div');
                        indicator.className = 'selection-indicator';
                        indicator.style.position = 'absolute';
                        indicator.style.top = '8px';
                        indicator.style.right = '8px';
                        indicator.style.width = '24px';
                        indicator.style.height = '24px';
                        indicator.style.borderRadius = '50%';
                        indicator.style.backgroundColor = '#3b82f6';
                        indicator.style.color = 'white';
                        indicator.style.display = 'flex';
                        indicator.style.alignItems = 'center';
                        indicator.style.justifyContent = 'center';
                        indicator.style.zIndex = '10';
                        indicator.innerHTML = '<i class="fas fa-check"></i>';
                        assetItem.appendChild(indicator);
                    }
                    
                    lastClickedAsset = assetItem;
                }
            });
            
            // Thumbnail container
            const thumbnailContainer = document.createElement('div');
            thumbnailContainer.className = 'thumbnail-container';
            thumbnailContainer.style.position = 'relative';
            thumbnailContainer.style.width = '100%';
            thumbnailContainer.style.paddingBottom = '100%'; // 1:1 aspect ratio
            
            // Create the actual thumbnail element
            const thumbnail = document.createElement('div');
            thumbnail.className = 'thumbnail';
            thumbnail.style.position = 'absolute';
            thumbnail.style.top = '0';
            thumbnail.style.left = '0';
            thumbnail.style.width = '100%';
            thumbnail.style.height = '100%';
            thumbnail.style.display = 'flex';
            thumbnail.style.alignItems = 'center';
            thumbnail.style.justifyContent = 'center';
            thumbnail.style.overflow = 'hidden';
            thumbnail.style.backgroundColor = '#f8fafc';
            
            // Add appropriate content based on asset type
            if (asset.type === 'image') {
                const img = document.createElement('img');
                // Use file_path which could be either a URL or local path
                img.src = asset.file_path || asset.thumbnail || asset.url;
                img.alt = asset.name;
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'cover';
                img.style.objectPosition = 'center';
                thumbnail.appendChild(img);
            } else if (asset.type === 'video') {
                const video = document.createElement('video');
                video.src = asset.file_path;
                video.muted = true;
                video.style.width = '100%';
                video.style.height = '100%';
                video.style.objectFit = 'cover';
                video.style.objectPosition = 'center';
                
                // Add play on hover effect
                thumbnailContainer.addEventListener('mouseenter', () => {
                    video.play().catch(err => console.error('Error playing video:', err));
                });
                
                thumbnailContainer.addEventListener('mouseleave', () => {
                    video.pause();
                    video.currentTime = 0;
                });
                
                thumbnail.appendChild(video);
                
                // Add a play icon overlay
                const playIcon = document.createElement('div');
                playIcon.className = 'play-icon';
                playIcon.innerHTML = '<i class="fas fa-play"></i>';
                playIcon.style.position = 'absolute';
                playIcon.style.top = '50%';
                playIcon.style.left = '50%';
                playIcon.style.transform = 'translate(-50%, -50%)';
                playIcon.style.width = '40px';
                playIcon.style.height = '40px';
                playIcon.style.borderRadius = '50%';
                playIcon.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                playIcon.style.color = 'white';
                playIcon.style.display = 'flex';
                playIcon.style.alignItems = 'center';
                playIcon.style.justifyContent = 'center';
                playIcon.style.zIndex = '5';
                
                thumbnail.appendChild(playIcon);
            }
            
            thumbnailContainer.appendChild(thumbnail);
            assetItem.appendChild(thumbnailContainer);
            
            // Asset info section
            const assetInfo = document.createElement('div');
            assetInfo.className = 'asset-info';
            assetInfo.style.padding = '12px';
            assetInfo.style.borderTop = '1px solid #e2e8f0';
            assetInfo.style.flex = '1';
            
            // Asset name with proper display - fixing truncation issue
            const assetName = document.createElement('div');
            assetName.className = 'asset-name';
            assetName.textContent = asset.name;
            assetName.style.fontSize = '14px';
            assetName.style.fontWeight = '500';
            assetName.style.color = '#334155';
            assetName.style.marginBottom = '4px';
            assetName.style.wordWrap = 'break-word';
            assetName.style.overflowWrap = 'break-word';
            assetName.style.whiteSpace = 'normal'; // Allow text to wrap
            assetName.style.minHeight = '40px'; // Ensure space for 2 lines of text
            assetName.style.maxHeight = '40px'; // Limit height
            assetName.style.overflow = 'hidden';
            assetName.style.display = '-webkit-box';
            assetName.style.webkitLineClamp = '2';
            assetName.style.webkitBoxOrient = 'vertical';
            
            // Asset type info (simplified)
            const assetTypeDiv = document.createElement('div');
            assetTypeDiv.className = 'asset-type';
            assetTypeDiv.textContent = asset.type.charAt(0).toUpperCase() + asset.type.slice(1);
            assetTypeDiv.style.fontSize = '12px';
            assetTypeDiv.style.color = '#64748b';
            
            assetInfo.appendChild(assetName);
            assetInfo.appendChild(assetTypeDiv);
            
            assetItem.appendChild(assetInfo);
            elements.libraryAssets.appendChild(assetItem);
            
            // Store for shift-select functionality
            allAssets.push(assetItem);
        });
        
        // Add pagination if needed
        if (totalPages > 1) {
            const paginationContainer = document.createElement('div');
            paginationContainer.className = 'pagination';
            paginationContainer.style.gridColumn = '1 / -1';
            paginationContainer.style.marginTop = '20px';
            paginationContainer.style.display = 'flex';
            paginationContainer.style.justifyContent = 'center';
            paginationContainer.style.gap = '10px';
            
            // Add pagination UI here if needed
            
            elements.libraryAssets.appendChild(paginationContainer);
        }
    }
    
    /**
     * Handle selecting assets from the library
     */
    function selectAssetsFromLibrary() {
        const selectedAssetElements = document.querySelectorAll('.library-asset.selected');
        
        if (selectedAssetElements.length === 0) {
            // Show error message
            const modalBody = elements.assetSelectorModal.querySelector('.modal-body');
            if (!modalBody.querySelector('.alert-danger')) {
                const alertMsg = document.createElement('div');
                alertMsg.className = 'alert alert-danger';
                alertMsg.style.position = 'absolute';
                alertMsg.style.top = '10px';
                alertMsg.style.left = '50%';
                alertMsg.style.transform = 'translateX(-50%)';
                alertMsg.style.padding = '10px 20px';
                alertMsg.style.borderRadius = '4px';
                alertMsg.style.backgroundColor = '#f8d7da';
                alertMsg.style.color = '#721c24';
                alertMsg.style.border = '1px solid #f5c6cb';
                alertMsg.style.zIndex = '100';
                alertMsg.innerHTML = 'Please select at least one asset';
                
                modalBody.appendChild(alertMsg);
                
                // Auto-remove after 3 seconds
                setTimeout(() => {
                    if (alertMsg.parentNode) {
                        alertMsg.parentNode.removeChild(alertMsg);
                    }
                }, 3000);
            }
            return;
        }
        
        // Get selected assets and update state
        const selectedAssets = Array.from(selectedAssetElements).map(el => {
            return {
                id: el.dataset.id,
                type: el.dataset.type,
                name: el.dataset.name,
                url: el.dataset.url || el.dataset.path,
                file_path: el.dataset.url || el.dataset.path // Make sure we have file_path which could be a URL
            };
        });
        
        console.log(`Selected ${selectedAssets.length} assets from library:`, selectedAssets);
        
        // Update state with selected assets
        state.selectedAssets = state.selectedAssets || [];
        
        // Add newly selected assets to state
        selectedAssets.forEach(asset => {
            if (!state.selectedAssets.includes(asset.id)) {
                state.selectedAssets.push(asset.id);
            }
        });
        
        // Make sure the uploaded asset preview area exists
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
        
        // Clear any empty state message
        const emptyMessage = assetsContainer.querySelector('.empty-panel-message');
        if (emptyMessage) {
            emptyMessage.remove();
        }
        
        // Add selected assets to preview section
        selectedAssets.forEach(asset => {
            // Skip if already in preview
            if (assetsContainer.querySelector(`.preview-item[data-id="${asset.id}"]`)) {
                return;
            }
            
            // Create preview item
            const previewItem = document.createElement('div');
            previewItem.className = 'preview-item';
            previewItem.dataset.id = asset.id;
            previewItem.dataset.type = asset.type;
            previewItem.style.width = '140px';
            previewItem.style.height = '140px';
            previewItem.style.position = 'relative';
            previewItem.style.margin = '0 10px 10px 0';
            previewItem.style.border = '1px solid #e2e8f0';
            previewItem.style.borderRadius = '8px';
            previewItem.style.overflow = 'hidden';
            previewItem.style.display = 'inline-block';
            
            // Make it draggable for adset assignment
            previewItem.draggable = true;
            previewItem.addEventListener('dragstart', function(e) {
                previewItem.classList.add('dragging');
                document.body.classList.add('dragging');
                e.dataTransfer.setData('text/plain', asset.id);
                e.dataTransfer.setData('application/json', JSON.stringify(asset));
                
                // Use a ghost image if available
                if (previewItem.querySelector('img')) {
                    const img = previewItem.querySelector('img');
                    const rect = img.getBoundingClientRect();
                    e.dataTransfer.setDragImage(img, rect.width / 2, rect.height / 2);
                }
            });
            
            // Show the image/video
            if (asset.type === 'image') {
                const img = document.createElement('img');
                img.src = asset.url || asset.file_path; // Use whichever is available
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'cover';
                previewItem.appendChild(img);
            } else if (asset.type === 'video') {
                const video = document.createElement('video');
                video.src = asset.url || asset.file_path;
                video.muted = true;
                video.style.width = '100%';
                video.style.height = '100%';
                video.style.objectFit = 'cover';
                previewItem.appendChild(video);
                
                // Add play icon overlay for videos
                const playIcon = document.createElement('div');
                playIcon.innerHTML = '<i class="fas fa-play"></i>';
                playIcon.style.position = 'absolute';
                playIcon.style.top = '50%';
                playIcon.style.left = '50%';
                playIcon.style.transform = 'translate(-50%, -50%)';
                playIcon.style.width = '30px';
                playIcon.style.height = '30px';
                playIcon.style.borderRadius = '50%';
                playIcon.style.backgroundColor = 'rgba(0,0,0,0.5)';
                playIcon.style.color = 'white';
                playIcon.style.display = 'flex';
                playIcon.style.alignItems = 'center';
                playIcon.style.justifyContent = 'center';
                playIcon.style.fontSize = '12px';
                previewItem.appendChild(playIcon);
            }
            
            // Add remove button
            const removeBtn = document.createElement('button');
            removeBtn.className = 'preview-remove';
            removeBtn.innerHTML = '&times;';
            removeBtn.style.position = 'absolute';
            removeBtn.style.top = '5px';
            removeBtn.style.right = '5px';
            removeBtn.style.backgroundColor = 'rgba(0,0,0,0.5)';
            removeBtn.style.color = 'white';
            removeBtn.style.border = 'none';
            removeBtn.style.borderRadius = '50%';
            removeBtn.style.width = '22px';
            removeBtn.style.height = '22px';
            removeBtn.style.display = 'flex';
            removeBtn.style.alignItems = 'center';
            removeBtn.style.justifyContent = 'center';
            removeBtn.style.cursor = 'pointer';
            removeBtn.style.fontSize = '14px';
            removeBtn.style.fontWeight = 'bold';
            removeBtn.style.padding = '0';
            removeBtn.style.lineHeight = '1';
            
            removeBtn.addEventListener('click', function() {
                previewItem.remove();
                
                // Remove from state
                const index = state.selectedAssets.indexOf(asset.id);
                if (index !== -1) {
                    state.selectedAssets.splice(index, 1);
                }
                
                // Show empty message if no assets
                if (assetsContainer.querySelectorAll('.preview-item').length === 0) {
                    const emptyMessage = document.createElement('div');
                    emptyMessage.className = 'empty-panel-message';
                    emptyMessage.style.padding = '20px';
                    emptyMessage.style.textAlign = 'center';
                    emptyMessage.style.color = '#64748b';
                    emptyMessage.textContent = 'No assets selected. Click "Select Assets" to choose from library.';
                    assetsContainer.appendChild(emptyMessage);
                }
                
                validateStep();
            });
            
            previewItem.addEventListener('dragend', function() {
                previewItem.classList.remove('dragging');
                document.body.classList.remove('dragging');
            });
            
            previewItem.appendChild(removeBtn);
            assetsContainer.appendChild(previewItem);
        });
        
        // Close the modal
        closeAllModals();
        
        // Validate the step
        validateStep();
    }
    
    /**
     * Handle selecting videos from the library and ensure they have proper dimensions
     * @param {Array} selectedAssets - The selected assets from the library
     */
    function processSelectedVideos(selectedAssets) {
        console.log(`Processing ${selectedAssets.length} selected assets for proper dimensions`);
        
        // Define supported aspect ratios and minimum dimensions for TikTok videos
        const supportedFormats = [
            { name: 'Horizontal 16:9', minWidth: 960, minHeight: 540, aspectRatio: 16/9, maxAspectDiff: 0.1 },
            { name: 'Vertical 9:16', minWidth: 540, minHeight: 960, aspectRatio: 9/16, maxAspectDiff: 0.1 },
            { name: 'Square 1:1', minWidth: 640, minHeight: 640, aspectRatio: 1, maxAspectDiff: 0.1 }
        ];
        
        // Define the list of TikTok video URLs (from asset_service.py)
        const tiktokVideoUrls = [
            "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4",
            "https://test-videos.co.uk/vids/jellyfish/mp4/h264/360/Jellyfish_360_10s_1MB.mp4",
            "https://test-videos.co.uk/vids/sintel/mp4/h264/360/Sintel_360_10s_1MB.mp4",
            "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
            "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4"
        ];
        
        // Process each asset
        selectedAssets.forEach(asset => {
            if (asset.type === 'video') {
                // First, ensure the asset has a URL
                if (!asset.url || asset.url.trim() === '') {
                    // Extract the video index from the ID if it's a tiktok-video-X format
                    let videoIndex = 0;
                    if (asset.id && asset.id.startsWith('tiktok-video-')) {
                        videoIndex = parseInt(asset.id.replace('tiktok-video-', '')) || 0;
                    } else {
                        // Fallback for other ID formats
                        videoIndex = parseInt(asset.id.replace(/[^\d]/g, '')) || 0;
                    }
                    
                    // Ensure the index is within bounds of the URL array
                    videoIndex = videoIndex % tiktokVideoUrls.length;
                    
                    // Set URL to a TikTok video URL
                    asset.url = tiktokVideoUrls[videoIndex];
                    console.log(`Set URL for ${asset.id}: ${asset.url}`);
                }
                
                // Check/set dimensions
                if (!asset.width || !asset.height || asset.width <= 0 || asset.height <= 0) {
                    const idNumber = parseInt(asset.id.replace(/[^\d]/g, '')) || 0;
                    const formatIndex = idNumber % supportedFormats.length;
                    const format = supportedFormats[formatIndex];
                    
                    // Calculate dimensions to match the required format
                    if (formatIndex === 0) { // Horizontal 16:9
                        asset.width = 1920;
                        asset.height = 1080;
                    } else if (formatIndex === 1) { // Vertical 9:16
                        asset.width = 1080;
                        asset.height = 1920;
                    } else { // Square 1:1
                        asset.width = 1080;
                        asset.height = 1080;
                    }
                    
                    console.log(`Set dimensions for ${asset.id}: ${asset.width}x${asset.height} (${format.name})`);
                }
            }
        });
        
        return selectedAssets;
    }

    // Modify the original selectAssetsFromLibrary function to call our new function
    const originalSelectAssetsFromLibrary = window.selectAssetsFromLibrary || function() {};

    window.selectAssetsFromLibrary = function(options) {
        const originalCallback = options.onSelect;
        
        // Override the onSelect callback to include our processing
        options.onSelect = function(selectedAssets) {
            const processedAssets = processSelectedVideos(selectedAssets);
            console.log('Selected and processed assets:', processedAssets);
            
            // Call the original callback with our processed assets
            if (typeof originalCallback === 'function') {
                originalCallback(processedAssets);
            }
        };
        
        // Call the original function
        originalSelectAssetsFromLibrary(options);
    };

    // Also hook into the direct drag events
    document.addEventListener('dragstart', function(e) {
        const draggedElement = e.target.closest('.asset-item[data-type="video"], .preview-item[data-type="video"]');
        if (draggedElement) {
            // Define the list of TikTok video URLs (from asset_service.py)
            const tiktokVideoUrls = [
                "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4",
                "https://test-videos.co.uk/vids/jellyfish/mp4/h264/360/Jellyfish_360_10s_1MB.mp4",
                "https://test-videos.co.uk/vids/sintel/mp4/h264/360/Sintel_360_10s_1MB.mp4",
                "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
                "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4"
            ];
            
            // Ensure video has dimensions and URL
            const assetId = draggedElement.dataset.id;
            if (assetId) {
                // If no dimensions, set dimensions based on the asset ID
                if (!draggedElement.dataset.width || !draggedElement.dataset.height) {
                    const idNumber = parseInt(assetId.replace(/[^\d]/g, '')) || 0;
                    const modValue = idNumber % 3;
                    
                    if (modValue === 0) { // Horizontal 16:9
                        draggedElement.dataset.width = '1920';
                        draggedElement.dataset.height = '1080';
                    } else if (modValue === 1) { // Vertical 9:16
                        draggedElement.dataset.width = '1080';
                        draggedElement.dataset.height = '1920';
                    } else { // Square 1:1
                        draggedElement.dataset.width = '1080';
                        draggedElement.dataset.height = '1080';
                    }
                    
                    console.log(`Set dimensions for ${assetId} during drag: ${draggedElement.dataset.width}x${draggedElement.dataset.height}`);
                }
                
                // If no URL, set a URL from the TikTok video URLs list
                if (!draggedElement.dataset.url || draggedElement.dataset.url.trim() === '') {
                    // Extract the video index from the ID if it's a tiktok-video-X format
                    let videoIndex = 0;
                    if (assetId && assetId.startsWith('tiktok-video-')) {
                        videoIndex = parseInt(assetId.replace('tiktok-video-', '')) || 0;
                    } else {
                        // Fallback for other ID formats
                        videoIndex = parseInt(assetId.replace(/[^\d]/g, '')) || 0;
                    }
                    
                    // Ensure the index is within bounds of the URL array
                    videoIndex = videoIndex % tiktokVideoUrls.length;
                    
                    // Set URL to a TikTok video URL
                    draggedElement.dataset.url = tiktokVideoUrls[videoIndex];
                    console.log(`Set URL for ${assetId} during drag: ${draggedElement.dataset.url}`);
                }
                
                // Make sure the drag data includes the dimensions and URL
                try {
                    // Get the dataTransfer data
                    const dataTransfer = e.dataTransfer;
                    const jsonData = dataTransfer.getData('application/json');
                    
                    if (jsonData) {
                        const assetData = JSON.parse(jsonData);
                        
                        // Update with the dimensions and URL
                        assetData.width = parseInt(draggedElement.dataset.width);
                        assetData.height = parseInt(draggedElement.dataset.height);
                        assetData.url = draggedElement.dataset.url;
                        
                        // Set the updated data
                        dataTransfer.setData('application/json', JSON.stringify(assetData));
                        dataTransfer.setData('text/plain', JSON.stringify(assetData));
                        
                        console.log('Updated drag data with dimensions and URL:', assetData);
                    }
                } catch (err) {
                    console.error('Error updating drag data:', err);
                }
            }
        }
    }, true); // Use capture phase to intercept before other handlers

    return {
        openAssetLibrary,
        closeAllModals,
        loadLibraryAssets,
        filterAssetLibrary,
        renderLibraryAssets,
        selectAssetsFromLibrary
    };
} 