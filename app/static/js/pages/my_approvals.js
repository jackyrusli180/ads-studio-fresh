document.addEventListener('DOMContentLoaded', function() {
    const editTextBtns = document.querySelectorAll('.edit-text-btn');
    const regenerateImageBtns = document.querySelectorAll('.regenerate-image-btn');
    const resubmitBtns = document.querySelectorAll('.resubmit-btn');
    const editTextModal = document.getElementById('editTextModal');
    const saveTextChangesBtn = document.getElementById('saveTextChangesBtn');
    const loadingOverlay = document.getElementById('loadingOverlay');
    
    // Add event listeners to all edit text buttons
    editTextBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            openTextEditModal(btn.dataset.id);
        });
    });
    
    // Add event listeners to regenerate image buttons
    regenerateImageBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            regenerateImage(btn.dataset.id);
        });
    });
    
    // Add event listeners to resubmit buttons
    resubmitBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            resubmitAsset(btn.dataset.id);
        });
    });
    
    // Add event listener to save text changes button
    saveTextChangesBtn?.addEventListener('click', saveTextChanges);
    
    // Add close handlers for the modal
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            if (editTextModal) {
                editTextModal.style.display = 'none';
            }
        });
    });
    
    // Add character count handlers
    document.getElementById('editHeadline')?.addEventListener('input', function() {
        document.getElementById('editHeadlineCount').textContent = this.value.length;
    });
    
    document.getElementById('editTC')?.addEventListener('input', function() {
        document.getElementById('editTCCount').textContent = this.value.length;
    });
    
    // Function to open the text edit modal
    function openTextEditModal(assetId) {
        if (!editTextModal) return;
        
        showLoading();
        
        // Get the asset details from the server
        fetch(`/api/assets/${assetId}`)
            .then(response => response.json())
            .then(asset => {
                // Store the asset ID
                document.getElementById('editAssetId').value = assetId;
                
                // Determine which sections to show based on rejection reasons
                const rejectionReasons = asset.rejection_reasons || [];
                const headlineSection = document.getElementById('headlineEditSection');
                const tcSection = document.getElementById('tcEditSection');
                
                // Show/hide headline section and populate
                if (rejectionReasons.includes('primary_headline')) {
                    headlineSection.style.display = 'block';
                    const headlineInput = document.getElementById('editHeadline');
                    headlineInput.value = asset.headline || '';
                    document.getElementById('editHeadlineCount').textContent = headlineInput.value.length;
                } else {
                    headlineSection.style.display = 'none';
                }
                
                // Show/hide T&C section and populate
                if (rejectionReasons.includes('tc_text')) {
                    tcSection.style.display = 'block';
                    const tcInput = document.getElementById('editTC');
                    tcInput.value = asset.tc_text || '';
                    document.getElementById('editTCCount').textContent = tcInput.value.length;
                } else {
                    tcSection.style.display = 'none';
                }
                
                // Show the modal
                editTextModal.style.display = 'block';
                hideLoading();
            })
            .catch(error => {
                console.error('Error fetching asset details:', error);
                showToast('Error fetching asset details', 'error');
                hideLoading();
            });
    }
    
    // Function to save text changes
    function saveTextChanges() {
        const assetId = document.getElementById('editAssetId').value;
        const headlineSection = document.getElementById('headlineEditSection');
        const tcSection = document.getElementById('tcEditSection');
        
        // Collect the updated values
        const updates = {};
        
        if (headlineSection.style.display !== 'none') {
            updates.headline = document.getElementById('editHeadline').value.trim();
            if (!updates.headline) {
                showToast('Please enter a headline', 'error');
                return;
            }
        }
        
        if (tcSection.style.display !== 'none') {
            updates.tc_text = document.getElementById('editTC').value.trim();
            if (!updates.tc_text) {
                showToast('Please enter T&C text', 'error');
                return;
            }
        }
        
        showLoading();
        
        // Send the updates to the server
        fetch(`/api/assets/${assetId}/update-text`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updates)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showToast('Text updated successfully');
                editTextModal.style.display = 'none';
                
                // Refresh the page after a short delay
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                throw new Error(data.error || 'Failed to update text');
            }
        })
        .catch(error => {
            console.error('Error updating text:', error);
            showToast('Error updating text: ' + error.message, 'error');
            hideLoading();
        });
    }
    
    // Function to regenerate image
    function regenerateImage(assetId) {
        // Redirect to AI Image page with the asset ID for regeneration
        window.location.href = `/aigc/ai_image?regenerate=${assetId}`;
    }
    
    // Function to resubmit asset for approval
    function resubmitAsset(assetId) {
        showConfirmationModal(
            'Resubmit Asset',
            'Are you sure you want to resubmit this asset for approval?',
            () => {
                showLoading();
                
                fetch(`/api/assets/${assetId}/resubmit`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        showToast('Asset resubmitted successfully');
                        
                        // Refresh the page after a short delay
                        setTimeout(() => {
                            window.location.reload();
                        }, 1500);
                    } else {
                        throw new Error(data.error || 'Failed to resubmit asset');
                    }
                })
                .catch(error => {
                    console.error('Error resubmitting asset:', error);
                    showToast('Error resubmitting asset: ' + error.message, 'error');
                    hideLoading();
                });
            }
        );
    }
    
    // Show confirmation modal
    function showConfirmationModal(title, message, confirmCallback) {
        const modal = document.createElement('div');
        modal.className = 'modal confirmation-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="close-modal"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <p>${message}</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary cancel-btn">Cancel</button>
                    <button class="btn btn-primary confirm-btn">Confirm</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Show the modal
        modal.style.display = 'block';
        
        // Add event listeners
        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.querySelector('.cancel-btn').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.querySelector('.confirm-btn').addEventListener('click', () => {
            modal.remove();
            confirmCallback();
        });
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
}); 