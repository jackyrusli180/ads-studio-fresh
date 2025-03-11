document.addEventListener('DOMContentLoaded', function() {
    const statusFilter = document.getElementById('statusFilter');
    const typeFilter = document.getElementById('assetTypeFilter');
    const searchInput = document.getElementById('searchAssets');
    const assetItems = document.querySelectorAll('.asset-item');
    const assetPreview = document.getElementById('assetPreview');
    const processTimeline = document.getElementById('processTimeline');
    const commentInput = document.getElementById('commentInput');
    const approveBtn = document.getElementById('approveBtn');
    const rejectBtn = document.getElementById('rejectBtn');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const assetCount = document.getElementById('assetCount');
    const gridViewBtn = document.getElementById('gridViewBtn');
    const listViewBtn = document.getElementById('listViewBtn');
    
    let currentAsset = null;
    let viewMode = 'grid'; // Default view mode
    let selectedAssets = [];
    const bulkActions = document.getElementById('bulkActions');
    const selectedCount = document.getElementById('selectedCount');
    const createAdsBtn = document.getElementById('createAdsBtn');
    
    // Check initial filter state and set up UI accordingly
    const initialStatus = statusFilter?.value || 'all';
    if (initialStatus !== 'pending' && initialStatus !== 'all') {
        // If we're starting on approved or rejected, hide preview
        togglePreviewSection('approved');
    }
    
    // Initialize view toggle
    if (gridViewBtn && listViewBtn) {
        gridViewBtn.addEventListener('click', () => setViewMode('grid'));
        listViewBtn.addEventListener('click', () => setViewMode('list'));
        
        // Set initial active state
        gridViewBtn.classList.add('active');
    }
    
    // Add search functionality
    let searchTimeout;
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                filterAssets();
            }, 300); // Debounce 300ms
        });
    }
    
    // Apply filters when changed
    statusFilter?.addEventListener('change', filterAssets);
    typeFilter?.addEventListener('change', filterAssets);
    
    // Add click event to all asset items
    assetItems.forEach(item => {
        item.addEventListener('click', () => {
            selectAsset(item);
        });
    });

    // Add approval/rejection event listeners
    approveBtn?.addEventListener('click', approveAsset);
    rejectBtn?.addEventListener('click', rejectAsset);
    
    // Handle checkbox click events
    document.addEventListener('click', function(e) {
        if (e.target && e.target.classList.contains('asset-checkbox')) {
            const assetId = e.target.dataset.id;
            const assetPath = e.target.dataset.path;
            const assetItem = e.target.closest('.asset-item');
            const assetStatus = assetItem.dataset.status;
            
            // Only allow selecting approved assets
            if (assetStatus !== 'approved') {
                e.preventDefault();
                showToast('Only approved assets can be selected for creating ads', 'info');
                e.target.checked = false;
                return;
            }
            
            if (e.target.checked) {
                // Add to selected assets
                selectedAssets.push({
                    id: assetId,
                    path: assetPath
                });
                assetItem.classList.add('selected');
            } else {
                // Remove from selected assets
                selectedAssets = selectedAssets.filter(asset => asset.id !== assetId);
                assetItem.classList.remove('selected');
            }
            
            updateBulkActions();
            
            // Prevent the asset from being selected for preview
            e.stopPropagation();
        }
    });
    
    // Add "Create Ads" button event handler
    createAdsBtn?.addEventListener('click', () => {
        redirectToAdsBuilder();
    });
    
    // Initial filter
    filterAssets();
    
    // Set view mode (grid or list)
    function setViewMode(mode) {
        viewMode = mode;
        const assetItemsContainer = document.getElementById('assetItems');
        
        if (mode === 'grid') {
            assetItemsContainer.classList.remove('list-view');
            assetItemsContainer.classList.add('grid-view');
            gridViewBtn.classList.add('active');
            listViewBtn.classList.remove('active');
        } else {
            assetItemsContainer.classList.remove('grid-view');
            assetItemsContainer.classList.add('list-view');
            gridViewBtn.classList.remove('active');
            listViewBtn.classList.add('active');
        }
    }
    
    // Filter assets based on selected filters and search term
    function filterAssets() {
        if (!statusFilter || !typeFilter) return;
        
        const statusValue = statusFilter.value;
        const typeValue = typeFilter.value;
        const searchTerm = searchInput?.value.toLowerCase() || '';
        
        let visibleCount = 0;
        
        // Check if we need to show or hide the preview section based on the status filter
        if (statusValue === 'pending' || statusValue === 'all') {
            // Keep preview section visible when showing pending assets
            // (We'll update it when selecting an individual asset)
        } else {
            // Always hide preview for approved/rejected filter views
            togglePreviewSection('approved'); // Force hide preview
        }
        
        assetItems.forEach(item => {
            const statusMatch = statusValue === 'all' || item.dataset.status === statusValue;
            const typeMatch = typeValue === 'all' || item.dataset.type === typeValue;
            
            // Search in asset name, status, and type
            const assetName = item.querySelector('.asset-item-name')?.textContent.toLowerCase() || '';
            const searchMatch = !searchTerm || 
                assetName.includes(searchTerm) || 
                item.dataset.status.includes(searchTerm) || 
                item.dataset.type.includes(searchTerm);
            
            if (statusMatch && typeMatch && searchMatch) {
                item.style.display = '';
                visibleCount++;
            } else {
                item.style.display = 'none';
            }
        });
        
        // Select first visible asset if needed
        if (visibleCount > 0) {
            const firstVisible = Array.from(assetItems).find(
                item => item.style.display !== 'none'
            );
            if (firstVisible) {
                if (statusValue === 'pending' || (statusValue === 'all' && firstVisible.dataset.status === 'pending')) {
                    // Only auto-select if it's a pending item
                    selectAsset(firstVisible);
                } else {
                    // Clear current asset but don't select a new one
                    currentAsset = null;
                    // Hide preview for non-pending items
                    togglePreviewSection('approved');
                }
            }
        } else {
            // Clear preview if no items are visible
            clearPreview();
        }
        
        // Update count display if it exists
        if (assetCount) {
            assetCount.textContent = visibleCount;
        }
        
        console.log(`Filtered to ${visibleCount} visible assets`);
    }
    
    // Select an asset for review
    function selectAsset(assetElement) {
        if (!assetElement) return;
        
        console.log("Asset selected:", assetElement.dataset.id);
        
        // Remove active class from all items
        assetItems.forEach(item => item.classList.remove('active'));
        
        // Add active class to selected item
        assetElement.classList.add('active');
        
        // Get asset data
        const assetId = assetElement.dataset.id;
        const assetType = assetElement.dataset.type;
        const assetStatus = assetElement.dataset.status;
        
        // Toggle preview section based on asset status
        togglePreviewSection(assetStatus);
        
        // Only continue with preview if the asset is pending
        if (assetStatus === 'pending') {
            // Store current asset
            currentAsset = {
                id: assetId,
                type: assetType,
                status: assetStatus,
                element: assetElement
            };
            
            // Get asset details from the DOM
            const thumbnail = assetElement.querySelector('img').src;
            const name = assetElement.querySelector('.asset-item-name').textContent;
            
            // Find the larger version path (resolve path properly)
            const filePath = thumbnail.replace('thumb_', '');
            
            // Update preview immediately with what we have
            updatePreview({
                name: name,
                type: assetType, 
                file_path: filePath,
                thumbnail: thumbnail
            });
            
            // Try to get more details from the server
            fetch(`/api/assets/${assetId}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Asset not found');
                    }
                    return response.json();
                })
                .then(asset => {
                    // Update preview with complete data
                    updatePreview(asset);
                    
                    // Enable/disable approval actions based on status
                    toggleApprovalActions(true); // Always enable for pending
                    
                    // Render timeline
                    renderTimeline(asset);
                })
                .catch(error => {
                    console.error('Error fetching asset details:', error);
                    // Show error in preview
                    showErrorInPreview(assetId, error);
                });
        } else {
            // Clear current asset for non-pending items
            currentAsset = null;
        }
    }
    
    // Update the preview section
    function updatePreview(asset) {
        if (!assetPreview) return;
        
        // Clear previous content
        assetPreview.innerHTML = '';
        
        if (asset.type === 'image') {
            const img = document.createElement('img');
            img.src = asset.file_path;
            img.alt = asset.name;
            img.className = 'preview-image';
            img.onload = () => {
                // Remove loading state when image loads
                assetPreview.classList.remove('loading');
                // Add zoom controls after image loads
                addZoomControls();
            };
            img.onerror = () => {
                // Show error if image fails to load
                assetPreview.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Failed to load image</p>
                    </div>
                `;
            };
            // Add loading state
            assetPreview.classList.add('loading');
            assetPreview.appendChild(img);
        } else if (asset.type === 'video') {
            const video = document.createElement('video');
            video.controls = true;
            video.autoplay = true;
            video.className = 'preview-video';
            video.innerHTML = `<source src="${asset.file_path}" type="video/mp4">`;
            video.onloadeddata = () => {
                // Add zoom controls after video loads
                addZoomControls();
            };
            video.onerror = () => {
                // Show error if video fails to load
                assetPreview.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Failed to load video</p>
                    </div>
                `;
            };
            assetPreview.appendChild(video);
        } else {
            assetPreview.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file"></i>
                    <p>${asset.name}</p>
                </div>
            `;
        }
    }
    
    // Show error in preview
    function showErrorInPreview(assetId, error) {
        if (!assetPreview) return;
        
        assetPreview.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error loading asset (ID: ${assetId})</p>
                <small>${error.message}</small>
            </div>
        `;
    }
    
    // Enable/disable approval actions
    function toggleApprovalActions(enabled) {
        if (!approvalActions) return;
        
        const actions = document.getElementById('approvalActions');
        actions.style.opacity = enabled ? '1' : '0.5';
        actions.style.pointerEvents = enabled ? 'auto' : 'none';
        
        if (commentInput) commentInput.disabled = !enabled;
        if (approveBtn) approveBtn.disabled = !enabled;
        if (rejectBtn) rejectBtn.disabled = !enabled;
    }
    
    // Render the timeline
    function renderTimeline(asset) {
        if (!processTimeline) return;
        
        // Clear timeline
        processTimeline.innerHTML = '';
        
        // Add "Submitted" entry
        const submittedItem = document.createElement('div');
        submittedItem.className = 'timeline-item';
        submittedItem.innerHTML = `
            <div class="timeline-icon submitted">
                <i class="fas fa-upload"></i>
            </div>
            <div class="timeline-content">
                <div class="timeline-header">
                    <span class="timeline-title">Submitted</span>
                    <span class="timeline-date">${formatDate(asset.created_at)}</span>
                </div>
                <div class="timeline-user">
                    <div class="timeline-avatar">
                        <i class="fas fa-user"></i>
                    </div>
                    <span>${asset.created_by || 'System'}</span>
                </div>
            </div>
        `;
        processTimeline.appendChild(submittedItem);
        
        // Add approval/rejection entry if applicable
        if (asset.status === 'approved' || asset.status === 'rejected') {
            const actionItem = document.createElement('div');
            actionItem.className = 'timeline-item';
            
            const actionIcon = asset.status === 'approved' ? 'check' : 'times';
            const actionUser = asset.approved_by || asset.rejected_by || 'System';
            const actionDate = asset.approved_at || asset.rejected_at || new Date().toISOString();
            const actionComment = asset.approval_comment || asset.rejection_comment || '';
            
            actionItem.innerHTML = `
                <div class="timeline-icon ${asset.status}">
                    <i class="fas fa-${actionIcon}"></i>
                </div>
                <div class="timeline-content">
                    <div class="timeline-header">
                        <span class="timeline-title">${capitalizeFirstLetter(asset.status)}</span>
                        <span class="timeline-date">${formatDate(actionDate)}</span>
                    </div>
                    <div class="timeline-user">
                        <div class="timeline-avatar">
                            <i class="fas fa-user"></i>
                        </div>
                        <span>${actionUser}</span>
                    </div>
                    ${actionComment ? `<div class="timeline-comment">${actionComment}</div>` : ''}
                </div>
            `;
            processTimeline.appendChild(actionItem);
        }
    }
    
    // Render a fallback timeline when we don't have full asset data
    function renderFallbackTimeline(status) {
        if (!processTimeline) return;
        
        // Clear timeline
        processTimeline.innerHTML = '';
        
        // Add "Submitted" entry
        const submittedItem = document.createElement('div');
        submittedItem.className = 'timeline-item';
        submittedItem.innerHTML = `
            <div class="timeline-icon submitted">
                <i class="fas fa-upload"></i>
            </div>
            <div class="timeline-content">
                <div class="timeline-header">
                    <span class="timeline-title">Submitted</span>
                    <span class="timeline-date">-</span>
                </div>
                <div class="timeline-user">
                    <div class="timeline-avatar">
                        <i class="fas fa-user"></i>
                    </div>
                    <span>System</span>
                </div>
            </div>
        `;
        processTimeline.appendChild(submittedItem);
        
        // Add status entry if not pending
        if (status !== 'pending') {
            const actionItem = document.createElement('div');
            actionItem.className = 'timeline-item';
            
            const actionIcon = status === 'approved' ? 'check' : 'times';
            
            actionItem.innerHTML = `
                <div class="timeline-icon ${status}">
                    <i class="fas fa-${actionIcon}"></i>
                </div>
                <div class="timeline-content">
                    <div class="timeline-header">
                        <span class="timeline-title">${capitalizeFirstLetter(status)}</span>
                        <span class="timeline-date">-</span>
                    </div>
                    <div class="timeline-user">
                        <div class="timeline-avatar">
                            <i class="fas fa-user"></i>
                        </div>
                        <span>System</span>
                    </div>
                </div>
            `;
            processTimeline.appendChild(actionItem);
        }
    }
    
    // Approve asset
    function approveAsset() {
        if (!currentAsset || currentAsset.status !== 'pending') return;
        
        const comment = commentInput ? commentInput.value.trim() : '';
        
        showConfirmationModal(
            'Approve Asset',
            'Are you sure you want to approve this asset?',
            async () => {
                showLoading();
                try {
                    // In a real app, this would be an API call
                    const response = await fetch(`/api/assets/${currentAsset.id}/approve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
                        body: JSON.stringify({ comment })
        });
        
        if (response.ok) {
            showToast('Asset approved successfully');
                        
                        // Refresh the page after short delay to show changes
                        setTimeout(() => {
                            window.location.reload();
                        }, 1500);
        } else {
            throw new Error('Failed to approve asset');
        }
    } catch (error) {
                    console.error('Error approving asset:', error);
                    showToast('Failed to approve asset', 'error');
                    hideLoading();
                }
            }
        );
    }
    
    // Reject asset
    function rejectAsset() {
        if (!currentAsset || currentAsset.status !== 'pending') return;
        
        const comment = commentInput ? commentInput.value.trim() : '';
        
        if (!comment) {
            showToast('Please provide a reason for rejection', 'error');
            commentInput.focus();
            return;
        }
        
        showConfirmationModal(
            'Reject Asset',
            'Are you sure you want to reject this asset?',
            async (rejectionReasons) => {
                showLoading();
                try {
                    const response = await fetch(`/api/assets/${currentAsset.id}/reject`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ 
                            comment: comment,
                            rejection_reasons: rejectionReasons 
                        })
                    });
                    
                    if (response.ok) {
                        showToast('Asset rejected successfully');
                        
                        // Refresh the page after short delay to show changes
                        setTimeout(() => {
                            window.location.reload();
                        }, 1500);
                    } else {
                        throw new Error('Failed to reject asset');
                    }
                } catch (error) {
                    console.error('Error rejecting asset:', error);
                    showToast('Failed to reject asset', 'error');
                    hideLoading();
                }
            },
            true // isRejection = true
        );
    }
    
    // Show confirmation modal
    function showConfirmationModal(title, message, confirmCallback, isRejection = false) {
        const modal = document.getElementById('confirmationModal');
        if (!modal) return;
        
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalMessage').textContent = message;
        
        // Show/hide rejection reasons section based on action type
        const rejectionReasons = document.getElementById('rejectionReasons');
        rejectionReasons.style.display = isRejection ? 'block' : 'none';
        
        // Reset checkboxes and error message when modal is opened
        if (isRejection) {
            document.querySelectorAll('input[name="rejectionReasons"]').forEach(cb => cb.checked = false);
            document.getElementById('rejectionReasonError').style.display = 'none';
        }
        
        // Set up confirm button
        const confirmBtn = document.getElementById('modalConfirm');
        confirmBtn.onclick = () => {
            // For rejection, validate that at least one reason is selected
            if (isRejection) {
                const selectedReasons = Array.from(
                    document.querySelectorAll('input[name="rejectionReasons"]:checked')
                ).map(cb => cb.value);
                
                if (selectedReasons.length === 0) {
                    document.getElementById('rejectionReasonError').style.display = 'block';
                    return;
                }
                
                // Pass selected reasons to the callback
                modal.style.display = 'none';
                confirmCallback(selectedReasons);
                return;
            }
            
            // For non-rejection actions
            modal.style.display = 'none';
            confirmCallback();
        };
        
        // Set up cancel button
        const cancelBtn = document.getElementById('modalCancel');
        cancelBtn.onclick = () => {
            modal.style.display = 'none';
        };
        
        // Close button
        modal.querySelector('.close-modal').onclick = () => {
            modal.style.display = 'none';
        };
        
        // Show the modal
        modal.style.display = 'block';
    }
    
    // Show loading overlay
    function showLoading() {
        if (loadingOverlay) {
            loadingOverlay.style.display = 'flex';
        }
    }
    
    // Hide loading overlay
    function hideLoading() {
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }
    
    // Show toast notification
    function showToast(message, type = 'success') {
        // Create toast if it doesn't exist
        let toast = document.getElementById('toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toast';
            document.body.appendChild(toast);
        }
        
        // Set toast content
        toast.textContent = message;
        toast.className = `toast toast-${type}`;
        
        // Show toast
        toast.classList.add('show');
        
        // Hide after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
    
    // Helper function to capitalize first letter
    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
    
    // Helper function to format date
    function formatDate(dateString) {
        if (!dateString) return '-';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        } catch (e) {
            return dateString;
        }
    }
    
    // Initialize hover previews
    initializeHoverPreviews();
    
    // Add a new function to clear the preview
    function clearPreview() {
        if (assetPreview) {
            assetPreview.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-image"></i>
                    <p>No assets match the current filters</p>
                </div>
            `;
        }
        
        // Clear timeline
        if (processTimeline) {
            processTimeline.innerHTML = '';
        }
        
        // Disable actions
        toggleApprovalActions(false);
    }
    
    // Function to update bulk actions visibility
    function updateBulkActions() {
        if (selectedAssets.length > 0) {
            document.body.classList.add('bulk-mode');
            bulkActions.style.display = 'flex';
            selectedCount.textContent = selectedAssets.length;
        } else {
            document.body.classList.remove('bulk-mode');
            bulkActions.style.display = 'none';
        }
    }
    
    // Function to redirect to Ads Builder with selected assets
    function redirectToAdsBuilder() {
        if (selectedAssets.length === 0) return;
        
        // Create a form to post data to the ads builder
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = '/ads_builder';
        form.style.display = 'none';
        
        // Add selected assets as hidden inputs
        selectedAssets.forEach((asset, index) => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = `selected_assets[${index}]`;
            input.value = asset.id;
            form.appendChild(input);
        });
        
        // Add form to document and submit
        document.body.appendChild(form);
        form.submit();
    }
});

// Initialize hover previews
function initializeHoverPreviews() {
    assetItems.forEach(item => {
        const previewTooltip = item.querySelector('.asset-preview-tooltip');
        if (!previewTooltip) return;
        
        const video = previewTooltip.querySelector('video');
        
        // Set position based on mouse
        item.addEventListener('mousemove', (e) => {
            const rect = item.getBoundingClientRect();
            
            // Position tooltip to the right of the cursor
            previewTooltip.style.left = (e.clientX - rect.left + 20) + 'px';
            previewTooltip.style.top = (e.clientY - rect.top) + 'px';
            
            // Play video on hover
            if (video) {
                video.play().catch(() => {});
            }
        });
        
        // Clear video when not hovering
        item.addEventListener('mouseleave', () => {
            if (video) {
                video.pause();
                video.currentTime = 0;
            }
        });
    });
}

// Add zoom functionality to asset preview
function addZoomControls() {
    const assetPreview = document.getElementById('assetPreview');
    if (!assetPreview) return;
    
    // Wrap preview content in a container if not already wrapped
    if (!document.querySelector('.asset-preview-container')) {
        const container = document.createElement('div');
        container.className = 'asset-preview-container';
        
        // Move preview content inside container
        const previewContent = assetPreview.innerHTML;
        assetPreview.innerHTML = '';
        container.innerHTML = previewContent;
        assetPreview.appendChild(container);
        
        // Add zoom controls
        const zoomControls = document.createElement('div');
        zoomControls.className = 'zoom-controls';
        zoomControls.innerHTML = `
            <button class="zoom-btn zoom-in" title="Zoom In">
                <i class="fas fa-search-plus"></i>
            </button>
            <button class="zoom-btn zoom-out" title="Zoom Out">
                <i class="fas fa-search-minus"></i>
            </button>
            <button class="zoom-btn zoom-reset" title="Reset Zoom">
                <i class="fas fa-sync-alt"></i>
            </button>
        `;
        container.appendChild(zoomControls);
        
        // Add zoom event listeners
        const zoomIn = container.querySelector('.zoom-in');
        const zoomOut = container.querySelector('.zoom-out');
        const zoomReset = container.querySelector('.zoom-reset');
        
        let currentZoom = 1;
        const zoomStep = 0.2;
        const maxZoom = 3;
        const minZoom = 0.5;
        
        zoomIn?.addEventListener('click', () => {
            if (currentZoom < maxZoom) {
                currentZoom += zoomStep;
                applyZoom(currentZoom);
            }
        });
        
        zoomOut?.addEventListener('click', () => {
            if (currentZoom > minZoom) {
                currentZoom -= zoomStep;
                applyZoom(currentZoom);
            }
        });
        
        zoomReset?.addEventListener('click', () => {
            currentZoom = 1;
            applyZoom(currentZoom);
        });
    }
}

// Apply zoom level to preview content
function applyZoom(zoom) {
    const previewImage = document.querySelector('.preview-image');
    const previewVideo = document.querySelector('.preview-video');
    
    if (previewImage) {
        previewImage.style.transform = `scale(${zoom})`;
    }
    
    if (previewVideo) {
        previewVideo.style.transform = `scale(${zoom})`;
    }
}

// Add this function to the approval_flow.js file
function togglePreviewSection(assetStatus) {
    const approvalContent = document.querySelector('.approval-content');
    const assetList = document.querySelector('.asset-list');
    const approvalDetails = document.querySelector('.approval-details');
    
    console.log("Toggling preview for status:", assetStatus);
    
    // Only show preview section for pending assets
    if (assetStatus === 'pending') {
        // Show split view with preview
        approvalContent?.classList.remove('full-width-mode');
        if (approvalDetails) {
            approvalDetails.style.display = 'block';
            approvalDetails.style.visibility = 'visible';
        }
        if (assetList) assetList.classList.remove('full-width');
    } else {
        // Hide preview, show assets in full width
        approvalContent?.classList.add('full-width-mode');
        if (approvalDetails) {
            approvalDetails.style.display = 'none';
            approvalDetails.style.visibility = 'hidden';
        }
        if (assetList) assetList.classList.add('full-width');
    }
}