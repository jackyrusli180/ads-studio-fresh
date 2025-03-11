// Add this helper function at the top of your file, before any other code
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(context, args);
        }, wait);
    };
}

// Fallback for showToast if not defined in main.js
if (typeof showToast !== 'function') {
    window.showToast = function(message, type) {
        console.log(`Toast (${type}): ${message}`);
        alert(message);
    };
}

document.addEventListener('DOMContentLoaded', () => {
    // Initialize variables for adgroup management
    let adgroupCounter = 1;
    let selectedAssets = [];
    let adgroupAssignments = {};
    
    // Initialize tooltip function fallback if not available
    if (typeof showToast !== 'function') {
        window.showToast = function(message, type = 'info') {
            console.log(`Toast (${type}): ${message}`);
            alert(message);
        };
    }
    
    // Get form elements
    const form = document.getElementById('campaignForm');
    const operationType = document.getElementById('operationType');
    const template = document.getElementById('template');
    const dynamicFields = document.getElementById('dynamicFields');
    const uploadZone = document.getElementById('uploadZone');
    const creativeUpload = document.getElementById('creativeUpload');
    const uploadPreview = document.getElementById('uploadPreview');
    
    // Check if we have pre-selected assets from the library
    const preselectedAssets = document.querySelectorAll('.selected-asset');
    console.log(`Found ${preselectedAssets.length} pre-selected assets from library`);
    
    // Setup remove buttons for pre-selected assets
    preselectedAssets.forEach(item => {
        const removeBtn = item.querySelector('.remove-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                item.remove();
            });
        }
    });

    // Get all form sections that should be initially hidden
    const formGroups = form.querySelectorAll('.form-group');
    const operationTypeGroup = operationType.closest('.form-group');
    const platformSection = Array.from(formGroups).find(group => group.querySelector('input[name="platforms"]'));
    const templateSection = Array.from(formGroups).find(group => group.querySelector('select[name="template"]'));
    const creativeSection = Array.from(formGroups).find(group => group.querySelector('#selectFromLibraryBtn'));
    const dynamicFieldsSection = document.getElementById('dynamicFields');
    const submitButton = document.getElementById('submitBtn');
    
    // Initially hide all sections except Operation Type
    function hideAllSections() {
        if (platformSection) platformSection.style.display = 'none';
        if (templateSection) templateSection.style.display = 'none';
        if (creativeSection) creativeSection.style.display = 'none';
        if (dynamicFieldsSection) dynamicFieldsSection.style.display = 'none';
        if (submitButton) submitButton.style.display = 'none';
        
        // Hide adgroups section and connector if they exist
        const adgroupsSection = document.getElementById('adgroupsSection');
        const connector = document.getElementById('dragConnector');
        if (adgroupsSection) adgroupsSection.style.display = 'none';
        if (connector) connector.style.display = 'none';
    }
    
    // Hide all sections initially
    hideAllSections();
    
    // Add step indicators to form sections
    function addStepIndicators() {
        if (operationTypeGroup) {
            const indicator = document.createElement('div');
            indicator.className = 'step-indicator';
            indicator.textContent = '1';
            operationTypeGroup.prepend(indicator);
            operationTypeGroup.classList.add('active');
        }
        
        if (platformSection) {
            const indicator = document.createElement('div');
            indicator.className = 'step-indicator';
            indicator.textContent = '2';
            platformSection.prepend(indicator);
        }
        
        if (templateSection) {
            const indicator = document.createElement('div');
            indicator.className = 'step-indicator';
            indicator.textContent = '3';
            templateSection.prepend(indicator);
        }
        
        if (creativeSection) {
            const indicator = document.createElement('div');
            indicator.className = 'step-indicator';
            indicator.textContent = '4';
            creativeSection.prepend(indicator);
        }
    }
    
    // Add step indicators on page load
    addStepIndicators();
    
    // Function to update active state on form sections
    function updateActiveState() {
        // Remove active class from all form groups
        formGroups.forEach(group => group.classList.remove('active'));
        
        // Set active class on the current step
        if (!operationType.value) {
            operationTypeGroup.classList.add('active');
            return;
        }
        
        operationTypeGroup.classList.add('active');
        
        const platformsSelected = document.querySelectorAll('input[name="platforms"]:checked').length > 0;
        if (platformSection && platformSection.style.display !== 'none') {
            platformSection.classList.add('active');
            
            if (!platformsSelected) return;
        }
        
        const templateSelected = document.getElementById('template').value;
        if (templateSection && templateSection.style.display !== 'none') {
            templateSection.classList.add('active');
            
            if (!templateSelected) return;
        }
        
        if (creativeSection && creativeSection.style.display !== 'none') {
            creativeSection.classList.add('active');
        }
    }
    
    // Function to show sections based on current selections
    function updateFormSections() {
        // Get current value of operation type
        const operation = operationType.value;
        
        if (!operation) {
            // If no operation is selected, hide all other sections
            hideAllSections();
            updateActiveState();
            return;
        }
        
        // Operation type is selected, show platform selection
        if (platformSection) platformSection.style.display = 'block';
        
        // Check if platforms are selected
        const platformsSelected = document.querySelectorAll('input[name="platforms"]:checked').length > 0;
        
        if (platformsSelected) {
            // Show template section
            if (templateSection) templateSection.style.display = 'block';
            
            // Check if template is selected
            const templateSelected = document.getElementById('template').value;
            
            if (templateSelected) {
                // Show creative selection section
                if (creativeSection) creativeSection.style.display = 'block';
                
                // Show dynamic fields based on operation type
                if (dynamicFieldsSection) {
                    updateDynamicFields(operation);
                    dynamicFieldsSection.style.display = 'block';
                }
                
                // Show submit button
                if (submitButton) submitButton.style.display = 'block';
                
                // Show adgroups section if we have assets and operation type is 3
                if (operation === '3' && uploadPreview.childElementCount > 0) {
                    const adgroupsSection = document.getElementById('adgroupsSection');
                    const connector = document.getElementById('dragConnector');
                    
                    if (adgroupsSection) adgroupsSection.style.display = 'block';
                    if (connector) connector.style.display = 'flex';
                }
            }
        }
        
        // Update active state for all sections
        updateActiveState();
    }

    // Handle operation type change
    operationType.addEventListener('change', function() {
        updateFormSections();
    });
    
    // Add listeners to platform checkboxes
    const platformCheckboxes = document.querySelectorAll('input[name="platforms"]');
    platformCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            updateFormSections();
        });
    });
    
    // Add listener to template selection
    document.getElementById('template').addEventListener('change', () => {
        updateFormSections();
    });

    function updateDynamicFields(operation) {
        let fields = '';
        
        if (operation === '1') {
            fields = `
                <div class="form-group">
                    <label class="form-label">Campaign ID</label>
                    <input type="text" class="form-control" name="campaignId" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Adset ID</label>
                    <input type="text" class="form-control" name="adsetId" required>
                </div>
            `;
        } else if (operation === '2') {
            fields = `
                <div class="form-group">
                    <label class="form-label">Campaign ID</label>
                    <input type="text" class="form-control" name="campaignId" required>
                </div>
            `;
        } else if (operation === '3') {
            // Check which platforms are selected
            const metaSelected = document.querySelector('input[name="platforms"][value="meta"]')?.checked;
            const tiktokSelected = document.querySelector('input[name="platforms"][value="tiktok"]')?.checked;
            
            if (metaSelected && tiktokSelected) {
                // Both platforms selected - show separate fields
                fields = `
                    <div class="platform-section">
                        <h3>Meta Campaign Settings</h3>
                        <div class="form-group">
                            <label class="form-label">Meta Campaign Name</label>
                            <input type="text" class="form-control" name="metaCampaignName" required>
                        </div>
                    </div>
                    
                    <div class="platform-section">
                        <h3>TikTok Campaign Settings</h3>
                        <div class="form-group">
                            <label class="form-label">TikTok Campaign Name</label>
                            <input type="text" class="form-control" name="tiktokCampaignName" required>
                        </div>
                    </div>
                `;
            } else {
                // Only one platform selected - show generic fields
                fields = `
                    <div class="form-group">
                        <label class="form-label">Campaign Name</label>
                        <input type="text" class="form-control" name="campaignName" required>
                    </div>
                `;
            }
        }
        
        document.getElementById('dynamicFields').innerHTML = fields;
    }

    // Update form when platform selection changes
    platformCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            // Only update if operation type 3 is selected
            if (operationType.value === '3') {
                updateDynamicFields('3');
            }
        });
    });

    // Handle form submission
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Check if TikTok is selected but no advertiser account is chosen
        const isTikTokSelected = Array.from(document.querySelectorAll('input[name="platforms"]'))
            .find(cb => cb.value === 'tiktok')?.checked || false;
        
        const tiktokAdvertiserId = document.getElementById('tiktokAdvertiserId').value;
        
        if (isTikTokSelected && !tiktokAdvertiserId) {
            alert('Please select a TikTok Advertiser Account');
            return false;
        }
        
        // Check if Meta is selected but no advertiser account is chosen
        const isMetaSelected = Array.from(document.querySelectorAll('input[name="platforms"]'))
            .find(cb => cb.value === 'meta')?.checked || false;
        
        const metaAdvertiserId = document.getElementById('metaAdvertiserId').value;
        
        if (isMetaSelected && !metaAdvertiserId) {
            alert('Please select a Meta Advertiser Account');
            return false;
        }
        
        // Collect form data
        const formData = new FormData(form);
        
        // Validate platform selection
        const platforms = [...document.querySelectorAll('input[name="platforms"]:checked')].map(el => el.value);
            
        if (platforms.length === 0) {
            showToast('Please select at least one platform', 'error');
            return;
        }
        
        // Validate library assets
        const libraryAssets = document.querySelectorAll('input[name="library_assets[]"]');
        if (libraryAssets.length === 0) {
            showToast('Please select at least one asset from the library', 'error');
            return;
        }
        
        // Check for unassigned assets
        const unassignedAssets = document.querySelectorAll('.preview-item.asset-preview:not(.assigned)');
        if (unassignedAssets.length > 0) {
            const unassignedCount = unassignedAssets.length;
            const warningMessage = `
                <div style="margin-bottom: 15px;">
                    <i class="fas fa-exclamation-triangle" style="color: orange; margin-right: 10px;"></i> 
                    <strong>Warning:</strong> ${unassignedCount} asset(s) have not been assigned to any ad group.
                </div>
                <div style="margin-bottom: 15px;">
                    Only assigned assets will be used in your ads.
                </div>
                <div>
                    Do you want to continue anyway?
                </div>
            `;
            
            if (!confirm(warningMessage)) {
                // Highlight unassigned assets
                unassignedAssets.forEach(asset => {
                    asset.classList.add('highlight-unassigned');
                    setTimeout(() => {
                        asset.classList.remove('highlight-unassigned');
                    }, 3000);
                });
                return;
            }
        }
        
        // Validate adgroups if visible
        const adgroupsSection = document.getElementById('adgroupsSection');
        if (adgroupsSection && adgroupsSection.style.display !== 'none') {
            // Check if we have adgroups but no asset assignments
            if (Object.keys(adgroupAssignments).length > 0) {
                const emptyAdgroups = Object.keys(adgroupAssignments).filter(id => 
                    adgroupAssignments[id].length === 0
                );
                
                if (emptyAdgroups.length > 0) {
                    // Show more prominent warning
                    const warningMessage = `
                        <div style="margin-bottom: 15px;">
                            <i class="fas fa-exclamation-triangle" style="color: orange; margin-right: 10px;"></i> 
                            <strong>Important:</strong> ${emptyAdgroups.length} ad group(s) have no assets assigned.
                        </div>
                        <div style="margin-bottom: 15px;">
                            Please drag assets from the top section into each ad group before continuing.
                        </div>
                        <div>
                            Each ad group must have at least one asset to create an ad.
                        </div>
                    `;
                    
                    if (confirm(warningMessage)) {
                        // Highlight empty adgroups
                        emptyAdgroups.forEach(id => {
                            const adgroupElem = document.querySelector(`.adgroup-item[data-adgroup-id="${id}"]`);
                            if (adgroupElem) {
                                adgroupElem.classList.add('highlight-empty');
                                // Remove highlight after a few seconds
                                setTimeout(() => {
                                    adgroupElem.classList.remove('highlight-empty');
                                }, 3000);
                            }
                        });
                    }
                    return;
                }
            }
            
            // Check that all adgroups have names
            const unnamedAdgroups = document.querySelectorAll('.adgroup-name:invalid');
            if (unnamedAdgroups.length > 0) {
                showToast('Please provide names for all ad groups', 'error');
                unnamedAdgroups[0].focus();
                return;
            }
            
            // Check that all adgroups have budgets
            const invalidBudgets = document.querySelectorAll('.adgroup-budget:invalid');
            if (invalidBudgets.length > 0) {
                showToast('Please provide valid budgets for all ad groups', 'error');
                invalidBudgets[0].focus();
                return;
            }
            
            // Check that all adgroups have ad names
            const unnamedAds = document.querySelectorAll('.ad-name:invalid');
            if (unnamedAds.length > 0) {
                showToast('Please provide names for all ads', 'error');
                unnamedAds[0].focus();
                return;
            }
        }
        
        // Add adgroup assignments to form data
        for (const [adgroupId, assetIds] of Object.entries(adgroupAssignments)) {
            // Skip empty adgroups
            if (assetIds.length === 0) continue;
            
            // Get the adgroup element
            const adgroupElem = document.querySelector(`.adgroup-item[data-adgroup-id="${adgroupId}"]`);
            if (!adgroupElem) continue;
            
            // Get the adgroup name and budget
            const nameField = adgroupElem.querySelector('.adgroup-name');
            const budgetField = adgroupElem.querySelector('.adgroup-budget');
            const adNameField = adgroupElem.querySelector('.ad-name');
            const landingPageField = adgroupElem.querySelector('.landing-page-url');
            
            // Add to form data
            formData.append(`adgroup_names[${adgroupId}]`, nameField.value);
            formData.append(`adgroup_budgets[${adgroupId}]`, budgetField.value);
                formData.append(`ad_names[${adgroupId}]`, adNameField.value);
            
            // Add landing page URL if it exists and has a value
            if (landingPageField && landingPageField.value) {
                formData.append(`landing_page_urls[${adgroupId}]`, landingPageField.value);
            }
            
            // Add asset assignments
            assetIds.forEach(assetId => {
                formData.append(`asset_assignments[${adgroupId}][]`, assetId);
            });
        }
        
        // Show loading state
        const submitBtn = document.getElementById('submitBtn');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        submitBtn.disabled = true;
        
        try {
            const response = await fetch('/api/create_campaign', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            // Display specific message from the backend
            if (data.success) {
                showToast(data.message || 'Campaign created successfully', 'success');
                
                // Display detailed results for each platform
                if (data.results) {
                    for (const platform in data.results) {
                        const result = data.results[platform];
                        if (result.success) {
                            console.log(`${platform} campaign created: ID ${result.campaign_id}, AdGroup ID: ${result.adset_id}, Ad ID: ${result.ad_id}`);
                        }
                    }
                }
                
                // Reset form after successful submission
                setTimeout(() => {
                    form.reset();
                    updateDynamicFields('');
                    uploadPreview.innerHTML = '';
                    document.getElementById('adgroupsSection').style.display = 'none';
                    adgroupCounter = 1;
                    adgroupAssignments = {};
                    selectedAssets = [];
                    const adgroupsContainer = document.getElementById('adgroupsContainer');
                    if (adgroupsContainer) adgroupsContainer.innerHTML = '';
                }, 2000);
                
            } else {
                // Show specific error message from the backend
                const errorMessage = data.message || data.error || 'An error occurred while creating the campaign';
                showToast(errorMessage, 'error');
                
                // Log detailed errors
                if (data.results) {
                    for (const platform in data.results) {
                        const result = data.results[platform];
                        if (!result.success && result.errors && result.errors.length > 0) {
                            console.error(`${platform} errors:`, result.errors);
                        }
                    }
                }
            }
        } catch (error) {
            const errorMessage = error.message || 'An unexpected error occurred';
            showToast(errorMessage, 'error');
            console.error('Form submission error:', error);
        } finally {
            // Restore button state
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
        }
    });

    // Asset Library Modal Functionality
    const selectFromLibraryBtn = document.getElementById('selectFromLibraryBtn');
    const assetLibraryModal = document.getElementById('assetLibraryModal');
    const libraryAssets = document.getElementById('libraryAssets');
    const selectAssetsBtn = document.getElementById('selectAssetsBtn');
    const libraryTypeFilter = document.getElementById('libraryTypeFilter');
    const librarySearch = document.getElementById('librarySearch');
    let allLibraryAssets = [];
    let selectedLibraryAssets = [];
    
    // Open asset library modal
    selectFromLibraryBtn.addEventListener('click', function() {
        assetLibraryModal.style.display = 'block';
        // Load assets from the library if not already loaded
        if (allLibraryAssets.length === 0) {
            loadLibraryAssets();
        }
    });
    
    // Close modal when clicking close button or outside
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            assetLibraryModal.style.display = 'none';
        });
    });
    
    // Load assets from library
    async function loadLibraryAssets() {
        libraryAssets.innerHTML = '<div class="loading">Loading assets...</div>';
        try {
            const response = await fetch('/api/assets');
            const assets = await response.json();
            
            // Filter to only show approved assets
            allLibraryAssets = assets.filter(asset => asset.status === 'approved');
            
            renderLibraryAssets(allLibraryAssets);
        } catch (error) {
            libraryAssets.innerHTML = '<div class="error">Failed to load assets</div>';
            console.error('Error loading assets:', error);
        }
    }
    
    // Render assets in the library modal
    function renderLibraryAssets(assets) {
        const container = document.getElementById('libraryAssets');
        container.innerHTML = '';
        
        if (!assets || assets.length === 0) {
            container.innerHTML = '<div class="empty-state">No assets found</div>';
            return;
        }
        
        assets.forEach(asset => {
            const assetItem = document.createElement('div');
            assetItem.className = 'library-asset-item';
            assetItem.dataset.id = asset.id;
            assetItem.dataset.type = asset.type;
            assetItem.dataset.status = asset.status;
            
            // Only allow selection of approved assets
            if (asset.status === 'approved') {
                assetItem.classList.add('selectable');
                assetItem.addEventListener('click', () => {
                    assetItem.classList.toggle('selected');
                });
            } else {
                assetItem.classList.add('unavailable');
                assetItem.title = 'Only approved assets can be selected';
            }
            
            // Make asset draggable for adgroup assignment
            assetItem.draggable = asset.status === 'approved';
            assetItem.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', asset.id);
            });
            
            const thumbnail = document.createElement('div');
            thumbnail.className = 'asset-thumbnail';
            
            if (asset.type === 'image') {
                const img = document.createElement('img');
                img.src = asset.thumbnail || asset.file_path;
                img.alt = asset.name;
                thumbnail.appendChild(img);
            } else if (asset.type === 'video') {
                const video = document.createElement('video');
                video.src = asset.file_path;
                video.muted = true;
                video.addEventListener('mouseover', () => video.play());
                video.addEventListener('mouseout', () => video.pause());
                thumbnail.appendChild(video);
            }
            
            const assetInfo = document.createElement('div');
            assetInfo.className = 'asset-info';
            assetInfo.innerHTML = `<div class="asset-name">${asset.name}</div>`;
            
            assetItem.appendChild(thumbnail);
            assetItem.appendChild(assetInfo);
            container.appendChild(assetItem);
        });
    }
    
    // Filter assets by type
    libraryTypeFilter.addEventListener('change', filterLibraryAssets);
    librarySearch.addEventListener('input', debounce(filterLibraryAssets, 300));
    
    function filterLibraryAssets() {
        const typeFilter = libraryTypeFilter.value;
        const searchTerm = librarySearch.value.trim().toLowerCase();
        
        let filteredAssets = allLibraryAssets;
        
        // Apply type filter
        if (typeFilter !== 'all') {
            filteredAssets = filteredAssets.filter(asset => asset.type === typeFilter);
        }
        
        // Apply search filter
        if (searchTerm) {
            filteredAssets = filteredAssets.filter(asset => 
                asset.name.toLowerCase().includes(searchTerm)
            );
        }
        
        renderLibraryAssets(filteredAssets);
    }
    
    // Modify the setupAdgroupsSection function to ensure it only runs once
    function setupAdgroupsSection() {
        // Check if adgroups section already exists
        let adgroupsSection = document.getElementById('adgroupsSection');
        if (adgroupsSection) {
            return adgroupsSection; // Return existing section instead of creating a new one
        }

        // Create the section if it doesn't exist
        adgroupsSection = document.createElement('div');
        adgroupsSection.id = 'adgroupsSection';
        adgroupsSection.className = 'adgroups-section';
        adgroupsSection.style.display = 'none';
        
        // Create a visual connector element between preview assets and adgroups
        const connector = document.createElement('div');
        connector.className = 'drag-connector';
        connector.id = 'dragConnector'; // Add an ID to easily find it later
        connector.innerHTML = `
            <div class="connector-line"></div>
            <div class="connector-text">
                <i class="fas fa-level-down-alt"></i>
                Drag assets down to ad groups
            </div>
        `;
        
        const header = document.createElement('div');
        header.className = 'adgroups-header';
        
        const title = document.createElement('h3');
        title.textContent = 'Configure Ad Groups';
        
        // Add instructions for dragging assets
        const instructions = document.createElement('div');
        instructions.className = 'adgroups-instructions';
        instructions.innerHTML = '<i class="fas fa-info-circle"></i> <strong>Required:</strong> Drag assets from above into your ad groups below. Each ad group must contain at least one asset.';
        
        const controls = document.createElement('div');
        controls.className = 'adgroups-controls';
        
        const addAdgroupBtn = document.createElement('button');
        addAdgroupBtn.type = 'button';
        addAdgroupBtn.className = 'btn btn-primary btn-sm';
        addAdgroupBtn.innerHTML = '<i class="fas fa-plus"></i> Add Ad Group';
        addAdgroupBtn.addEventListener('click', addNewAdgroup);
        
        controls.appendChild(addAdgroupBtn);
        header.appendChild(title);
        header.appendChild(controls);
        
        // Insert instructions after the header
        adgroupsSection.appendChild(header);
        adgroupsSection.appendChild(instructions);
        
        const adgroupsContainer = document.createElement('div');
        adgroupsContainer.id = 'adgroupsContainer';
        adgroupsContainer.className = 'adgroups-container';
        
        adgroupsSection.appendChild(adgroupsContainer);
        
        // Insert the connector before the adgroups section
        const uploadPreviewParent = uploadPreview.parentNode;
        uploadPreviewParent.parentNode.insertBefore(connector, uploadPreviewParent.nextSibling);
        uploadPreviewParent.parentNode.insertBefore(adgroupsSection, connector.nextSibling);
        
        return adgroupsSection;
    }
    
    function addNewAdgroup() {
        const adgroupsContainer = document.getElementById('adgroupsContainer');
        const adgroupId = `adgroup-${adgroupCounter++}`;
        
        // Create new adgroup container
        const adgroupElem = document.createElement('div');
        adgroupElem.className = 'adgroup-item';
        adgroupElem.dataset.adgroupId = adgroupId;
        
        // Create adgroup header with input field and remove button
        const adgroupHeader = document.createElement('div');
        adgroupHeader.className = 'adgroup-header';
        
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'form-control adgroup-name';
        nameInput.name = `adgroup_names[${adgroupId}]`;
        nameInput.placeholder = `Ad Group ${adgroupCounter-1} Name`;
        nameInput.required = true;
        
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'btn btn-danger btn-sm';
        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
        removeBtn.addEventListener('click', () => removeAdgroup(adgroupId));
        
        adgroupHeader.appendChild(nameInput);
        adgroupHeader.appendChild(removeBtn);
        
        // Create adgroup settings container
        const settingsContainer = document.createElement('div');
        settingsContainer.className = 'adgroup-settings';
        
        // Create budget input
        const budgetContainer = document.createElement('div');
        budgetContainer.className = 'budget-container';
        
        const budgetLabel = document.createElement('label');
        budgetLabel.className = 'form-label';
        budgetLabel.textContent = 'Daily Budget';
        
        const budgetInput = document.createElement('input');
        budgetInput.type = 'number';
        budgetInput.className = 'form-control adgroup-budget';
        budgetInput.name = `adgroup_budgets[${adgroupId}]`;
        budgetInput.placeholder = 'Enter daily budget';
        budgetInput.min = '1';
        budgetInput.required = true;
        
        budgetContainer.appendChild(budgetLabel);
        budgetContainer.appendChild(budgetInput);
        
        // Add country selection dropdown
        const countryContainer = document.createElement('div');
        countryContainer.className = 'country-container';
        
        const countryLabel = document.createElement('label');
        countryLabel.className = 'form-label';
        countryLabel.textContent = 'Target Country';
        
        const countrySelect = document.createElement('select');
        countrySelect.className = 'form-control adgroup-country';
        countrySelect.name = `adgroup_countries[${adgroupId}]`;
        countrySelect.required = true;
        
        // Add placeholder option
        const placeholderOption = document.createElement('option');
        placeholderOption.value = '';
        placeholderOption.textContent = 'Select target country';
        countrySelect.appendChild(placeholderOption);
        
        // Add country options
        const countries = [
            { name: 'United States', meta: 'US', tiktok: '7' },
            { name: 'Turkey', meta: 'TR', tiktok: '298795' },
            { name: 'Brazil', meta: 'BR', tiktok: '31' },
            { name: 'United Arab Emirates', meta: 'AE', tiktok: '298796' },
            { name: 'Australia', meta: 'AU', tiktok: '12' },
            { name: 'Netherlands', meta: 'NL', tiktok: '178' },
            { name: 'Vietnam', meta: 'VN', tiktok: '306' },
            { name: 'Argentina', meta: 'AR', tiktok: '10' }
        ];
        
        countries.forEach(country => {
            const option = document.createElement('option');
            option.value = country.name;
            option.dataset.metaCode = country.meta;
            option.dataset.tiktokCode = country.tiktok;
            option.textContent = country.name;
            countrySelect.appendChild(option);
        });
        
        countryContainer.appendChild(countryLabel);
        countryContainer.appendChild(countrySelect);

        // Add containers to settings in the correct order
        settingsContainer.appendChild(budgetContainer);
        settingsContainer.appendChild(countryContainer);

        // Create landing page URL input (for TikTok and Meta iOS Onelink)
        const landingPageContainer = document.createElement('div');
        landingPageContainer.className = 'landing-page-container';
        landingPageContainer.style.display = 'none'; // Hidden by default, will be shown by updateLandingPageVisibility
        
        const landingPageLabel = document.createElement('label');
        landingPageLabel.className = 'form-label';
        landingPageLabel.textContent = 'Landing Page URL';
        
        const landingPageInput = document.createElement('input');
        landingPageInput.type = 'url';
        landingPageInput.className = 'form-control landing-page-url';
        landingPageInput.name = `landing_page_urls[${adgroupId}]`;
        landingPageInput.placeholder = 'Enter Landing Page URL';
        
        // Add event listener to track user edits
        landingPageInput.addEventListener('input', function() {
            this.dataset.userEdited = 'true';
        });
        
        const landingPageHelp = document.createElement('small');
        landingPageHelp.className = 'form-text text-muted';
        landingPageHelp.textContent = 'Optional: Enter a custom landing page URL with tracking parameters';
        
        landingPageContainer.appendChild(landingPageLabel);
        landingPageContainer.appendChild(landingPageInput);
        landingPageContainer.appendChild(landingPageHelp);
        
        settingsContainer.appendChild(landingPageContainer);
        
        // Create ads container
        const adsContainer = document.createElement('div');
        adsContainer.className = 'ads-container';
        adsContainer.dataset.adgroupId = adgroupId;
        
        // Add a header for the ads section
        const adsHeader = document.createElement('div');
        adsHeader.className = 'ads-header';
        
        const adsTitle = document.createElement('h4');
        adsTitle.textContent = 'Ads';
        
        const addAdBtn = document.createElement('button');
        addAdBtn.type = 'button';
        addAdBtn.className = 'btn btn-secondary btn-sm';
        addAdBtn.innerHTML = '<i class="fas fa-plus"></i> Add Ad';
        addAdBtn.addEventListener('click', () => addNewAd(adgroupId));
        
        adsHeader.appendChild(adsTitle);
        adsHeader.appendChild(addAdBtn);
        
        adsContainer.appendChild(adsHeader);
        
        // Add the first ad by default
        const adCounter = 1;
        const adId = `${adgroupId}-ad-${adCounter}`;
        
        // Create ad container
        const adElem = document.createElement('div');
        adElem.className = 'ad-item';
        adElem.dataset.adId = adId;
        
        // Create ad header with name input and remove button
        const adHeader = document.createElement('div');
        adHeader.className = 'ad-header';
        
        const adNameLabel = document.createElement('label');
        adNameLabel.className = 'form-label';
        adNameLabel.textContent = 'Ad Name';
        
        const adNameInput = document.createElement('input');
        adNameInput.type = 'text';
        adNameInput.className = 'form-control ad-name';
        adNameInput.name = `ad_names[${adId}]`;
        adNameInput.placeholder = 'Enter Ad Name';
        adNameInput.required = true;
        
        const removeAdBtn = document.createElement('button');
        removeAdBtn.type = 'button';
        removeAdBtn.className = 'btn btn-danger btn-sm';
        removeAdBtn.innerHTML = '<i class="fas fa-times"></i>';
        removeAdBtn.addEventListener('click', () => removeAd(adId));
        removeAdBtn.style.display = 'none'; // Hide remove button for the first ad
        
        adHeader.appendChild(adNameLabel);
        adHeader.appendChild(adNameInput);
        adHeader.appendChild(removeAdBtn);
        
        // Create landing page URL input for this ad
        const adLandingPageContainer = document.createElement('div');
        adLandingPageContainer.className = 'landing-page-container ad-landing-page';
        adLandingPageContainer.style.display = 'none'; // Hidden by default, will be shown by updateLandingPageVisibility
        
        const adLandingPageLabel = document.createElement('label');
        adLandingPageLabel.className = 'form-label';
        adLandingPageLabel.textContent = 'Ad Landing Page URL';
        
        const adLandingPageInput = document.createElement('input');
        adLandingPageInput.type = 'url';
        adLandingPageInput.className = 'form-control landing-page-url';
        adLandingPageInput.name = `ad_landing_page_urls[${adId}]`;
        adLandingPageInput.placeholder = 'Enter Landing Page URL for this Ad';
        
        // Add event listener to track user edits
        adLandingPageInput.addEventListener('input', function() {
            this.dataset.userEdited = 'true';
        });
        
        const adLandingPageHelp = document.createElement('small');
        adLandingPageHelp.className = 'form-text text-muted';
        adLandingPageHelp.textContent = 'Optional: Enter a custom landing page URL with tracking parameters for this ad';
        
        adLandingPageContainer.appendChild(adLandingPageLabel);
        adLandingPageContainer.appendChild(adLandingPageInput);
        adLandingPageContainer.appendChild(adLandingPageHelp);
        
        // Create ad assets container (drop zone)
        const adAssetsContainer = document.createElement('div');
        adAssetsContainer.className = 'ad-assets';
        adAssetsContainer.innerHTML = '<div class="drop-placeholder">Drag assets here <i class="fas fa-arrow-down"></i></div>';
        adAssetsContainer.dataset.adId = adId;
        
        // Set up as a drop zone
        adAssetsContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            adAssetsContainer.classList.add('drag-over');
        });
        
        adAssetsContainer.addEventListener('dragleave', () => {
            adAssetsContainer.classList.remove('drag-over');
        });
        
        adAssetsContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            adAssetsContainer.classList.remove('drag-over');
            
            // Get the asset ID being dropped
            const assetId = e.dataTransfer.getData('text/plain');
            if (!assetId) return;
            
            // Move the asset to this ad
            moveAssetToAd(assetId, adId);
        });
        
        adElem.appendChild(adHeader);
        adElem.appendChild(adLandingPageContainer);
        adElem.appendChild(adAssetsContainer);
        
        adsContainer.appendChild(adElem);
        
        // Store the ad counter for this adgroup
        adsContainer.dataset.adCounter = adCounter;
        
        // Add animated arrow indicator when adgroup is first created
        const dropIndicator = document.createElement('div');
        dropIndicator.className = 'drop-indicator';
        dropIndicator.innerHTML = '<i class="fas fa-long-arrow-alt-down"></i>';
        adElem.appendChild(dropIndicator);
        
        // Remove the animation after 5 seconds
        setTimeout(() => {
            if (dropIndicator && dropIndicator.parentNode) {
                dropIndicator.classList.add('fade-out');
                setTimeout(() => {
                    if (dropIndicator && dropIndicator.parentNode) {
                        dropIndicator.parentNode.removeChild(dropIndicator);
                    }
                }, 1000);
            }
        }, 5000);
        
        // Assemble the adgroup
        adgroupElem.appendChild(adgroupHeader);
        adgroupElem.appendChild(settingsContainer);
        adgroupElem.appendChild(adsContainer);
        
        // Add the adgroup to the container
        adgroupsContainer.appendChild(adgroupElem);
        
        // Show the adgroups section if it was hidden
        document.getElementById('adgroupsSection').style.display = 'block';
        
        // Add the first ad to the adgroup
        addNewAd(adgroupId);
        
        // Update landing page visibility based on current platform and template
        updateLandingPageVisibility();
        
        // Update the assignment status of all assets
        updateAssetAssignmentStatus();
        
        return adgroupId;
    }
    
    // Function to add a new ad to an adgroup
    function addNewAd(adgroupId) {
        const adsContainer = document.querySelector(`.ads-container[data-adgroup-id="${adgroupId}"]`);
        let adCounter = parseInt(adsContainer.dataset.adCounter || 1);
        adCounter++;
        adsContainer.dataset.adCounter = adCounter;
        
        const adId = `${adgroupId}-ad-${adCounter}`;
        
        // Create ad container
        const adElem = document.createElement('div');
        adElem.className = 'ad-item';
        adElem.dataset.adId = adId;
        
        // Create ad header with name input and remove button
        const adHeader = document.createElement('div');
        adHeader.className = 'ad-header';
        
        const adNameLabel = document.createElement('label');
        adNameLabel.className = 'form-label';
        adNameLabel.textContent = 'Ad Name';
        
        const adNameInput = document.createElement('input');
        adNameInput.type = 'text';
        adNameInput.className = 'form-control ad-name';
        adNameInput.name = `ad_names[${adId}]`;
        adNameInput.placeholder = 'Enter Ad Name';
        adNameInput.required = true;
        
        const removeAdBtn = document.createElement('button');
        removeAdBtn.type = 'button';
        removeAdBtn.className = 'btn btn-danger btn-sm';
        removeAdBtn.innerHTML = '<i class="fas fa-times"></i>';
        removeAdBtn.addEventListener('click', () => removeAd(adId));
        
        adHeader.appendChild(adNameLabel);
        adHeader.appendChild(adNameInput);
        adHeader.appendChild(removeAdBtn);
        
        // Create landing page URL input for this ad
        const adLandingPageContainer = document.createElement('div');
        adLandingPageContainer.className = 'landing-page-container ad-landing-page';
        adLandingPageContainer.style.display = 'none'; // Hidden by default, will be shown by updateLandingPageVisibility
        
        const adLandingPageLabel = document.createElement('label');
        adLandingPageLabel.className = 'form-label';
        adLandingPageLabel.textContent = 'Ad Landing Page URL';
        
        const adLandingPageInput = document.createElement('input');
        adLandingPageInput.type = 'url';
        adLandingPageInput.className = 'form-control landing-page-url';
        adLandingPageInput.name = `ad_landing_page_urls[${adId}]`;
        adLandingPageInput.placeholder = 'Enter Landing Page URL for this Ad';
        
        // Add event listener to track user edits
        adLandingPageInput.addEventListener('input', function() {
            this.dataset.userEdited = 'true';
        });
        
        const adLandingPageHelp = document.createElement('small');
        adLandingPageHelp.className = 'form-text text-muted';
        adLandingPageHelp.textContent = 'Optional: Enter a custom landing page URL with tracking parameters for this ad';
        
        adLandingPageContainer.appendChild(adLandingPageLabel);
        adLandingPageContainer.appendChild(adLandingPageInput);
        adLandingPageContainer.appendChild(adLandingPageHelp);
        
        // Create ad assets container (drop zone)
        const adAssetsContainer = document.createElement('div');
        adAssetsContainer.className = 'ad-assets';
        adAssetsContainer.innerHTML = '<div class="drop-placeholder">Drag assets here <i class="fas fa-arrow-down"></i></div>';
        adAssetsContainer.dataset.adId = adId;
        
        // Set up as a drop zone
        adAssetsContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            adAssetsContainer.classList.add('drag-over');
        });
        
        adAssetsContainer.addEventListener('dragleave', () => {
            adAssetsContainer.classList.remove('drag-over');
        });
        
        adAssetsContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            adAssetsContainer.classList.remove('drag-over');
            
            // Get the asset ID being dropped
            const assetId = e.dataTransfer.getData('text/plain');
            if (!assetId) return;
            
            // Move the asset to this ad
            moveAssetToAd(assetId, adId);
        });
        
        adElem.appendChild(adHeader);
        adElem.appendChild(adLandingPageContainer);
        adElem.appendChild(adAssetsContainer);
        
        adsContainer.appendChild(adElem);
        
        return adElem;
    }
    
    // Function to remove an ad
    function removeAd(adId) {
        const adElem = document.querySelector(`.ad-item[data-ad-id="${adId}"]`);
        if (!adElem) return;
        
        // Get all assets in this ad and move them back to the preview
        const assetElems = adElem.querySelectorAll('.mini-asset');
        assetElems.forEach(assetElem => {
            const assetId = assetElem.dataset.assetId;
            moveAssetFromAd(assetId, adId);
        });
        
        // Remove the ad element
        adElem.parentNode.removeChild(adElem);
        
        // Update the assignment status of all assets
        updateAssetAssignmentStatus();
    }
    
    // Function to move an asset to a specific ad
    function moveAssetToAd(assetId, adId) {
        // Get the asset element
        const assetElem = document.querySelector(`.preview-item[data-id="${assetId}"]`);
        if (!assetElem) return;
        
        // Check if the asset is already in an ad
        const existingAdAsset = document.querySelector(`.mini-asset[data-asset-id="${assetId}"]`);
        if (existingAdAsset) {
            // Remove from current ad
            const currentAdId = existingAdAsset.closest('.ad-assets').dataset.adId;
            moveAssetFromAd(assetId, currentAdId);
        }
        
        // Get the ad assets container
        const adAssetsContainer = document.querySelector(`.ad-assets[data-ad-id="${adId}"]`);
        if (!adAssetsContainer) return;
        
        // Remove the placeholder if it exists
        const placeholder = adAssetsContainer.querySelector('.drop-placeholder');
            if (placeholder) {
            adAssetsContainer.removeChild(placeholder);
            }
            
        // Create a mini version of the asset for the ad
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
            moveAssetFromAd(assetId, adId);
        });
        
        miniAsset.appendChild(removeBtn);
        adAssetsContainer.appendChild(miniAsset);
        
        // Mark the asset as assigned
        assetElem.classList.add('assigned');
        
        // Add a hidden input to track the assignment
        const hiddenInput = document.createElement('input');
        hiddenInput.type = 'hidden';
        hiddenInput.name = `asset_assignments[${adId}][]`;
        hiddenInput.value = assetId;
        adAssetsContainer.appendChild(hiddenInput);
        
        // Update the assignment status of all assets
            updateAssetAssignmentStatus();
        }
    
    // Function to move an asset from an ad back to the preview
    function moveAssetFromAd(assetId, adId) {
        // Get the mini asset element
        const miniAsset = document.querySelector(`.ad-assets[data-ad-id="${adId}"] .mini-asset[data-asset-id="${assetId}"]`);
        if (!miniAsset) return;
        
        // Get the ad assets container
        const adAssetsContainer = miniAsset.parentNode;
        
        // Remove the mini asset
        adAssetsContainer.removeChild(miniAsset);
        
        // Remove the hidden input
        const hiddenInput = adAssetsContainer.querySelector(`input[name="asset_assignments[${adId}][]"][value="${assetId}"]`);
        if (hiddenInput) {
            adAssetsContainer.removeChild(hiddenInput);
        }
        
        // Add the placeholder if there are no more assets
        if (!adAssetsContainer.querySelector('.mini-asset')) {
            const placeholder = document.createElement('div');
            placeholder.className = 'drop-placeholder';
            placeholder.innerHTML = 'Drag assets here <i class="fas fa-arrow-down"></i>';
            adAssetsContainer.appendChild(placeholder);
        }
        
        // Check if the asset is assigned to any other ads
        const otherAssignments = document.querySelectorAll(`.mini-asset[data-asset-id="${assetId}"]`);
        if (otherAssignments.length === 0) {
            // If not assigned to any other ads, mark as unassigned
            const assetElem = document.querySelector(`.preview-item[data-id="${assetId}"]`);
            if (assetElem) {
                assetElem.classList.remove('assigned');
            }
        }
        
        // Update the assignment status of all assets
        updateAssetAssignmentStatus();
    }

    // Function to update the assignment status of all assets
    function updateAssetAssignmentStatus() {
        // Get all assets
        const assets = document.querySelectorAll('.preview-item');
        
        // Reset all assets to unassigned
        assets.forEach(asset => {
            asset.classList.remove('assigned');
            
            // Remove any existing status indicator
            const existingStatus = asset.querySelector('.assignment-status');
            if (existingStatus) {
                existingStatus.remove();
            }
        });
        
        // Check all ads for assigned assets
        const adAssets = document.querySelectorAll('.ad-assets .mini-asset');
        const assignedAssetIds = new Set();
        
        adAssets.forEach(miniAsset => {
            const assetId = miniAsset.dataset.assetId;
            assignedAssetIds.add(assetId);
            
            // Mark the original asset as assigned
            const originalAsset = document.querySelector(`.preview-item[data-id="${assetId}"]`);
            if (originalAsset) {
                originalAsset.classList.add('assigned');
            }
        });
        
        // Add status indicators to all assets
        assets.forEach(asset => {
            const assetId = asset.dataset.id;
            const isAssigned = assignedAssetIds.has(assetId);
            
            // Create status indicator
            const statusIndicator = document.createElement('div');
            statusIndicator.className = `assignment-status ${isAssigned ? 'status-assigned' : 'status-unassigned'}`;
            
            if (isAssigned) {
                statusIndicator.innerHTML = '<i class="fas fa-check-circle"></i> Assigned';
            } else {
                statusIndicator.innerHTML = '<i class="fas fa-exclamation-circle"></i> Unassigned';
            }
            
            // Add to asset
            asset.appendChild(statusIndicator);
        });
        
        // Check if any adgroups have no assets assigned
        const adgroups = document.querySelectorAll('.adgroup-item');
        adgroups.forEach(adgroup => {
            const adgroupId = adgroup.dataset.adgroupId;
            const ads = adgroup.querySelectorAll('.ad-item');
            
            // Check if any ad in this adgroup has assets
            let hasAssets = false;
            ads.forEach(ad => {
                const adAssets = ad.querySelectorAll('.mini-asset');
                if (adAssets.length > 0) {
                    hasAssets = true;
                }
            });
            
            // Highlight adgroup if it has no assets
            if (!hasAssets) {
                adgroup.classList.add('highlight-empty');
            } else {
                adgroup.classList.remove('highlight-empty');
            }
        });
        
        // Update the submit button state
        updateSubmitButtonState();
    }

    // Function to update the submit button state
    function updateSubmitButtonState() {
        const submitBtn = document.getElementById('submitBtn');
        if (!submitBtn) return;
        
        // Check if any adgroups have no assets assigned
        const adgroups = document.querySelectorAll('.adgroup-item');
        let allAdgroupsHaveAssets = true;
        
        adgroups.forEach(adgroup => {
            const ads = adgroup.querySelectorAll('.ad-item');
            
            // Check if any ad in this adgroup has assets
            let adgroupHasAssets = false;
            ads.forEach(ad => {
                const adAssets = ad.querySelectorAll('.mini-asset');
                if (adAssets.length > 0) {
                    adgroupHasAssets = true;
                }
            });
            
            if (!adgroupHasAssets) {
                allAdgroupsHaveAssets = false;
            }
        });
        
        // Enable/disable submit button
        if (adgroups.length > 0 && allAdgroupsHaveAssets) {
            submitBtn.disabled = false;
            submitBtn.title = '';
        } else if (adgroups.length === 0) {
            submitBtn.disabled = true;
            submitBtn.title = 'Please add at least one ad group';
        } else {
            submitBtn.disabled = true;
            submitBtn.title = 'Please assign at least one asset to each ad group';
        }
    }

    // Modify the selectAssetsBtn click handler
    document.getElementById('selectAssetsBtn').addEventListener('click', () => {
        const selectedAssetElements = document.querySelectorAll('#libraryAssets .library-asset-item.selected');
        if (selectedAssetElements.length === 0) {
            showToast('Please select at least one asset', 'error');
            return;
        }
        
        // Hide the modal
        document.getElementById('assetLibraryModal').style.display = 'none';
        
        // Process selected assets - Add to existing assets, don't clear the preview
        selectedAssets = selectedAssets || [];
        
        selectedAssetElements.forEach(assetElem => {
            const assetId = assetElem.dataset.id;
            
            // Skip if this asset is already in the preview
            if (document.querySelector(`.preview-item[data-id="${assetId}"]`)) {
                return;
            }
            
            const assetType = assetElem.dataset.type;
            const assetName = assetElem.querySelector('.asset-name').textContent;
            
            // Create asset preview
            const previewItem = document.createElement('div');
            previewItem.className = 'preview-item asset-preview';
            previewItem.dataset.id = assetId;
            previewItem.dataset.type = assetType;
            
            // Create the content container first
            const contentContainer = document.createElement('div');
            contentContainer.className = 'asset-content';
            
            // Add the content based on asset type
            if (assetType === 'image') {
                const img = document.createElement('img');
                img.src = assetElem.querySelector('img').src;
                img.alt = assetName;
                contentContainer.appendChild(img);
            } else if (assetType === 'video') {
                const video = document.createElement('video');
                video.src = assetElem.querySelector('video').src;
                video.muted = true;
                video.controls = true;
                contentContainer.appendChild(video);
            }
            
            // Add the content container to the preview item
            previewItem.appendChild(contentContainer);
            
            // Add remove button
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn';
            removeBtn.innerHTML = '×';
            removeBtn.title = "Remove asset";
            
            // Stop propagation to prevent drag events from interfering
            removeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Remove the asset from all adgroups first
                Object.keys(adgroupAssignments).forEach(adgroupId => {
                    if (adgroupAssignments[adgroupId].includes(assetId)) {
                        moveAssetFromAd(assetId, adgroupId);
                    }
                });
                
                // Remove the preview item
                previewItem.parentNode.removeChild(previewItem);
                
                // Remove from selected assets
                selectedAssets = selectedAssets.filter(id => id !== assetId);
                
                // Hide adgroups section if no assets left
                if (uploadPreview.childElementCount === 0) {
                    const adgroupsSection = document.getElementById('adgroupsSection');
                    if (adgroupsSection) adgroupsSection.style.display = 'none';
                    
                    const connector = document.getElementById('dragConnector');
                    if (connector) connector.style.display = 'none';
                }
            });
            
            // Add the remove button to the preview item
            previewItem.appendChild(removeBtn);
            
            // Add visual indicator for assignment status
            const statusBadge = document.createElement('div');
            statusBadge.className = 'assignment-status status-unassigned';
            statusBadge.innerHTML = '<i class="fas fa-exclamation-circle"></i> Unassigned';
            previewItem.appendChild(statusBadge);
            
            // Add a visual drag handle and indicator
            const dragHandle = document.createElement('div');
            dragHandle.className = 'drag-handle';
            dragHandle.innerHTML = '<i class="fas fa-grip-vertical"></i><span class="drag-tooltip">Drag to Ad Group</span>';
            previewItem.appendChild(dragHandle);
            
            // Make preview item draggable
            previewItem.draggable = true;
            previewItem.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', assetId);
                previewItem.classList.add('dragging');
            });
            
            previewItem.addEventListener('dragend', () => {
                previewItem.classList.remove('dragging');
            });
            
            // Add hidden input for form submission
            const hiddenInput = document.createElement('input');
            hiddenInput.type = 'hidden';
            hiddenInput.name = 'library_assets[]';
            hiddenInput.value = assetId;
            previewItem.appendChild(hiddenInput);
            
            uploadPreview.appendChild(previewItem);
            selectedAssets.push(assetId);
        });
        
        // Show adgroups section if there are assets
        if (uploadPreview.childElementCount > 0) {
            // Get the existing or create a new adgroups section
            const adgroupsSection = setupAdgroupsSection();
            adgroupsSection.style.display = 'block';
            
            // Show the connector
            const connector = document.getElementById('dragConnector');
            if (connector) connector.style.display = 'flex';
            
            // Make sure we have at least one adgroup
            if (document.querySelectorAll('.adgroup-item').length === 0) {
                addNewAdgroup();
            }
            
            // Update the asset assignment status indicators
            updateAssetAssignmentStatus();
        }
    });

    // Show/hide platform-specific account sections based on platform selection
    const tiktokAccountSection = document.getElementById('tiktokAccountSection');
    const metaAccountSection = document.getElementById('metaAccountSection');
    const tiktokAdvertiserId = document.getElementById('tiktokAdvertiserId');
    const metaAdvertiserId = document.getElementById('metaAdvertiserId');
    
    // Add event listeners to advertiser account dropdowns
    tiktokAdvertiserId.addEventListener('change', updateLandingPageVisibility);
    metaAdvertiserId.addEventListener('change', updateLandingPageVisibility);
    
    platformCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            // Check if TikTok platform is selected
            const isTikTokSelected = Array.from(platformCheckboxes)
                .find(cb => cb.value === 'tiktok')?.checked || false;
            
            // Check if Meta platform is selected
            const isMetaSelected = Array.from(platformCheckboxes)
                .find(cb => cb.value === 'meta')?.checked || false;
            
            // Show/hide TikTok account section
            tiktokAccountSection.style.display = isTikTokSelected ? 'block' : 'none';
            
            // Show/hide Meta account section
            metaAccountSection.style.display = isMetaSelected ? 'block' : 'none';
            
            // If TikTok is not selected, reset the account selection
            if (!isTikTokSelected) {
                document.getElementById('tiktokAdvertiserId').value = '';
            }
            
            // If Meta is not selected, reset the account selection
            if (!isMetaSelected) {
                document.getElementById('metaAdvertiserId').value = '';
            }
            
            // Show/hide landing page URL fields based on platform
            updateLandingPageVisibility();
        });
    });
    
    // Also update landing page visibility when template changes
    document.getElementById('template').addEventListener('change', updateLandingPageVisibility);
    
    // Function to update landing page URL field visibility
    function updateLandingPageVisibility() {
        const isTikTokSelected = Array.from(platformCheckboxes)
            .find(cb => cb.value === 'tiktok')?.checked || false;
        const isMetaSelected = Array.from(platformCheckboxes)
            .find(cb => cb.value === 'meta')?.checked || false;
        const template = document.getElementById('template').value;
        
        // Get all landing page containers
        const adgroupLandingPageContainers = document.querySelectorAll('.landing-page-container:not(.ad-landing-page)');
        const adLandingPageContainers = document.querySelectorAll('.landing-page-container.ad-landing-page');
        
        // Show landing page URL field based on platform and template
        const showTikTokLandingPage = isTikTokSelected && template === 'ios_onelink';
        const showMetaLandingPage = isMetaSelected && template === 'ios_onelink';
        
        // For iOS Onelink, only show ad-level landing page URLs
        adgroupLandingPageContainers.forEach(container => {
            container.style.display = 'none';  // Always hide adgroup-level landing page URLs for iOS Onelink
        });
        
        // For both TikTok and Meta iOS Onelink, show ad-level landing page URLs
        adLandingPageContainers.forEach(container => {
            container.style.display = (showTikTokLandingPage || showMetaLandingPage) ? 'block' : 'none';
        });
        
        // If showing landing page fields, fetch and display the default URL from selected advertiser account
        if (showTikTokLandingPage) {
            // Get the selected advertiser ID
            const advertiserId = document.getElementById('tiktokAdvertiserId').value;
            
            // Make an AJAX request to get the default landing page URL for this advertiser
            if (advertiserId) {
                // Show loading state in all ad-level landing page URL fields
                const adLandingPageInputs = document.querySelectorAll('.landing-page-container.ad-landing-page .landing-page-url');
                adLandingPageInputs.forEach(input => {
                    input.placeholder = 'Loading default URL...';
                    // Only clear the value if it's not already set by the user
                    if (input.dataset.userEdited !== 'true') {
                        input.value = '';
                    }
                });
                
                // Fetch default URL from TikTok account config
                fetch(`/api/tiktok/account_details?advertiser_id=${advertiserId}`)
                    .then(response => response.json())
                    .then(data => {
                        if (data.success && data.account_details && data.account_details.landing_page_url) {
                            // Update all landing page URL fields with the default URL
                            adLandingPageInputs.forEach(input => {
                                // Only update if the user hasn't edited it
                                if (input.dataset.userEdited !== 'true') {
                                    input.value = data.account_details.landing_page_url;
                                }
                                input.placeholder = 'Enter landing page URL';
                            });
                        } else {
                            // Set a generic placeholder
                            adLandingPageInputs.forEach(input => {
                                input.placeholder = 'Enter landing page URL';
                            });
                        }
                    })
                    .catch(error => {
                        console.error('Error fetching account details:', error);
                        // Set a generic placeholder
                        adLandingPageInputs.forEach(input => {
                            input.placeholder = 'Enter landing page URL';
                        });
                    });
            }
        } else if (showMetaLandingPage) {
            // Get the selected advertiser ID
            const advertiserId = document.getElementById('metaAdvertiserId').value;
            
            // Make an AJAX request to get the default landing page URL for this advertiser
            if (advertiserId) {
                // Show loading state in all landing page URL fields (both adgroup and ad level)
                const allLandingPageInputs = document.querySelectorAll('.landing-page-url');
                allLandingPageInputs.forEach(input => {
                    input.placeholder = 'Loading default URL...';
                    // Only clear the value if it's not already set by the user
                    if (input.dataset.userEdited !== 'true') {
                        input.value = '';
                    }
                });
                
                // Fetch default URL from Meta account config
                fetch(`/api/meta/account_details?account_id=${advertiserId}`)
                    .then(response => response.json())
                    .then(data => {
                        if (data.success && data.account_details && data.account_details.link_url) {
                            // Update all landing page URL fields with the default URL
                            allLandingPageInputs.forEach(input => {
                                // Only update if the user hasn't edited it
                                if (input.dataset.userEdited !== 'true') {
                                    input.value = data.account_details.link_url;
                                }
                                input.placeholder = 'Enter landing page URL';
                            });
                        } else {
                            // Set a generic placeholder
                            allLandingPageInputs.forEach(input => {
                                input.placeholder = 'Enter landing page URL';
                            });
                        }
                    })
                    .catch(error => {
                        console.error('Error fetching account details:', error);
                        // Set a generic placeholder
                        allLandingPageInputs.forEach(input => {
                            input.placeholder = 'Enter landing page URL';
                        });
                    });
            }
        }
    }

    // Initialize landing page visibility
    updateLandingPageVisibility();

    // Function to remove an adgroup
    function removeAdgroup(adgroupId) {
        const adgroupElem = document.querySelector(`.adgroup-item[data-adgroup-id="${adgroupId}"]`);
        if (!adgroupElem) return;
        
        // Get all ads in this adgroup
        const adElems = adgroupElem.querySelectorAll('.ad-item');
        
        // For each ad, move its assets back to the preview
        adElems.forEach(adElem => {
            const adId = adElem.dataset.adId;
            const assetElems = adElem.querySelectorAll('.mini-asset');
            
            assetElems.forEach(assetElem => {
                const assetId = assetElem.dataset.assetId;
                moveAssetFromAd(assetId, adId);
            });
        });
        
        // Remove the adgroup element
        adgroupElem.parentNode.removeChild(adgroupElem);
        
        // If no adgroups left, hide the section
        const adgroupsContainer = document.getElementById('adgroupsContainer');
        if (adgroupsContainer.children.length === 0) {
            document.getElementById('adgroupsSection').style.display = 'none';
        }
        
        // Update the assignment status of all assets
        updateAssetAssignmentStatus();
    }
}); 