/**
 * Summary View Component
 * Handles the generation and display of the campaign summary in the final step
 */

// Import utilities
import { showToast } from '../../../utils/common.js';

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

        // Create main container with modern styling
        const summaryContainer = document.createElement('div');
        summaryContainer.className = 'summary-container';
        summaryContainer.style.padding = '30px';
        summaryContainer.style.backgroundColor = '#fff';
        summaryContainer.style.borderRadius = '12px';
        summaryContainer.style.boxShadow = '0 10px 25px rgba(0,0,0,0.05)';

        // Add title
        const title = document.createElement('h2');
        title.textContent = 'Review';
        title.style.marginBottom = '30px';
        title.style.color = '#1e293b';
        title.style.fontSize = '28px';
        title.style.fontWeight = '700';
        summaryContainer.appendChild(title);

        // Get all ad sets with their assets
        const adSets = collectAdSets();
        
        if (adSets.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-state';
            emptyMessage.style.textAlign = 'center';
            emptyMessage.style.padding = '40px 20px';
            
            const emptyIcon = document.createElement('div');
            emptyIcon.innerHTML = '<i class="fas fa-exclamation-circle"></i>';
            emptyIcon.style.fontSize = '48px';
            emptyIcon.style.color = '#94a3b8';
            emptyIcon.style.marginBottom = '16px';
            
            const emptyText = document.createElement('p');
            emptyText.textContent = 'No ad configurations found.';
            emptyText.style.color = '#64748b';
            emptyText.style.fontSize = '18px';
            emptyText.style.margin = '0';
            
            const emptySubtext = document.createElement('p');
            emptySubtext.textContent = 'Please go back and configure your ad sets.';
            emptySubtext.style.color = '#94a3b8';
            emptySubtext.style.fontSize = '14px';
            emptySubtext.style.marginTop = '8px';
            
            emptyMessage.appendChild(emptyIcon);
            emptyMessage.appendChild(emptyText);
            emptyMessage.appendChild(emptySubtext);
            
            summaryContainer.appendChild(emptyMessage);
        } else {
            // Create card-based layout instead of table
            const cardsContainer = document.createElement('div');
            cardsContainer.className = 'ad-cards-container';
            cardsContainer.style.display = 'grid';
            cardsContainer.style.gridTemplateColumns = 'repeat(auto-fill, minmax(300px, 1fr))';
            cardsContainer.style.gap = '24px';
            cardsContainer.style.marginBottom = '30px';
            
            // Add cards for each ad set
            adSets.forEach((adSet, index) => {
                const card = document.createElement('div');
                card.className = 'ad-card';
                card.style.borderRadius = '10px';
                card.style.overflow = 'hidden';
                card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
                card.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';
                card.style.border = '1px solid #e2e8f0';
                
                // Add hover effect
                card.addEventListener('mouseenter', () => {
                    card.style.transform = 'translateY(-4px)';
                    card.style.boxShadow = '0 8px 16px rgba(0,0,0,0.08)';
                });
                
                card.addEventListener('mouseleave', () => {
                    card.style.transform = 'translateY(0)';
                    card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
                });
                
                // Card header with ad set name
                const cardHeader = document.createElement('div');
                cardHeader.className = 'ad-card-header';
                cardHeader.style.padding = '16px 20px';
                cardHeader.style.backgroundColor = '#f8fafc';
                cardHeader.style.borderBottom = '1px solid #e2e8f0';
                
                const adSetName = document.createElement('h3');
                adSetName.textContent = adSet.name || `Ad Set ${index + 1}`;
                adSetName.style.margin = '0';
                adSetName.style.fontSize = '18px';
                adSetName.style.fontWeight = '600';
                adSetName.style.color = '#1e293b';
                
                cardHeader.appendChild(adSetName);
                card.appendChild(cardHeader);
                
                // Card body
                const cardBody = document.createElement('div');
                cardBody.className = 'ad-card-body';
                cardBody.style.padding = '20px';
                
                // Ad name
                const adNameWrapper = document.createElement('div');
                adNameWrapper.className = 'ad-detail-row';
                adNameWrapper.style.marginBottom = '16px';
                
                const adNameLabel = document.createElement('div');
                adNameLabel.className = 'ad-detail-label';
                adNameLabel.textContent = 'Ad Name';
                adNameLabel.style.fontSize = '13px';
                adNameLabel.style.color = '#64748b';
                adNameLabel.style.marginBottom = '4px';
                
                const adNameValue = document.createElement('div');
                adNameValue.className = 'ad-detail-value';
                adNameValue.textContent = adSet.adName || `Ad ${index + 1}`;
                adNameValue.style.fontSize = '15px';
                adNameValue.style.color = '#334155';
                adNameValue.style.fontWeight = '500';
                
                adNameWrapper.appendChild(adNameLabel);
                adNameWrapper.appendChild(adNameValue);
                cardBody.appendChild(adNameWrapper);
                
                // Assets preview
                const assetsWrapper = document.createElement('div');
                assetsWrapper.className = 'ad-detail-row';
                assetsWrapper.style.marginBottom = '16px';
                
                const assetsLabel = document.createElement('div');
                assetsLabel.className = 'ad-detail-label';
                assetsLabel.textContent = 'Assets';
                assetsLabel.style.fontSize = '13px';
                assetsLabel.style.color = '#64748b';
                assetsLabel.style.marginBottom = '8px';
                
                assetsWrapper.appendChild(assetsLabel);
                
                if (adSet.assets && adSet.assets.length > 0) {
                    const assetGrid = document.createElement('div');
                    assetGrid.className = 'asset-thumbnails';
                    assetGrid.style.display = 'grid';
                    assetGrid.style.gridTemplateColumns = 'repeat(3, 1fr)';
                    assetGrid.style.gap = '10px';
                    
                    adSet.assets.forEach(asset => {
                        const assetThumb = document.createElement('div');
                        assetThumb.className = 'asset-thumbnail';
                        assetThumb.style.position = 'relative';
                        assetThumb.style.paddingBottom = '100%'; // Square aspect ratio
                        assetThumb.style.borderRadius = '6px';
                        assetThumb.style.overflow = 'hidden';
                        assetThumb.style.backgroundColor = '#f1f5f9';
                        
                        // Create the image container
                        const imgContainer = document.createElement('div');
                        imgContainer.style.position = 'absolute';
                        imgContainer.style.top = '0';
                        imgContainer.style.left = '0';
                        imgContainer.style.width = '100%';
                        imgContainer.style.height = '100%';
                        
                        // Create the image
                        if (asset.url) {
                            const img = document.createElement('img');
                            img.src = asset.url;
                            img.style.width = '100%';
                            img.style.height = '100%';
                            img.style.objectFit = 'cover';
                            imgContainer.appendChild(img);
                        } else {
                            // If no URL, show a placeholder
                            imgContainer.style.display = 'flex';
                            imgContainer.style.justifyContent = 'center';
                            imgContainer.style.alignItems = 'center';
                            imgContainer.style.color = '#94a3b8';
                            imgContainer.style.fontSize = '12px';
                            imgContainer.textContent = asset.name || 'Asset';
                        }
                        
                        assetThumb.appendChild(imgContainer);
                        assetGrid.appendChild(assetThumb);
                    });
                    
                    assetsWrapper.appendChild(assetGrid);
                } else {
                    const noAssets = document.createElement('div');
                    noAssets.className = 'no-assets';
                    noAssets.textContent = 'No assets added';
                    noAssets.style.color = '#94a3b8';
                    noAssets.style.fontStyle = 'italic';
                    noAssets.style.fontSize = '14px';
                    noAssets.style.padding = '10px 0';
                    
                    assetsWrapper.appendChild(noAssets);
                }
                
                cardBody.appendChild(assetsWrapper);
                
                // Ad copy
                const copyWrapper = document.createElement('div');
                copyWrapper.className = 'ad-detail-row';
                
                const copyLabel = document.createElement('div');
                copyLabel.className = 'ad-detail-label';
                copyLabel.textContent = 'Ad Copy';
                copyLabel.style.fontSize = '13px';
                copyLabel.style.color = '#64748b';
                copyLabel.style.marginBottom = '8px';
                
                copyWrapper.appendChild(copyLabel);
                
                if (adSet.headline || adSet.adCopy) {
                    const adCopyContainer = document.createElement('div');
                    adCopyContainer.className = 'ad-copy-container';
                    
                    // Add headline if available
                    if (adSet.headline) {
                        const headlineElem = document.createElement('div');
                        headlineElem.className = 'ad-headline';
                        headlineElem.textContent = adSet.headline;
                        headlineElem.style.fontWeight = '600';
                        headlineElem.style.fontSize = '15px';
                        headlineElem.style.color = '#334155';
                        headlineElem.style.marginBottom = '8px';
                        adCopyContainer.appendChild(headlineElem);
                    }
                    
                    // Add ad copy text if available
                    if (adSet.adCopy) {
                        const copyText = document.createElement('div');
                        copyText.className = 'ad-copy-text';
                        copyText.textContent = adSet.adCopy;
                        copyText.style.maxHeight = '120px';
                        copyText.style.overflow = 'auto';
                        copyText.style.fontSize = '14px';
                        copyText.style.color = '#475569';
                        copyText.style.lineHeight = '1.5';
                        adCopyContainer.appendChild(copyText);
                    }
                    
                    copyWrapper.appendChild(adCopyContainer);
                } else {
                    const noCopy = document.createElement('div');
                    noCopy.className = 'no-copy';
                    noCopy.textContent = 'Ad copy not provided (optional)';
                    noCopy.style.color = '#94a3b8';
                    noCopy.style.fontStyle = 'italic';
                    noCopy.style.fontSize = '14px';
                    
                    copyWrapper.appendChild(noCopy);
                }
                
                cardBody.appendChild(copyWrapper);
                card.appendChild(cardBody);
                cardsContainer.appendChild(card);
            });
            
            summaryContainer.appendChild(cardsContainer);
        }
        
        // Create action bar with launch button
        const actionBar = document.createElement('div');
        actionBar.className = 'summary-action-bar';
        actionBar.style.display = 'flex';
        actionBar.style.justifyContent = 'space-between';
        actionBar.style.alignItems = 'center';
        actionBar.style.marginTop = '30px';
        actionBar.style.padding = '20px 0 0';
        actionBar.style.borderTop = '1px solid #e2e8f0';
        
        // Previous button container (left side)
        const prevBtnContainer = document.createElement('div');
        
        // Previous button
        const prevButton = document.createElement('button');
        prevButton.type = 'button';
        prevButton.className = 'btn prev-step';
        prevButton.innerHTML = '<i class="fas fa-arrow-left"></i> Previous';
        prevButton.style.backgroundColor = 'transparent';
        prevButton.style.border = '1px solid #cbd5e1';
        prevButton.style.color = '#475569';
        prevButton.style.padding = '12px 20px';
        prevButton.style.borderRadius = '8px';
        prevButton.style.fontSize = '15px';
        prevButton.style.cursor = 'pointer';
        prevButton.style.transition = 'all 0.2s ease';
        
        // Add event listener to navigate to the previous step
        prevButton.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Use the established StepNavigation component pattern
            // This will work as long as the button has the prev-step class
            
            // Alternatively, manually handle navigation
            const currentStep = document.querySelector('.form-step[data-step="4"]');
            const prevStep = document.querySelector('.form-step[data-step="3"]');
            const stepIndicators = document.querySelectorAll('.step-item');
            
            if (currentStep && prevStep) {
                // Hide current step
                currentStep.style.display = 'none';
                
                // Show previous step
                prevStep.style.display = 'block';
                
                // Update step indicators
                stepIndicators.forEach(indicator => {
                    const stepNum = parseInt(indicator.dataset.step);
                    indicator.classList.remove('active');
                    
                    if (stepNum === 3) {
                        indicator.classList.add('active');
                    }
                });
                
                // Update application state
                if (state && typeof state === 'object') {
                    state.currentStep = 3;
                }
                
                // Scroll to top of form if needed
                const form = document.getElementById('adsBuilderForm');
                if (form) {
                    form.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
        
        // Add hover effect
        prevButton.addEventListener('mouseenter', () => {
            prevButton.style.backgroundColor = '#f8fafc';
            prevButton.style.borderColor = '#94a3b8';
        });
        
        prevButton.addEventListener('mouseleave', () => {
            prevButton.style.backgroundColor = 'transparent';
            prevButton.style.borderColor = '#cbd5e1';
        });
        
        prevBtnContainer.appendChild(prevButton);
        actionBar.appendChild(prevBtnContainer);
        
        // Launch button container (right side)
        const launchBtnContainer = document.createElement('div');
        
        // Launch button
        const launchButton = document.createElement('button');
        launchButton.type = 'button';
        launchButton.id = 'launchAdsBtn';
        launchButton.className = 'btn btn-primary launch-ads-btn';
        launchButton.innerHTML = '<i class="fas fa-rocket"></i> Launch Ads';
        launchButton.style.backgroundColor = '#0ea5e9';
        launchButton.style.border = 'none';
        launchButton.style.color = '#ffffff';
        launchButton.style.padding = '14px 28px';
        launchButton.style.borderRadius = '8px';
        launchButton.style.fontSize = '16px';
        launchButton.style.fontWeight = '500';
        launchButton.style.boxShadow = '0 4px 12px rgba(14, 165, 233, 0.2)';
        launchButton.style.cursor = 'pointer';
        launchButton.style.transition = 'all 0.2s ease';
        launchButton.setAttribute('form', 'adsBuilderForm');
        
        // Add click event listener to submit the form
        launchButton.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Launch Ads button clicked');
            
            // Show loading state
            const originalBtnText = launchButton.innerHTML;
            launchButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            launchButton.disabled = true;
            
            try {
                // Get the form element
                const form = document.getElementById('adsBuilderForm');
                if (!form) {
                    console.error('Form element not found: adsBuilderForm');
                    showToast('Error: Form element not found', 'error');
                    launchButton.innerHTML = originalBtnText;
                    launchButton.disabled = false;
                    return;
                }
                
                console.log('Form found, preparing to collect data for submission');
                
                // Collect additional data about ads from drop zones
                const allAdsetItems = document.querySelectorAll('.adset-item');
                console.log(`Found ${allAdsetItems.length} adset items`);
                
                // Collect data for each ad
                const adDataByAdset = {};
                
                // Loop through all adset items
                allAdsetItems.forEach((adsetItem, adsetIndex) => {
                    const adsetId = adsetItem.dataset.adsetId;
                    const platform = adsetItem.dataset.platform;
                    const accountId = adsetItem.dataset.accountId;
                    
                    console.log(`Processing adset: ${adsetId} (${platform}) from account: ${accountId}`);
                    
                    // Get drop zones with assets in this adset
                    const dropZones = adsetItem.querySelectorAll('.asset-drop-zone.has-asset');
                    console.log(`Found ${dropZones.length} drop zones with assets in adset ${adsetId}`);
                    
                    // Create array for this adset if it doesn't exist
                    if (!adDataByAdset[adsetId]) {
                        adDataByAdset[adsetId] = {
                            platform: platform,
                            accountId: accountId,
                            ads: []
                        };
                    }
                    
                    // Process each drop zone with assets
                    dropZones.forEach((dropZone, dzIndex) => {
                        // Check if the drop zone has any asset data
                        console.log(`Checking drop zone ${dzIndex} in adset ${adsetId}, has assets:`, !!dropZone.dataset.assets);
                        if (dropZone.dataset.assets) {
                            console.log(`Raw assets data:`, dropZone.dataset.assets);
                        }
                        
                        // Get ad name from the input field
                        const adNameInput = dropZone.querySelector('input[name="ad_name"]');
                        const adNameValue = adNameInput ? adNameInput.value : '';
                        
                        // Get headline from the input field
                        const headlineInput = dropZone.querySelector('input[name="headline"]');
                        const headlineValue = headlineInput ? headlineInput.value : '';
                        
                        console.log(`Processing ad in adset ${adsetId}, drop zone ${dzIndex}: "${adNameValue}"`);
                        
                        // Make sure we have a name for validation
                        if (!adNameValue) {
                            console.warn(`Ad name is missing for drop zone in adset ${adsetId}`);
                            
                            // Focus on the input field
                            if (adNameInput) {
                                adNameInput.focus();
                                adNameInput.classList.add('is-invalid');
                                
                                // Scroll to the input field
                                adNameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                
                                throw new Error('Please enter a name for each ad');
                            }
                        }
                        
                        // Check if we have assets in this drop zone
                        if (dropZone.dataset.assets) {
                            try {
                                const assetData = JSON.parse(dropZone.dataset.assets);
                                console.log(`Parsed assets data:`, assetData);
                                
                                const assets = assetData.map(asset => asset.id);
                                
                                // Debug: Print assets for this drop zone
                                console.log(`Assets for ad "${adNameValue}":`, assets);
                                
                                // Add hidden inputs to the form for this ad's data
                                const nameHidden = document.createElement('input');
                                nameHidden.type = 'hidden';
                                nameHidden.name = `ad_names[${platform}][${adsetId}][${dzIndex}]`;
                                nameHidden.value = adNameValue;
                                form.appendChild(nameHidden);
                                
                                const headlineHidden = document.createElement('input');
                                headlineHidden.type = 'hidden';
                                headlineHidden.name = `ad_headlines[${platform}][${adsetId}][${dzIndex}]`;
                                headlineHidden.value = headlineValue;
                                form.appendChild(headlineHidden);
                                
                                const assetsHidden = document.createElement('input');
                                assetsHidden.type = 'hidden';
                                assetsHidden.name = `ad_assets[${platform}][${adsetId}][${dzIndex}]`;
                                assetsHidden.value = assets.join(',');
                                form.appendChild(assetsHidden);
                                
                                console.log(`Added form data for ad "${adNameValue}" with ${assets.length} assets`);
                            } catch (error) {
                                console.error(`Error parsing assets data for drop zone in adset ${adsetId}:`, error);
                            }
                        } else {
                            console.warn(`No assets found for drop zone in adset ${adsetId}`);
                        }
                    });
                });
                
                console.log('Form data collection complete, submitting form');
                
                // Add event listener for form submission response
                window.addEventListener('submissionComplete', function(event) {
                    console.log('Received submissionComplete event:', event.detail);
                    
                    // Reset button state
                    launchButton.innerHTML = originalBtnText;
                    launchButton.disabled = false;
                }, { once: true });
                
                // Submit the form using form's submit event
                try {
                    console.log('Dispatching form submit event');
                    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
                    console.log('Form submission event dispatched successfully');
                } catch (error) {
                    console.error('Error dispatching form submit event:', error);
                    throw error;
                }
                
                // Set a timeout to reset the button if no response within 30 seconds
                setTimeout(() => {
                    if (launchButton.disabled) {
                        launchButton.innerHTML = originalBtnText;
                        launchButton.disabled = false;
                        showToast('The request is taking longer than expected. Please check the network tab for status.', 'warning');
                    }
                }, 30000);
            } catch (error) {
                console.error('Error in Launch Ads button click handler:', error);
                showToast(`Error: ${error.message}`, 'error');
                launchButton.innerHTML = originalBtnText;
                launchButton.disabled = false;
            }
        });
        
        // Add hover effect
        launchButton.addEventListener('mouseenter', () => {
            launchButton.style.backgroundColor = '#0284c7';
            launchButton.style.boxShadow = '0 6px 16px rgba(14, 165, 233, 0.25)';
            launchButton.style.transform = 'translateY(-2px)';
        });
        
        launchButton.addEventListener('mouseleave', () => {
            launchButton.style.backgroundColor = '#0ea5e9';
            launchButton.style.boxShadow = '0 4px 12px rgba(14, 165, 233, 0.2)';
            launchButton.style.transform = 'translateY(0)';
        });
        
        // Disable button if no assets
        if (!adSets.some(adSet => adSet.assets?.length > 0)) {
            launchButton.disabled = true;
            launchButton.style.backgroundColor = '#94a3b8';
            launchButton.style.boxShadow = 'none';
            launchButton.style.cursor = 'not-allowed';
            
            // Remove hover effects for disabled button
            launchButton.addEventListener('mouseenter', () => {});
            launchButton.addEventListener('mouseleave', () => {});
            
            const warningText = document.createElement('div');
            warningText.className = 'warning-message';
            warningText.innerHTML = '<i class="fas fa-exclamation-triangle"></i> You need at least one ad set with assets to launch.';
            warningText.style.color = '#b45309';
            warningText.style.backgroundColor = '#fef3c7';
            warningText.style.border = '1px solid #fde68a';
            warningText.style.padding = '12px 16px';
            warningText.style.borderRadius = '8px';
            warningText.style.marginTop = '16px';
            warningText.style.fontSize = '14px';
            warningText.style.display = 'flex';
            warningText.style.alignItems = 'center';
            warningText.style.gap = '8px';
            
            launchBtnContainer.appendChild(warningText);
        }
        
        launchBtnContainer.appendChild(launchButton);
        actionBar.appendChild(launchBtnContainer);
        summaryContainer.appendChild(actionBar);
        
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
            // Get all drop zones within this adset that have assets
            const dropZones = adsetItem.querySelectorAll('.asset-drop-zone.has-asset');
            console.log(`Adset ${index+1} has ${dropZones.length} drop zones with assets`);
            
            if (dropZones.length > 0) {
                // Extract adset information
                const adsetName = adsetItem.querySelector('.adset-name')?.textContent || `Ad Set ${index + 1}`;
                const adsetId = adsetItem.dataset.adsetId || `adset-${index}`;
                
                // Create an ad card for EACH drop zone that has assets (each ad)
                dropZones.forEach((dropZone, adIndex) => {
                const assets = [];
                
                    // Get the nearest ad creation container (parent container with both inputs)
                    const adCreationContainer = dropZone.closest('.ad-creation-container');
                    
                    // Get headline (if available)
                    const headlineInput = adCreationContainer?.querySelector('.headline-input input');
                    const headline = headlineInput ? headlineInput.value : '';
                    
                    // Get ad name (if available)
                    const adNameInput = adCreationContainer?.querySelector('.ad-name-input input');
                    const adName = adNameInput ? adNameInput.value : '';
                    
                    // Get ad copy (if available)
                    const adCopy = adsetItem.querySelector('textarea[name*="copy"]')?.value || 
                                  adsetItem.querySelector('input[name*="copy"]')?.value || 
                                  adsetItem.dataset.adCopy || '';
                    
                    // Collect assets from this specific drop zone
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
                    
                    // Only add if this drop zone has assets
                    if (assets.length > 0) {
                        // Add this ad to our collection
                adSets.push({
                            id: `${adsetId}-ad-${adIndex}`,
                    name: adsetName,
                            adName: adName || `Ad ${adIndex + 1} for ${adsetName}`,
                    assets: assets,
                    headline: headline,
                    adCopy: adCopy
                });
                
                        console.log(`Added ad "${adName}" with ${assets.length} assets for adset "${adsetName}"`);
                    }
                });
            }
        });
        
        // Fallback: If no adsets were found with the above method, try the old approach
        if (adSets.length === 0) {
            console.log('No adsets found with the primary method, trying fallback approach');
            
            // Get all drop zones that have assets
            const dropZones = document.querySelectorAll('.asset-drop-zone.has-asset');
            console.log(`Found ${dropZones.length} drop zones with assets (fallback method)`);
            
            // Each drop zone with assets represents an ad
            dropZones.forEach((dropZone, adIndex) => {
                // Get the ad set ID/name from the closest parent with ad-set class or data attribute
                const adSetElement = dropZone.closest('[data-ad-set]') || 
                                   dropZone.closest('.ad-set') || 
                                   dropZone.closest('.adset-item');
                
                if (!adSetElement) {
                    console.log('Could not find parent adset element for drop zone', dropZone);
                    return;
                }
                
                const adSetId = adSetElement.dataset.adSet || adSetElement.dataset.adsetId || adSetElement.id || 'default';
                const adsetName = adSetElement.querySelector('.adset-name')?.textContent || 
                                adSetElement.dataset.name || 
                                `Ad Set ${adSets.length + 1}`;
                
                // Find the ad creation container with the headline and ad name inputs
                const adCreationContainer = dropZone.closest('.ad-creation-container');
                
                // Get headline (if available)
                    const headlineInput = adCreationContainer?.querySelector('.headline-input input');
                    const headline = headlineInput ? headlineInput.value : '';
                    
                // Get ad name (if available)
                const adNameInput = adCreationContainer?.querySelector('.ad-name-input input');
                const adName = adNameInput ? adNameInput.value : `Ad ${adIndex + 1}`;
                
                // Get ad copy
                const adCopy = getAdCopyForAdSet(adSetElement);
                
                // Get asset data from preview content
                const assets = [];
                const assetPreviews = dropZone.querySelectorAll('.asset-preview-container, .asset-preview');
                
                assetPreviews.forEach(assetPreview => {
                    const img = assetPreview.querySelector('img');
                    if (img) {
                        const asset = {
                            type: 'image',
                            url: img.src,
                            name: assetPreview.querySelector('.asset-name')?.textContent || 'Image Asset'
                        };
                        
                        assets.push(asset);
                        console.log(`Added image asset to ad ${adName}`, asset);
                    } else {
                        const video = assetPreview.querySelector('video');
                        if (video) {
                            const asset = {
                                type: 'video',
                                url: video.src,
                                name: assetPreview.querySelector('.asset-name')?.textContent || 'Video Asset'
                            };
                            
                            assets.push(asset);
                            console.log(`Added video asset to ad ${adName}`, asset);
                        }
                    }
                });
                
                // Only add if there are assets
                if (assets.length > 0) {
                    adSets.push({
                        id: `${adSetId}-ad-${adIndex}`,
                        name: adsetName,
                        adName: adName,
                        assets: assets,
                        headline: headline,
                        adCopy: adCopy
                    });
                    
                    console.log(`Added ad "${adName}" with ${assets.length} assets for adset "${adsetName}"`);
                }
            });
        }
        
        console.log(`Total ad cards to display: ${adSets.length}`);
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