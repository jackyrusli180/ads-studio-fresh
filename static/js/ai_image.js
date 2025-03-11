document.addEventListener('DOMContentLoaded', function() {
    const imagePrompt = document.getElementById('imagePrompt');
    const resolution = document.getElementById('resolution');
    const fluxModel = document.getElementById('fluxModel');
    const generateBtn = document.getElementById('generateBtn');
    const imagePreview = document.getElementById('imagePreview');
    const generateHeadlines = document.getElementById('generateHeadlines');
    const headlineSuggestions = document.getElementById('headlineSuggestions');
    const imageHistory = document.getElementById('imageHistory');
    
    let currentImageUrl = null;

    // Load history when page loads
    loadImageHistory();

    // Character count handlers
    const imagePromptCount = document.getElementById('imagePromptCount');
    const headlinePromptCount = document.getElementById('headlinePromptCount');

    imagePrompt.addEventListener('input', function() {
        imagePromptCount.textContent = this.value.length;
    });

    document.getElementById('headlinePrompt').addEventListener('input', function() {
        headlinePromptCount.textContent = this.value.length;
    });

    // Initialize character counts
    imagePromptCount.textContent = imagePrompt.value.length;
    headlinePromptCount.textContent = document.getElementById('headlinePrompt').value.length;

    // Check if we're regenerating an image
    const regenerationAssetId = document.getElementById('regenerationAssetId')?.value;
    const regenerationPrompt = document.querySelector('.regeneration-banner')?.querySelector('p strong')?.nextSibling?.nodeValue;
    
    // If regenerating, populate the prompt field
    if (regenerationAssetId && regenerationPrompt) {
        document.getElementById('imagePrompt').value = regenerationPrompt.trim();
        // Update character count
        document.getElementById('imagePromptCount').textContent = regenerationPrompt.trim().length;
    }

    // Add a function to handle regeneration submission
    async function submitRegeneration(imageUrl) {
        if (!regenerationAssetId) return false;
        
        try {
            const response = await fetch(`/api/assets/${regenerationAssetId}/update-image`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    new_image_url: imageUrl,
                    prompt: document.getElementById('imagePrompt').value
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                showToast('Image regenerated successfully. You can now apply branding or resubmit it for approval.', 'success');
                
                // Show the resubmit button and properly set the asset ID
                const resubmitBtn = document.getElementById('resubmitRegeneratedBtn');
                if (resubmitBtn) {
                    resubmitBtn.style.display = 'inline-block';
                    // Set the asset ID from our regenerationAssetId variable
                    resubmitBtn.dataset.assetId = regenerationAssetId;
                    console.log('Set asset ID on resubmit button:', regenerationAssetId);
                }
                
                return true;
            } else {
                throw new Error(data.error || 'Failed to update image');
            }
        } catch (error) {
            console.error('Error updating image:', error);
            showToast('Error updating regenerated image: ' + error.message, 'error');
            return false;
        }
    }

    generateBtn.addEventListener('click', async function() {
        if (!imagePrompt.value.trim()) {
            showToast('Please enter a prompt', 'error');
            return;
        }

        generateBtn.disabled = true;
        imagePreview.innerHTML = '<div class="loading"></div>';

        try {
            const response = await fetch('/api/generate_image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prompt: imagePrompt.value,
                    resolution: resolution.value,
                    model: fluxModel.value
                })
            });

            const data = await response.json();
            
            if (data.success) {
                currentImageUrl = data.image_url;
                imagePreview.innerHTML = `<img src="${data.image_url}" alt="Generated image">`;
                generateHeadlines.disabled = false;
                
                // If we're regenerating, submit it automatically
                if (regenerationAssetId) {
                    submitRegeneration(data.image_url);
                } else {
                    // Add to history immediately (for normal generation)
                    addToHistory({
                        url: data.image_url,
                        prompt: imagePrompt.value,
                        timestamp: new Date().toISOString()
                    });
                }
            } else {
                throw new Error(data.error || 'Failed to generate image');
            }
        } catch (error) {
            showToast(error.message, 'error');
            imagePreview.innerHTML = '<div class="placeholder">Generation failed</div>';
        } finally {
            generateBtn.disabled = false;
        }
    });

    generateHeadlines.addEventListener('click', async function() {
        if (!currentImageUrl) return;

        generateHeadlines.disabled = true;
        headlineSuggestions.innerHTML = '<div class="loading"></div>';

        try {
            const response = await fetch('/api/generate_headlines', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    image_url: currentImageUrl,
                    prompt: document.getElementById('headlinePrompt').value
                })
            });

            const data = await response.json();
            
            if (data.success) {
                headlineSuggestions.innerHTML = data.headlines
                    .map(headline => `
                        <div class="headline-item">
                            ${headline}
                            <button class="copy-btn" data-text="${headline}">
                                <i class="fas fa-copy"></i>
                            </button>
                        </div>
                    `).join('');
            } else {
                throw new Error(data.error || 'Failed to generate headlines');
            }
        } catch (error) {
            showToast(error.message, 'error');
            headlineSuggestions.innerHTML = '<div class="placeholder-message">Failed to generate headlines</div>';
        } finally {
            generateHeadlines.disabled = false;
        }
    });

    async function loadImageHistory() {
        try {
            const response = await fetch('/api/aigc/image/history');
            const data = await response.json();
            
            if (data.success) {
                imageHistory.innerHTML = data.images
                    .map(image => createHistoryItem(image))
                    .join('');
            }
        } catch (error) {
            console.error('Failed to load history:', error);
        }
    }

    function createHistoryItem(image) {
        // Add /static/ to the path for proper URL routing
        const imagePath = image.local_path ? `/static/${image.local_path}` : image.url;
        return `
            <div class="history-item" data-url="${image.url}" data-prompt="${image.prompt}">
                <img src="${imagePath}" 
                     alt="Historical image" 
                     class="history-item-image">
                <div class="history-item-prompt">${image.prompt}</div>
            </div>
        `;
    }

    function addToHistory(image) {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = createHistoryItem({
            url: image.url,
            local_path: null,  // New images won't have a local path yet
            prompt: image.prompt
        });
        imageHistory.insertBefore(historyItem, imageHistory.firstChild);
    }

    // Event delegation for history items
    imageHistory.addEventListener('click', function(e) {
        const historyItem = e.target.closest('.history-item');
        if (!historyItem) return;

        const imageUrl = historyItem.dataset.url;
        const prompt = historyItem.dataset.prompt;

        // Update preview
        imagePreview.innerHTML = `<img src="${imageUrl}" alt="Generated image">`;
        imagePrompt.value = prompt;
        currentImageUrl = imageUrl;
        generateHeadlines.disabled = false;
    });

    // Modify the Apply Branding button click handler
    document.getElementById('applyBrandingBtn')?.addEventListener('click', function() {
        console.log("Apply branding button clicked");
        const currentImage = document.querySelector('#imagePreview img');
        console.log("Current image:", currentImage?.src);
        
        if (!currentImage || !currentImage.src) {
            showToast('No image to apply branding to', 'error');
            return;
        }
        
        // Show the branding modal instead of directly applying branding
        const brandingModal = document.getElementById('brandingModal');
        brandingModal.classList.add('show');
        
        // Focus on the headline input
        document.getElementById('brandingHeadline').focus();
    });

    // Add character counter for headline input
    document.getElementById('brandingHeadline')?.addEventListener('input', function() {
        document.getElementById('headlineCharCount').textContent = this.value.length;
    });

    // Add character counter for T&C text input
    document.getElementById('brandingTcText')?.addEventListener('input', function() {
        document.getElementById('tcTextCharCount').textContent = this.value.length;
    });

    // Initialize character counters on page load
    document.addEventListener('DOMContentLoaded', function() {
        // Set initial character count for headline
        const headlineInput = document.getElementById('brandingHeadline');
        if (headlineInput) {
            document.getElementById('headlineCharCount').textContent = headlineInput.value.length;
        }
        
        // Set initial character count for T&C text
        const tcTextInput = document.getElementById('brandingTcText');
        if (tcTextInput) {
            document.getElementById('tcTextCharCount').textContent = tcTextInput.value.length;
        }
    });

    // Add close handlers for the modal
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            document.getElementById('brandingModal').classList.remove('show');
        });
    });

    // Update the confirmBrandingBtn click handler to handle regeneration mode properly
    document.getElementById('confirmBrandingBtn')?.addEventListener('click', function() {
        const currentImage = document.querySelector('#imagePreview img');
        const headline = document.getElementById('brandingHeadline').value.trim();
        const tcText = document.getElementById('brandingTcText').value.trim();
        
        if (!headline) {
            showToast('Please enter a headline', 'error');
            return;
        }
        
        if (!tcText) {
            showToast('Please enter T&C text', 'error');
            return;
        }
        
        // Show loading state
        showToast('Applying branding to image...', 'info');
        
        // Hide the modal
        document.getElementById('brandingModal').classList.remove('show');
        
        // Disable the button during processing
        this.disabled = true;
        
        // Add loading indicator to brandedImagePreview
        const brandedPreview = document.getElementById('brandedImagePreview');
        brandedPreview.innerHTML = `<div class="loading"></div>`;
        brandedPreview.style.display = 'flex';
        
        // Send the full image URL, headline, and T&C text to the server
        fetch('/api/apply_branding', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                image_path: currentImage.src,
                headline: headline,
                tc_text: tcText
            })
        })
        .then(response => response.json())
        .then(data => {
            // Re-enable the button
            this.disabled = false;
            
            if (data.success) {
                console.log("Branded image URL:", data.branded_image_url);
                
                // Display the branded image in the second preview area
                brandedPreview.innerHTML = `<img src="${data.branded_image_url}" alt="Branded image">`;
                
                // Check if we're in regeneration mode
                const isRegenerationMode = !!document.getElementById('regenerationAssetId')?.value;
                
                if (isRegenerationMode) {
                    // Update the resubmit button to use the branded image
                    const resubmitBtn = document.getElementById('resubmitRegeneratedBtn');
                    if (resubmitBtn) {
                        resubmitBtn.style.display = 'inline-block';
                        // Make sure we keep the original asset ID
                        const assetId = resubmitBtn.dataset.assetId || document.getElementById('regenerationAssetId')?.value;
                        resubmitBtn.dataset.assetId = assetId;
                        // Set the branded image URL
                        resubmitBtn.dataset.brandedImageUrl = data.branded_image_url;
                        console.log('Updated resubmit button with:', {
                            assetId: resubmitBtn.dataset.assetId,
                            brandedImageUrl: resubmitBtn.dataset.brandedImageUrl
                        });
                    }
                    
                    // Hide the sendForApproval button
                    const sendForApprovalBtn = document.getElementById('sendForApprovalBtn');
                    if (sendForApprovalBtn) {
                        sendForApprovalBtn.style.display = 'none';
                    }
                } else {
                    // Normal flow (not regenerating)
                    const sendForApprovalBtn = document.getElementById('sendForApprovalBtn');
                    if (sendForApprovalBtn) {
                        sendForApprovalBtn.style.display = 'inline-block';
                        sendForApprovalBtn.dataset.brandedImageUrl = data.branded_image_url;
                    }
                }
                
                showToast('Branding applied successfully', 'success');
            } else {
                // Clear loading indicator on error
                brandedPreview.innerHTML = `<div class="placeholder">Failed to apply branding</div>`;
                showToast(data.error || 'Failed to apply branding', 'error');
            }
        })
        .catch(error => {
            // Re-enable the button
            this.disabled = false;
            
            // Clear loading indicator on error
            brandedPreview.innerHTML = `<div class="placeholder">Error occurred</div>`;
            console.error('Error applying branding:', error);
            showToast('Error applying branding', 'error');
        });
    });

    // Update the resubmit button handler to ensure it sends valid JSON
    document.getElementById('resubmitRegeneratedBtn')?.addEventListener('click', function() {
        console.log('Resubmit button clicked');
        console.log('Button dataset:', this.dataset);
        
        const assetId = this.dataset.assetId;
        console.log('Asset ID:', assetId);
        
        if (!assetId) {
            showToast('No asset to resubmit', 'error');
            return;
        }
        
        this.disabled = true;
        showToast('Resubmitting asset...', 'info');
        
        // Check if we have a branded image to use
        const brandedImageUrl = this.dataset.brandedImageUrl;
        console.log('Branded image URL:', brandedImageUrl);
        
        // Prepare the request data
        const requestData = {
            branded_image_url: brandedImageUrl || null
        };
        
        console.log('Sending request with data:', requestData);
        
        // Proceed with resubmission
        fetch(`/api/assets/${assetId}/resubmit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => {
                    console.error('Error response:', text);
                    throw new Error(`Server error: ${response.status} ${response.statusText}`);
                });
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                showToast('Asset resubmitted successfully', 'success');
                // Redirect to My Approvals page after a delay
                setTimeout(() => {
                    window.location.href = '/my-approvals';
                }, 1500);
            } else {
                throw new Error(data.error || 'Failed to resubmit asset');
            }
        })
        .catch(error => {
            this.disabled = false;
            console.error('Error resubmitting asset:', error);
            showToast('Error resubmitting asset: ' + error.message, 'error');
        });
    });

    // Function to display the branded image in a modal
    function showBrandedImageModal(imageUrl) {
        // Create modal if it doesn't exist
        let modal = document.getElementById('brandedImageModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'brandedImageModal';
            modal.className = 'modal';
            
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Branded Image</h3>
                        <button class="close-modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <img id="brandedImage" src="" alt="Branded Image">
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-primary" id="saveBrandedImageBtn">Save to Library</button>
                        <button class="btn btn-secondary" id="downloadBrandedImageBtn">Download</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Add event listeners for the modal
            modal.querySelector('.close-modal').addEventListener('click', function() {
                modal.classList.remove('show');
            });
            
            modal.querySelector('#saveBrandedImageBtn').addEventListener('click', function() {
                saveToLibrary(document.getElementById('brandedImage').src, 'Branded image');
            });
            
            modal.querySelector('#downloadBrandedImageBtn').addEventListener('click', function() {
                downloadImage(document.getElementById('brandedImage').src, 'branded_image.png');
            });
        }
        
        // Set the image source and show the modal
        document.getElementById('brandedImage').src = imageUrl;
        modal.classList.add('show');
    }

    // Update the sendForApprovalBtn click handler to not redirect
    document.getElementById('sendForApprovalBtn')?.addEventListener('click', function() {
        console.log("Send for approval button clicked");
        
        // Get the branded image URL from the data attribute
        const brandedImageUrl = this.dataset.brandedImageUrl;
        console.log("Branded image URL:", brandedImageUrl);
        
        if (!brandedImageUrl) {
            // Fall back to the current image in the branded preview
            const brandedImage = document.querySelector('#brandedImagePreview img');
            if (brandedImage && brandedImage.src) {
                console.log("Using branded image from preview:", brandedImage.src);
                this.dataset.brandedImageUrl = brandedImage.src;
            } else {
                showToast('No branded image to submit', 'error');
                return;
            }
        }
        
        // Get prompt text to use as image name
        const promptText = document.getElementById('imagePrompt').value;
        const imageName = promptText.length > 50 
            ? promptText.substring(0, 50) + '...' 
            : promptText || 'Branded Asset';
        
        // Show loading state
        showToast('Submitting branded image for approval...', 'info');
        this.disabled = true;
        
        fetch('/api/submit_for_approval', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                image_path: this.dataset.brandedImageUrl,
                image_name: imageName
            })
        })
        .then(response => response.json())
        .then(data => {
            this.disabled = false;
            if (data.success) {
                showToast('Image submitted for approval successfully', 'success');
                // Optionally hide the button after submission
                this.style.display = 'none';
                
                // Remove the redirect - just stay on the current page
                // Add more feedback to the user
                const brandedPreview = document.getElementById('brandedImagePreview');
                if (brandedPreview) {
                    // Add a success message over the preview
                    const overlay = document.createElement('div');
                    overlay.className = 'success-overlay';
                    overlay.innerHTML = `
                        <div class="success-message">
                            <i class="fas fa-check-circle"></i>
                            <p>Submitted for approval</p>
                        </div>
                    `;
                    brandedPreview.appendChild(overlay);
                }
            } else {
                showToast(data.error || 'Failed to submit image for approval', 'error');
            }
        })
        .catch(error => {
            this.disabled = false;
            console.error('Error submitting for approval:', error);
            showToast('Error submitting image for approval', 'error');
        });
    });
}); 