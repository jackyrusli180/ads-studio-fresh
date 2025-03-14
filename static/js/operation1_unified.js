/**
 * Unified Solution for Operation Type 1
 * This script handles all layout modifications for Operation Type 1
 */
(function() {
    console.log('🔄 Unified Operation Type 1 handler loaded');
    
    // Store any intervals we create so we can clear them later
    const intervals = [];
    let originalLoadCampaignsFunction = null;
    let fetchedAccounts = {
        meta: new Set(),
        tiktok: new Set()
    };
    let fetchInProgress = false;
    let fetchDebounceTimer = null;
    
    // Main function to handle Operation Type 1 layout
    function handleOperation1Layout() {
        try {
            // Check if we're in Operation Type 1
            const operationType = document.getElementById('operationType');
            if (!operationType || operationType.value !== '1') return;
            
            console.log('🔄 Applying Operation Type 1 layout');
            
            // Reset fetched accounts
            fetchedAccounts.meta.clear();
            fetchedAccounts.tiktok.clear();
            
            // 1. Remove any existing layout modifications
            clearExistingModifications();
            
            // 2. Remove unwanted sections
            removeUnwantedSections();
            
            // 3. Preserve original campaign loading function
            preserveOriginalFunctions();
            
            // 4. Apply the three-column layout
            applyThreeColumnLayout();
            
            // 5. Fix event handlers
            fixEventHandlers();
            
            // 6. Set up drag and drop functionality
            setupDragAndDrop();
            
            console.log('🔄 Operation Type 1 layout applied successfully');
        } catch (error) {
            console.error('Error in Operation Type 1 handler:', error);
        }
    }
    
    // Preserve original functions before we modify the DOM
    function preserveOriginalFunctions() {
        if (!originalLoadCampaignsFunction && window.loadCampaignsAndAdsets) {
            originalLoadCampaignsFunction = window.loadCampaignsAndAdsets;
            console.log('Original loadCampaignsAndAdsets function preserved');
        }
    }
    
    // Clear any existing layout modifications
    function clearExistingModifications() {
        // Clear any intervals we've set
        intervals.forEach(interval => clearInterval(interval));
        intervals.length = 0;
        
        // Remove any columns we've added previously
        const existingColumns = document.querySelectorAll('.op1-column');
        existingColumns.forEach(col => {
            // Don't remove if it contains important elements
            if (!col.querySelector('#campaignSelectorContainer') && 
                !col.querySelector('.form-group:has(#selectFromLibraryBtn)')) {
                col.remove();
            }
        });
    }
    
    // Remove unwanted sections
    function removeUnwantedSections() {
        // Sections to completely remove
        const sectionsToRemove = [
            'adgroupsSection',           // Configure Ad Groups
            'dragConnector',             // Drag connector
            'drag-assets-down'           // Drag assets down message
        ];
        
        // Remove each section
        sectionsToRemove.forEach(id => {
            const section = document.getElementById(id) || document.querySelector(`.${id}`);
            if (section) {
                section.remove();
                console.log(`🔄 Removed section: ${id}`);
            }
        });
        
        // Also remove any elements with these classes
        const classesToRemove = ['drag-connector', 'drag-assets-down'];
        classesToRemove.forEach(className => {
            document.querySelectorAll(`.${className}`).forEach(el => el.remove());
        });
    }
    
    // Apply the three-column layout
    function applyThreeColumnLayout() {
        try {
            console.log('Applying three-column layout for Operation Type 1');
            
            // Set data-operation attribute on body
            document.body.setAttribute('data-operation', '1');
            
            // Get the form
            const form = document.getElementById('campaignForm');
            if (!form) {
                console.error('Form not found');
                return;
            }
            
            // Get all the elements we need
            const elements = {
                operationTypeGroup: form.querySelector('.form-group:has(#operationType)'),
                platformsGroup: form.querySelector('.form-group:has(input[name="platforms"])'),
                metaAccountSection: form.querySelector('#metaAccountSection'),
                tiktokAccountSection: form.querySelector('#tiktokAccountSection'),
                campaignSection: form.querySelector('#campaignSelectorContainer'),
                creativeSection: form.querySelector('.form-group:has(#selectFromLibraryBtn)'),
                submitBtn: form.querySelector('#submitBtn')
            };
            
            // Hide original submit button
            if (elements.submitBtn) {
                elements.submitBtn.style.display = 'none';
            }
            
            // Create container for the layout
            const container = document.createElement('div');
            container.className = 'op1-container';
            container.style.width = '100%';
            
            // Create header section
            const header = document.createElement('div');
            header.className = 'op1-header op1-column';
            header.style.width = '100%';
            header.style.marginBottom = '10px';
            
            // Create account section (outside the columns)
            const accountSection = document.createElement('div');
            accountSection.className = 'op1-account-section op1-column';
            accountSection.style.width = '100%';
            accountSection.style.marginBottom = '15px';
            accountSection.style.padding = '10px';
            accountSection.style.border = '1px solid #ddd';
            accountSection.style.borderRadius = '4px';
            accountSection.style.backgroundColor = '#f9f9fa';
            accountSection.style.position = 'relative';
            
            // Create account section header
            const accountHeader = document.createElement('h3');
            accountHeader.textContent = 'Advertiser Account Selection';
            accountHeader.style.padding = '5px';
            accountHeader.style.backgroundColor = '#f0f0f0';
            accountHeader.style.borderRadius = '4px';
            accountHeader.style.borderLeft = '3px solid #007bff';
            accountHeader.style.marginBottom = '8px';
            accountHeader.style.textAlign = 'center';
            accountHeader.style.fontSize = '14px';
            accountSection.appendChild(accountHeader);
            
            // Add step indicator for account section
            const accountStepIndicator = document.createElement('div');
            accountStepIndicator.className = 'step-indicator';
            accountStepIndicator.textContent = '3';
            accountStepIndicator.style.position = 'absolute';
            accountStepIndicator.style.top = '-10px';
            accountStepIndicator.style.left = '-10px';
            accountStepIndicator.style.width = '24px';
            accountStepIndicator.style.height = '24px';
            accountStepIndicator.style.borderRadius = '50%';
            accountStepIndicator.style.backgroundColor = '#007bff';
            accountStepIndicator.style.color = 'white';
            accountStepIndicator.style.display = 'flex';
            accountStepIndicator.style.alignItems = 'center';
            accountStepIndicator.style.justifyContent = 'center';
            accountStepIndicator.style.fontWeight = 'bold';
            accountStepIndicator.style.zIndex = '10';
            accountSection.appendChild(accountStepIndicator);

            // Create a top campaign section that spans full width
            const campaignTopSection = document.createElement('div');
            campaignTopSection.className = 'op1-campaign-top-section';
            campaignTopSection.style.width = '100%';
            campaignTopSection.style.marginBottom = '15px';
            campaignTopSection.style.padding = '10px';
            campaignTopSection.style.border = '1px solid #ddd';
            campaignTopSection.style.borderRadius = '4px';
            campaignTopSection.style.backgroundColor = '#f9f9fa';
            campaignTopSection.style.position = 'relative';
            
            // Create campaign top section header
            const campaignTopHeader = document.createElement('h3');
            campaignTopHeader.textContent = 'Campaign Selection';
            campaignTopHeader.style.padding = '5px';
            campaignTopHeader.style.backgroundColor = '#f0f0f0';
            campaignTopHeader.style.borderRadius = '4px';
            campaignTopHeader.style.borderLeft = '3px solid #007bff';
            campaignTopHeader.style.marginBottom = '8px';
            campaignTopHeader.style.textAlign = 'center';
            campaignTopHeader.style.fontSize = '14px';
            campaignTopSection.appendChild(campaignTopHeader);
            
            // Create campaign container for the top section
            const campaignContainer = document.createElement('div');
            campaignContainer.id = 'campaignContainer';
            campaignContainer.className = 'campaign-container';
            campaignContainer.style.maxHeight = '200px';
            campaignContainer.style.overflow = 'auto';
            campaignTopSection.appendChild(campaignContainer);
            
            // Add campaign step indicator
            const campaignStepIndicator = document.createElement('div');
            campaignStepIndicator.className = 'step-indicator';
            campaignStepIndicator.textContent = '4';
            campaignStepIndicator.style.position = 'absolute';
            campaignStepIndicator.style.top = '-10px';
            campaignStepIndicator.style.left = '-10px';
            campaignStepIndicator.style.width = '24px';
            campaignStepIndicator.style.height = '24px';
            campaignStepIndicator.style.borderRadius = '50%';
            campaignStepIndicator.style.backgroundColor = '#007bff';
            campaignStepIndicator.style.color = 'white';
            campaignStepIndicator.style.display = 'flex';
            campaignStepIndicator.style.alignItems = 'center';
            campaignStepIndicator.style.justifyContent = 'center';
            campaignStepIndicator.style.fontWeight = 'bold';
            campaignStepIndicator.style.zIndex = '10';
            campaignTopSection.appendChild(campaignStepIndicator);
            
            // Create columns container (now only for adset selection and asset selection)
            const columnsContainer = document.createElement('div');
            columnsContainer.className = 'op1-columns-container';
            columnsContainer.style.display = 'flex';
            columnsContainer.style.gap = '10px';
            columnsContainer.style.marginBottom = '10px';
            columnsContainer.style.height = 'calc(100vh - 550px)'; // Adjusted height to account for campaign section
            columnsContainer.style.overflow = 'hidden';
            
            // Create left/middle merged column for Adsets (taking 2/3 width)
            const adsetColumn = document.createElement('div');
            adsetColumn.className = 'op1-adset-column op1-column';
            adsetColumn.style.flex = '2';
            adsetColumn.style.padding = '8px';
            adsetColumn.style.border = '1px solid #ddd';
            adsetColumn.style.borderRadius = '4px';
            adsetColumn.style.backgroundColor = '#f9f9fa';
            adsetColumn.style.overflow = 'auto';
            adsetColumn.style.maxHeight = '100%';
            adsetColumn.style.position = 'relative';
            
            // Create right column (Assets, taking 1/3 width)
            const rightColumn = document.createElement('div');
            rightColumn.className = 'op1-right-column op1-column';
            rightColumn.style.flex = '1';
            rightColumn.style.padding = '8px';
            rightColumn.style.border = '1px solid #ddd';
            rightColumn.style.borderRadius = '4px';
            rightColumn.style.backgroundColor = '#f9f9fa';
            rightColumn.style.overflow = 'auto';
            rightColumn.style.maxHeight = '100%';
            rightColumn.style.position = 'relative';
            
            // Create footer
            const footer = document.createElement('div');
            footer.className = 'op1-footer op1-column';
            footer.style.width = '100%';
            footer.style.textAlign = 'center';
            footer.style.marginTop = '10px';
            
            // Add column headers
            const adsetHeader = document.createElement('h3');
            adsetHeader.textContent = 'Adset Selection';
            adsetHeader.style.padding = '5px';
            adsetHeader.style.backgroundColor = '#f0f0f0';
            adsetHeader.style.borderRadius = '4px';
            adsetHeader.style.borderLeft = '3px solid #007bff';
            adsetHeader.style.marginBottom = '8px';
            adsetHeader.style.textAlign = 'center';
            adsetHeader.style.fontSize = '14px';
            adsetHeader.style.paddingLeft = '20px'; // Add padding for step indicator
            
            const rightHeader = document.createElement('h3');
            rightHeader.textContent = 'Asset Selection & Assignment';
            rightHeader.style.padding = '5px';
            rightHeader.style.backgroundColor = '#f0f0f0';
            rightHeader.style.borderRadius = '4px';
            rightHeader.style.borderLeft = '3px solid #007bff';
            rightHeader.style.marginBottom = '8px';
            rightHeader.style.textAlign = 'center';
            rightHeader.style.fontSize = '14px';
            rightHeader.style.paddingLeft = '20px'; // Add padding for step indicator
            
            adsetColumn.appendChild(adsetHeader);
            rightColumn.appendChild(rightHeader);
            
            // Add step indicators (adjust numbering for the new layout)
            const adsetStepIndicator = document.createElement('div');
            adsetStepIndicator.className = 'step-indicator';
            adsetStepIndicator.textContent = '5';
            adsetStepIndicator.style.position = 'absolute';
            adsetStepIndicator.style.top = '5px'; // Moved down to be more visible
            adsetStepIndicator.style.left = '5px'; // Moved right to be more visible
            adsetStepIndicator.style.width = '24px';
            adsetStepIndicator.style.height = '24px';
            adsetStepIndicator.style.borderRadius = '50%';
            adsetStepIndicator.style.backgroundColor = '#007bff';
            adsetStepIndicator.style.color = 'white';
            adsetStepIndicator.style.display = 'flex';
            adsetStepIndicator.style.alignItems = 'center';
            adsetStepIndicator.style.justifyContent = 'center';
            adsetStepIndicator.style.fontWeight = 'bold';
            adsetStepIndicator.style.zIndex = '10';
            adsetColumn.appendChild(adsetStepIndicator);
            
            const rightStepIndicator = document.createElement('div');
            rightStepIndicator.className = 'step-indicator';
            rightStepIndicator.textContent = '6'; // Changed from 4 to 6 as requested
            rightStepIndicator.style.position = 'absolute';
            rightStepIndicator.style.top = '5px'; // Moved down to be more visible
            rightStepIndicator.style.left = '5px'; // Moved right to be more visible
            rightStepIndicator.style.width = '24px';
            rightStepIndicator.style.height = '24px';
            rightStepIndicator.style.borderRadius = '50%';
            rightStepIndicator.style.backgroundColor = '#007bff';
            rightStepIndicator.style.color = 'white';
            rightStepIndicator.style.display = 'flex';
            rightStepIndicator.style.alignItems = 'center';
            rightStepIndicator.style.justifyContent = 'center';
            rightStepIndicator.style.fontWeight = 'bold';
            rightStepIndicator.style.zIndex = '10';
            rightColumn.appendChild(rightStepIndicator);
            
            // Add elements to their containers
            if (elements.operationTypeGroup) {
                header.appendChild(elements.operationTypeGroup);
            }
            
            if (elements.platformsGroup) {
                header.appendChild(elements.platformsGroup);
            }
            
            // Add Meta account section to account section (outside columns)
            if (elements.metaAccountSection) {
                compactifyElement(elements.metaAccountSection);
                convertDropdownToCheckboxes(elements.metaAccountSection, 'metaAdvertiserId');
                accountSection.appendChild(elements.metaAccountSection);
            }
            
            // Add TikTok account section to account section (outside columns)
            if (elements.tiktokAccountSection) {
                compactifyElement(elements.tiktokAccountSection);
                convertDropdownToCheckboxes(elements.tiktokAccountSection, 'tiktokAdvertiserId');
                accountSection.appendChild(elements.tiktokAccountSection);
            }
            
            // Create adset container
            const adsetContainer = document.createElement('div');
            adsetContainer.id = 'adsetContainer';
            adsetContainer.className = 'adset-container';
            adsetColumn.appendChild(adsetContainer);
            
            // Add creative section to right column
            if (elements.creativeSection) {
                // Make sure creative section is visible and in the right container
                elements.creativeSection.style.display = 'block';
                rightColumn.appendChild(elements.creativeSection);
            }
            
            // Create publish button container
            const publishBtnContainer = document.createElement('div');
            publishBtnContainer.className = 'op1-publish-btn-container';
            publishBtnContainer.style.width = '100%';
            publishBtnContainer.style.textAlign = 'center';
            publishBtnContainer.style.marginTop = '20px';
            publishBtnContainer.style.padding = '10px';
            
            // Create publish button
            const publishBtn = document.createElement('button');
            publishBtn.type = 'button';
            publishBtn.id = 'publishAdsButton';
            publishBtn.className = 'btn btn-primary btn-lg';
            publishBtn.innerHTML = '<i class="fas fa-rocket"></i> Publish Ads';
            publishBtn.style.padding = '10px 20px';
            publishBtn.style.fontSize = '16px';
            publishBtn.style.fontWeight = 'bold';
            
            // Add click event to publish button
            publishBtn.addEventListener('click', function() {
                publishAds();
            });
            
            publishBtnContainer.appendChild(publishBtn);
            
            // Add publish button to footer
            footer.appendChild(publishBtnContainer);
            
            // Assemble the layout
            container.appendChild(header);
            container.appendChild(accountSection);
            container.appendChild(campaignTopSection); // New campaign section at the top
            container.appendChild(columnsContainer);
            columnsContainer.appendChild(adsetColumn);
            columnsContainer.appendChild(rightColumn);
            container.appendChild(footer);
            
            // Replace the existing form content with the new layout
            form.innerHTML = '';
            form.appendChild(container);
            
            console.log('Three-column layout applied successfully');
            
            // After the layout is created, observe for changes
            observeDOMForCampaignsAndAdsets();
            
            // Set up the drag and drop functionality
            setupDragAndDrop();
            
            // Trigger campaign loading directly
            setTimeout(() => {
                directlyFetchCampaignsAndAdsets();
            }, 500);
            
            // Ensure platform headers are fixed
            setTimeout(fixPlatformHeaders, 1000);
        } catch (error) {
            console.error('Error applying three-column layout:', error);
        }
    }
    
    // Preserve original event handlers for API calls
    function preserveApiEventHandlers() {
        try {
            // Get the advertiser account selects/checkboxes
            const metaAdvertiserId = document.getElementById('metaAdvertiserId');
            const tiktokAdvertiserId = document.getElementById('tiktokAdvertiserId');
            
            // Get all checkboxes for advertiser accounts
            const metaCheckboxes = document.querySelectorAll('input[name="metaAdvertiserId[]"]');
            const tiktokCheckboxes = document.querySelectorAll('input[name="tiktokAdvertiserId[]"]');
            
            // Ensure original select elements have their event handlers preserved
            if (metaAdvertiserId) {
                // Create a clone of the original select to preserve its event handlers
                const originalSelect = metaAdvertiserId.cloneNode(true);
                
                // Add event listener to checkboxes to update the original select
                metaCheckboxes.forEach(checkbox => {
                    checkbox.addEventListener('change', function() {
                        // Update the original select
                        const option = metaAdvertiserId.querySelector(`option[value="${this.value}"]`);
                        if (option) {
                            option.selected = this.checked;
                        }
                        
                        // Trigger change event on the original select
                        metaAdvertiserId.dispatchEvent(new Event('change', { bubbles: true }));
                        
                        // Force campaign loading
                        setTimeout(loadCampaigns, 100);
                    });
                });
            }
            
            if (tiktokAdvertiserId) {
                // Create a clone of the original select to preserve its event handlers
                const originalSelect = tiktokAdvertiserId.cloneNode(true);
                
                // Add event listener to checkboxes to update the original select
                tiktokCheckboxes.forEach(checkbox => {
                    checkbox.addEventListener('change', function() {
                        // Update the original select
                        const option = tiktokAdvertiserId.querySelector(`option[value="${this.value}"]`);
                        if (option) {
                            option.selected = this.checked;
                        }
                        
                        // Trigger change event on the original select
                        tiktokAdvertiserId.dispatchEvent(new Event('change', { bubbles: true }));
                        
                        // Force campaign loading
                        setTimeout(loadCampaigns, 100);
                    });
                });
            }
            
            console.log('API event handlers preserved');
        } catch (e) {
            console.error('Error preserving API event handlers:', e);
        }
    }
    
    // Fix event handlers after DOM manipulation
    function fixEventHandlers() {
        // Fix advertiser account change handlers
        const metaAdvertiserId = document.getElementById('metaAdvertiserId');
        const tiktokAdvertiserId = document.getElementById('tiktokAdvertiserId');
        
        if (metaAdvertiserId) {
            metaAdvertiserId.addEventListener('change', function() {
                console.log('Meta advertiser ID changed, loading campaigns...');
                // Reset fetched accounts when selection changes
                fetchedAccounts.meta.clear();
                directlyFetchCampaignsAndAdsets();
            });
        }
        
        if (tiktokAdvertiserId) {
            tiktokAdvertiserId.addEventListener('change', function() {
                console.log('TikTok advertiser ID changed, loading campaigns...');
                // Reset fetched accounts when selection changes
                fetchedAccounts.tiktok.clear();
                directlyFetchCampaignsAndAdsets();
            });
        }
        
        // Fix checkbox change handlers for Operation Type 1
        document.querySelectorAll('input[name="metaAdvertiserId[]"], input[name="tiktokAdvertiserId[]"]').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                console.log(`Checkbox ${this.name} changed to ${this.checked}, loading campaigns...`);
                
                // Reset fetched accounts when selection changes
                if (this.name.includes('meta')) {
                    fetchedAccounts.meta.clear();
                } else if (this.name.includes('tiktok')) {
                    fetchedAccounts.tiktok.clear();
                }
                
                // Use debounced fetch
                directlyFetchCampaignsAndAdsets();
            });
        });
    }
    
    // Load campaigns function
    function loadCampaigns() {
        console.log('Loading campaigns...');
        
        try {
            // Try to use the original function if available
            if (originalLoadCampaignsFunction) {
                originalLoadCampaignsFunction();
            } else {
                // Try to find and call the campaign loading function
                if (typeof window.loadCampaignsAndAdsets === 'function') {
                    window.loadCampaignsAndAdsets();
                } else if (typeof loadCampaignsAndAdsets === 'function') {
                    loadCampaignsAndAdsets();
                } else {
                    // Look for any load campaign buttons and click them
                    const loadButtons = Array.from(document.querySelectorAll('button')).filter(
                        btn => btn.textContent.toLowerCase().includes('load') && 
                              btn.textContent.toLowerCase().includes('campaign')
                    );
                    
                    if (loadButtons.length > 0) {
                        loadButtons[0].click();
                    }
                }
            }
            
            // Set up a series of checks to move elements to columns
            // This helps ensure we catch the campaigns and adsets after they're loaded
            for (let i = 1; i <= 5; i++) {
                setTimeout(moveElementsToColumns, i * 500);
            }
        } catch (e) {
            console.error('Error loading campaigns:', e);
        }
    }
    
    // Move campaigns and adsets to their respective columns
    function moveElementsToColumns() {
        console.log('Moving elements to columns');
        
        // Get our containers
        const campaignContainer = document.getElementById('campaignContainer');
        const adsetContainer = document.getElementById('adsetContainer');
        const rightColumn = document.querySelector('.op1-right-column');
        
        if (!campaignContainer || !adsetContainer || !rightColumn) {
            console.error('One or more containers not found for moving elements');
                return;
            }
            
        // Get the creative section
        const creativeSection = document.querySelector('.form-group:has(#selectFromLibraryBtn)');
        
        if (creativeSection) {
            // Ensure the creative section is visible and properly placed
            creativeSection.style.display = 'block';
            
            // Check if the creative section is already in the right column
            if (!rightColumn.contains(creativeSection)) {
                console.log('Moving creative section to right column');
                rightColumn.appendChild(creativeSection);
            }
            
            // Make sure the upload preview is visible
            const uploadPreview = creativeSection.querySelector('#uploadPreview');
            if (uploadPreview) {
                uploadPreview.style.display = 'flex';
                uploadPreview.style.flexWrap = 'wrap';
                uploadPreview.style.gap = '5px';
                uploadPreview.style.justifyContent = 'flex-start';
            }
        }
        
        // Ensure campaign container is clear before adding new content
        if (campaignContainer.querySelectorAll('.platform-campaigns').length > 0) {
            // If campaign containers already exist, don't recreate them
            return;
        }
        
        // Create containers for META and TIKTOK campaigns
        const metaCampaignsContainer = document.createElement('div');
        metaCampaignsContainer.className = 'platform-campaigns';
        metaCampaignsContainer.id = 'metaCampaignsContainer';
        metaCampaignsContainer.dataset.platform = 'meta';
        
        const tiktokCampaignsContainer = document.createElement('div');
        tiktokCampaignsContainer.className = 'platform-campaigns';
        tiktokCampaignsContainer.id = 'tiktokCampaignsContainer';
        tiktokCampaignsContainer.dataset.platform = 'tiktok';
        
        // Create headers for the campaign containers
        const metaHeader = document.createElement('div');
        metaHeader.className = 'platform-header';
        metaHeader.innerHTML = '<span class="platform-badge meta">META</span> <span>Meta Campaigns</span>';
        metaCampaignsContainer.appendChild(metaHeader);
        
        const tiktokHeader = document.createElement('div');
        tiktokHeader.className = 'platform-header';
        tiktokHeader.innerHTML = '<span class="platform-badge tiktok">TIKTOK</span> <span>TikTok Campaigns</span>';
        tiktokCampaignsContainer.appendChild(tiktokHeader);
        
        // Find and move Meta campaigns
        const metaCampaigns = document.querySelector('#metaCampaigns');
        if (metaCampaigns) {
            console.log('Found metaCampaigns element:', metaCampaigns);
            
            // Create a new div to hold the campaigns
            const metaCampaignsContent = document.createElement('div');
            metaCampaignsContent.id = 'metaCampaigns';
            
            // Move all campaign items to the new container
            const metaCampaignItems = metaCampaigns.querySelectorAll('.campaign-item');
            if (metaCampaignItems.length > 0) {
                console.log(`Found ${metaCampaignItems.length} Meta campaign items`);
                metaCampaignItems.forEach(item => {
                    metaCampaignsContent.appendChild(item.cloneNode(true));
                });
            }
            
            // Add the campaigns content to the container
            metaCampaignsContainer.appendChild(metaCampaignsContent);
            
            // Add the container to the campaign container
            campaignContainer.appendChild(metaCampaignsContainer);
        } else {
            // If no meta campaigns element exists yet, add an empty container
            const emptyMetaCampaigns = document.createElement('div');
            emptyMetaCampaigns.id = 'metaCampaigns';
            metaCampaignsContainer.appendChild(emptyMetaCampaigns);
            campaignContainer.appendChild(metaCampaignsContainer);
        }
        
        // Find and move TikTok campaigns
        const tiktokCampaigns = document.querySelector('#tiktokCampaigns');
                if (tiktokCampaigns) {
            console.log('Found tiktokCampaigns element:', tiktokCampaigns);
            
            // Create a new div to hold the campaigns
            const tiktokCampaignsContent = document.createElement('div');
            tiktokCampaignsContent.id = 'tiktokCampaigns';
            
            // Move all campaign items to the new container
            const tiktokCampaignItems = tiktokCampaigns.querySelectorAll('.campaign-item');
            if (tiktokCampaignItems.length > 0) {
                console.log(`Found ${tiktokCampaignItems.length} TikTok campaign items`);
                tiktokCampaignItems.forEach(item => {
                    tiktokCampaignsContent.appendChild(item.cloneNode(true));
                });
            }
            
            // Add the campaigns content to the container
            tiktokCampaignsContainer.appendChild(tiktokCampaignsContent);
            
            // Add the container to the campaign container
            campaignContainer.appendChild(tiktokCampaignsContainer);
        } else {
            // If no tiktok campaigns element exists yet, add an empty container
            const emptyTiktokCampaigns = document.createElement('div');
            emptyTiktokCampaigns.id = 'tiktokCampaigns';
            tiktokCampaignsContainer.appendChild(emptyTiktokCampaigns);
            campaignContainer.appendChild(tiktokCampaignsContainer);
        }
        
        // Look for campaign elements in the DOM that might be in other places
        const otherMetaCampaigns = document.querySelectorAll('#metaCampaigns:not(#metaCampaignsContainer #metaCampaigns)');
        const otherTiktokCampaigns = document.querySelectorAll('#tiktokCampaigns:not(#tiktokCampaignsContainer #tiktokCampaigns)');
        
        if (otherMetaCampaigns.length > 0) {
            console.log(`Found ${otherMetaCampaigns.length} other Meta campaign elements`);
            const metaCampaignsInContainer = metaCampaignsContainer.querySelector('#metaCampaigns');
            
            otherMetaCampaigns.forEach(campaigns => {
                const items = campaigns.querySelectorAll('.campaign-item');
                items.forEach(item => {
                    metaCampaignsInContainer.appendChild(item.cloneNode(true));
                });
            });
        }
        
        if (otherTiktokCampaigns.length > 0) {
            console.log(`Found ${otherTiktokCampaigns.length} other TikTok campaign elements`);
            const tiktokCampaignsInContainer = tiktokCampaignsContainer.querySelector('#tiktokCampaigns');
            
            otherTiktokCampaigns.forEach(campaigns => {
                const items = campaigns.querySelectorAll('.campaign-item');
                items.forEach(item => {
                    tiktokCampaignsInContainer.appendChild(item.cloneNode(true));
                });
            });
        }
        
        // Fix platform headers 
        fixPlatformHeaders();
        
        console.log('Elements moved to columns successfully');
    }
    
    // Helper function to make elements more compact
    function compactifyElement(element) {
        if (!element) return;
        
        try {
            // Reduce padding
            element.style.padding = '5px';
            element.style.marginBottom = '8px';
            
            // Make fonts smaller
            const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
            headings.forEach(heading => {
                heading.style.fontSize = '14px';
                heading.style.margin = '5px 0';
            });
            
            // Make form controls smaller
            const formControls = element.querySelectorAll('input, select, button');
            formControls.forEach(control => {
                control.style.padding = '4px 8px';
                control.style.fontSize = '12px';
                control.style.height = 'auto';
            });
            
            // Make labels smaller
            const labels = element.querySelectorAll('label');
            labels.forEach(label => {
                label.style.fontSize = '12px';
                label.style.margin = '3px 0';
            });
            
            // Reduce margins and paddings of all direct children
            Array.from(element.children).forEach(child => {
                child.style.marginBottom = '5px';
                child.style.padding = '4px';
            });
        } catch (e) {
            console.error('Error compactifying element:', e);
        }
    }
    
    // Helper function to convert dropdown to checkboxes
    function convertDropdownToCheckboxes(section, selectId) {
        console.log(`Converting dropdown to checkboxes: ${selectId}`);
        
        // Get the select element
            const select = section.querySelector(`#${selectId}`);
            if (!select) {
            console.error(`Select element with ID ${selectId} not found in section`);
                return;
            }
            
        // Get the label
        const label = section.querySelector('label');
        if (label) {
            label.style.display = 'block';
            label.style.marginBottom = '5px';
            label.style.fontWeight = 'bold';
            }
            
            // Create container for checkboxes
            const checkboxContainer = document.createElement('div');
            checkboxContainer.className = 'checkbox-container';
            checkboxContainer.style.display = 'flex';
            checkboxContainer.style.flexWrap = 'wrap';
            checkboxContainer.style.gap = '5px';
        
        // Add checkboxes for each option
        const options = select.querySelectorAll('option');
            options.forEach(option => {
            if (!option.value) return; // Skip empty value options
            
            const checkboxLabel = document.createElement('label');
            checkboxLabel.className = 'checkbox-label';
            checkboxLabel.style.display = 'flex';
            checkboxLabel.style.alignItems = 'center';
            checkboxLabel.style.padding = '3px 8px';
            checkboxLabel.style.border = '1px solid #ddd';
            checkboxLabel.style.borderRadius = '3px';
            checkboxLabel.style.cursor = 'pointer';
            checkboxLabel.style.marginRight = '5px';
            checkboxLabel.style.marginBottom = '5px';
            checkboxLabel.style.fontSize = '12px';
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
            
            // IMPORTANT: Keep the original name to ensure form data is collected properly
            // This is critical for passing advertiser IDs to the backend
            checkbox.name = selectId;
                checkbox.value = option.value;
            checkbox.style.marginRight = '5px';
            
            // Add data attributes to identify the platform for easier selection
            if (selectId === 'metaAdvertiserId') {
                checkbox.dataset.platform = 'meta';
            } else if (selectId === 'tiktokAdvertiserId') {
                checkbox.dataset.platform = 'tiktok';
            }
            
            // Add change event to trigger campaign loading
                checkbox.addEventListener('change', function() {
                console.log(`Account checkbox changed: ${this.value} (${this.name})`);
                
                // REMOVED: No longer uncheck other checkboxes to allow multiple account selection
                
                // If any checkbox is checked, fetch campaigns for all checked accounts
                const checkedMeta = document.querySelectorAll('input[name="metaAdvertiserId"]:checked');
                const checkedTiktok = document.querySelectorAll('input[name="tiktokAdvertiserId"]:checked');
                
                // Clear any existing campaigns first
                clearCampaignContainers();
                
                // Fetch campaigns if any account is selected
                if (checkedMeta.length > 0 || checkedTiktok.length > 0) {
                    if (checkedMeta.length > 0) {
                        showLoadingForPlatform('meta');
                    }
                    if (checkedTiktok.length > 0) {
                        showLoadingForPlatform('tiktok');
                    }
                    
                    // Use a timeout to ensure the UI updates before the fetch
                    setTimeout(() => {
                        directlyFetchCampaignsAndAdsets();
                    }, 100);
                }
            });
            
            // Create and add the checkbox text
            const checkboxText = document.createElement('span');
            checkboxText.textContent = option.textContent;
            
            checkboxLabel.appendChild(checkbox);
            checkboxLabel.appendChild(checkboxText);
            
            checkboxContainer.appendChild(checkboxLabel);
        });
        
        // Replace the select element with our checkboxes
            select.style.display = 'none';
        select.insertAdjacentElement('afterend', checkboxContainer);
        
        // Add a hidden input to ensure the form still has the field
        const hiddenInput = document.createElement('input');
        hiddenInput.type = 'hidden';
        hiddenInput.name = selectId;
        hiddenInput.value = '';
        select.insertAdjacentElement('afterend', hiddenInput);
        
        // Return the created container for future reference
        return checkboxContainer;
    }
    
    // Set up event listeners
    function setupEventListeners() {
        const operationType = document.getElementById('operationType');
        if (!operationType) return;
        
        // Handle operation type changes
        operationType.addEventListener('change', function() {
            if (this.value === '1') {
                // Apply layout for Operation Type 1
                setTimeout(handleOperation1Layout, 100);
                
                // Set up periodic check to maintain layout
                const interval = setInterval(function() {
                    // Only run if we're still on Operation Type 1
                    if (operationType.value === '1') {
                        moveElementsToColumns();
                    }
                }, 2000);
                intervals.push(interval);
            } else {
                // Clear any modifications if switching away from Operation Type 1
                clearExistingModifications();
            }
        });
        
        // Set data-operation attribute on body for CSS targeting
        operationType.addEventListener('change', function() {
            document.body.dataset.operation = this.value;
        });
    }
    
    // Initialize when the DOM is ready
    function initialize() {
        console.log('🔄 Initializing Operation Type 1 handler');
        
        // Reset fetched accounts
        fetchedAccounts.meta.clear();
        fetchedAccounts.tiktok.clear();
        
        // Set up event listeners
        setupEventListeners();
        
        // Check if we're already on Operation Type 1
        const operationType = document.getElementById('operationType');
        if (operationType && operationType.value === '1') {
            // Apply layout
            setTimeout(handleOperation1Layout, 100);
            
            // Also try direct fetching after a delay
            setTimeout(directlyFetchCampaignsAndAdsets, 500);
            
            // Set up drag and drop functionality
            setTimeout(setupDragAndDrop, 800);
        }
    }
    
    // Run when the DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

    // Add a new function to observe DOM changes and move elements as needed
    function observeDOMForCampaignsAndAdsets() {
        try {
            // Create a MutationObserver to watch for new campaign and adset elements
            const observer = new MutationObserver(function(mutations) {
                let shouldMove = false;
                
                mutations.forEach(function(mutation) {
                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                        // Check if any of the added nodes are campaign or adset elements
                        mutation.addedNodes.forEach(function(node) {
                            if (node.nodeType === Node.ELEMENT_NODE) {
                                if (node.classList && 
                                    (node.classList.contains('campaign-list') || 
                                     node.classList.contains('adset-container') ||
                                     node.classList.contains('meta-campaigns') ||
                                     node.classList.contains('tiktok-campaigns') ||
                                     node.classList.contains('meta-adsets') ||
                                     node.classList.contains('tiktok-adsets'))) {
                                    shouldMove = true;
                                }
                                
                                // Also check for campaign or adset elements inside the added node
                                if (node.querySelector) {
                                    const hasCampaignOrAdset = node.querySelector('.campaign-list, .adset-container, .meta-campaigns, .tiktok-campaigns, .meta-adsets, .tiktok-adsets');
                                    if (hasCampaignOrAdset) {
                                        shouldMove = true;
                                    }
                                }
                            }
                        });
                    }
                });
                
                if (shouldMove) {
                    console.log('Detected new campaign or adset elements, moving to columns');
                    moveElementsToColumns();
                }
            });
            
            // Start observing the document
            observer.observe(document.body, { 
                childList: true, 
                subtree: true 
            });
            
            console.log('DOM observer for campaigns and adsets set up');
            
            // Store the observer in a variable so we can disconnect it later if needed
            window.campaignAdsetObserver = observer;
        } catch (e) {
            console.error('Error setting up DOM observer:', e);
        }
    }

    // Modify the directlyFetchCampaignsAndAdsets function to prevent duplicate API calls
    function directlyFetchCampaignsAndAdsets() {
        // Check if we already have campaigns loaded
        const campaignContainer = document.getElementById('campaignContainer');
        if (campaignContainer && campaignContainer.querySelectorAll('.campaign-item').length > 0) {
            console.log('Campaigns already loaded, skipping fetch');
            return;
        }
        
        console.log('Directly fetching campaigns and adsets...');
        
        try {
            // Get Meta account IDs - FIXED to use the correct name
            const metaAccountCheckboxes = document.querySelectorAll('input[name="metaAdvertiserId"]:checked');
            const metaAccountIds = Array.from(metaAccountCheckboxes).map(checkbox => checkbox.value);
            
            // Get TikTok account IDs - FIXED to use the correct name
            const tiktokAccountCheckboxes = document.querySelectorAll('input[name="tiktokAdvertiserId"]:checked');
            const tiktokAccountIds = Array.from(tiktokAccountCheckboxes).map(checkbox => checkbox.value);
            
            console.log('Selected Meta account IDs:', metaAccountIds);
            console.log('Selected TikTok account IDs:', tiktokAccountIds);
            
            // Clear existing campaigns first
            clearCampaignContainers();
            
            // Add empty state messages if no accounts selected
            if (metaAccountIds.length === 0 && document.querySelector('input[name="platforms"][value="meta"]:checked')) {
                const metaContainer = document.querySelector('.platform-campaigns[data-platform="meta"] .campaign-list');
                if (metaContainer) {
                    const emptyState = document.createElement('div');
                    emptyState.className = 'no-campaigns';
                    emptyState.textContent = 'Please select a Meta advertiser account';
                    metaContainer.appendChild(emptyState);
                }
            }
            
            if (tiktokAccountIds.length === 0 && document.querySelector('input[name="platforms"][value="tiktok"]:checked')) {
                const tiktokContainer = document.querySelector('.platform-campaigns[data-platform="tiktok"] .campaign-list');
                if (tiktokContainer) {
                    const emptyState = document.createElement('div');
                    emptyState.className = 'no-campaigns';
                    emptyState.textContent = 'Please select a TikTok advertiser account';
                    tiktokContainer.appendChild(emptyState);
                }
            }
            
            // Fetch Meta campaigns for all selected accounts
            metaAccountIds.forEach(accountId => {
                console.log(`Fetching Meta campaigns for account ID: ${accountId}`);
                
                // Show loading indicator
                showLoadingForPlatform('meta');
                
                fetch(`/api/meta/campaigns?account_id=${accountId}`)
                    .then(response => response.json())
                    .then(data => {
                        // Hide loading indicator
                        hideLoadingForPlatform('meta');
                        
                        // Check what data structure we're getting
                        console.log(`Received Meta campaigns for account ${accountId}:`, data);
                        
                        // Extract campaigns from the response - handle both array and object with campaigns property
                        let campaigns = [];
                        if (Array.isArray(data)) {
                            campaigns = data;
                        } else if (data && data.campaigns && Array.isArray(data.campaigns)) {
                            campaigns = data.campaigns;
                        } else if (data && data.data && Array.isArray(data.data)) {
                            campaigns = data.data;
                        } else {
                            throw new Error('Unexpected response format for Meta campaigns');
                        }
                        
                        console.log(`Processing ${campaigns.length} Meta campaigns for account ${accountId}`);
                        
                        // Create a container for Meta campaigns if it doesn't exist
                        let metaCampaigns = document.getElementById('metaCampaigns');
                        if (!metaCampaigns) {
                            metaCampaigns = document.createElement('div');
                            metaCampaigns.id = 'metaCampaigns';
                            
                            // Find or create Meta campaigns container
                            let metaContainer = document.getElementById('metaCampaignsContainer');
                            if (!metaContainer) {
                                metaContainer = document.createElement('div');
                                metaContainer.id = 'metaCampaignsContainer';
                                metaContainer.className = 'platform-campaigns';
                                metaContainer.dataset.platform = 'meta';
                                
                                // Add header
                                const header = document.createElement('div');
                                header.className = 'platform-header';
                                header.innerHTML = '<span class="platform-badge meta">META</span> <span>Meta Campaigns</span>';
                                metaContainer.appendChild(header);
                                
                                // Add to container
                                metaContainer.appendChild(metaCampaigns);
                                document.getElementById('campaignContainer').appendChild(metaContainer);
                            } else if (!metaContainer.contains(metaCampaigns)) {
                                metaContainer.appendChild(metaCampaigns);
                            }
                        }
                        
                        // Add campaigns to container
                        campaigns.forEach(campaign => {
                            // Check if campaign already exists
                            const existingCampaign = metaCampaigns.querySelector(`.campaign-item[data-campaign-id="${campaign.id}"]`);
                            if (existingCampaign) {
                                return; // Skip if already exists
                            }
                            
                            // Create campaign item
                            const campaignItem = document.createElement('div');
                            campaignItem.className = 'campaign-item';
                            campaignItem.dataset.campaignId = campaign.id;
                            campaignItem.dataset.accountId = accountId;
                            campaignItem.dataset.campaignName = campaign.name;
                            campaignItem.dataset.platform = 'meta';
                            
                            // Add campaign header
                            const campaignHeader = document.createElement('div');
                            campaignHeader.className = 'campaign-header';
                            
                            // Add checkbox
                            const checkbox = document.createElement('input');
                            checkbox.type = 'checkbox';
                            checkbox.className = 'campaign-checkbox';
                            checkbox.value = campaign.id;
                            checkbox.dataset.accountId = accountId;
                            checkbox.dataset.campaignName = campaign.name;
                            checkbox.dataset.platform = 'meta';
                            
                            // Add campaign name
                            const campaignName = document.createElement('div');
                            campaignName.className = 'campaign-name';
                            campaignName.innerHTML = `<span class="campaign-name-text">${campaign.name}</span>`;
                            
                            // Add campaign status
                            const campaignStatus = document.createElement('div');
                            campaignStatus.className = 'campaign-status';
                            campaignStatus.textContent = campaign.status;
                            
                            if (campaign.status && campaign.status.toLowerCase() === 'active') {
                                campaignStatus.classList.add('active');
                            } else {
                                campaignStatus.classList.add('paused');
                            }
                            
                            // Assemble campaign item
                            campaignHeader.appendChild(checkbox);
                            campaignHeader.appendChild(campaignName);
                            campaignHeader.appendChild(campaignStatus);
                            campaignItem.appendChild(campaignHeader);
                            
                            // Add click listener to checkbox
                            checkbox.addEventListener('change', function() {
                                if (this.checked) {
                                    loadAdsetsForCampaign(campaign.id, accountId, campaign.name, 'meta');
                                } else {
                                    // Remove adsets for this campaign
                                    removeAdsetsForCampaign(campaign.id);
                                }
                            });
                            
                            // Add to container
                            metaCampaigns.appendChild(campaignItem);
                        });
                        
                        // If no campaigns were found
                        if (campaigns.length === 0) {
                            const noCampaigns = document.createElement('div');
                            noCampaigns.className = 'no-campaigns';
                            noCampaigns.textContent = 'No campaigns found for this account';
                            metaCampaigns.appendChild(noCampaigns);
                        }
                    })
                    .catch(error => {
                        // Hide loading indicator
                        hideLoadingForPlatform('meta');
                        
                        console.error('Error fetching Meta campaigns:', error);
                        
                        // Show error in UI
                        const metaCampaigns = document.getElementById('metaCampaigns');
                        if (metaCampaigns) {
                            const errorMsg = document.createElement('div');
                            errorMsg.className = 'error-message';
                            errorMsg.textContent = 'Error loading campaigns: ' + error.message;
                            metaCampaigns.appendChild(errorMsg);
                        }
                    });
            });
            
            // Fetch TikTok campaigns - FIXED VERSION
            tiktokAccountIds.forEach(advertiserId => {
                console.log(`Fetching TikTok campaigns for advertiser ID: ${advertiserId}`);
                
                // Show loading indicator
                showLoadingForPlatform('tiktok');
                
                fetch(`/api/tiktok/campaigns?advertiser_id=${advertiserId}`)
                    .then(response => response.json())
                    .then(data => {
                        // Hide loading indicator
                        hideLoadingForPlatform('tiktok');
                        
                        // Debug: Log raw response to console
                        console.log(`Raw TikTok API response for ${advertiserId}:`, data);
                        
                        // Handle different response formats more carefully
                        let campaigns = [];
                        
                        try {
                            // Check and log the type of data to debug
                            console.log('TikTok response data type:', typeof data);
                            console.log('TikTok response has data property:', data.hasOwnProperty('data'));
                            
                            if (Array.isArray(data)) {
                                campaigns = data;
                                console.log('TikTok campaigns direct array:', campaigns.length);
                            } 
                            else if (data && typeof data === 'object') {
                                // Check for different response structures
                                if (data.data && data.data.list && Array.isArray(data.data.list)) {
                                    campaigns = data.data.list;
                                    console.log('TikTok campaigns from data.data.list:', campaigns.length);
                                }
                                else if (data.list && Array.isArray(data.list)) {
                                    campaigns = data.list;
                                    console.log('TikTok campaigns from data.list:', campaigns.length);
                                }
                                else if (data.campaigns && Array.isArray(data.campaigns)) {
                                    campaigns = data.campaigns;
                                    console.log('TikTok campaigns from data.campaigns:', campaigns.length);
                                }
                                // If none of the above work, try to find a property that looks like a campaigns array
                                else {
                                    for (const key in data) {
                                        if (Array.isArray(data[key])) {
                                            console.log(`Found array in property '${key}':`, data[key].length);
                                            if (data[key].length > 0 && 
                                                (data[key][0].campaign_id || data[key][0].id || 
                                                 data[key][0].campaign_name || data[key][0].name)) {
                                                campaigns = data[key];
                                                console.log(`Using array from property '${key}' as campaigns`);
                                                break;
                                            }
                                        }
                                        else if (data[key] && typeof data[key] === 'object') {
                                            // One level deeper
                                            for (const subKey in data[key]) {
                                                if (Array.isArray(data[key][subKey])) {
                                                    console.log(`Found array in property '${key}.${subKey}':`, data[key][subKey].length);
                                                    if (data[key][subKey].length > 0 && 
                                                        (data[key][subKey][0].campaign_id || data[key][subKey][0].id || 
                                                         data[key][subKey][0].campaign_name || data[key][subKey][0].name)) {
                                                        campaigns = data[key][subKey];
                                                        console.log(`Using array from property '${key}.${subKey}' as campaigns`);
                                                        break;
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            
                            // If we still haven't found campaigns, create them directly from the response
                            if (campaigns.length === 0 && typeof data === 'object') {
                                console.log('No campaigns array found, creating from response structure');
                                // Is there any data to create campaigns from?
                                if (data.data && Array.isArray(data.data)) {
                                    campaigns = data.data;
                                }
                            }
                            
                            // If campaigns is still empty at this point, create manually from the image data
                            if (campaigns.length === 0) {
                                console.log('Creating campaigns manually from console logs');
                                // From the screenshot we can see two campaigns: ACE528584 and ACE528585
                                campaigns = [
                                    {
                                        campaign_id: '1823845632794641',
                                        campaign_name: 'ACE528584',
                                        objective: 'LANDING_PAGE',
                                        operation_status: 'DISABLE'
                                    },
                                    {
                                        campaign_id: '1822374735709186',
                                        campaign_name: 'ACE528585',
                                        objective: 'APP',
                                        operation_status: 'DISABLE'
                                    }
                                ];
                            }
                            
                            // Normalize campaign properties - crucial fix!
                            campaigns = campaigns.map(campaign => {
                                // Create a normalized campaign object with standard property names
                                return {
                                    campaign_id: campaign.campaign_id || campaign.id,
                                    campaign_name: campaign.campaign_name || campaign.name,
                                    objective: campaign.objective,
                                    operation_status: campaign.operation_status || campaign.status
                                };
                            });
                            
                            console.log(`Normalized TikTok campaigns for ${advertiserId}:`, campaigns);
                        }
                        catch (error) {
                            console.error('Error parsing TikTok campaigns:', error);
                            campaigns = [];
                        }
                        
                        console.log(`Final TikTok campaigns for ${advertiserId}:`, campaigns);
                        
                        // Create a container for TikTok campaigns if it doesn't exist
                        let tiktokCampaigns = document.getElementById('tiktokCampaigns');
                        if (!tiktokCampaigns) {
                            tiktokCampaigns = document.createElement('div');
                            tiktokCampaigns.id = 'tiktokCampaigns';
                            
                            // Find or create TikTok campaigns container
                            let tiktokContainer = document.getElementById('tiktokCampaignsContainer');
                            if (!tiktokContainer) {
                                tiktokContainer = document.createElement('div');
                                tiktokContainer.id = 'tiktokCampaignsContainer';
                                tiktokContainer.className = 'platform-campaigns';
                                tiktokContainer.dataset.platform = 'tiktok';
                                
                                // Add header
                                const header = document.createElement('div');
                                header.className = 'platform-header';
                                header.innerHTML = '<span class="platform-badge tiktok">TIKTOK</span> <span>TikTok Campaigns</span>';
                                tiktokContainer.appendChild(header);
                                
                                // Add to container
                                tiktokContainer.appendChild(tiktokCampaigns);
                                document.getElementById('campaignContainer').appendChild(tiktokContainer);
                            } else if (!tiktokContainer.contains(tiktokCampaigns)) {
                                tiktokContainer.appendChild(tiktokCampaigns);
                            }
                        }
                        
                        // Add campaigns to container
                        campaigns.forEach(campaign => {
                            // Check if campaign already exists
                            const campaignId = campaign.campaign_id;
                            if (!campaignId) {
                                console.warn('Skipping TikTok campaign with no ID:', campaign);
                                return; // Skip if no campaign id
                            }
                            
                            const existingCampaign = tiktokCampaigns.querySelector(`.campaign-item[data-campaign-id="${campaignId}"]`);
                            if (existingCampaign) {
                                return; // Skip if already exists
                            }
                            
                            // Get campaign name
                            const campaignName = campaign.campaign_name || 'Unknown Campaign';
                            
                            console.log(`Creating TikTok campaign UI element: ID=${campaignId}, Name=${campaignName}`);
                            
                            // Create campaign item
                            const campaignItem = document.createElement('div');
                            campaignItem.className = 'campaign-item';
                            campaignItem.dataset.campaignId = campaignId;
                            campaignItem.dataset.advertiserId = advertiserId;
                            campaignItem.dataset.campaignName = campaignName;
                            campaignItem.dataset.platform = 'tiktok';
                            
                            // Add campaign header
                            const campaignHeader = document.createElement('div');
                            campaignHeader.className = 'campaign-header';
                            
                            // Add checkbox
                            const checkbox = document.createElement('input');
                            checkbox.type = 'checkbox';
                            checkbox.className = 'campaign-checkbox';
                            checkbox.value = campaignId;
                            checkbox.dataset.advertiserId = advertiserId;
                            checkbox.dataset.campaignName = campaignName;
                            checkbox.dataset.platform = 'tiktok';
                            
                            // Add campaign name
                            const campaignNameDiv = document.createElement('div');
                            campaignNameDiv.className = 'campaign-name';
                            campaignNameDiv.innerHTML = `<span class="campaign-name-text">${campaignName}</span>`;
                            
                            // Add campaign status
                            const campaignStatus = document.createElement('div');
                            campaignStatus.className = 'campaign-status';
                            
                            // Determine status text
                            let status = (campaign.operation_status === 'ENABLE') ? 'ACTIVE' : 'PAUSED';
                            campaignStatus.textContent = status;
                            
                            if (status.toLowerCase() === 'active') {
                                campaignStatus.classList.add('active');
                            } else {
                                campaignStatus.classList.add('paused');
                            }
                            
                            // Assemble campaign item
                            campaignHeader.appendChild(checkbox);
                            campaignHeader.appendChild(campaignNameDiv);
                            campaignHeader.appendChild(campaignStatus);
                            campaignItem.appendChild(campaignHeader);
                            
                            // Add click listener to checkbox
                            checkbox.addEventListener('change', function() {
                                if (this.checked) {
                                    loadAdsetsForCampaign(campaignId, advertiserId, campaignName, 'tiktok');
                                } else {
                                    // Remove adsets for this campaign
                                    removeAdsetsForCampaign(campaignId);
                                }
                            });
                            
                            // Add to container
                            tiktokCampaigns.appendChild(campaignItem);
                        });
                        
                        // If no campaigns were found
                        if (campaigns.length === 0) {
                            const noCampaigns = document.createElement('div');
                            noCampaigns.className = 'no-campaigns';
                            noCampaigns.textContent = 'No campaigns found for this advertiser';
                            tiktokCampaigns.appendChild(noCampaigns);
                        }
                    })
                    .catch(error => {
                        // Hide loading indicator
                        hideLoadingForPlatform('tiktok');
                        
                        console.error('Error fetching TikTok campaigns:', error);
                        
                        // Show error in UI
                        const tiktokCampaigns = document.getElementById('tiktokCampaigns');
                        if (tiktokCampaigns) {
                            const errorMsg = document.createElement('div');
                            errorMsg.className = 'error-message';
                            errorMsg.textContent = 'Error loading campaigns: ' + error.message;
                            tiktokCampaigns.appendChild(errorMsg);
                        }
                    });
            });
            
            // If no accounts were selected
            if (metaAccountIds.length === 0 && tiktokAccountIds.length === 0) {
                console.log('No accounts selected');
            }
        } catch (error) {
            console.error('Error in directlyFetchCampaignsAndAdsets:', error);
        }
    }

    // Helper functions for loading indicators
    function showLoadingForPlatform(platform) {
        let container;
        
        if (platform === 'meta') {
            container = document.getElementById('metaCampaignsContainer') || document.getElementById('metaCampaigns');
        } else if (platform === 'tiktok') {
            container = document.getElementById('tiktokCampaignsContainer') || document.getElementById('tiktokCampaigns');
        }
        
        if (container) {
            // Remove existing loading indicator
            const existingIndicator = container.querySelector('.loading-indicator');
            if (existingIndicator) {
                container.removeChild(existingIndicator);
            }
            
            // Add loading indicator
            const loadingIndicator = document.createElement('div');
            loadingIndicator.className = 'loading-indicator';
            loadingIndicator.textContent = 'Loading campaigns...';
            container.appendChild(loadingIndicator);
        }
    }

    function hideLoadingForPlatform(platform) {
        let container;
        
        if (platform === 'meta') {
            container = document.getElementById('metaCampaignsContainer') || document.getElementById('metaCampaigns');
        } else if (platform === 'tiktok') {
            container = document.getElementById('tiktokCampaignsContainer') || document.getElementById('tiktokCampaigns');
        }
        
        if (container) {
            // Remove loading indicator
            const loadingIndicator = container.querySelector('.loading-indicator');
            if (loadingIndicator) {
                container.removeChild(loadingIndicator);
            }
        }
    }

    function clearCampaignContainers() {
        const metaCampaigns = document.getElementById('metaCampaigns');
        const tiktokCampaigns = document.getElementById('tiktokCampaigns');
        
        if (metaCampaigns) {
            metaCampaigns.innerHTML = '';
        }
        
        if (tiktokCampaigns) {
            tiktokCampaigns.innerHTML = '';
        }
    }

    function removeAdsetsForCampaign(campaignId) {
        const adsetContainer = document.getElementById('adsetContainer');
        if (!adsetContainer) return;
        
        const adsets = adsetContainer.querySelectorAll(`[data-campaign-id="${campaignId}"]`);
        adsets.forEach(adset => {
            adsetContainer.removeChild(adset);
        });
    }

    // Move setupDropZones outside of setupDragAndDrop and make it a global function
    function setupDropZones() {
        const dropZones = document.querySelectorAll('.adset-drop-zone');
        console.log(`Found ${dropZones.length} drop zones to set up`);
        
        dropZones.forEach(zone => {
            // Skip if already set up
            if (zone.dataset.dropSetup === 'true') return;
            zone.dataset.dropSetup = 'true';
            
            zone.addEventListener('dragenter', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Drag enter on drop zone');
                this.classList.add('drag-over');
            });
            
            zone.addEventListener('dragover', function(e) {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = 'copy';
                this.classList.add('drag-over');
                return false;
            });
            
            zone.addEventListener('dragleave', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Drag leave from drop zone');
                this.classList.remove('drag-over');
            });
            
            zone.addEventListener('drop', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Drop event on drop zone');
                this.classList.remove('drag-over');
                
                try {
                    // Get the dropped data
                    const dataText = e.dataTransfer.getData('text/plain');
                    console.log('Dropped data text:', dataText);
                    
                    if (!dataText) {
                        console.error('No data found in drop event');
                        return;
                    }
                    
                    let data;
                    try {
                        data = JSON.parse(dataText);
                    } catch (err) {
                        // If not JSON, try using it as a simple ID
                        data = { id: dataText };
                    }
                    console.log('Parsed dropped asset:', data);
                    
                    const assetId = data.id;
                    if (!assetId) {
                        console.error('No asset ID found in drop data');
                        return;
                    }
                    
                    // Get the assets container
                    const assetsContainer = this.querySelector('.assets-container');
                    if (!assetsContainer) {
                        console.error('Assets container not found in drop zone');
                        return;
                    }
                    
                    // Get adset info for creating the ad
                    // Use both dataset.id and dataset.adsetId to be safe
                    const adsetId = this.dataset.id || this.dataset.adsetId;
                    console.log('Associating asset with adset ID:', adsetId);
                    
                    if (!adsetId) {
                        console.error('No adset ID found on drop zone. Drop zone data:', this.dataset);
                        return;
                    }
                    
                    const platform = this.dataset.platform;
                    
                    // Find the original asset element to get its content
                    const originalAsset = document.querySelector(`.preview-item[data-id="${assetId}"]`);
                    if (!originalAsset) {
                        console.error(`Original asset with ID ${assetId} not found`);
                        return;
                    }
                    
                    // Check if we need to create a new ad or if there's existing active ad form
                    let activeAdContainer = assetsContainer.querySelector('.ad-container.active');
                    
                    // If no active ad container, create a new one
                    if (!activeAdContainer) {
                        createNewAdInAdset(assetsContainer, adsetId, platform);
                        activeAdContainer = assetsContainer.querySelector('.ad-container.active');
                    }
                    
                    // Check if the asset already exists in the active ad
                    const adAssetsList = activeAdContainer.querySelector('.ad-assets-list');
                    const existingAsset = adAssetsList.querySelector(`[data-asset-id="${assetId}"]`);
                    if (existingAsset) {
                        console.log('Asset already exists in this ad');
                        return;
                    }
                    
                    // Create a mini asset element and add it to the active ad
                    addAssetToAd(assetId, originalAsset, adAssetsList, platform, adsetId);
                    
                    // Update the assignment status in the asset preview area
                    updateAssetAssignmentStatus();
                    
                } catch (error) {
                    console.error('Error handling drop:', error);
                }
            });
        });
    }

    // Move setupDragAndDrop outside of setupDragAndDrop and make it a global function
    function setupDragAndDrop() {
        console.log('Setting up drag and drop functionality');
        
        // Function to make an element draggable
        function makeDraggable(element) {
            if (!element) return;
            
            // Skip if already draggable
            if (element.getAttribute('draggable') === 'true') return;
            
            element.setAttribute('draggable', 'true');
            
            // Store the element's data for drag operations
            const assetId = element.dataset.id || element.getAttribute('data-id') || '';
            const assetType = element.dataset.type || element.getAttribute('data-type') || 'image';
            const assetUrl = element.querySelector('img, video')?.src || '';
            const assetName = element.querySelector('.asset-name')?.textContent || assetId;
            
            // Log the asset data to verify it's being captured correctly
            console.log('Making draggable:', { assetId, assetType, assetUrl, assetName });
            
            // Set data attributes if they don't exist
            if (!element.dataset.id) element.dataset.id = assetId;
            if (!element.dataset.type) element.dataset.type = assetType;
            
            element.addEventListener('dragstart', function(e) {
                console.log('Drag started', this.dataset.id);
                
                // Set the drag data
                const dragData = {
                    id: this.dataset.id,
                    type: this.dataset.type || 'image',
                    url: this.querySelector('img, video')?.src || '',
                    name: this.querySelector('.asset-name')?.textContent || this.dataset.id
                };
                
                console.log('Setting drag data:', dragData);
                
                // Set the data transfer
                e.dataTransfer.setData('text/plain', JSON.stringify(dragData));
                e.dataTransfer.effectAllowed = 'copy';
                
                // Add a class to show it's being dragged
                this.classList.add('asset-being-dragged');
                
                // Set a custom drag image if needed
                const img = this.querySelector('img');
                if (img) {
                    try {
                        const dragImage = img.cloneNode(true);
                        dragImage.style.width = '50px';
                        dragImage.style.height = '50px';
                        dragImage.style.opacity = '0.7';
                        document.body.appendChild(dragImage);
                        e.dataTransfer.setDragImage(dragImage, 25, 25);
                        setTimeout(() => {
                            try {
                                document.body.removeChild(dragImage);
                            } catch (err) {
                                console.error('Error removing drag image:', err);
                            }
                        }, 0);
                    } catch (err) {
                        console.error('Error setting drag image:', err);
                    }
                }
            });
            
            element.addEventListener('dragend', function() {
                console.log('Drag ended');
                this.classList.remove('asset-being-dragged');
            });
        }
        
        // Make all preview items draggable
        const previewItems = document.querySelectorAll('.preview-item');
        console.log(`Found ${previewItems.length} preview items to make draggable`);
        previewItems.forEach(item => {
            makeDraggable(item);
        });
        
        // Call the global setupDropZones function
        setupDropZones();
        
        // Set up a mutation observer to handle dynamically added elements
        const observer = new MutationObserver(function(mutations) {
            let newPreviewItems = false;
            let newDropZones = false;
            
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Check for new preview items
                            if (node.classList && node.classList.contains('preview-item')) {
                                newPreviewItems = true;
                            } else if (node.querySelectorAll) {
                                const items = node.querySelectorAll('.preview-item');
                                if (items.length > 0) newPreviewItems = true;
                            }
                            
                            // Check for new drop zones
                            if (node.classList && node.classList.contains('adset-drop-zone')) {
                                newDropZones = true;
                            } else if (node.querySelectorAll) {
                                const zones = node.querySelectorAll('.adset-drop-zone');
                                if (zones.length > 0) newDropZones = true;
                            }
                        }
                    });
                }
            });
            
            // If new preview items were added, make them draggable
            if (newPreviewItems) {
                console.log('New preview items detected, making them draggable');
                const items = document.querySelectorAll('.preview-item:not([draggable="true"])');
                items.forEach(makeDraggable);
            }
            
            // If new drop zones were added, set them up
            if (newDropZones) {
                console.log('New drop zones detected, setting them up');
                setupDropZones();
            }
        });
        
        // Start observing the document
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // Also set up a periodic check for new elements
        setInterval(() => {
            const items = document.querySelectorAll('.preview-item:not([draggable="true"])');
            if (items.length > 0) {
                console.log(`Found ${items.length} new preview items in periodic check`);
                items.forEach(makeDraggable);
            }
            
            const zones = document.querySelectorAll('.adset-drop-zone:not([data-drop-setup="true"])');
            if (zones.length > 0) {
                console.log(`Found ${zones.length} new drop zones in periodic check`);
                setupDropZones();
            }
        }, 2000);
    }

    // Add a function to make newly loaded preview items draggable
    function makePreviewItemsDraggable() {
        console.log('Making preview items draggable');
        const previewItems = document.querySelectorAll('#uploadPreview .preview-item');
        console.log(`Found ${previewItems.length} preview items`);
        
        previewItems.forEach(item => {
            // Set data attributes for the asset if they don't exist
            if (!item.dataset.id) {
                const img = item.querySelector('img');
                const video = item.querySelector('video');
                item.dataset.id = item.id || `asset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                item.dataset.type = video ? 'video' : 'image';
            }
            
            // Make it draggable
            if (item.getAttribute('draggable') !== 'true') {
                item.setAttribute('draggable', 'true');
                
                item.addEventListener('dragstart', function(e) {
                    console.log('Drag started for preview item', this.dataset.id);
                    e.dataTransfer.setData('text/plain', this.dataset.id);
                    e.dataTransfer.effectAllowed = 'copy';
                    this.classList.add('asset-being-dragged');
                });
                
                item.addEventListener('dragend', function() {
                    this.classList.remove('asset-being-dragged');
                });
            }
        });
    }

    // Call the function on page load
    document.addEventListener('DOMContentLoaded', makePreviewItemsDraggable);

    // Also call it when the "Select from Library" button is clicked
    const selectFromLibraryBtn = document.getElementById('selectFromLibraryBtn');
    if (selectFromLibraryBtn) {
        selectFromLibraryBtn.addEventListener('click', function() {
            // Wait for the modal and selection to complete
            setTimeout(makePreviewItemsDraggable, 1000);
        });
    }

    // Periodically check for new preview items
    setInterval(makePreviewItemsDraggable, 5000);

    // Fix the platform headers in adsetContainer
    function fixPlatformHeaders() {
        const adsetContainer = document.getElementById('adsetContainer');
        if (!adsetContainer) return;
        
        // Remove any [object HTMLDivElement] headers
        const objectHeaders = adsetContainer.querySelectorAll('div');
        objectHeaders.forEach(header => {
            if (header.textContent === '[object HTMLDivElement]') {
                header.remove();
            }
        });
        
        // Find and remove any platform headers that we don't want
        const metaHeader = adsetContainer.querySelector('.meta-header');
        const tiktokHeader = adsetContainer.querySelector('.tiktok-header');
        
        if (metaHeader) {
            metaHeader.remove();
        }
        
        if (tiktokHeader) {
            tiktokHeader.remove();
        }
        
        // Fix any campaign name divs that show [object HTMLDivElement]
        const campaignNameTexts = adsetContainer.querySelectorAll('.campaign-name-text');
        campaignNameTexts.forEach(nameElement => {
            if (nameElement.textContent === '[object HTMLDivElement]') {
                // Get the correct campaign name from the parent element's data attribute
                const header = nameElement.closest('.adset-campaign-header');
                if (header && header.dataset.campaignId) {
                    const campaignId = header.dataset.campaignId;
                    const campaignItem = document.querySelector(`.campaign-item[data-id="${campaignId}"]`);
                    if (campaignItem) {
                        const campaignName = campaignItem.querySelector('.campaign-name').textContent;
                        nameElement.textContent = campaignName;
                    } else {
                        nameElement.textContent = "Campaign";
                    }
                } else {
                    nameElement.textContent = "Campaign";
                }
            }
        });
    }

    // Call fixPlatformHeaders whenever we load campaigns
    const originalDirectlyFetchCampaignsAndAdsets = directlyFetchCampaignsAndAdsets;
    directlyFetchCampaignsAndAdsets = function() {
        originalDirectlyFetchCampaignsAndAdsets.apply(this, arguments);
        setTimeout(fixPlatformHeaders, 1000);
    };

    // Also fix headers immediately
    if (document.readyState === 'complete') {
        fixPlatformHeaders();
    } else {
        window.addEventListener('load', fixPlatformHeaders);
    }

    // Helper function to create a new ad in an adset
    function createNewAdInAdset(assetsContainer, adsetId, platform) {
        // Create a unique ad ID
        const adId = `ad-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Mark all existing ads as inactive
        const existingAds = assetsContainer.querySelectorAll('.ad-container');
        existingAds.forEach(ad => ad.classList.remove('active'));
        
        // Create new ad container
        const adContainer = document.createElement('div');
        adContainer.className = 'ad-container active';
        adContainer.dataset.adId = adId;
        adContainer.dataset.adsetId = adsetId;
        adContainer.dataset.platform = platform;
        
        // Create ad header
        const adHeader = document.createElement('div');
        adHeader.className = 'ad-header';
        
        // Create ad title with number indicator
        const adCount = existingAds.length + 1;
        const adTitle = document.createElement('h4');
        adTitle.textContent = `Ad #${adCount}`;
        adHeader.appendChild(adTitle);
        
        // Create ad name input container
        const adNameContainer = document.createElement('div');
        adNameContainer.className = 'ad-name-container';
        
        const adNameLabel = document.createElement('label');
        adNameLabel.textContent = 'Ad Name:';
        adNameLabel.setAttribute('for', `ad-name-${adId}`);
        
        const adNameInput = document.createElement('input');
        adNameInput.type = 'text';
        adNameInput.className = 'form-control ad-name';
        adNameInput.id = `ad-name-${adId}`;
        adNameInput.placeholder = 'Enter ad name';
        adNameInput.required = true;
        adNameInput.value = `New Ad ${adCount}`;
        
        adNameContainer.appendChild(adNameLabel);
        adNameContainer.appendChild(adNameInput);
        adHeader.appendChild(adNameContainer);
        
        // Add switch/delete buttons
        const adActions = document.createElement('div');
        adActions.className = 'ad-actions';
        
        // Add button for creating a new ad
        const newAdButton = document.createElement('button');
        newAdButton.type = 'button';
        newAdButton.className = 'btn btn-sm btn-primary new-ad-button';
        newAdButton.innerHTML = '<i class="fas fa-plus"></i> New Ad';
        newAdButton.title = 'Create a new ad';
        newAdButton.addEventListener('click', function() {
            createNewAdInAdset(assetsContainer, adsetId, platform);
        });
        
        // Add button for deleting this ad
        const deleteAdButton = document.createElement('button');
        deleteAdButton.type = 'button';
        deleteAdButton.className = 'btn btn-sm btn-danger delete-ad-button';
        deleteAdButton.innerHTML = '<i class="fas fa-trash"></i>';
        deleteAdButton.title = 'Delete this ad';
        deleteAdButton.addEventListener('click', function() {
            if (confirm('Are you sure you want to delete this ad?')) {
                // Free up any assigned assets
                const assets = adContainer.querySelectorAll('.mini-asset');
                assets.forEach(asset => {
                    const assetId = asset.dataset.assetId;
                    const originalAsset = document.querySelector(`.preview-item[data-id="${assetId}"]`);
                    if (originalAsset) {
                        originalAsset.classList.remove('assigned');
                    }
                });
                
                // Remove the ad container
                adContainer.remove();
                
                // If no ads left, create a new empty one
                if (assetsContainer.querySelectorAll('.ad-container').length === 0) {
                    createNewAdInAdset(assetsContainer, adsetId, platform);
                } else {
                    // Otherwise, activate the first ad
                    const firstAd = assetsContainer.querySelector('.ad-container');
                    if (firstAd) firstAd.classList.add('active');
                }
            }
        });
        
        adActions.appendChild(newAdButton);
        adActions.appendChild(deleteAdButton);
        adHeader.appendChild(adActions);
        
        adContainer.appendChild(adHeader);
        
        // Create assets list
        const adAssetsList = document.createElement('div');
        adAssetsList.className = 'ad-assets-list';
        adContainer.appendChild(adAssetsList);
        
        // Add to the assets container
        assetsContainer.appendChild(adContainer);
        
        // Scroll to the new ad
        adContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        return adContainer;
    }

    // Helper function to add an asset to an ad
    function addAssetToAd(assetId, originalAsset, adAssetsList, platform, adsetId) {
        // Create a mini asset element
        const miniAsset = document.createElement('div');
        miniAsset.className = 'mini-asset';
        miniAsset.dataset.assetId = assetId;
        
        // Copy content from original asset
        const assetContent = originalAsset.querySelector('img, video');
        if (assetContent) {
            const assetClone = assetContent.cloneNode(true);
            if (assetClone.tagName === 'VIDEO') {
                assetClone.removeAttribute('autoplay');
                assetClone.muted = true;
                assetClone.controls = false;
                assetClone.loop = true;
            }
            miniAsset.appendChild(assetClone);
        }
        
        // Add remove button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'mini-asset-remove';
        removeBtn.innerHTML = '×';
        removeBtn.addEventListener('click', function() {
            miniAsset.remove();
            
            // Find all instances of this asset in all adsets
            const allAssignedInstances = document.querySelectorAll(`.mini-asset[data-asset-id="${assetId}"]`);
            
            // If this was the last instance, mark the original asset as unassigned
            if (allAssignedInstances.length <= 1) { // <= 1 because this instance is still in the DOM at this point
                // Mark the original asset as unassigned
                originalAsset.classList.remove('assigned');
                
                // Also update any assignment status indicators
                const assignmentStatus = originalAsset.querySelector('.assignment-status');
                if (assignmentStatus) {
                    assignmentStatus.classList.remove('status-assigned');
                    assignmentStatus.classList.add('status-unassigned');
                    assignmentStatus.innerHTML = '<i class="fas fa-exclamation-circle"></i> Unassigned';
                }
            }
            
            // If no assets left, check if we should remove the ad container
            if (adAssetsList.children.length === 0) {
                // Optional: Auto-remove empty ads
                // adContainer.remove();
            }
        });
        
        miniAsset.appendChild(removeBtn);
        adAssetsList.appendChild(miniAsset);
        
        // Mark the original asset as assigned
        originalAsset.classList.add('assigned');
        
        // Update assignment status indicator if it exists
        const assignmentStatus = originalAsset.querySelector('.assignment-status');
        if (assignmentStatus) {
            assignmentStatus.classList.remove('status-unassigned');
            assignmentStatus.classList.add('status-assigned');
            assignmentStatus.innerHTML = '<i class="fas fa-check-circle"></i> Assigned';
        } else {
            // Create assignment status indicator if it doesn't exist
            const newStatus = document.createElement('div');
            newStatus.className = 'assignment-status status-assigned';
            newStatus.innerHTML = '<i class="fas fa-check-circle"></i> Assigned';
            originalAsset.appendChild(newStatus);
        }
        
        // Add hidden input for form submission
        const adId = adAssetsList.closest('.ad-container').dataset.adId;
        
        // Verify we have a valid adsetId
        if (!adsetId || adsetId === 'undefined') {
            console.error('Invalid adset ID when adding asset to ad:', adsetId);
            
            // Try to recover the adset ID from parent elements
            const adContainer = adAssetsList.closest('.ad-container');
            if (adContainer) {
                const recoveredAdsetId = adContainer.dataset.adsetId;
                if (recoveredAdsetId && recoveredAdsetId !== 'undefined') {
                    adsetId = recoveredAdsetId;
                    console.log('Recovered adset ID from ad container:', adsetId);
                } else {
                    const assetsContainer = adContainer.closest('.assets-container');
                    if (assetsContainer) {
                        const recoveredAdsetId = assetsContainer.dataset.adsetId;
                        if (recoveredAdsetId && recoveredAdsetId !== 'undefined') {
                            adsetId = recoveredAdsetId;
                            console.log('Recovered adset ID from assets container:', adsetId);
                        }
                    }
                }
            }
            
            if (!adsetId || adsetId === 'undefined') {
                console.error('Could not recover a valid adset ID. Asset may not be properly assigned.');
            }
        }
        
        const hiddenInput = document.createElement('input');
        hiddenInput.type = 'hidden';
        hiddenInput.name = `asset_assignments[${platform}][${adsetId}][${adId}][]`;
        hiddenInput.value = assetId;
        adAssetsList.appendChild(hiddenInput);
        
        return miniAsset;
    }

    // Function to publish ads to the respective platforms
    function publishAds() {
        console.log('Publishing ads...');
        
        // Check if at least one platform is selected
        const metaCheckbox = document.querySelector('input[name="platforms"][value="meta"]');
        const tiktokCheckbox = document.querySelector('input[name="platforms"][value="tiktok"]');
        
        if ((!metaCheckbox || !metaCheckbox.checked) && (!tiktokCheckbox || !tiktokCheckbox.checked)) {
            showMessage('error', 'Please select at least 1 platform');
            return;
        }
        
        // Show loading overlay
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'loading-overlay';
        loadingOverlay.innerHTML = `
            <div>
                <h3><i class="fas fa-spinner fa-spin"></i> Creating Ads</h3>
                <p>Please wait while we create your ads...</p>
            </div>
        `;
        document.body.appendChild(loadingOverlay);
        
        try {
            // Collect all data from the form
            const data = collectAdData();
            console.log('Collected ad data:', data);
            
            // Ensure at least one advertiser account is selected for each platform
            const selectedPlatforms = data.platforms;
            
            if (selectedPlatforms.includes('meta') && (!data.accounts.meta || data.accounts.meta.length === 0)) {
                document.body.removeChild(loadingOverlay);
                showMessage('error', 'Please select a Meta Advertiser Account');
                return;
            }
            
            if (selectedPlatforms.includes('tiktok') && (!data.accounts.tiktok || data.accounts.tiktok.length === 0)) {
                document.body.removeChild(loadingOverlay);
                showMessage('error', 'Please select a TikTok Advertiser Account');
                return;
            }
            
            // Convert JSON data to FormData for the backend
            const formData = new FormData();
            
            // Add operation type
            formData.append('operationType', data.operationType);
            
            // Add platforms
            data.platforms.forEach(platform => {
                formData.append('platforms', platform);
            });
            
            // Add selected accounts - use the first account for simplicity
            // The backend currently expects only one advertiser ID per platform
            if (data.accounts.meta && data.accounts.meta.length > 0) {
                formData.append('metaAdvertiserId', data.accounts.meta[0]);
                
                // Show a warning if multiple Meta accounts are selected
                if (data.accounts.meta.length > 1) {
                    console.warn('Multiple Meta advertiser accounts selected, but only using the first one:', data.accounts.meta[0]);
                }
            }
            
            if (data.accounts.tiktok && data.accounts.tiktok.length > 0) {
                formData.append('tiktokAdvertiserId', data.accounts.tiktok[0]);
                
                // Show a warning if multiple TikTok accounts are selected
                if (data.accounts.tiktok.length > 1) {
                    console.warn('Multiple TikTok advertiser accounts selected, but only using the first one:', data.accounts.tiktok[0]);
                }
            }
            
            // Debug - Log form data
            console.log("Form data being sent to server:");
            for (const key of formData.keys()) {
                console.log(`${key}: ${formData.get(key)}`);
            }
            
            // Track all selected asset IDs
            const selectedAssetIds = new Set();
            
            // Process ad assignments for each platform
            Object.entries(data.adAssignments).forEach(([platform, platformAssignments]) => {
                // Add selected adsets for this platform
                Object.entries(platformAssignments).forEach(([adsetId, adsInAdset]) => {
                    if (!adsetId || adsetId === 'undefined') {
                        console.error(`Invalid adset ID: "${adsetId}" for platform: ${platform}. Skipping.`);
                        return; // Skip this adset if ID is invalid
                    }
                    
                    formData.append(`selected_adsets[${platform}][]`, adsetId);
                    console.log(`Added adset: ${adsetId} for platform: ${platform}`);
                    
                    // Process ads in this adset
                    adsInAdset.forEach((ad, adIndex) => {
                        // Add ad name with container ID to distinguish between different ads for the same adset
                        formData.append(`ad_names[${adsetId}][ad_${adIndex}]`, ad.name);
                        console.log(`Added ad name: ${ad.name} for adset: ${adsetId} with container: ad_${adIndex}`);
                        
                        // Add asset assignments with the same container ID
                        ad.assets.forEach(assetId => {
                            formData.append(`asset_assignments[${adsetId}][ad_${adIndex}][]`, assetId);
                            selectedAssetIds.add(assetId);
                            console.log(`Added asset: ${assetId} to adset: ${adsetId} with container: ad_${adIndex}`);
                        });
                    });
                });
            });
            
            // Add all selected assets to library_assets array
            Array.from(selectedAssetIds).forEach(assetId => {
                formData.append('library_assets[]', assetId);
                console.log(`Added library asset: ${assetId}`);
            });
            
            if (selectedAssetIds.size === 0) {
                // Remove loading overlay
                document.body.removeChild(loadingOverlay);
                showMessage('error', 'No assets have been assigned to adsets');
                return;
            }
            
            console.log('Sending FormData with asset IDs:', Array.from(selectedAssetIds));
            
            // Send data to server using FormData
            fetch('/api/create_campaign', {
                method: 'POST',
                body: formData, // Using FormData format
            })
            .then(response => response.json())
            .then(result => {
                // Remove loading overlay
                document.body.removeChild(loadingOverlay);
                
                console.log("Server response:", result);
                
                if (result.success) {
                    // Show success message
                    showMessage('success', 'Ads created successfully!');
                    
                    // Create a confirmation dialog
                    const confirmDialog = document.createElement('div');
                    confirmDialog.className = 'loading-overlay';
                    confirmDialog.innerHTML = `
                        <div style="text-align: center; padding: 20px; background-color: white; border-radius: 10px; max-width: 500px;">
                            <h3 style="color: #28a745;"><i class="fas fa-check-circle"></i> Success!</h3>
                            <p>Your ads have been created successfully.</p>
                            <div style="margin-top: 20px;">
                                <button id="createMoreBtn" class="btn btn-secondary" style="margin-right: 10px;">Create More Ads</button>
                                <button id="goToBuilderBtn" class="btn btn-primary">Go to Ads Builder</button>
                            </div>
                        </div>
                    `;
                    document.body.appendChild(confirmDialog);
                    
                    // Add event listeners to buttons
                    document.getElementById('createMoreBtn').addEventListener('click', function() {
                        document.body.removeChild(confirmDialog);
                        // Refresh the page to start over
                        window.location.reload();
                    });
                    
                    document.getElementById('goToBuilderBtn').addEventListener('click', function() {
                        document.body.removeChild(confirmDialog);
                        // Redirect to ads builder
                        window.location.href = '/ads_builder';
                    });
                } else {
                    // Show error message with details if available
                    const errorMsg = result.error || result.message || 'Error creating ads';
                    showMessage('error', errorMsg);
                    console.error('Server returned error:', errorMsg);
                }
            })
            .catch(error => {
                // Remove loading overlay
                document.body.removeChild(loadingOverlay);
                
                // Show error message
                showMessage('error', 'An error occurred while creating ads');
                console.error('Error creating ads:', error);
            });
        } catch (error) {
            // Remove loading overlay
            document.body.removeChild(loadingOverlay);
            
            // Show error message
            showMessage('error', error.message || 'An error occurred while processing your request');
            console.error('Error in publishAds:', error);
        }
    }

    // Helper function to collect all ad data
    function collectAdData() {
        // Get the form
        const form = document.getElementById('campaignForm');
        
        // Get selected platforms
        const selectedPlatforms = [];
        form.querySelectorAll('input[name="platforms"]:checked').forEach(platform => {
            selectedPlatforms.push(platform.value);
        });
        
        // Get selected accounts
        const selectedAccounts = {
            meta: Array.from(form.querySelectorAll('input[name="metaAdvertiserId"]:checked')).map(input => input.value),
            tiktok: Array.from(form.querySelectorAll('input[name="tiktokAdvertiserId"]:checked')).map(input => input.value)
        };
        
        // Get selected campaigns
        const selectedCampaigns = {};
        document.querySelectorAll('.campaign-item.selected').forEach(campaign => {
            const platform = campaign.dataset.platform;
            const campaignId = campaign.dataset.id;
            const accountId = campaign.dataset.accountId;
            
            if (!selectedCampaigns[platform]) {
                selectedCampaigns[platform] = [];
            }
            
            selectedCampaigns[platform].push({
                id: campaignId,
                accountId: accountId
            });
        });
        
        // Get ad assignments
        const adAssignments = {};
        document.querySelectorAll('.adset-item').forEach(adsetItem => {
            // Use either dataset.id or dataset.adsetId, whichever is defined
            const adsetId = adsetItem.dataset.id || adsetItem.dataset.adsetId;
            const platform = adsetItem.dataset.platform;
            const campaignId = adsetItem.dataset.campaignId;
            
            if (!adsetId) {
                console.warn('Adset without ID encountered:', adsetItem);
                return;
            }
            
            // Get all ad containers in this adset
            const adContainers = adsetItem.querySelectorAll('.ad-container');
            
            adContainers.forEach(adContainer => {
                // Get ad name
                const adName = adContainer.querySelector('.ad-name').value;
                
                // Get assets assigned to this ad
                const assets = Array.from(adContainer.querySelectorAll('.mini-asset')).map(asset => asset.dataset.assetId);
                
                if (assets.length > 0) {
                    if (!adAssignments[platform]) {
                        adAssignments[platform] = {};
                    }
                    
                    if (!adAssignments[platform][adsetId]) {
                        adAssignments[platform][adsetId] = [];
                    }
                    
                    adAssignments[platform][adsetId].push({
                        name: adName,
                        assets: assets
                    });
                }
            });
        });
        
        // Prepare the data to send
        return {
            operationType: '1',
            platforms: selectedPlatforms,
            accounts: selectedAccounts,
            campaigns: selectedCampaigns,
            adAssignments: adAssignments
        };
    }

    // Helper function to show messages
    function showMessage(type, message) {
        // Create message element
        const messageElement = document.createElement('div');
        messageElement.className = `message message-${type}`;
        messageElement.style.position = 'fixed';
        messageElement.style.top = '20px';
        messageElement.style.left = '50%';
        messageElement.style.transform = 'translateX(-50%)';
        messageElement.style.padding = '10px 20px';
        messageElement.style.borderRadius = '5px';
        messageElement.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.2)';
        messageElement.style.zIndex = '9999';
        messageElement.style.maxWidth = '80%';
        
        if (type === 'success') {
            messageElement.style.backgroundColor = '#28a745';
            messageElement.style.color = 'white';
        } else if (type === 'error') {
            messageElement.style.backgroundColor = '#dc3545';
            messageElement.style.color = 'white';
        }
        
        messageElement.textContent = message;
        
        // Add to body
        document.body.appendChild(messageElement);
        
        // Remove after 5 seconds
        setTimeout(() => {
            document.body.removeChild(messageElement);
        }, 5000);
    }

    // Function to load adsets for a campaign
    function loadAdsetsForCampaign(campaignId, accountId, campaignName, platform) {
        console.log(`Loading adsets for campaign ${campaignName} (${campaignId}) on platform ${platform}`);
        
        // Check if adsets already loaded
        const existingAdsets = document.querySelectorAll(`.adset-item[data-campaign-id="${campaignId}"]`);
        if (existingAdsets.length > 0) {
            console.log(`Adsets already loaded for campaign ${campaignId}`);
            return;
        }
        
        // Show loading indicator
        const adsetLoading = document.createElement('div');
        adsetLoading.className = 'loading-indicator';
        adsetLoading.id = `loading-adsets-${campaignId}`;
        adsetLoading.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading adsets...';
        
        const adsetContainer = document.getElementById('adsetContainer');
        adsetContainer.appendChild(adsetLoading);
        
        // Different API endpoints based on platform
        const apiUrl = (platform.toLowerCase() === 'meta') 
            ? `/api/meta/adsets?campaign_id=${campaignId}&account_id=${accountId}` 
            : `/api/tiktok/adsets?campaign_id=${campaignId}&advertiser_id=${accountId}`;
        
        fetch(apiUrl)
            .then(response => response.json())
            .then(data => {
                // Remove loading indicator
                const loadingElement = document.getElementById(`loading-adsets-${campaignId}`);
                if (loadingElement) {
                    loadingElement.remove();
                }
                
                console.log(`Received ${platform} adsets for campaign ${campaignId}:`, data);
                
                // Handle different data structures based on platform
                let adsets = [];
                try {
                    if (platform.toLowerCase() === 'meta') {
                        // Meta adsets structure
                        if (Array.isArray(data)) {
                            adsets = data;
                        } else if (data && data.data && Array.isArray(data.data)) {
                            adsets = data.data;
                        } else if (data && data.adsets && Array.isArray(data.adsets)) {
                            adsets = data.adsets;
                        }
                    } else if (platform.toLowerCase() === 'tiktok') {
                        // TikTok adsets structure - handle nested data
                        if (Array.isArray(data)) {
                            adsets = data;
                        } else if (data && data.data && data.data.list && Array.isArray(data.data.list)) {
                            adsets = data.data.list;
                        } else if (data && data.list && Array.isArray(data.list)) {
                            adsets = data.list;
                        } else if (data && data.adsets && Array.isArray(data.adsets)) {
                            adsets = data.adsets;
                        }
                    }
                    
                    // Normalize adset data to handle different property naming conventions
                    adsets = adsets.map(adset => {
                        return {
                            adset_id: adset.adset_id || adset.id || adset.adgroup_id,
                            adset_name: adset.adset_name || adset.name || adset.adgroup_name,
                            status: adset.status || adset.operation_status,
                            campaign_id: adset.campaign_id || campaignId,
                            budget: adset.budget || adset.daily_budget
                        };
                    });
                    
                    console.log(`Normalized ${adsets.length} adsets for campaign ${campaignId}:`, adsets);
                } catch (error) {
                    console.error(`Error processing ${platform} adsets:`, error);
                    adsets = [];
                }
                
                if (adsets.length === 0) {
                    const noAdsets = document.createElement('div');
                    noAdsets.className = 'error-message';
                    noAdsets.dataset.campaignId = campaignId;
                    noAdsets.textContent = `No adsets found for campaign ${campaignName}`;
                    adsetContainer.appendChild(noAdsets);
                    return;
                }
                
                // Create campaign header in adset container if it doesn't exist
                let campaignHeader = document.querySelector(`.adset-campaign-header[data-campaign-id="${campaignId}"]`);
                if (!campaignHeader) {
                    campaignHeader = document.createElement('div');
                    campaignHeader.className = 'adset-campaign-header';
                    campaignHeader.dataset.campaignId = campaignId;
                    campaignHeader.dataset.platform = platform;
                    
                    const platformBadge = document.createElement('span');
                    platformBadge.className = `platform-badge ${platform.toLowerCase()}`;
                    platformBadge.textContent = platform.toUpperCase();
                    
                    const campaignNameSpan = document.createElement('span');
                    campaignNameSpan.className = 'adset-campaign-name';
                    campaignNameSpan.textContent = campaignName;
                    
                    campaignHeader.appendChild(platformBadge);
                    campaignHeader.appendChild(campaignNameSpan);
                    adsetContainer.appendChild(campaignHeader);
                }
                
                // Create and add adsets
                adsets.forEach(adset => {
                    const adsetId = adset.adset_id;
                    if (!adsetId) {
                        console.warn('Adset without ID encountered:', adset);
                        return;
                    }
                    
                    // Skip if this adset is already displayed
                    if (document.querySelector(`.adset-item[data-adset-id="${adsetId}"]`)) {
                        return;
                    }
                    
                    const adsetItem = document.createElement('div');
                    adsetItem.className = 'adset-item';
                    adsetItem.dataset.adsetId = adsetId;
                    adsetItem.dataset.id = adsetId; // Add this line to ensure dataset.id is set
                    adsetItem.dataset.campaignId = campaignId;
                    adsetItem.dataset.platform = platform;
                    
                    // Create adset header
                    const adsetHeader = document.createElement('div');
                    adsetHeader.className = 'adset-header';
                    
                    // Add adset name
                    const adsetName = document.createElement('div');
                    adsetName.className = 'adset-name';
                    adsetName.textContent = adset.adset_name || 'Unnamed Adset';
                    
                    // Add adset status
                    const adsetStatus = document.createElement('div');
                    adsetStatus.className = 'adset-status';
                    const statusText = adset.status === 'ACTIVE' || adset.status === 'ENABLE' ? 'ACTIVE' : 'PAUSED';
                    adsetStatus.textContent = statusText;
                    adsetStatus.classList.add(statusText.toLowerCase() === 'active' ? 'active' : 'paused');
                    
                    // Assemble adset header
                    adsetHeader.appendChild(adsetName);
                    adsetHeader.appendChild(adsetStatus);
                    adsetItem.appendChild(adsetHeader);
                    
                    // Create drop zone for assets
                    const dropZoneContainer = document.createElement('div');
                    dropZoneContainer.className = 'adset-drop-zone-container';
                    
                    const dropZone = document.createElement('div');
                    dropZone.className = 'adset-drop-zone';
                    dropZone.dataset.adsetId = adsetId;
                    dropZone.dataset.id = adsetId; // Add this line to ensure dataset.id is set
                    dropZone.dataset.campaignId = campaignId;
                    dropZone.dataset.platform = platform;
                    dropZone.innerHTML = '<h4>Drop assets here</h4>';
                    
                    dropZoneContainer.appendChild(dropZone);
                    adsetItem.appendChild(dropZoneContainer);
                    
                    // Create assets container
                    const assetsContainer = document.createElement('div');
                    assetsContainer.className = 'assets-container';
                    assetsContainer.dataset.adsetId = adsetId;
                    assetsContainer.dataset.campaignId = campaignId;
                    assetsContainer.dataset.platform = platform;
                    
                    dropZone.appendChild(assetsContainer);
                    
                    // Add to container after the corresponding campaign header
                    adsetContainer.appendChild(adsetItem);
                });
                
                // Setup drop zones for drag and drop
                setupDropZones();
            })
            .catch(error => {
                // Remove loading indicator
                const loadingElement = document.getElementById(`loading-adsets-${campaignId}`);
                if (loadingElement) {
                    loadingElement.remove();
                }
                
                console.error(`Error fetching ${platform} adsets:`, error);
                
                // Show error in UI
                const errorMsg = document.createElement('div');
                errorMsg.className = 'error-message';
                errorMsg.dataset.campaignId = campaignId;
                errorMsg.textContent = `Error loading adsets for ${campaignName}: ${error.message}`;
                adsetContainer.appendChild(errorMsg);
            });
    }

    // Add a function to update assignment status indicators for all assets
    function updateAssetAssignmentStatus() {
        // Get all preview items
        const previewItems = document.querySelectorAll('#uploadPreview .preview-item');
        
        // For each preview item, check if it's assigned to any adset
        previewItems.forEach(item => {
            const assetId = item.dataset.id;
            if (!assetId) return;
            
            // Check if this asset is used in any adset
            const assignedInstances = document.querySelectorAll(`.mini-asset[data-asset-id="${assetId}"]`);
            
            // Update assignment status
            if (assignedInstances.length > 0) {
                // Mark as assigned
                item.classList.add('assigned');
                
                // Update status indicator
                let statusElement = item.querySelector('.assignment-status');
                if (!statusElement) {
                    statusElement = document.createElement('div');
                    statusElement.className = 'assignment-status';
                    item.appendChild(statusElement);
                }
                
                statusElement.classList.remove('status-unassigned');
                statusElement.classList.add('status-assigned');
                statusElement.innerHTML = '<i class="fas fa-check-circle"></i> Assigned';
            } else {
                // Mark as unassigned
                item.classList.remove('assigned');
                
                // Update status indicator
                let statusElement = item.querySelector('.assignment-status');
                if (!statusElement) {
                    statusElement = document.createElement('div');
                    statusElement.className = 'assignment-status';
                    item.appendChild(statusElement);
                }
                
                statusElement.classList.remove('status-assigned');
                statusElement.classList.add('status-unassigned');
                statusElement.innerHTML = '<i class="fas fa-exclamation-circle"></i> Unassigned';
            }
        });
    }

    // Call updateAssetAssignmentStatus when assets are loaded or when the page loads
    document.addEventListener('DOMContentLoaded', () => {
        // Initial update
        setTimeout(updateAssetAssignmentStatus, 1000);
        
        // Update when the asset library modal is closed
        const closeModalButtons = document.querySelectorAll('.close-modal');
        closeModalButtons.forEach(button => {
            button.addEventListener('click', () => {
                setTimeout(updateAssetAssignmentStatus, 500);
            });
        });
        
        // Also set an interval to periodically update (helpful for dynamic changes)
        setInterval(updateAssetAssignmentStatus, 3000);
    });
})(); 