// Campaign and Adset Selector functionality
document.addEventListener('DOMContentLoaded', () => {
    // Cache DOM elements
    const operationType = document.getElementById('operationType');
    const platformCheckboxes = document.querySelectorAll('input[name="platforms"]');
    const templateSection = document.querySelector('.form-group:has(#template)');
    const metaAdvertiserId = document.getElementById('metaAdvertiserId');
    const tiktokAdvertiserId = document.getElementById('tiktokAdvertiserId');
    const creativeSection = document.querySelector('.form-group:has(#selectFromLibraryBtn)');
    const submitButton = document.getElementById('submitBtn');
    
    // Hide template section initially
    if (templateSection) {
        templateSection.style.display = 'none';
    }
    
    // Hide creative section initially
    if (creativeSection) {
        creativeSection.style.display = 'none';
    }
    
    // Hide submit button initially
    if (submitButton) {
        submitButton.style.display = 'none';
    }
    
    // Create campaign/adset selector container
    const campaignSelectorContainer = document.createElement('div');
    campaignSelectorContainer.id = 'campaignSelectorContainer';
    campaignSelectorContainer.className = 'form-group campaign-selector-container';
    campaignSelectorContainer.style.display = 'none';
    
    // Insert after advertiser account sections
    const tiktokAccountSection = document.getElementById('tiktokAccountSection');
    tiktokAccountSection.parentNode.insertBefore(campaignSelectorContainer, tiktokAccountSection.nextSibling);
    
    // Function to update visibility based on operation type
    function updateSelectorVisibility() {
        const operation = operationType.value;
        const metaSelected = document.querySelector('input[name="platforms"][value="meta"]')?.checked;
        const tiktokSelected = document.querySelector('input[name="platforms"][value="tiktok"]')?.checked;
        
        // Hide template section for operation type 1 (create ads in existing campaign/adset)
        if (operation === '1') {
            templateSection.style.display = 'none';
            
            // Show campaign selector if we have selected platforms and advertiser accounts
            const metaReady = !metaSelected || (metaSelected && metaAdvertiserId.value);
            const tiktokReady = !tiktokSelected || (tiktokSelected && tiktokAdvertiserId.value);
            
            if ((metaSelected || tiktokSelected) && metaReady && tiktokReady) {
                // Show the campaign selector
                campaignSelectorContainer.style.display = 'block';
                loadCampaignsAndAdsets();
                
                // Get the creative section
                const creativeSection = document.querySelector('.form-group:has(#selectFromLibraryBtn)');
                if (creativeSection) {
                    // Show the creative section
                    creativeSection.style.display = 'block';
                    
                    // Move it to the end (after adset selection)
                    const form = document.getElementById('campaignForm');
                    if (form) {
                        // Move creative section to the end of the form, before the submit button
                        const submitBtn = document.getElementById('submitBtn');
                        if (submitBtn) {
                            form.insertBefore(creativeSection, submitBtn);
                        } else {
                            form.appendChild(creativeSection);
                        }
                    }
                }
                
                // Always hide adgroups section for operation type 1
                const adgroupsSection = document.getElementById('adgroupsSection');
                if (adgroupsSection) {
                    adgroupsSection.style.display = 'none';
                }
                
                // Hide connector if it exists
                const connector = document.getElementById('dragConnector');
                if (connector) {
                    connector.style.display = 'none';
                }
            } else {
                campaignSelectorContainer.style.display = 'none';
            }
        } else if (operation === '2' || operation === '3') {
            // For other operation types, show template and hide campaign selector
            templateSection.style.display = 'block';
            campaignSelectorContainer.style.display = 'none';
            
            // Show adgroups section for operation type 3
            const adgroupsSection = document.getElementById('adgroupsSection');
            const connector = document.getElementById('dragConnector');
            
            if (operation === '3' && adgroupsSection) {
                // Only show if we have assets
                const uploadPreview = document.getElementById('uploadPreview');
                if (uploadPreview && uploadPreview.childElementCount > 0) {
                    adgroupsSection.style.display = 'block';
                    if (connector) connector.style.display = 'flex';
                }
            } else if (adgroupsSection) {
                adgroupsSection.style.display = 'none';
                if (connector) connector.style.display = 'none';
            }
        } else {
            // If no operation type is selected, hide both
            templateSection.style.display = 'none';
            campaignSelectorContainer.style.display = 'none';
        }
    }
    
    // Function to load campaigns and adsets based on selected platforms and advertiser accounts
    function loadCampaignsAndAdsets() {
        campaignSelectorContainer.innerHTML = '<div class="loading">Loading campaigns and adsets...</div>';
        
        // Get selected platforms
        const metaSelected = document.querySelector('input[name="platforms"][value="meta"]')?.checked;
        const tiktokSelected = document.querySelector('input[name="platforms"][value="tiktok"]')?.checked;
        
        // Get selected account IDs
        let metaId = null;
        let tiktokId = null;
        
        // For operation type 1, we might have checkboxes instead of dropdowns
        if (document.body.getAttribute('data-operation') === '1') {
            // Try to get selected checkboxes
            const metaCheckbox = document.querySelector('input[name="metaAdvertiserId[]"]:checked');
            const tiktokCheckbox = document.querySelector('input[name="tiktokAdvertiserId[]"]:checked');
            
            metaId = metaCheckbox ? metaCheckbox.value : null;
            tiktokId = tiktokCheckbox ? tiktokCheckbox.value : null;
            
            console.log(`Operation 1 - Selected Meta ID: ${metaId}, TikTok ID: ${tiktokId}`);
        } else {
            // Regular dropdown selection
            metaId = metaSelected ? metaAdvertiserId.value : null;
            tiktokId = tiktokSelected ? tiktokAdvertiserId.value : null;
        }
        
        // Debug logging
        console.log(`Loading campaigns for Meta: ${metaId}, TikTok: ${tiktokId}`);
        
        // Prepare requests for selected platforms
        const requests = [];
        
        if (metaSelected && metaId) {
            requests.push(
                fetch(`/api/meta/campaigns?account_id=${metaId}`)
                    .then(response => response.json())
                    .then(data => ({ platform: 'meta', data }))
                    .catch(error => {
                        console.error(`Error fetching Meta campaigns: ${error}`);
                        return { platform: 'meta', data: { success: false, error: error.toString() } };
                    })
            );
        }
        
        if (tiktokSelected && tiktokId) {
            requests.push(
                fetch(`/api/tiktok/campaigns?advertiser_id=${tiktokId}`)
                    .then(response => response.json())
                    .then(data => ({ platform: 'tiktok', data }))
                    .catch(error => {
                        console.error(`Error fetching TikTok campaigns: ${error}`);
                        return { platform: 'tiktok', data: { success: false, error: error.toString() } };
                    })
            );
        }
        
        // Execute all requests
        Promise.all(requests)
            .then(results => {
                // Clear loading indicator
                campaignSelectorContainer.innerHTML = '';
                
                // Process results for each platform
                results.forEach(result => {
                    const { platform, data } = result;
                    
                    if (data.success && data.campaigns && data.campaigns.length > 0) {
                        // Create platform section
                        const platformSection = document.createElement('div');
                        platformSection.className = `platform-section ${platform}-campaigns`;
                        
                        // Add platform header
                        const platformHeader = document.createElement('h3');
                        platformHeader.textContent = platform === 'meta' ? 'Meta Campaigns' : 'TikTok Campaigns';
                        platformSection.appendChild(platformHeader);
                        
                        // Create campaign selector
                        const campaignSelector = document.createElement('div');
                        campaignSelector.className = 'campaign-selector';
                        
                        // Add campaigns
                        data.campaigns.forEach(campaign => {
                            const campaignItem = document.createElement('div');
                            campaignItem.className = 'campaign-item';
                            campaignItem.dataset.id = campaign.id;
                            campaignItem.dataset.platform = platform;
                            
                            // Campaign header with name and toggle button
                            const campaignHeader = document.createElement('div');
                            campaignHeader.className = 'campaign-header';
                            
                            const campaignName = document.createElement('div');
                            campaignName.className = 'campaign-name';
                            campaignName.textContent = campaign.name;
                            
                            const toggleButton = document.createElement('button');
                            toggleButton.type = 'button';
                            toggleButton.className = 'toggle-button';
                            toggleButton.innerHTML = '<i class="fas fa-chevron-down"></i>';
                            
                            campaignHeader.appendChild(campaignName);
                            campaignHeader.appendChild(toggleButton);
                            campaignItem.appendChild(campaignHeader);
                            
                            // Adsets container (initially hidden)
                            const adsetsContainer = document.createElement('div');
                            adsetsContainer.className = 'adsets-container';
                            adsetsContainer.style.display = 'none';
                            
                            // Add loading indicator for adsets
                            adsetsContainer.innerHTML = '<div class="loading">Loading adsets...</div>';
                            
                            campaignItem.appendChild(adsetsContainer);
                            
                            // Add click handler to toggle adsets visibility
                            toggleButton.addEventListener('click', () => {
                                const isVisible = adsetsContainer.style.display !== 'none';
                                
                                // Toggle visibility
                                adsetsContainer.style.display = isVisible ? 'none' : 'block';
                                toggleButton.innerHTML = isVisible ? 
                                    '<i class="fas fa-chevron-down"></i>' : 
                                    '<i class="fas fa-chevron-up"></i>';
                                
                                // Load adsets if not already loaded
                                if (!isVisible && adsetsContainer.querySelector('.loading')) {
                                    loadAdsets(platform, campaign.id, adsetsContainer, platform === 'meta' ? metaId : tiktokId);
                                }
                            });
                            
                            campaignSelector.appendChild(campaignItem);
                        });
                        
                        platformSection.appendChild(campaignSelector);
                        campaignSelectorContainer.appendChild(platformSection);
                    } else {
                        // No campaigns found or error
                        const errorMessage = data.error || 'No campaigns found';
                        const noCampaignsMsg = document.createElement('div');
                        noCampaignsMsg.className = data.success ? 'no-campaigns' : 'error';
                        noCampaignsMsg.innerHTML = `<i class="fas fa-${data.success ? 'info-circle' : 'exclamation-circle'}"></i> ${platform.charAt(0).toUpperCase() + platform.slice(1)}: ${errorMessage}`;
                        campaignSelectorContainer.appendChild(noCampaignsMsg);
                    }
                });
                
                // If no results at all
                if (results.length === 0) {
                    campaignSelectorContainer.innerHTML = '<div class="no-campaigns">No campaigns found. Please select a platform and advertiser account.</div>';
                }
                
                // For Operation Type 1, make sure the campaigns are moved to the correct column
                if (document.body.getAttribute('data-operation') === '1') {
                    setTimeout(() => {
                        if (typeof moveElementsToColumns === 'function') {
                            moveElementsToColumns();
                        }
                    }, 100);
                }
            })
            .catch(error => {
                console.error('Error loading campaigns:', error);
                campaignSelectorContainer.innerHTML = `<div class="error"><i class="fas fa-exclamation-circle"></i> Error loading campaigns: ${error.message}</div>`;
            });
    }
    
    // Function to load adsets for a campaign
    function loadAdsets(platform, campaignId, container, accountId) {
        console.log(`Loading adsets for ${platform} campaign: ${campaignId}`);
        container.innerHTML = '<div class="loading">Loading adsets...</div>';
        
        // Make the API request with both IDs
        fetch(`/api/${platform}/adsets?campaign_id=${campaignId}&${platform === 'meta' ? 'account_id' : 'advertiser_id'}=${accountId}`)
            .then(response => response.json())
            .then(data => {
                if (data.success && data.adsets && data.adsets.length > 0) {
                    // Clear loading indicator
                    container.innerHTML = '';
                    
                    // Create adset list
                    const adsetList = document.createElement('div');
                    adsetList.className = 'adset-list';
                    
                    // Filter and sort adsets
                    const filteredAdsets = data.adsets;
                    
                    // Create adset items
                    filteredAdsets.forEach(adset => {
                        const adsetItem = document.createElement('div');
                        adsetItem.className = 'adset-item';
                        adsetItem.dataset.adsetId = adset.id;
                        adsetItem.dataset.platform = platform;
                        adsetItem.dataset.campaignId = campaignId;
                        adsetItem.dataset.adsetName = adset.name;
                        adsetItem.dataset.adsetStatus = adset.status;
                        
                        // Adset header with checkbox and name
                        const adsetHeader = document.createElement('div');
                        adsetHeader.className = 'adset-header';
                        
                        // Add a checkbox for selection
                        const checkbox = document.createElement('input');
                        checkbox.type = 'checkbox';
                        checkbox.className = 'adset-checkbox';
                        checkbox.id = `adset_${platform}_${adset.id}`;
                        
                        // Add label for the checkbox
                        const adsetName = document.createElement('label');
                        adsetName.className = 'adset-name';
                        adsetName.textContent = adset.name;
                        adsetName.htmlFor = checkbox.id;
                        
                        adsetHeader.appendChild(checkbox);
                        adsetHeader.appendChild(adsetName);
                        adsetItem.appendChild(adsetHeader);
                        
                        // Add status badge
                        const statusBadge = document.createElement('div');
                        statusBadge.className = `status-badge status-${adset.status.toLowerCase()}`;
                        statusBadge.textContent = adset.status;
                        adsetItem.appendChild(statusBadge);
                        
                        // Add click handler to the checkbox
                        checkbox.addEventListener('change', function() {
                            console.log(`Checkbox for adset: ${adset.id} (${adset.name}) changed to ${this.checked}`);
                            
                            if (this.checked) {
                                // Select the adset
                                adsetItem.classList.add('selected');
                                
                                // Add hidden input for form submission
                                const input = document.createElement('input');
                                input.type = 'hidden';
                                input.name = `selected_adsets[${platform}][]`;
                                input.value = adset.id;
                                adsetItem.appendChild(input);
                                
                                // Call select function
                                window.selectAdset(platform, campaignId, adset.id, adset.name, adset.status);
                            } else {
                                // Deselect the adset
                                adsetItem.classList.remove('selected');
                                
                                // Remove hidden input if exists
                                const input = adsetItem.querySelector(`input[name="selected_adsets[${platform}][]"]`);
                                if (input) input.remove();
                                
                                // Call deselect function
                                window.deselectAdset(platform, adset.id);
                            }
                            
                            // Force update creative section visibility
                            updateCreativeSectionVisibility();
                        });
                        
                        adsetList.appendChild(adsetItem);
                    });
                    
                    container.appendChild(adsetList);
                    
                    // Force update creative section visibility
                    setTimeout(updateCreativeSectionVisibility, 100);
                } else {
                    // No adsets found
                    container.innerHTML = '<div class="no-adsets">No adsets found in this campaign.</div>';
                }
            })
            .catch(error => {
                console.error('Error loading adsets:', error);
                container.innerHTML = '<div class="error">Error loading adsets. Please try again.</div>';
            });
    }
    
    // Function to create or update adset drop zone
    function createOrUpdateAdsetDropZone(platform, campaignId, adsetId, adsetName) {
        // Check if drop zones container exists, create if not
        let dropZonesContainer = document.getElementById('adsetDropZonesContainer');
        if (!dropZonesContainer) {
            dropZonesContainer = document.createElement('div');
            dropZonesContainer.id = 'adsetDropZonesContainer';
            dropZonesContainer.className = 'adset-drop-zones-container';
            
            // Add header
            const header = document.createElement('h3');
            header.textContent = 'Assign Assets to Selected Adsets';
            dropZonesContainer.appendChild(header);
            
            // Add instructions
            const instructions = document.createElement('div');
            instructions.className = 'drop-instructions';
            instructions.innerHTML = '<i class="fas fa-info-circle"></i> Drag assets from the library to the adsets below. Each adset must have at least one asset.';
            dropZonesContainer.appendChild(instructions);
            
            // Add to page after campaign selector
            const campaignSelector = document.getElementById('campaignSelectorContainer');
            campaignSelector.parentNode.insertBefore(dropZonesContainer, campaignSelector.nextSibling);
        }
        
        // Check if drop zone for this adset already exists
        const dropZoneId = `dropZone_${platform}_${adsetId}`;
        let dropZone = document.getElementById(dropZoneId);
        
        if (!dropZone) {
            // Create new drop zone
            dropZone = document.createElement('div');
            dropZone.id = dropZoneId;
            dropZone.className = 'adset-drop-zone';
            dropZone.dataset.platform = platform;
            dropZone.dataset.campaignId = campaignId;
            dropZone.dataset.adsetId = adsetId;
            
            // Add header with adset name
            const dropZoneHeader = document.createElement('div');
            dropZoneHeader.className = 'drop-zone-header';
            dropZoneHeader.innerHTML = `
                <span class="platform-badge platform-${platform}">${platform}</span>
                <span class="drop-zone-name">${adsetName}</span>
            `;
            
            // Add ad name input
            const adNameContainer = document.createElement('div');
            adNameContainer.className = 'ad-name-container';
            
            const adNameLabel = document.createElement('label');
            adNameLabel.textContent = 'Ad Name:';
            adNameLabel.htmlFor = `ad_name_${platform}_${adsetId}`;
            
            const adNameInput = document.createElement('input');
            adNameInput.type = 'text';
            adNameInput.id = `ad_name_${platform}_${adsetId}`;
            adNameInput.name = `ad_names[${platform}][${adsetId}]`;
            adNameInput.className = 'form-control ad-name-input';
            adNameInput.placeholder = 'Enter ad name';
            adNameInput.required = true;
            
            adNameContainer.appendChild(adNameLabel);
            adNameContainer.appendChild(adNameInput);
            
            // Create assets container (the actual drop zone)
            const assetsContainer = document.createElement('div');
            assetsContainer.className = 'assets-container';
            assetsContainer.innerHTML = '<div class="drop-placeholder">Drag assets here <i class="fas fa-arrow-down"></i></div>';
            
            // Set up drop zone event handlers
            assetsContainer.addEventListener('dragover', (e) => {
                e.preventDefault();
                assetsContainer.classList.add('drag-over');
            });
            
            assetsContainer.addEventListener('dragleave', () => {
                assetsContainer.classList.remove('drag-over');
            });
            
            assetsContainer.addEventListener('drop', (e) => {
                e.preventDefault();
                assetsContainer.classList.remove('drag-over');
                
                // Get the asset ID being dropped
                const assetId = e.dataTransfer.getData('text/plain');
                if (!assetId) return;
                
                // Move the asset to this adset
                moveAssetToAdset(assetId, platform, adsetId, assetsContainer);
            });
            
            // Assemble drop zone
            dropZone.appendChild(dropZoneHeader);
            dropZone.appendChild(adNameContainer);
            dropZone.appendChild(assetsContainer);
            
            // Add to container
            dropZonesContainer.appendChild(dropZone);
        }
        
        // Show the drop zones container
        dropZonesContainer.style.display = 'block';
    }
    
    // Function to remove adset drop zone
    function removeAdsetDropZone(platform, adsetId) {
        const dropZoneId = `dropZone_${platform}_${adsetId}`;
        const dropZone = document.getElementById(dropZoneId);
        
        if (dropZone) {
            // Move any assets back to the library
            const assetElements = dropZone.querySelectorAll('.mini-asset');
            assetElements.forEach(assetElem => {
                const assetId = assetElem.dataset.assetId;
                moveAssetFromAdset(assetId, platform, adsetId);
            });
            
            // Remove the drop zone
            dropZone.parentNode.removeChild(dropZone);
            
            // Hide container if no drop zones left
            const dropZonesContainer = document.getElementById('adsetDropZonesContainer');
            if (dropZonesContainer && !dropZonesContainer.querySelector('.adset-drop-zone')) {
                dropZonesContainer.style.display = 'none';
            }
        }
    }
    
    // Function to move asset to adset
    function moveAssetToAdset(assetId, platform, adsetId, container) {
        // Get the asset element
        const assetElem = document.querySelector(`.preview-item[data-id="${assetId}"]`);
        if (!assetElem) return;
        
        // Check if the asset is already in an adset
        const existingAdAsset = document.querySelector(`.mini-asset[data-asset-id="${assetId}"]`);
        if (existingAdAsset) {
            // Remove from current adset
            const currentPlatform = existingAdAsset.closest('.adset-drop-zone').dataset.platform;
            const currentAdsetId = existingAdAsset.closest('.adset-drop-zone').dataset.adsetId;
            moveAssetFromAdset(assetId, currentPlatform, currentAdsetId);
        }
        
        // Get the assets container
        if (!container) {
            const dropZoneId = `dropZone_${platform}_${adsetId}`;
            const dropZone = document.getElementById(dropZoneId);
            if (!dropZone) return;
            container = dropZone.querySelector('.assets-container');
        }
        
        // Remove the placeholder if it exists
        const placeholder = container.querySelector('.drop-placeholder');
        if (placeholder) {
            container.removeChild(placeholder);
        }
        
        // Create a mini version of the asset for the adset
        const miniAsset = document.createElement('div');
        miniAsset.className = 'mini-asset';
        miniAsset.dataset.assetId = assetId;
        
        // Clone the asset content
        if (assetElem.querySelector('img')) {
            const img = document.createElement('img');
            img.src = assetElem.querySelector('img').src;
            miniAsset.appendChild(img);
        } else if (assetElem.querySelector('video')) {
            const video = document.createElement('video');
            video.src = assetElem.querySelector('video').src;
            video.muted = true;
            miniAsset.appendChild(video);
        }
        
        // Add remove button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'mini-remove-btn';
        removeBtn.innerHTML = '×';
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            moveAssetFromAdset(assetId, platform, adsetId);
        });
        
        miniAsset.appendChild(removeBtn);
        container.appendChild(miniAsset);
        
        // Mark the asset as assigned
        assetElem.classList.add('assigned');
        
        // Add a hidden input to track the assignment
        const hiddenInput = document.createElement('input');
        hiddenInput.type = 'hidden';
        hiddenInput.name = `asset_assignments[${platform}][${adsetId}][]`;
        hiddenInput.value = assetId;
        container.appendChild(hiddenInput);
        
        // Update submit button state
        updateSubmitButtonState();
    }
    
    // Function to move asset from adset back to the library
    function moveAssetFromAdset(assetId, platform, adsetId) {
        // Get the drop zone
        const dropZoneId = `dropZone_${platform}_${adsetId}`;
        const dropZone = document.getElementById(dropZoneId);
        if (!dropZone) return;
        
        // Get the assets container
        const assetsContainer = dropZone.querySelector('.assets-container');
        
        // Get the mini asset
        const miniAsset = assetsContainer.querySelector(`.mini-asset[data-asset-id="${assetId}"]`);
        if (!miniAsset) return;
        
        // Remove the mini asset
        assetsContainer.removeChild(miniAsset);
        
        // Remove the hidden input
        const hiddenInput = assetsContainer.querySelector(`input[name="asset_assignments[${platform}][${adsetId}][]"][value="${assetId}"]`);
        if (hiddenInput) {
            assetsContainer.removeChild(hiddenInput);
        }
        
        // Add the placeholder if there are no more assets
        if (!assetsContainer.querySelector('.mini-asset')) {
            const placeholder = document.createElement('div');
            placeholder.className = 'drop-placeholder';
            placeholder.innerHTML = 'Drag assets here <i class="fas fa-arrow-down"></i>';
            assetsContainer.appendChild(placeholder);
        }
        
        // Check if the asset is assigned to any other adsets
        const otherAssignments = document.querySelectorAll(`.mini-asset[data-asset-id="${assetId}"]`);
        if (otherAssignments.length === 0) {
            // If not assigned to any other adsets, mark as unassigned
            const assetElem = document.querySelector(`.preview-item[data-id="${assetId}"]`);
            if (assetElem) {
                assetElem.classList.remove('assigned');
            }
        }
        
        // Update submit button state
        updateSubmitButtonState();
    }
    
    // Function to update submit button state
    function updateSubmitButtonState() {
        const submitBtn = document.getElementById('submitBtn');
        if (!submitBtn) return;
        
        // For operation type 1, check if any adsets are selected and have assets
        if (operationType.value === '1') {
            const dropZones = document.querySelectorAll('.adset-drop-zone');
            let allDropZonesHaveAssets = true;
            
            dropZones.forEach(dropZone => {
                const assetsContainer = dropZone.querySelector('.assets-container');
                const hasAssets = assetsContainer.querySelector('.mini-asset') !== null;
                
                if (!hasAssets) {
                    allDropZonesHaveAssets = false;
                }
            });
            
            // Enable/disable submit button
            if (dropZones.length > 0 && allDropZonesHaveAssets) {
                submitBtn.disabled = false;
                submitBtn.title = '';
            } else if (dropZones.length === 0) {
                submitBtn.disabled = true;
                submitBtn.title = 'Please select at least one adset';
            } else {
                submitBtn.disabled = true;
                submitBtn.title = 'Please assign at least one asset to each selected adset';
            }
        }
    }
    
    // Add event listeners
    operationType.addEventListener('change', updateSelectorVisibility);
    platformCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateSelectorVisibility);
    });
    metaAdvertiserId.addEventListener('change', updateSelectorVisibility);
    tiktokAdvertiserId.addEventListener('change', updateSelectorVisibility);
    
    // Initial update
    updateSelectorVisibility();

    // Function to update creative section visibility
    function updateCreativeSectionVisibility() {
        const operationType = document.getElementById('operationType');
        const operation = operationType ? operationType.value : null;
        
        // Get the creative section
        const creativeSection = document.querySelector('.form-group:has(#selectFromLibraryBtn)') || 
                               document.querySelector('.form-group:has(.select-creatives-heading)');
        
        if (!creativeSection) return;
        
        // For operation type 1 (create ads in existing campaign/adset)
        // or operation type 3 (create new campaign, adset & ads)
        // we should show the creative section with a highlight
        if (operation === '1' || operation === '3') {
            console.log(`Ensuring creative section is visible for operation type ${operation}`);
            
            // Make sure the section is visible
            creativeSection.style.display = 'block';
            
            // Add the red box highlight if not already present
            if (!creativeSection.classList.contains('highlighted-section')) {
                creativeSection.classList.add('highlighted-section');
                creativeSection.style.border = '2px solid #dc3545';
                creativeSection.style.borderRadius = '8px';
                creativeSection.style.padding = '16px';
                creativeSection.style.marginBottom = '24px';
            }
            
            // Make sure we have the proper heading
            if (!creativeSection.querySelector('.select-creatives-heading')) {
                const heading = document.createElement('h4');
                heading.className = 'select-creatives-heading';
                heading.textContent = 'Select Creatives';
                heading.style.marginBottom = '16px';
                heading.style.fontWeight = '500';
                creativeSection.insertBefore(heading, creativeSection.firstChild);
            }
            
            // For operation type 1, make sure creative section appears before campaign selector
            if (operation === '1') {
                const platformSection = document.querySelector('.form-group:has(input[name="platforms"])');
                const campaignSection = document.getElementById('campaignSelectorContainer');
                
                if (platformSection && platformSection.nextSibling && campaignSection) {
                    // Move the creative section to appear right after the platform section
                    platformSection.parentNode.insertBefore(creativeSection, platformSection.nextSibling);
                }
            }
        } else {
            // For other operation types, remove highlight if present
            creativeSection.classList.remove('highlighted-section');
            creativeSection.style.border = '';
            creativeSection.style.borderRadius = '';
            creativeSection.style.padding = '';
        }
    }

    // Add this in your initialization code
    document.addEventListener('DOMContentLoaded', function() {
        // ... existing code ...
        
        // Get operation type element
        const operationType = document.getElementById('operationType');
        if (operationType) {
            // Update creative section visibility on page load
            updateCreativeSectionVisibility();
            
            // Update when operation type changes
            operationType.addEventListener('change', function() {
                setTimeout(updateCreativeSectionVisibility, 500);
            });
        }
        
        // ... existing code ...
    });

    // Function to select an adset
    window.selectAdset = function(platform, campaignId, adsetId, adsetName, adsetStatus) {
        console.log(`Selecting adset: ${adsetId} (${adsetName}) from ${platform}`);
        
        // Find the adset element
        const adsetItem = document.querySelector(`.adset-item[data-platform="${platform}"][data-adset-id="${adsetId}"]`);
        if (!adsetItem) return;
        
        // Mark as selected
        adsetItem.classList.add('selected');
        
        // Create a hidden input to include this adset in the form submission
        const hiddenInput = document.createElement('input');
        hiddenInput.type = 'hidden';
        hiddenInput.name = `selected_adsets[${platform}][]`;
        hiddenInput.value = adsetId;
        hiddenInput.dataset.platform = platform;
        hiddenInput.dataset.adsetId = adsetId;
        adsetItem.appendChild(hiddenInput);
        
        // Create drop zone for this adset if it doesn't exist
        createDropZone(platform, campaignId, adsetId, adsetName, adsetStatus);
        
        // Update creative section visibility
        updateCreativeSectionVisibility();
    };
    
    // Function to deselect an adset
    window.deselectAdset = function(platform, adsetId) {
        console.log(`Deselecting adset: ${adsetId} from ${platform}`);
        
        // Find the adset element
        const adsetItem = document.querySelector(`.adset-item[data-platform="${platform}"][data-adset-id="${adsetId}"]`);
        if (!adsetItem) return;
        
        // Remove selected class
        adsetItem.classList.remove('selected');
        
        // Remove hidden input
        const hiddenInput = adsetItem.querySelector(`input[name="selected_adsets[${platform}][]"][value="${adsetId}"]`);
        if (hiddenInput) {
            adsetItem.removeChild(hiddenInput);
        }
        
        // Remove drop zone
        const dropZoneId = `dropZone_${platform}_${adsetId}`;
        const dropZone = document.getElementById(dropZoneId);
        if (dropZone) {
            // Move any assets back to the preview
            const miniAssets = dropZone.querySelectorAll('.mini-asset');
            miniAssets.forEach(miniAsset => {
                const assetId = miniAsset.dataset.assetId;
                moveAssetFromAd(assetId, platform, adsetId);
            });
            
            // Remove the drop zone
            dropZone.parentNode.removeChild(dropZone);
        }
        
        // Update creative section visibility
        updateCreativeSectionVisibility();
    };

    // Update the form submission handler to collect data from all selected platforms
    document.getElementById('campaignForm').addEventListener('submit', function(e) {
        // Get all selected adsets across all platforms
        const selectedAdsets = document.querySelectorAll('.adset-item.selected');
        
        if (selectedAdsets.length === 0) {
            e.preventDefault();
            showToast('Please select at least one adset', 'error');
            return false;
        }
        
        // Check if all selected adsets have assets assigned
        let allAdsetsHaveAssets = true;
        
        selectedAdsets.forEach(adset => {
            const adsetId = adset.dataset.adsetId;
            const platform = adset.dataset.platform;
            const dropZoneId = `dropZone_${platform}_${adsetId}`;
            const dropZone = document.getElementById(dropZoneId);
            
            if (dropZone) {
                const assetsContainer = dropZone.querySelector('.assets-container');
                const hasAssets = assetsContainer.querySelector('.mini-asset') !== null;
                
                if (!hasAssets) {
                    allAdsetsHaveAssets = false;
                }
            }
        });
        
        if (!allAdsetsHaveAssets) {
            e.preventDefault();
            showToast('Please assign at least one asset to each selected adset', 'error');
            return false;
        }
        
        // Form is valid, continue with submission
        return true;
    });

    // Add this function to check the existing implementation
    function checkExistingImplementation() {
        console.log('Checking existing implementation for asset library');
        
        // Try to find the existing asset library modal
        const existingModal = document.querySelector('.modal:not(#assetLibraryModal)');
        if (existingModal) {
            console.log('Found existing modal:', existingModal);
            
            // Clone the existing modal
            const clonedModal = existingModal.cloneNode(true);
            clonedModal.id = 'assetLibraryModal';
            
            // Replace our modal with the cloned one
            const ourModal = document.getElementById('assetLibraryModal');
            if (ourModal) {
                ourModal.parentNode.replaceChild(clonedModal, ourModal);
            } else {
                document.body.appendChild(clonedModal);
            }
            
            // Add our event listeners to the cloned modal
            const closeButtons = clonedModal.querySelectorAll('.close-modal');
            closeButtons.forEach(button => {
                button.addEventListener('click', () => {
                    clonedModal.style.display = 'none';
                });
            });
            
            // Add event listener for the select assets button
            const selectBtn = clonedModal.querySelector('#selectAssetsBtn');
            if (selectBtn) {
                selectBtn.addEventListener('click', () => {
                    // Get selected assets from the library
                    const selectedAssets = clonedModal.querySelectorAll('.library-asset.selected');
                    console.log(`Selected ${selectedAssets.length} assets`);
                    
                    if (selectedAssets.length === 0) {
                        // Show error message if no assets are selected
                        alert('Please select at least one asset');
                        return;
                    }
                    
                    // Add them to the upload preview
                    selectedAssets.forEach(asset => {
                        // Create a preview item for each selected asset
                        const assetId = asset.dataset.id;
                        const assetType = asset.dataset.type;
                        const assetUrl = asset.dataset.url;
                        const assetName = asset.dataset.name;
                        
                        console.log(`Adding asset to preview: ${assetId} (${assetName})`);
                        
                        // Add to the upload preview if not already there
                        if (!document.querySelector(`.preview-item[data-id="${assetId}"]`)) {
                            addAssetToPreview(assetId, assetType, assetUrl, assetName);
                        }
                    });
                    
                    // Close the modal
                    const modal = document.getElementById('assetLibraryModal');
                    if (modal) modal.style.display = 'none';
                });
            }
            
            return clonedModal;
        }
        
        return null;
    }

    // Update the initAssetLibraryModal function to try using the existing implementation first
    function initAssetLibraryModal() {
        // Try to use the existing implementation
        const existingModal = checkExistingImplementation();
        if (existingModal) {
            console.log('Using existing asset library modal implementation');
            return existingModal;
        }
        
        // If no existing implementation, create our own
        console.log('Creating new asset library modal');
        
        // Check if the modal already exists
        let modal = document.getElementById('assetLibraryModal');
        
        if (!modal) {
            // Create the modal
            modal = document.createElement('div');
            modal.id = 'assetLibraryModal';
            modal.className = 'modal';
            
            modal.innerHTML = `
                <div class="modal-content library-modal">
                    <div class="modal-header">
                        <h3>Select from Asset Library</h3>
                        <button class="close-modal"><i class="fas fa-times"></i></button>
                    </div>
                    <div class="modal-body">
                        <div class="library-filters">
                            <select id="libraryTypeFilter" class="form-control">
                                <option value="all">All Types</option>
                                <option value="image">Images</option>
                                <option value="video">Videos</option>
                            </select>
                            <div class="search-bar">
                                <i class="fas fa-search"></i>
                                <input type="text" id="librarySearch" placeholder="Search assets..." class="form-control">
                            </div>
                        </div>
                        <div id="libraryAssets" class="library-assets-grid">
                            <!-- Assets will be loaded here via JavaScript -->
                            <div class="loading">Loading assets...</div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary close-modal">Cancel</button>
                        <button class="btn btn-primary" id="selectAssetsBtn">Add Selected Assets</button>
                    </div>
                </div>
            `;
            
            // Add the modal to the document
            document.body.appendChild(modal);
            
            // Add event listeners for the modal
            const closeButtons = modal.querySelectorAll('.close-modal');
            closeButtons.forEach(button => {
                button.addEventListener('click', () => {
                    modal.style.display = 'none';
                });
            });
            
            // Close modal when clicking outside
            window.addEventListener('click', (event) => {
                if (event.target === modal) {
                    modal.style.display = 'none';
                }
            });
            
            // Update the event listener for the select assets button
            document.getElementById('selectAssetsBtn').addEventListener('click', () => {
                // Get selected assets from the library
                const selectedAssets = document.querySelectorAll('#libraryAssets .library-asset.selected');
                console.log(`Selected ${selectedAssets.length} assets`);
                
                if (selectedAssets.length === 0) {
                    // Show error message if no assets are selected
                    alert('Please select at least one asset');
                    return;
                }
                
                // Add them to the upload preview
                selectedAssets.forEach(asset => {
                    // Create a preview item for each selected asset
                    const assetId = asset.dataset.id;
                    const assetType = asset.dataset.type;
                    const assetUrl = asset.dataset.url;
                    const assetName = asset.dataset.name;
                    
                    console.log(`Adding asset to preview: ${assetId} (${assetName})`);
                    
                    // Add to the upload preview if not already there
                    if (!document.querySelector(`.preview-item[data-id="${assetId}"]`)) {
                        addAssetToPreview(assetId, assetType, assetUrl, assetName);
                    }
                });
                
                // Close the modal
                const modal = document.getElementById('assetLibraryModal');
                if (modal) modal.style.display = 'none';
            });
        }
        
        // Load assets when the modal is initialized
        loadAssetsFromLibrary();
        
        return modal;
    }

    // Call this function when the page loads
    initAssetLibraryModal();

    // Function to load assets from the library
    function loadAssetsFromLibrary() {
        const libraryAssets = document.getElementById('libraryAssets');
        if (!libraryAssets) return;
        
        // Show loading indicator
        libraryAssets.innerHTML = '<div class="loading">Loading assets...</div>';
        
        // Try to determine the correct API endpoint
        // First, check if we can find it from existing code
        let apiEndpoint = '/api/media_library';
        
        // Look for any existing fetch calls to a media library endpoint in the page
        const scripts = document.querySelectorAll('script');
        for (const script of scripts) {
            if (script.textContent.includes('fetch') && script.textContent.includes('media')) {
                const match = script.textContent.match(/fetch\(['"]([^'"]*media[^'"]*)['"]\)/);
                if (match && match[1]) {
                    apiEndpoint = match[1];
                    console.log('Found existing media library endpoint:', apiEndpoint);
                    break;
                }
            }
        }
        
        // If we couldn't find it, try some common endpoints
        const possibleEndpoints = [
            '/api/media_library',
            '/api/media',
            '/api/assets',
            '/api/library',
            '/api/asset_library',
            '/api/get_media_library'
        ];
        
        // Function to try each endpoint
        function tryEndpoint(index) {
            if (index >= possibleEndpoints.length) {
                // We've tried all endpoints, show error
                libraryAssets.innerHTML = `
                    <div class="error">
                        Could not find the media library API endpoint. 
                        <p>Please add a media library API endpoint to your backend at one of these paths:</p>
                        <ul>
                            ${possibleEndpoints.map(ep => `<li>${ep}</li>`).join('')}
                        </ul>
                    </div>
                `;
                return;
            }
            
            const endpoint = possibleEndpoints[index];
            console.log(`Trying media library endpoint: ${endpoint}`);
            
            fetch(endpoint)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! Status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    console.log('Media library response:', data);
                    
                    if (data && (data.assets || data.media || data.items)) {
                        // Found a working endpoint!
                        apiEndpoint = endpoint;
                        console.log('Found working media library endpoint:', apiEndpoint);
                        
                        // Process the assets
                        const assets = data.assets || data.media || data.items || [];
                        
                        if (assets.length > 0) {
                            // Clear loading indicator
                            libraryAssets.innerHTML = '';
                            
                            // Add assets to the library
                            assets.forEach(asset => {
                                const assetElement = document.createElement('div');
                                assetElement.className = 'library-asset';
                                assetElement.dataset.id = asset.id;
                                assetElement.dataset.type = asset.type || 'image';
                                assetElement.dataset.url = asset.url || asset.file_path || asset.path;
                                assetElement.dataset.name = asset.name || asset.title || asset.id;
                                
                                // Create asset content based on type
                                if (asset.type === 'video') {
                                    assetElement.innerHTML = `
                                        <div class="asset-content">
                                            <video src="${asset.url || asset.file_path || asset.path}" muted loop></video>
                                            <div class="video-overlay">
                                                <i class="fas fa-play"></i>
                                            </div>
                                        </div>
                                        <div class="asset-info">
                                            <span class="asset-name">${asset.name || asset.title || asset.id}</span>
                                            <span class="asset-type">Video</span>
                                        </div>
                                        <div class="asset-select">
                                            <i class="fas fa-check-circle"></i>
                                        </div>
                                    `;
                                } else {
                                    // Default to image
                                    assetElement.innerHTML = `
                                        <div class="asset-content">
                                            <img src="${asset.url || asset.file_path || asset.path}" alt="${asset.name || asset.title || 'Image'}">
                                        </div>
                                        <div class="asset-info">
                                            <span class="asset-name">${asset.name || asset.title || asset.id}</span>
                                            <span class="asset-type">Image</span>
                                        </div>
                                        <div class="asset-select">
                                            <i class="fas fa-check-circle"></i>
                                        </div>
                                    `;
                                }
                                
                                // Add click event to select/deselect
                                assetElement.addEventListener('click', function() {
                                    console.log(`Clicked on asset: ${this.dataset.id}`);
                                    
                                    // Toggle selected class
                                    this.classList.toggle('selected');
                                    
                                    // Log the current selection state
                                    console.log(`Asset ${this.dataset.id} selected: ${this.classList.contains('selected')}`);
                                    
                                    // Make the selection more visible
                                    if (this.classList.contains('selected')) {
                                        // Add a visible checkmark or highlight
                                        const selectIcon = this.querySelector('.asset-select');
                                        if (selectIcon) selectIcon.style.opacity = '1';
                                    } else {
                                        // Remove the visible checkmark or highlight
                                        const selectIcon = this.querySelector('.asset-select');
                                        if (selectIcon) selectIcon.style.opacity = '0';
                                    }
                                });
                                
                                // Add to library
                                libraryAssets.appendChild(assetElement);
                            });
                        } else {
                            libraryAssets.innerHTML = '<div class="no-assets">No assets found in the library.</div>';
                        }
                    } else {
                        // This endpoint didn't work, try the next one
                        tryEndpoint(index + 1);
                    }
                })
                .catch(error => {
                    console.error(`Error with endpoint ${endpoint}:`, error);
                    // Try the next endpoint
                    tryEndpoint(index + 1);
                });
        }
        
        // Start trying endpoints
        tryEndpoint(0);

        // After adding all assets to the library
        updateAssetClickHandlers();
    }

    // Function to add an asset to the preview
    function addAssetToPreview(assetId, assetType, assetUrl, assetName) {
        // Get the upload preview container
        const uploadPreview = document.getElementById('uploadPreview');
        if (!uploadPreview) return;
        
        // Create a preview item
        const previewItem = document.createElement('div');
        previewItem.className = 'preview-item';
        previewItem.dataset.id = assetId;
        previewItem.dataset.type = assetType;
        previewItem.draggable = true;
        
        // Add content based on asset type
        if (assetType === 'image') {
            previewItem.innerHTML = `
                <div class="asset-content">
                    <img src="${assetUrl}" alt="${assetName || 'Image'}">
                </div>
                <div class="asset-info">
                    <span class="asset-name">${assetName || assetId}</span>
                    <div class="assignment-status status-unassigned">
                        <i class="fas fa-exclamation-circle"></i> Not Assigned
                    </div>
                </div>
                <button class="remove-asset-btn" title="Remove asset">
                    <i class="fas fa-times"></i>
                </button>
                <input type="hidden" name="library_assets[]" value="${assetId}">
            `;
        } else if (assetType === 'video') {
            previewItem.innerHTML = `
                <div class="asset-content">
                    <video src="${assetUrl}" muted loop></video>
                    <div class="video-overlay">
                        <i class="fas fa-play"></i>
                    </div>
                </div>
                <div class="asset-info">
                    <span class="asset-name">${assetName || assetId}</span>
                    <div class="assignment-status status-unassigned">
                        <i class="fas fa-exclamation-circle"></i> Not Assigned
                    </div>
                </div>
                <button class="remove-asset-btn" title="Remove asset">
                    <i class="fas fa-times"></i>
                </button>
                <input type="hidden" name="library_assets[]" value="${assetId}">
            `;
        }
        
        // Add drag event listeners
        previewItem.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', assetId);
            previewItem.classList.add('dragging');
        });
        
        previewItem.addEventListener('dragend', () => {
            previewItem.classList.remove('dragging');
        });
        
        // Add remove button event listener
        const removeBtn = previewItem.querySelector('.remove-asset-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                // Remove from preview
                uploadPreview.removeChild(previewItem);
                
                // Remove from any adsets it's assigned to
                const assignedAdsets = document.querySelectorAll(`.mini-asset[data-asset-id="${assetId}"]`);
                assignedAdsets.forEach(miniAsset => {
                    const adsetId = miniAsset.closest('.adset-drop-zone').dataset.adsetId;
                    const platform = miniAsset.closest('.adset-drop-zone').dataset.platform;
                    moveAssetFromAd(assetId, platform, adsetId);
                });
            });
        }
        
        // Add to preview
        uploadPreview.appendChild(previewItem);
    }

    // Add this to the end of your loadCampaignsAndAdsets function
    function setupAdsetSelectionListeners() {
        // Find all adset items
        const adsetItems = document.querySelectorAll('.adset-item');
        
        // Add click event listeners
        adsetItems.forEach(item => {
            item.addEventListener('click', function() {
                const platform = this.dataset.platform;
                const campaignId = this.dataset.campaignId;
                const adsetId = this.dataset.adsetId;
                const adsetName = this.dataset.adsetName;
                const adsetStatus = this.dataset.adsetStatus;
                
                // Toggle selection
                if (this.classList.contains('selected')) {
                    deselectAdset(platform, adsetId);
                } else {
                    selectAdset(platform, campaignId, adsetId, adsetName, adsetStatus);
                }
                
                // Force update creative section visibility
                updateCreativeSectionVisibility();
            });
        });
    }

    // Call this at the end of rendering adsets
    setupAdsetSelectionListeners();

    // Also add this at the end of your DOMContentLoaded event
    setTimeout(updateCreativeSectionVisibility, 1000);

    // Add this right after the campaign selector container is created
    const debugButton = document.createElement('button');
    debugButton.type = 'button';
    debugButton.textContent = 'Debug: Show Creative Section';
    debugButton.className = 'btn btn-secondary';
    debugButton.style.marginTop = '10px';
    debugButton.addEventListener('click', function() {
        console.log('Debug button clicked - forcing creative section to appear');
        
        // Force create and show the creative section
        let creativeSection = document.querySelector('.form-group.creative-section');
        if (!creativeSection) {
            creativeSection = document.createElement('div');
            creativeSection.className = 'form-group creative-section';
            
            // Create the section content
            const label = document.createElement('label');
            label.className = 'form-label';
            label.textContent = 'Select Creatives';
            creativeSection.appendChild(label);
            
            const creativeSelection = document.createElement('div');
            creativeSelection.className = 'creative-selection';
            
            const selectBtn = document.createElement('button');
            selectBtn.type = 'button';
            selectBtn.id = 'selectFromLibraryBtn';
            selectBtn.className = 'btn btn-outline-primary';
            selectBtn.innerHTML = '<i class="fas fa-photo-video"></i> Select from Asset Library';
            
            selectBtn.addEventListener('click', function() {
                console.log('Select from library button clicked');
                // Open the asset library modal
                const modal = document.getElementById('assetLibraryModal');
                if (modal) {
                    console.log('Opening asset library modal');
                    modal.style.display = 'block';
                } else {
                    console.log('Asset library modal not found');
                }
            });
            
            creativeSelection.appendChild(selectBtn);
            
            const uploadPreview = document.createElement('div');
            uploadPreview.id = 'uploadPreview';
            uploadPreview.className = 'upload-preview';
            creativeSelection.appendChild(uploadPreview);
            
            creativeSection.appendChild(creativeSelection);
            
            // Insert after the campaign selector container
            campaignSelectorContainer.parentNode.insertBefore(creativeSection, campaignSelectorContainer.nextSibling);
        }
        
        creativeSection.style.display = 'block';
        
        // Also initialize the asset library modal
        initAssetLibraryModal();
    });

    // Add the debug button to the page
    document.body.appendChild(debugButton);

    // Function to create a drop zone for an adset
    function createDropZone(platform, campaignId, adsetId, adsetName, adsetStatus) {
        console.log(`Creating drop zone for ${platform} adset: ${adsetId} (${adsetName})`);
        
        // Check if drop zone already exists
        const existingDropZone = document.getElementById(`dropZone_${platform}_${adsetId}`);
        if (existingDropZone) {
            return existingDropZone;
        }
        
        // Get or create the drop zones container
        let dropZonesContainer = document.getElementById('adsetDropZones');
        if (!dropZonesContainer) {
            dropZonesContainer = document.createElement('div');
            dropZonesContainer.id = 'adsetDropZones';
            dropZonesContainer.className = 'adset-drop-zones';
            
            // Add it after the creative section
            const creativeSection = document.querySelector('.form-group.creative-section');
            if (creativeSection) {
                creativeSection.parentNode.insertBefore(dropZonesContainer, creativeSection.nextSibling);
            } else {
                // If creative section doesn't exist yet, add it after campaign selector
                const campaignSelector = document.getElementById('campaignSelectorContainer');
                if (campaignSelector) {
                    campaignSelector.parentNode.insertBefore(dropZonesContainer, campaignSelector.nextSibling);
                }
            }
        }
        
        // Create the drop zone
        const dropZone = document.createElement('div');
        dropZone.id = `dropZone_${platform}_${adsetId}`;
        dropZone.className = 'adset-drop-zone';
        dropZone.dataset.platform = platform;
        dropZone.dataset.adsetId = adsetId;
        
        // Create drop zone header
        const header = document.createElement('div');
        header.className = 'drop-zone-header';
        
        const title = document.createElement('h4');
        title.textContent = `${platform.charAt(0).toUpperCase() + platform.slice(1)} Adset: ${adsetName}`;
        header.appendChild(title);
        
        const statusBadge = document.createElement('span');
        statusBadge.className = `status-badge status-${adsetStatus.toLowerCase()}`;
        statusBadge.textContent = adsetStatus;
        header.appendChild(statusBadge);
        
        dropZone.appendChild(header);
        
        // Create ad name input
        const adNameContainer = document.createElement('div');
        adNameContainer.className = 'ad-name-container';
        
        const adNameLabel = document.createElement('label');
        adNameLabel.textContent = 'Ad Name:';
        adNameLabel.htmlFor = `ad_name_${platform}_${adsetId}`;
        adNameContainer.appendChild(adNameLabel);
        
        const adNameInput = document.createElement('input');
        adNameInput.type = 'text';
        adNameInput.id = `ad_name_${platform}_${adsetId}`;
        adNameInput.name = `ad_names[${adsetId}]`;
        adNameInput.className = 'form-control';
        adNameInput.placeholder = 'Enter ad name';
        adNameInput.value = `Ad for ${adsetName}`;
        adNameContainer.appendChild(adNameInput);
        
        dropZone.appendChild(adNameContainer);
        
        // Create assets container
        const assetsContainer = document.createElement('div');
        assetsContainer.className = 'assets-container';
        
        // Add drop placeholder
        const dropPlaceholder = document.createElement('div');
        dropPlaceholder.className = 'drop-placeholder';
        dropPlaceholder.innerHTML = 'Drag assets here <i class="fas fa-arrow-down"></i>';
        assetsContainer.appendChild(dropPlaceholder);
        
        dropZone.appendChild(assetsContainer);
        
        // Add to drop zones container
        dropZonesContainer.appendChild(dropZone);
        
        // Make the drop zone a valid drop target
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });
        
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over');
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            
            // Get the asset ID from the dragged element
            const assetId = e.dataTransfer.getData('text/plain');
            if (assetId) {
                // Move the asset to this adset
                moveAssetToAd(assetId, platform, adsetId, assetsContainer);
            }
        });
        
        return dropZone;
    }

    // Function to move an asset to an ad
    function moveAssetToAd(assetId, platform, adsetId, container) {
        console.log(`Moving asset ${assetId} to ad ${adsetId}`);
        
        // Get the asset from the preview
        const assetPreview = document.querySelector(`.preview-item[data-id="${assetId}"]`);
        if (!assetPreview) return;
        
        // Get the drop zone
        const dropZone = document.getElementById(`dropZone_${platform}_${adsetId}`);
        if (!dropZone) return;
        
        // Get the assets container
        const assetsContainer = dropZone.querySelector('.assets-container');
        if (!assetsContainer) return;
        
        // Check if this asset is already in this ad
        if (assetsContainer.querySelector(`.mini-asset[data-asset-id="${assetId}"]`)) {
            return;
        }
        
        // Create a mini version of the asset
        const miniAsset = document.createElement('div');
        miniAsset.className = 'mini-asset';
        miniAsset.dataset.assetId = assetId;
        
        // Copy the content from the preview
        const assetContent = assetPreview.querySelector('.asset-content').cloneNode(true);
        miniAsset.appendChild(assetContent);
        
        // Add remove button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-asset-btn';
        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
        removeBtn.addEventListener('click', () => {
            // Remove the asset from this ad
            moveAssetFromAd(assetId, platform, adsetId);
        });
        miniAsset.appendChild(removeBtn);
        
        // Add hidden input for form submission
        const hiddenInput = document.createElement('input');
        hiddenInput.type = 'hidden';
        hiddenInput.name = `asset_assignments[${adsetId}][]`;
        hiddenInput.value = assetId;
        miniAsset.appendChild(hiddenInput);
        
        // Remove the drop placeholder if it exists
        const dropPlaceholder = assetsContainer.querySelector('.drop-placeholder');
        if (dropPlaceholder) {
            assetsContainer.removeChild(dropPlaceholder);
        }
        
        // Add to the assets container
        assetsContainer.appendChild(miniAsset);
        
        // Mark the asset as assigned in the preview
        assetPreview.classList.add('assigned');
        
        // Update the assignment status
        updateAssetAssignmentStatus();
    }

    // Function to move an asset from an ad back to the preview
    function moveAssetFromAd(assetId, platform, adsetId) {
        console.log(`Moving asset ${assetId} from ad ${adsetId}`);
        
        // Get the drop zone
        const dropZone = document.getElementById(`dropZone_${platform}_${adsetId}`);
        if (!dropZone) return;
        
        // Get the assets container
        const assetsContainer = dropZone.querySelector('.assets-container');
        if (!assetsContainer) return;
        
        // Get the mini asset
        const miniAsset = assetsContainer.querySelector(`.mini-asset[data-asset-id="${assetId}"]`);
        if (!miniAsset) return;
        
        // Remove the mini asset
        assetsContainer.removeChild(miniAsset);
        
        // Add the drop placeholder if there are no more assets
        if (assetsContainer.querySelectorAll('.mini-asset').length === 0) {
            const dropPlaceholder = document.createElement('div');
            dropPlaceholder.className = 'drop-placeholder';
            dropPlaceholder.innerHTML = 'Drag assets here <i class="fas fa-arrow-down"></i>';
            assetsContainer.appendChild(dropPlaceholder);
        }
        
        // Mark the asset as unassigned in the preview
        const assetPreview = document.querySelector(`.preview-item[data-id="${assetId}"]`);
        if (assetPreview) {
            assetPreview.classList.remove('assigned');
        }
        
        // Update the assignment status
        updateAssetAssignmentStatus();
    }

    // Function to update the assignment status of all assets
    function updateAssetAssignmentStatus() {
        // Get all assets in the preview
        const assetPreviews = document.querySelectorAll('.preview-item');
        
        // Check if each asset is assigned to at least one adset
        assetPreviews.forEach(preview => {
            const assetId = preview.dataset.id;
            const isAssigned = document.querySelector(`input[name^="asset_assignments"][value="${assetId}"]`) !== null;
            
            // Update the assignment status
            const statusBadge = preview.querySelector('.assignment-status');
            if (statusBadge) {
                if (isAssigned) {
                    statusBadge.className = 'assignment-status status-assigned';
                    statusBadge.innerHTML = '<i class="fas fa-check-circle"></i> Assigned';
                    preview.classList.remove('highlight-unassigned');
                } else {
                    statusBadge.className = 'assignment-status status-unassigned';
                    statusBadge.innerHTML = '<i class="fas fa-exclamation-circle"></i> Not Assigned';
                }
            }
        });
        
        // Check if all assets are assigned
        const allAssigned = Array.from(assetPreviews).every(preview => 
            preview.querySelector('.assignment-status.status-assigned') !== null
        );
        
        // Update submit button state
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            if (allAssigned) {
                submitBtn.disabled = false;
                submitBtn.title = '';
            } else {
                submitBtn.disabled = true;
                submitBtn.title = 'Please assign all assets to at least one adset';
            }
        }
    }

    // Fix the asset click handlers
    function fixAssetClickHandlers() {
        console.log('Fixing asset click handlers');
        
        // Get all assets in the library
        const assets = document.querySelectorAll('.library-asset');
        console.log(`Found ${assets.length} assets to fix click handlers`);
        
        // Add direct click handlers to each asset
        assets.forEach(asset => {
            // Add a direct click handler that doesn't rely on event bubbling
            asset.onclick = function(e) {
                // Stop propagation to prevent conflicts
                e.stopPropagation();
                
                console.log(`Direct click on asset: ${this.dataset.id}`);
                
                // Toggle selected class
                this.classList.toggle('selected');
                
                // Make the selection more visible
                const selectIcon = this.querySelector('.asset-select');
                if (selectIcon) {
                    selectIcon.style.opacity = this.classList.contains('selected') ? '1' : '0';
                }
                
                // Add a visible border
                this.style.borderColor = this.classList.contains('selected') ? '#007bff' : '#e1e1e1';
                this.style.boxShadow = this.classList.contains('selected') ? '0 0 8px rgba(0, 123, 255, 0.5)' : 'none';
                
                console.log(`Asset ${this.dataset.id} selected: ${this.classList.contains('selected')}`);
                
                return false; // Prevent default
            };
        });
        
        console.log('Asset click handlers fixed');
    }

    // Add this to the fixAssetSelectionButton function
    function fixAssetSelectionButton() {
        // ... existing code ...
        
        // Also fix the asset click handlers
        fixAssetClickHandlers();
        
        console.log('Asset selection button fixed');
    }

    // Call this function when the page loads
    document.addEventListener('DOMContentLoaded', function() {
        // Add a button to fix the asset selection
        const fixButton = document.createElement('button');
        fixButton.textContent = 'Fix Asset Selection';
        fixButton.className = 'btn btn-warning';
        fixButton.style.position = 'fixed';
        fixButton.style.bottom = '10px';
        fixButton.style.right = '10px';
        fixButton.style.zIndex = '9999';
        
        fixButton.addEventListener('click', function() {
            fixAssetSelectionButton();
            alert('Asset selection fixed. Try selecting assets again.');
        });
        
        document.body.appendChild(fixButton);
        
        // Also try to fix it automatically when the library button is clicked
        const libraryBtn = document.getElementById('selectFromLibraryBtn');
        if (libraryBtn) {
            libraryBtn.addEventListener('click', function() {
                // Wait for the modal to open
                setTimeout(fixAssetSelectionButton, 500);
            });
        }
    });

    // Fix the asset selection by directly overriding the button click handler
    function fixAssetSelectionFinal() {
        console.log('Applying final fix for asset selection');
        
        // Find the Add Selected Assets button in the currently visible modal
        const modal = document.querySelector('.modal[style*="display: block"]');
        if (!modal) {
            console.log('No visible modal found');
            return;
        }
        
        const addButton = modal.querySelector('button.btn-primary');
        if (!addButton) {
            console.log('Add Selected Assets button not found');
            return;
        }
        
        console.log('Found Add Selected Assets button, replacing with direct implementation');
        
        // Create a new button to replace the existing one
        const newButton = document.createElement('button');
        newButton.className = addButton.className;
        newButton.textContent = addButton.textContent;
        newButton.id = 'directAddSelectedAssetsBtn';
        
        // Replace the button
        addButton.parentNode.replaceChild(newButton, addButton);
        
        // Add the direct click handler
        newButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('Direct Add Selected Assets button clicked');
            
            // Get all selected assets
            const selectedAssets = document.querySelectorAll('.library-asset.selected');
            console.log(`Found ${selectedAssets.length} selected assets`);
            
            if (selectedAssets.length === 0) {
                alert('Please select at least one asset');
                return false;
            }
            
            // Make addAssetToPreview available globally
            window.addAssetToPreview = addAssetToPreview;
            
            // Process each selected asset
            selectedAssets.forEach(asset => {
                const assetId = asset.dataset.id;
                const assetType = asset.dataset.type || 'image';
                const assetUrl = asset.dataset.url;
                const assetName = asset.dataset.name || assetId;
                
                console.log(`Processing asset: ${assetId}`);
                
                // Add to preview if not already there
                if (!document.querySelector(`.preview-item[data-id="${assetId}"]`)) {
                    console.log(`Adding asset to preview: ${assetId}`);
                    addAssetToPreview(assetId, assetType, assetUrl, assetName);
                } else {
                    console.log(`Asset ${assetId} already in preview`);
                }
            });
            
            // Close the modal
            modal.style.display = 'none';
            
            return false;
        });
        
        // Also fix the asset click handlers
        const assets = document.querySelectorAll('.library-asset');
        assets.forEach(asset => {
            // Remove existing click handlers
            const newAsset = asset.cloneNode(true);
            asset.parentNode.replaceChild(newAsset, asset);
            
            // Add direct click handler
            newAsset.addEventListener('click', function(e) {
                e.stopPropagation();
                
                console.log(`Direct click on asset: ${this.dataset.id}`);
                
                // Toggle selected class
                this.classList.toggle('selected');
                
                // Update visual indication
                const selectIcon = this.querySelector('.asset-select');
                if (selectIcon) {
                    selectIcon.style.opacity = this.classList.contains('selected') ? '1' : '0';
                }
                
                // Add visual styling
                this.style.borderColor = this.classList.contains('selected') ? '#007bff' : '#e1e1e1';
                this.style.boxShadow = this.classList.contains('selected') ? '0 0 8px rgba(0, 123, 255, 0.5)' : 'none';
                
                console.log(`Asset ${this.dataset.id} selected: ${this.classList.contains('selected')}`);
            });
        });
        
        console.log('Asset selection fix applied');
    }

    // Add a global function to expose addAssetToPreview
    window.addAssetToPreview = addAssetToPreview;

    // Add a button to trigger the fix
    const fixButton = document.createElement('button');
    fixButton.textContent = 'Fix Asset Selection';
    fixButton.className = 'btn btn-warning';
    fixButton.style.position = 'fixed';
    fixButton.style.bottom = '10px';
    fixButton.style.right = '10px';
    fixButton.style.zIndex = '9999';

    fixButton.addEventListener('click', function() {
        fixAssetSelectionFinal();
    });

    document.body.appendChild(fixButton);

    // Also try to fix automatically when the library button is clicked
    const libraryBtn = document.getElementById('selectFromLibraryBtn');
    if (libraryBtn) {
        libraryBtn.addEventListener('click', function() {
            // Wait for the modal to open
            setTimeout(fixAssetSelectionFinal, 500);
        });
    }

    // Function to make operation 1 asset selection match operation 3
    function unifyAssetSelectionExperience() {
        console.log('Unifying asset selection experience between operation types');
        
        // Get the operation type
        const operationType = document.getElementById('operationType');
        if (!operationType) {
            console.log('Operation type element not found');
            return;
        }
        
        console.log(`Current operation type: ${operationType.value}`);
        
        // Function to handle asset selection for both operation types
        function setupUnifiedAssetSelection() {
            console.log('Setting up unified asset selection');
            
            // Find the select from library button for operation 1
            const selectFromLibraryBtn = document.getElementById('selectFromLibraryBtn');
            if (!selectFromLibraryBtn) {
                console.log('Select from library button not found');
                return;
            }
            
            // Store the original click handler
            const originalClickHandler = selectFromLibraryBtn.onclick;
            
            // Replace with a new handler that will use the operation 3 behavior
            selectFromLibraryBtn.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('Unified select from library button clicked');
                
                // Get the current operation type
                const currentOpType = document.getElementById('operationType').value;
                console.log(`Current operation type when button clicked: ${currentOpType}`);
                
                // If this is operation 1, use the operation 3 behavior
                if (currentOpType === '1') {
                    console.log('Using operation 3 behavior for asset selection');
                    
                    // Find the operation 3 select from library button
                    const op3Buttons = Array.from(document.querySelectorAll('button')).filter(btn => 
                        btn.textContent.includes('Select from Library') && btn !== selectFromLibraryBtn
                    );
                    
                    if (op3Buttons.length > 0) {
                        console.log('Found operation 3 select from library button, using its behavior');
                        
                        // Simulate a click on the operation 3 button
                        op3Buttons[0].click();
                        
                        // After the modal is opened, make sure it works with operation 1
                        setTimeout(function() {
                            const modal = document.querySelector('.modal[style*="display: block"]');
                            if (modal) {
                                console.log('Modal opened, adapting for operation 1');
                                
                                // Find the Add Selected Assets button
                                const addButton = modal.querySelector('button.btn-primary');
                                if (addButton) {
                                    console.log('Found Add Selected Assets button, adapting for operation 1');
                                    
                                    // Store the original click handler
                                    const originalAddHandler = addButton.onclick;
                                    
                                    // Replace with a handler that works for operation 1
                                    addButton.onclick = function(e) {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        
                                        console.log('Adapted Add Selected Assets button clicked');
                                        
                                        // Get selected assets
                                        const selectedAssets = modal.querySelectorAll('.library-asset.selected, .library-asset[style*="border: 3px solid"], .library-asset[style*="border-color: #007bff"]');
                                        console.log(`Found ${selectedAssets.length} selected assets`);
                                        
                                        if (selectedAssets.length === 0) {
                                            alert('Please select at least one asset');
                                            return false;
                                        }
                                        
                                        // Process selected assets for operation 1
                                        selectedAssets.forEach(asset => {
                                            const assetId = asset.dataset.id;
                                            const assetType = asset.dataset.type || 'image';
                                            const assetUrl = asset.dataset.url;
                                            const assetName = asset.dataset.name || assetId;
                                            
                                            console.log(`Processing asset for operation 1: ${assetId}`);
                                            
                                            // Add to the form as hidden inputs
                                            const input = document.createElement('input');
                                            input.type = 'hidden';
                                            input.name = 'library_assets[]';
                                            input.value = assetId;
                                            document.querySelector('form').appendChild(input);
                                            
                                            // Also add to the preview if the function exists
                                            if (typeof window.addAssetToPreview === 'function') {
                                                window.addAssetToPreview(assetId, assetType, assetUrl, assetName);
                                            }
                                        });
                                        
                                        // Close the modal
                                        modal.style.display = 'none';
                                        
                                        return false;
                                    };
                                }
                            }
                        }, 500);
                        
                        return false;
                    }
                }
                
                // If we couldn't find the operation 3 button or this is not operation 1,
                // use the original behavior
                if (originalClickHandler) {
                    return originalClickHandler.call(this, e);
                }
                
                return true;
            };
        }
        
        // Set up the unified asset selection when the page loads
        setupUnifiedAssetSelection();
        
        // Also set it up when the operation type changes
        operationType.addEventListener('change', function() {
            console.log(`Operation type changed to: ${this.value}`);
            setupUnifiedAssetSelection();
        });
        
        // Make sure the creative section is visible and highlighted
        updateCreativeSectionVisibility();
    }

    // Call this function when the page loads
    document.addEventListener('DOMContentLoaded', unifyAssetSelectionExperience);

    // Function to directly fix the asset selection issue in a clean way
    function fixAssetSelectionIssue() {
        console.log('Implementing clean asset selection fix');
        
        // 1. Make global addAssetToPreview function available to window
        window.addAssetToPreview = addAssetToPreview;
        
        // 2. Create a direct event handler for the asset library modal
        document.addEventListener('click', function(e) {
            // When any library asset is clicked
            if (e.target.closest('.library-asset')) {
                const asset = e.target.closest('.library-asset');
                console.log(`Clean click on asset: ${asset.dataset.id}`);
                
                // Toggle selected class
                asset.classList.toggle('selected');
                
                // Update visual indication
                const selectIcon = asset.querySelector('.asset-select');
                if (selectIcon) {
                    selectIcon.style.opacity = asset.classList.contains('selected') ? '1' : '0';
                }
                
                // Add visual styling
                asset.style.border = asset.classList.contains('selected') ? '2px solid #007bff' : '1px solid #e1e1e1';
                asset.style.boxShadow = asset.classList.contains('selected') ? '0 0 8px rgba(0, 123, 255, 0.5)' : 'none';
            }
            
            // When the Add Selected Assets button is clicked
            if (e.target.closest('#selectAssetsBtn') || 
                (e.target.tagName === 'BUTTON' && e.target.textContent.includes('Add Selected Assets'))) {
                
                // Prevent default action
                e.preventDefault();
                
                console.log('Clean Add Selected Assets button clicked');
                
                // Find the modal
                const modal = document.querySelector('.modal[style*="display: block"]');
                if (!modal) {
                    console.log('No visible modal found');
                    return;
                }
                
                // Get all selected assets
                const selectedAssets = modal.querySelectorAll('.library-asset.selected');
                console.log(`Found ${selectedAssets.length} selected assets`);
                
                // Check if any assets are selected
                if (selectedAssets.length === 0) {
                    alert('Please select at least one asset');
                    return;
                }
                
                // Process the selected assets
                selectedAssets.forEach(asset => {
                    const assetId = asset.dataset.id;
                    const assetType = asset.dataset.type || 'image';
                    const assetUrl = asset.dataset.url;
                    const assetName = asset.dataset.name || assetId;
                    
                    console.log(`Processing selected asset: ${assetId}`);
                    
                    // Add to hidden form input
                    const input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = 'library_assets[]';
                    input.value = assetId;
                    document.querySelector('form').appendChild(input);
                    
                    // Add to preview
                    if (!document.querySelector(`.preview-item[data-id="${assetId}"]`)) {
                        window.addAssetToPreview(assetId, assetType, assetUrl, assetName);
                    }
                });
                
                // Close the modal
                modal.style.display = 'none';
            }
        }, true); // Use capturing to ensure this runs before other handlers
    }

    // Call the function when the page loads
    document.addEventListener('DOMContentLoaded', fixAssetSelectionIssue);

    // Enhanced debugging function for asset selection
    function enhancedAssetSelectionDebug() {
        console.log('%c🔍 Enhanced Asset Selection Debugging', 'background: #222; color: #bada55; font-size: 16px; padding: 4px;');
        
        // 1. Track all asset selection events with more verbose logging
        document.addEventListener('click', function(e) {
            const asset = e.target.closest('.library-asset');
            if (asset) {
                console.log('%c Asset clicked:', 'color: #ff9800; font-weight: bold;', {
                    id: asset.dataset.id,
                    selected: asset.classList.contains('selected'),
                    classList: Array.from(asset.classList),
                    elementHTML: asset.outerHTML.substring(0, 150) + '...' // First 150 chars
                });
                
                // Log the element's computed styles to check visibility
                const computedStyle = window.getComputedStyle(asset);
                console.log('Asset computed styles:', {
                    display: computedStyle.display,
                    visibility: computedStyle.visibility,
                    opacity: computedStyle.opacity
                });
                
                // Forcefully add the selected class and styles
                if (!e.ctrlKey) { // If not holding Ctrl, this is a direct click
                    console.log('Forcefully applying selected state to asset:', asset.dataset.id);
                    asset.classList.add('selected');
                    asset.style.border = '3px solid red'; // Very visible border
                    asset.style.boxShadow = '0 0 10px rgba(255, 0, 0, 0.8)';
                    
                    // Add a visible checkmark or indicator
                    let selectIndicator = asset.querySelector('.debug-select-indicator');
                    if (!selectIndicator) {
                        selectIndicator = document.createElement('div');
                        selectIndicator.className = 'debug-select-indicator';
                        selectIndicator.style.position = 'absolute';
                        selectIndicator.style.top = '5px';
                        selectIndicator.style.right = '5px';
                        selectIndicator.style.width = '30px';
                        selectIndicator.style.height = '30px';
                        selectIndicator.style.borderRadius = '50%';
                        selectIndicator.style.backgroundColor = 'red';
                        selectIndicator.style.color = 'white';
                        selectIndicator.style.textAlign = 'center';
                        selectIndicator.style.lineHeight = '30px';
                        selectIndicator.style.zIndex = '1000';
                        selectIndicator.textContent = '✓';
                        asset.appendChild(selectIndicator);
                    }
                }
            }
        }, true);
        
        // 2. Enhance the Add Selected Assets button with verbose logging
        document.addEventListener('click', function(e) {
            const addButton = e.target.closest('#selectAssetsBtn') || 
                             (e.target.tagName === 'BUTTON' && e.target.textContent.includes('Add Selected'));
            
            if (addButton) {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('%c Add Selected Assets button clicked', 'color: #4CAF50; font-weight: bold;');
                
                // Find the modal using multiple approaches
                const modal = document.querySelector('.modal[style*="display: block"]') || 
                              document.querySelector('.modal.show') ||
                              document.getElementById('assetLibraryModal') ||
                              addButton.closest('.modal');
                
                console.log('Found modal:', modal);
                
                if (!modal) {
                    console.error('No visible modal found');
                    return;
                }
                
                // Try multiple selectors to find selected assets
                const selectedByClass = modal.querySelectorAll('.library-asset.selected');
                const selectedByStyle = modal.querySelectorAll('.library-asset[style*="border: 3px solid red"]');
                const selectedByIndicator = modal.querySelectorAll('.library-asset .debug-select-indicator');
                
                console.log('Selected assets found by different methods:', {
                    byClass: selectedByClass.length,
                    byStyle: selectedByStyle.length,
                    byIndicator: selectedByIndicator.length
                });
                
                // Use any method that finds assets
                let selectedAssets = selectedByClass;
                if (selectedByClass.length === 0 && selectedByStyle.length > 0) {
                    selectedAssets = selectedByStyle;
                    console.log('Using assets found by style instead of class');
                } else if (selectedByClass.length === 0 && selectedByIndicator.length > 0) {
                    selectedAssets = Array.from(selectedByIndicator).map(indicator => indicator.closest('.library-asset'));
                    console.log('Using assets found by indicator instead of class');
                }
                
                console.log(`Found ${selectedAssets.length} selected assets`);
                
                // List each selected asset
                Array.from(selectedAssets).forEach((asset, index) => {
                    console.log(`Selected asset ${index + 1}:`, {
                        id: asset.dataset.id || 'No ID',
                        type: asset.dataset.type || 'No type',
                        name: asset.dataset.name || 'No name',
                        hasSelectedClass: asset.classList.contains('selected'),
                        classList: Array.from(asset.classList)
                    });
                });
                
                if (selectedAssets.length === 0) {
                    console.error('⚠️ No assets selected - would show error message');
                    alert('Please select at least one asset');
                    
                    // Debug: Show all assets in the modal
                    const allAssets = modal.querySelectorAll('.library-asset');
                    console.log(`There are ${allAssets.length} total assets in the modal`);
                    
                    // Create a debug button to manually select all assets
                    const selectAllBtn = document.createElement('button');
                    selectAllBtn.textContent = 'DEBUG: Select All Assets';
                    selectAllBtn.className = 'btn btn-danger mt-2';
                    selectAllBtn.onclick = function() {
                        const assets = modal.querySelectorAll('.library-asset');
                        assets.forEach(asset => {
                            asset.classList.add('selected');
                            asset.style.border = '3px solid red';
                        });
                        console.log(`DEBUG: Selected all ${assets.length} assets`);
                        alert(`Selected all ${assets.length} assets. Try clicking Add Selected Assets again.`);
                    };
                    modal.querySelector('.modal-footer').prepend(selectAllBtn);
                    
                    return;
                }
                
                // If assets are found, process them and close the modal
                console.log('Processing selected assets and closing modal');
                // Process assets here...
                
                // Close the modal
                modal.style.display = 'none';
            }
        }, true);
        
        console.log('Enhanced asset selection debugging activated');
    }

    // Call this function when the document is loaded
    document.addEventListener('DOMContentLoaded', function() {
        console.log('Page loaded, activating enhanced debugging');
        setTimeout(enhancedAssetSelectionDebug, 1000);
        
        // Add a debug button to manually activate the debug mode
        const debugBtn = document.createElement('button');
        debugBtn.textContent = 'Debug Asset Selection';
        debugBtn.className = 'btn btn-danger';
        debugBtn.style.position = 'fixed';
        debugBtn.style.bottom = '20px';
        debugBtn.style.right = '20px';
        debugBtn.style.zIndex = '9999';
        debugBtn.onclick = enhancedAssetSelectionDebug;
        document.body.appendChild(debugBtn);
    });

    // Emergency direct fix for asset selection issue
    document.addEventListener('DOMContentLoaded', function() {
        console.log('🚨 Implementing emergency asset selection fix');
        
        // 1. Create a completely separate button
        const emergencyBtn = document.createElement('button');
        emergencyBtn.textContent = 'EMERGENCY: Add Selected Assets';
        emergencyBtn.className = 'btn btn-danger';
        emergencyBtn.style.position = 'fixed';
        emergencyBtn.style.bottom = '60px';
        emergencyBtn.style.right = '20px';
        emergencyBtn.style.zIndex = '10000';
        emergencyBtn.style.padding = '10px 20px';
        emergencyBtn.style.fontWeight = 'bold';
        
        // Add the emergency button to the page
        document.body.appendChild(emergencyBtn);
        
        // 2. Add a direct click handler to the emergency button
        emergencyBtn.addEventListener('click', function() {
            console.log('🚨 Emergency button clicked');
            
            // Find the visible modal
            const modal = document.querySelector('.modal[style*="display: block"]');
            if (!modal) {
                alert('No modal is currently open. Please open the asset selection modal first.');
                return;
            }
            
            // Get all assets in the modal
            const allAssets = modal.querySelectorAll('.library-asset');
            console.log(`Found ${allAssets.length} total assets in the modal`);
            
            // Get all visibly selected assets (red border from debugging or with selected class)
            const selectedAssets = Array.from(allAssets).filter(asset => 
                asset.classList.contains('selected') || 
                asset.style.border?.includes('red') ||
                asset.querySelector('.debug-select-indicator')
            );
            
            console.log(`Found ${selectedAssets.length} selected assets using direct DOM inspection`);
            
            if (selectedAssets.length === 0) {
                // Emergency fallback: use the first asset
                console.log('No selected assets found, using first asset as fallback');
                const firstAsset = allAssets[0];
                if (firstAsset) {
                    selectedAssets.push(firstAsset);
                    
                    // Visually mark it as selected
                    firstAsset.style.border = '5px solid yellow';
                    firstAsset.style.boxShadow = '0 0 20px yellow';
                }
            }
            
            // Process the selected assets directly
            if (selectedAssets.length > 0) {
                console.log(`Processing ${selectedAssets.length} assets directly`);
                
                selectedAssets.forEach(asset => {
                    // Get asset data, falling back to defaults if attributes missing
                    let assetId = asset.dataset.id;
                    if (!assetId) {
                        // Try to extract ID from image src or any other source
                        const img = asset.querySelector('img');
                        if (img && img.src) {
                            const match = img.src.match(/([a-f0-9-]+)\.(jpg|png|gif|jpeg)$/i);
                            if (match) assetId = match[1];
                        }
                        // Last resort: generate a random ID
                        if (!assetId) assetId = 'asset-' + Math.random().toString(36).substring(2);
                    }
                    
                    const assetType = asset.dataset.type || 'image';
                    const assetUrl = asset.dataset.url || asset.querySelector('img')?.src || '';
                    const assetName = asset.dataset.name || assetId;
                    
                    console.log(`Direct processing asset: ${assetId} (${assetName})`);
                    
                    // 1. Add to the form directly
                    const form = document.querySelector('form');
                    if (form) {
                        // Check if input already exists
                        let input = form.querySelector(`input[name="library_assets[]"][value="${assetId}"]`);
                        if (!input) {
                            input = document.createElement('input');
                            input.type = 'hidden';
                            input.name = 'library_assets[]';
                            input.value = assetId;
                            form.appendChild(input);
                            console.log(`Added asset ${assetId} to form directly`);
                        }
                    }
                    
                    // 2. Add to preview if function exists
                    if (typeof window.addAssetToPreview === 'function') {
                        try {
                            window.addAssetToPreview(assetId, assetType, assetUrl, assetName);
                            console.log(`Added asset ${assetId} to preview directly`);
                        } catch (e) {
                            console.error(`Error adding asset to preview: ${e.message}`);
                        }
                    }
                });
                
                // Close the modal directly
                try {
                    modal.style.display = 'none';
                    // Also try jQuery if it exists
                    if (window.jQuery) {
                        window.jQuery(modal).modal('hide');
                    }
                    console.log('Modal closed directly');
                } catch (e) {
                    console.error(`Error closing modal: ${e.message}`);
                }
                
                alert(`Successfully added ${selectedAssets.length} assets directly, bypassing normal flow.`);
            } else {
                alert('Could not find any assets to add, even with emergency fallback!');
            }
        });
        
        // 3. Also directly override the modal's Add Selected Assets button when it appears
        const checkForModalButton = setInterval(function() {
            const modal = document.querySelector('.modal[style*="display: block"]');
            if (modal) {
                const addButton = modal.querySelector('button.btn-primary');
                if (addButton && addButton.textContent.includes('Add Selected Assets')) {
                    // If we haven't already replaced this button
                    if (!addButton.dataset.replaced) {
                        console.log('Found Add Selected Assets button, replacing with direct implementation');
                        
                        // Create replacement button
                        const newButton = document.createElement('button');
                        newButton.textContent = 'DIRECT: Add Selected Assets';
                        newButton.className = addButton.className;
                        newButton.style.backgroundColor = '#d9534f';
                        newButton.style.borderColor = '#d9534f';
                        newButton.dataset.replaced = 'true';
                        
                        // Replace the button
                        addButton.parentNode.replaceChild(newButton, addButton);
                        
                        // Add direct click handler (same as emergency button)
                        newButton.onclick = emergencyBtn.onclick;
                    }
                }
            }
        }, 500);
    });

    // Add this to your existing code
    operationType.addEventListener('change', function() {
        // Set data-operation attribute on body for CSS targeting
        document.body.dataset.operation = this.value;
    });

    // Also set it on initial load
    document.addEventListener('DOMContentLoaded', function() {
        const operationType = document.getElementById('operationType');
        if (operationType && operationType.value) {
            document.body.dataset.operation = operationType.value;
        }
    });

    // Add this function to immediately hide the Ad Groups section when Operation Type 1 is selected
    function hideAdGroupsForOperationType1() {
        const operationType = document.getElementById('operationType');
        if (!operationType) return;
        
        // Check if operation type is 1
        if (operationType.value === '1') {
            console.log('Operation Type 1 detected - hiding Ad Groups section');
            
            // Hide the Ad Groups section
            const adgroupsSection = document.getElementById('adgroupsSection');
            if (adgroupsSection) {
                adgroupsSection.style.display = 'none';
            }
            
            // Hide the connector
            const connector = document.getElementById('dragConnector');
            if (connector) {
                connector.style.display = 'none';
            }
            
            // Also hide any other related elements
            const dragAssetsDown = document.querySelector('.drag-assets-down');
            if (dragAssetsDown) {
                dragAssetsDown.style.display = 'none';
            }
        }
    }

    // Call this function on page load and whenever operation type changes
    document.addEventListener('DOMContentLoaded', function() {
        const operationType = document.getElementById('operationType');
        if (!operationType) return;
        
        // Run immediately
        hideAdGroupsForOperationType1();
        
        // Run whenever operation type changes
        operationType.addEventListener('change', hideAdGroupsForOperationType1);
    });

    // Replace the existing two-column layout code with this simpler version
    function createTwoColumnLayout() {
        try {
            console.log('Creating two-column layout - simplified version');
            const operationType = document.getElementById('operationType');
            if (!operationType || operationType.value !== '1') return;
            
            // Get the form
            const form = document.getElementById('campaignForm');
            if (!form) return;
            
            // First, remove any existing columns to avoid duplication
            const existingLeft = document.querySelector('.left-column');
            const existingRight = document.querySelector('.right-column');
            if (existingLeft) existingLeft.remove();
            if (existingRight) existingRight.remove();
            
            // Create the columns
            const leftColumn = document.createElement('div');
            leftColumn.className = 'left-column';
            leftColumn.innerHTML = '<h3 class="column-title">Campaign & Adset Selection</h3>';
            
            const rightColumn = document.createElement('div');
            rightColumn.className = 'right-column';
            rightColumn.innerHTML = '<h3 class="column-title">Asset Selection & Assignment</h3>';
            
            // Get the key elements
            const operationTypeGroup = operationType.closest('.form-group');
            const platformsGroup = document.querySelector('.form-group:has(input[name="platforms"])');
            const metaAccountSection = document.getElementById('metaAccountSection');
            const tiktokAccountSection = document.getElementById('tiktokAccountSection');
            const campaignSection = document.getElementById('campaignSelectorContainer');
            const creativeSection = document.querySelector('.form-group:has(#selectFromLibraryBtn)');
            const submitBtn = document.getElementById('submitBtn');
            
            // Add the columns to the form after the platform section
            if (platformsGroup && platformsGroup.nextSibling) {
                form.insertBefore(rightColumn, platformsGroup.nextSibling);
                form.insertBefore(leftColumn, platformsGroup.nextSibling);
            } else {
                form.appendChild(leftColumn);
                form.appendChild(rightColumn);
            }
            
            // Move elements to their respective columns
            if (metaAccountSection) leftColumn.appendChild(metaAccountSection);
            if (tiktokAccountSection) leftColumn.appendChild(tiktokAccountSection);
            if (campaignSection) leftColumn.appendChild(campaignSection);
            
            if (creativeSection) rightColumn.appendChild(creativeSection);
            
            // Move drop zones to right column
            const dropZonesContainer = document.getElementById('adsetDropZonesContainer');
            if (dropZonesContainer) rightColumn.appendChild(dropZonesContainer);
            
            // Make sure submit button is at the end
            if (submitBtn) form.appendChild(submitBtn);
            
            // Hide ad groups section
            const adgroupsSection = document.getElementById('adgroupsSection');
            if (adgroupsSection) adgroupsSection.style.display = 'none';
            
            // Hide connector
            const connector = document.getElementById('dragConnector');
            if (connector) connector.style.display = 'none';
            
            console.log('Two-column layout created successfully');
        } catch (error) {
            console.error('Error creating two-column layout:', error);
        }
    }

    // Call this function when operation type changes
    document.addEventListener('DOMContentLoaded', function() {
        const operationType = document.getElementById('operationType');
        if (!operationType) return;
        
        // Create layout on page load if needed
        if (operationType.value === '1') {
            createTwoColumnLayout();
        }
        
        // Create layout when operation type changes to 1
        operationType.addEventListener('change', function() {
            if (this.value === '1') {
                // Use setTimeout to ensure all other visibility changes have happened
                setTimeout(createTwoColumnLayout, 100);
            }
        });
    });

    // Modify the updateSelectorVisibility function to call createTwoColumnLayout
    const originalUpdateSelectorVisibility = updateSelectorVisibility;
    updateSelectorVisibility = function() {
        originalUpdateSelectorVisibility.apply(this, arguments);
        
        // After updating visibility, create two-column layout if needed
        const operationType = document.getElementById('operationType');
        if (operationType && operationType.value === '1') {
            createTwoColumnLayout();
        }
    };

    // Direct fix for Operation Type 1 layout issues
    function fixOperationType1Layout() {
        console.log('Applying direct fix for Operation Type 1 layout');
        
        try {
            // 1. First, forcefully hide the Configure Ad Groups section
            const adGroupsSection = document.getElementById('adgroupsSection');
            if (adGroupsSection) {
                adGroupsSection.style.display = 'none';
                adGroupsSection.style.visibility = 'hidden';
                adGroupsSection.style.height = '0';
                adGroupsSection.style.overflow = 'hidden';
                adGroupsSection.style.opacity = '0';
                adGroupsSection.style.pointerEvents = 'none';
                console.log('Forcefully hid Configure Ad Groups section');
            }
            
            // Also hide the drag connector
            const dragConnector = document.getElementById('dragConnector');
            if (dragConnector) {
                dragConnector.style.display = 'none';
                dragConnector.style.visibility = 'hidden';
                dragConnector.style.height = '0';
                console.log('Forcefully hid drag connector');
            }
            
            // 2. Create the two-column layout
            const form = document.getElementById('campaignForm');
            if (!form) {
                console.error('Form not found');
                return;
            }
            
            // Clear any existing columns
            const existingLeft = document.querySelector('.left-column');
            const existingRight = document.querySelector('.right-column');
            if (existingLeft) existingLeft.remove();
            if (existingRight) existingRight.remove();
            
            // Create new columns with inline styles for reliability
            const leftColumn = document.createElement('div');
            leftColumn.className = 'left-column';
            leftColumn.style.display = 'inline-block';
            leftColumn.style.verticalAlign = 'top';
            leftColumn.style.width = '48%';
            leftColumn.style.margin = '0 1%';
            leftColumn.style.boxSizing = 'border-box';
            
            const rightColumn = document.createElement('div');
            rightColumn.className = 'right-column';
            rightColumn.style.display = 'inline-block';
            rightColumn.style.verticalAlign = 'top';
            rightColumn.style.width = '48%';
            rightColumn.style.margin = '0 1%';
            rightColumn.style.boxSizing = 'border-box';
            
            // Add titles to columns
            leftColumn.innerHTML = '<h3 style="margin-top:0;padding:10px;background-color:#f8f9fa;border-radius:4px;font-size:16px;font-weight:500;color:#333;text-align:center;margin-bottom:15px;border-left:3px solid #007bff;">Campaign & Adset Selection</h3>';
            rightColumn.innerHTML = '<h3 style="margin-top:0;padding:10px;background-color:#f8f9fa;border-radius:4px;font-size:16px;font-weight:500;color:#333;text-align:center;margin-bottom:15px;border-left:3px solid #007bff;">Asset Selection & Assignment</h3>';
            
            // 3. Get all the sections we need to organize
            const operationTypeGroup = document.querySelector('.form-group:has(#operationType)');
            const platformsGroup = document.querySelector('.form-group:has(input[name="platforms"])');
            const metaAccountSection = document.getElementById('metaAccountSection');
            const tiktokAccountSection = document.getElementById('tiktokAccountSection');
            const campaignSection = document.getElementById('campaignSelectorContainer');
            const creativeSection = document.querySelector('.form-group:has(#selectFromLibraryBtn)');
            const submitBtn = document.getElementById('submitBtn');
            
            // 4. Create a container for the full-width elements
            const fullWidthContainer = document.createElement('div');
            fullWidthContainer.style.width = '100%';
            fullWidthContainer.style.marginBottom = '20px';
            
            // 5. Move elements to their respective containers
            if (operationTypeGroup) fullWidthContainer.appendChild(operationTypeGroup);
            if (platformsGroup) fullWidthContainer.appendChild(platformsGroup);
            
            // Add account sections and campaign section to left column
            if (metaAccountSection) leftColumn.appendChild(metaAccountSection);
            if (tiktokAccountSection) leftColumn.appendChild(tiktokAccountSection);
            if (campaignSection) leftColumn.appendChild(campaignSection);
            
            // Add creative section to right column
            if (creativeSection) rightColumn.appendChild(creativeSection);
            
            // 6. Clear the form and add our containers in the correct order
            while (form.firstChild) {
                form.removeChild(form.firstChild);
            }
            
            form.appendChild(fullWidthContainer);
            form.appendChild(leftColumn);
            form.appendChild(rightColumn);
            if (submitBtn) form.appendChild(submitBtn);
            
            console.log('Successfully applied two-column layout');
            
        } catch (error) {
            console.error('Error fixing Operation Type 1 layout:', error);
        }
    }

    // Call this function immediately when the page loads
    document.addEventListener('DOMContentLoaded', function() {
        const operationType = document.getElementById('operationType');
        if (operationType && operationType.value === '1') {
            // Apply fix immediately
            fixOperationType1Layout();
        }
        
        // Also apply fix when operation type changes
        if (operationType) {
            operationType.addEventListener('change', function() {
                if (this.value === '1') {
                    // Use setTimeout to ensure DOM is ready
                    setTimeout(fixOperationType1Layout, 100);
                }
            });
        }
    });
}); 