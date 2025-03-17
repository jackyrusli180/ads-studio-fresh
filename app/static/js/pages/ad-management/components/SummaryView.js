/**
 * Summary View Component
 * Handles the generation and display of the campaign summary in the final step
 */

/**
 * Initialize the Summary View component
 * @param {Object} elements - DOM elements object
 * @param {Object} state - Application state object
 * @returns {Object} - Summary View methods
 */
export function initSummaryView(elements, state) {
    /**
     * Generate a summary of the campaign configuration
     */
    function generateSummary() {
        if (!elements.campaignSummary) return;
        
        // Clear current content
        elements.campaignSummary.innerHTML = '';

        // Create main container with better styling
        const summaryContainer = document.createElement('div');
        summaryContainer.className = 'summary-container';
        summaryContainer.style.padding = '20px';
        summaryContainer.style.backgroundColor = '#fff';
        summaryContainer.style.borderRadius = '8px';
        summaryContainer.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';

        // Add title
        const title = document.createElement('h2');
        title.textContent = 'Review';
        title.style.marginBottom = '20px';
        title.style.color = '#333';
        title.style.borderBottom = '2px solid #f0f0f0';
        title.style.paddingBottom = '10px';
        summaryContainer.appendChild(title);

        // Get all ad sets with their assets
        const adSets = collectAdSets();
        
        if (adSets.length === 0) {
            const emptyMessage = document.createElement('p');
            emptyMessage.textContent = 'No ad sets have been configured yet.';
            emptyMessage.style.color = '#666';
            emptyMessage.style.fontStyle = 'italic';
            summaryContainer.appendChild(emptyMessage);
        } else {
            // Create the table
            const table = document.createElement('table');
            table.className = 'ads-summary-table';
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';
            table.style.marginTop = '20px';
            
            // Create header row
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            
            // Header cells
            const headers = ['Ad Set', 'Ad Name', 'Assets', 'Ad Copy'];
            headers.forEach(headerText => {
                const th = document.createElement('th');
                th.textContent = headerText;
                th.style.backgroundColor = '#f8f9fa';
                th.style.padding = '12px';
                th.style.textAlign = 'left';
                th.style.borderBottom = '2px solid #e9ecef';
                headerRow.appendChild(th);
            });
            
            thead.appendChild(headerRow);
            table.appendChild(thead);
            
            // Create table body
            const tbody = document.createElement('tbody');
            
            // Add rows for each ad set
            adSets.forEach((adSet, index) => {
                const row = document.createElement('tr');
                row.style.borderBottom = '1px solid #e9ecef';
                
                // Ad Set name cell
                const adSetCell = document.createElement('td');
                adSetCell.style.padding = '12px';
                adSetCell.style.verticalAlign = 'top';
                adSetCell.textContent = adSet.name || `Ad Set ${index + 1}`;
                row.appendChild(adSetCell);
                
                // Ad Name cell
                const adNameCell = document.createElement('td');
                adNameCell.style.padding = '12px';
                adNameCell.style.verticalAlign = 'top';
                adNameCell.textContent = adSet.adName || `Ad ${index + 1}`;
                row.appendChild(adNameCell);
                
                // Assets cell - show thumbnails of all assets
                const assetsCell = document.createElement('td');
                assetsCell.style.padding = '12px';
                
                if (adSet.assets && adSet.assets.length > 0) {
                    const assetGrid = document.createElement('div');
                    assetGrid.style.display = 'grid';
                    assetGrid.style.gridTemplateColumns = 'repeat(3, 1fr)';
                    assetGrid.style.gap = '8px';
                    
                    adSet.assets.forEach(asset => {
                        const assetThumb = document.createElement('div');
                        assetThumb.style.position = 'relative';
                        assetThumb.style.width = '75px';
                        assetThumb.style.height = '75px';
                        assetThumb.style.borderRadius = '4px';
                        assetThumb.style.overflow = 'hidden';
                        assetThumb.style.backgroundColor = '#f0f0f0';
                        
                        // Create the image
                        if (asset.url) {
                            const img = document.createElement('img');
                            img.src = asset.url;
                            img.style.width = '100%';
                            img.style.height = '100%';
                            img.style.objectFit = 'cover';
                            assetThumb.appendChild(img);
                        } else {
                            // If no URL, show a placeholder
                            assetThumb.textContent = asset.name || 'Asset';
                            assetThumb.style.display = 'flex';
                            assetThumb.style.justifyContent = 'center';
                            assetThumb.style.alignItems = 'center';
                            assetThumb.style.color = '#666';
                            assetThumb.style.fontSize = '12px';
                        }
                        
                        assetGrid.appendChild(assetThumb);
                    });
                    
                    assetsCell.appendChild(assetGrid);
                } else {
                    assetsCell.textContent = 'No assets';
                    assetsCell.style.color = '#666';
                    assetsCell.style.fontStyle = 'italic';
                }
                
                row.appendChild(assetsCell);
                
                // Ad copy cell
                const copyCell = document.createElement('td');
                copyCell.style.padding = '12px';
                copyCell.style.verticalAlign = 'top';
                
                if (adSet.headline || adSet.adCopy) {
                    // Create container for headline and copy
                    const adCopyContainer = document.createElement('div');
                    adCopyContainer.style.display = 'flex';
                    adCopyContainer.style.flexDirection = 'column';
                    adCopyContainer.style.gap = '8px';
                    
                    // Add headline if available
                    if (adSet.headline) {
                        const headlineElem = document.createElement('div');
                        headlineElem.className = 'ad-headline';
                        headlineElem.textContent = adSet.headline;
                        headlineElem.style.fontWeight = 'bold';
                        headlineElem.style.fontSize = '16px';
                        headlineElem.style.color = '#333';
                        adCopyContainer.appendChild(headlineElem);
                    }
                    
                    // Add ad copy text if available
                    if (adSet.adCopy) {
                        const copyText = document.createElement('div');
                        copyText.className = 'ad-copy-text';
                        copyText.textContent = adSet.adCopy;
                        copyText.style.maxHeight = '100px';
                        copyText.style.overflow = 'auto';
                        copyText.style.fontSize = '14px';
                        copyText.style.color = '#555';
                        adCopyContainer.appendChild(copyText);
                    }
                    
                    copyCell.appendChild(adCopyContainer);
                } else {
                    copyCell.textContent = 'Ad copy not provided (optional)';
                    copyCell.style.color = '#666';
                    copyCell.style.fontStyle = 'italic';
                }
                
                row.appendChild(copyCell);
                
                tbody.appendChild(row);
            });
            
            table.appendChild(tbody);
            summaryContainer.appendChild(table);
        }
        
        // Add launch button
        const launchButton = document.createElement('button');
        launchButton.type = 'submit';
        launchButton.className = 'btn btn-primary';
        launchButton.innerHTML = '<i class="fas fa-rocket"></i> Launch Ads';
        launchButton.style.marginTop = '30px';
        launchButton.style.width = '200px';
        launchButton.style.padding = '10px';
        launchButton.style.fontSize = '16px';
        
        // Simplified condition - only checking for assets
        if (!adSets.some(adSet => adSet.assets?.length > 0)) {
            launchButton.disabled = true;
            launchButton.classList.add('disabled');
            
            const warningText = document.createElement('p');
            warningText.textContent = 'You need at least one ad set with assets to launch a campaign.';
            warningText.style.color = '#856404';
            warningText.style.backgroundColor = '#fff3cd';
            warningText.style.padding = '10px';
            warningText.style.borderRadius = '4px';
            warningText.style.marginTop = '15px';
            summaryContainer.appendChild(warningText);
        }
        
        summaryContainer.appendChild(launchButton);
        elements.campaignSummary.appendChild(summaryContainer);
    }
    
    /**
     * Collect all ad sets with their assets from the application state
     * @returns {Array} Array of ad set objects with their assets
     */
    function collectAdSets() {
        const adSets = [];
        
        console.log('Collecting ad sets for the summary view...');
        
        // Get all drop zones that have assets
        const adsetItems = document.querySelectorAll('.adset-item');
        console.log(`Found ${adsetItems.length} adset items in the DOM`);
        
        adsetItems.forEach((adsetItem, index) => {
            // Get the drop zone within this adset
            const dropZones = adsetItem.querySelectorAll('.asset-drop-zone.has-asset');
            console.log(`Adset ${index+1} has ${dropZones.length} drop zones with assets`);
            
            if (dropZones.length > 0) {
                // Extract adset information
                const adsetName = adsetItem.querySelector('.adset-name')?.textContent || `Ad Set ${index + 1}`;
                const adsetId = adsetItem.dataset.adsetId || `adset-${index}`;
                
                const assets = [];
                
                // Collect assets from all drop zones in this adset
                dropZones.forEach(dropZone => {
                    const assetPreviews = dropZone.querySelectorAll('.asset-preview-container');
                    
                    assetPreviews.forEach(preview => {
                        const img = preview.querySelector('img');
                        const assetName = preview.querySelector('.asset-name')?.textContent;
                        
                        if (img) {
                            assets.push({
                                type: 'image',
                                url: img.src,
                                name: assetName || 'Image Asset'
                            });
                        } else {
                            const video = preview.querySelector('video');
                            if (video) {
                                assets.push({
                                    type: 'video',
                                    url: video.src,
                                    name: assetName || 'Video Asset'
                                });
                            }
                        }
                    });
                });
                
                // Find the ad creation container where input fields are located
                const adCreationContainer = adsetItem.querySelector('.ad-creation-container');
                
                // Get headline (if available)
                const headlineInput = adCreationContainer?.querySelector('.headline-input input');
                const headline = headlineInput ? headlineInput.value : '';
                console.log(`Found headline for adset ${adsetId}:`, headline);
                
                // Get ad name (if available)
                const adNameInput = adCreationContainer?.querySelector('.ad-name-input input');
                const adName = adNameInput ? adNameInput.value : '';
                console.log(`Found ad name for adset ${adsetId}:`, adName);
                
                // Get ad copy (if available)
                const adCopy = adsetItem.querySelector('textarea[name*="copy"]')?.value || 
                              adsetItem.querySelector('input[name*="copy"]')?.value || 
                              adsetItem.dataset.adCopy || '';
                
                // Add this adset to our collection
                adSets.push({
                    id: adsetId,
                    name: adsetName,
                    adName: adName || `Ad for ${adsetName}`,
                    assets: assets,
                    headline: headline,
                    adCopy: adCopy
                });
                
                console.log(`Added adset "${adsetName}" with ${assets.length} assets`);
            }
        });
        
        // Fallback: If no adsets were found with the above method, try the old approach
        if (adSets.length === 0) {
            console.log('No adsets found with the primary method, trying fallback approach');
            
            // Get all drop zones that have assets
            const dropZones = document.querySelectorAll('.asset-drop-zone.has-asset');
            console.log(`Found ${dropZones.length} drop zones with assets (fallback method)`);
            
            // Group by ad set
            const adSetMap = new Map();
            
            dropZones.forEach(dropZone => {
                // Get the ad set ID/name from the closest parent with ad-set class or data attribute
                const adSetElement = dropZone.closest('[data-ad-set]') || 
                                   dropZone.closest('.ad-set') || 
                                   dropZone.closest('.adset-item');
                
                if (!adSetElement) {
                    console.log('Could not find parent adset element for drop zone', dropZone);
                    return;
                }
                
                const adSetId = adSetElement.dataset.adSet || adSetElement.dataset.adsetId || adSetElement.id || 'default';
                
                if (!adSetMap.has(adSetId)) {
                    const adsetName = adSetElement.querySelector('.adset-name')?.textContent || 
                                    adSetElement.dataset.name || 
                                    `Ad Set ${adSetMap.size + 1}`;
                    
                    // Find the ad creation container with the headline input
                    const adCreationContainer = adSetElement.querySelector('.ad-creation-container');
                    const headlineInput = adCreationContainer?.querySelector('.headline-input input');
                    const headline = headlineInput ? headlineInput.value : '';
                    
                    adSetMap.set(adSetId, {
                        id: adSetId,
                        name: adsetName,
                        assets: [],
                        headline: headline,
                        adCopy: getAdCopyForAdSet(adSetElement)
                    });
                    
                    console.log(`Created adset entry for "${adsetName}" (id: ${adSetId})`);
                }
                
                // Get asset data from preview content
                const assetPreviews = dropZone.querySelectorAll('.asset-preview-container, .asset-preview');
                
                assetPreviews.forEach(assetPreview => {
                    const img = assetPreview.querySelector('img');
                    if (img) {
                        const asset = {
                            type: 'image',
                            url: img.src,
                            name: assetPreview.querySelector('.asset-name')?.textContent || 'Image Asset'
                        };
                        
                        adSetMap.get(adSetId).assets.push(asset);
                        console.log(`Added image asset to adset ${adSetId}`, asset);
                    } else {
                        const video = assetPreview.querySelector('video');
                        if (video) {
                            const asset = {
                                type: 'video',
                                url: video.src,
                                name: assetPreview.querySelector('.asset-name')?.textContent || 'Video Asset'
                            };
                            
                            adSetMap.get(adSetId).assets.push(asset);
                            console.log(`Added video asset to adset ${adSetId}`, asset);
                        }
                    }
                });
            });
            
            // Convert map to array
            adSetMap.forEach(adSet => {
                if (adSet.assets.length > 0) {
                    adSets.push(adSet);
                }
            });
        }
        
        console.log(`Total adsets with assets collected: ${adSets.length}`);
        return adSets;
    }
    
    /**
     * Get ad copy text for an ad set
     * @param {HTMLElement} adSetElement - The ad set element
     * @returns {string} The ad copy text or empty string
     */
    function getAdCopyForAdSet(adSetElement) {
        // Look for a textarea or input with ad copy
        const copyInput = adSetElement.querySelector('textarea[name*="copy"], input[name*="copy"]');
        if (copyInput) {
            return copyInput.value;
        }
        
        // If no specific input found, look for ad copy in data attribute
        return adSetElement.dataset.adCopy || '';
    }
    
    /**
     * Prepare the summary view (called when navigating to step 4)
     */
    function prepare() {
        console.log('Preparing summary view for Step 4');
        generateSummary();
    }
    
    return {
        generateSummary,
        prepare
    };
} 