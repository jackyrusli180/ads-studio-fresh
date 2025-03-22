/**
 * Summary View Component
 * Handles the generation and display of the campaign summary in the final step
 */

// Import utilities
import { showToast } from '../../../utils/common.js';
import { validateTikTokVideo } from './asset-modules/TikTokVideoRequirements.js';

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

        // Add fix errors mode notice if applicable
        if (window.fixErrorsMode === true) {
            const fixedNotice = document.createElement('div');
            fixedNotice.className = 'fix-errors-notice';
            fixedNotice.style.marginBottom = '20px';
            fixedNotice.style.padding = '15px';
            fixedNotice.style.backgroundColor = '#f0f9ff';
            fixedNotice.style.borderLeft = '5px solid #0ea5e9';
            fixedNotice.style.borderRadius = '5px';
            fixedNotice.style.color = '#0369a1';
            fixedNotice.style.fontSize = '14px';

            // Count fixed ads
            let fixedAdCount = 0;
            if (window.fixedAds) {
                Object.values(window.fixedAds).forEach(adSet => {
                    fixedAdCount += adSet.size;
                });
            }
            
            fixedNotice.innerHTML = `
                <div style="display: flex; align-items: center;">
                    <i class="fas fa-info-circle" style="margin-right: 10px; font-size: 16px;"></i>
                    <div>
                        <strong>Fixed Ads View</strong>
                        <p style="margin: 5px 0 0 0;">Showing ${fixedAdCount} ads you've fixed. Only these ads will be created when you click "Launch Ads".</p>
                    </div>
                </div>
                <button id="showAllFixedAds" class="btn btn-sm btn-outline-primary" style="margin-top: 10px; font-size: 12px; padding: 4px 8px;">Exit Fixed View</button>
            `;
            summaryContainer.appendChild(fixedNotice);
            
            // Add event listener for the "Exit Fixed View" button
            setTimeout(() => {
                const exitButton = document.getElementById('showAllFixedAds');
                if (exitButton) {
                    exitButton.addEventListener('click', function() {
                        // Clear fix errors mode
                        window.fixErrorsMode = false;
                        window.failedAdgroups = new Set();
                        window.failedAds = {};
                        window.fixedAds = {};
                        
                        // Regenerate the summary
                        generateSummary();
                    });
                }
            }, 100);
        }

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
                card.dataset.adId = adSet.id;
                card.dataset.platform = adSet.platform;
                card.dataset.adsetId = adSet.adsetId;
                card.dataset.dropZoneIndex = adSet.dropZoneIndex;
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
                adSetName.style.wordWrap = 'break-word';
                adSetName.style.overflowWrap = 'break-word';
                adSetName.style.whiteSpace = 'normal';
                
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
                adNameValue.style.wordWrap = 'break-word';
                adNameValue.style.overflowWrap = 'break-word';
                
                adNameWrapper.appendChild(adNameLabel);
                adNameWrapper.appendChild(adNameValue);
                cardBody.appendChild(adNameWrapper);
                
                // Ad Text
                const copyWrapper = document.createElement('div');
                copyWrapper.className = 'ad-detail-row';
                copyWrapper.style.marginBottom = '16px';
                
                const copyLabel = document.createElement('div');
                copyLabel.className = 'ad-detail-label';
                copyLabel.textContent = 'Ad Text';
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
                        headlineElem.style.wordWrap = 'break-word';
                        headlineElem.style.overflowWrap = 'break-word';
                        adCopyContainer.appendChild(headlineElem);
                    }
                    
                    // Add ad copy text if available
                    if (adSet.adCopy) {
                        const adCopyText = document.createElement('div');
                        adCopyText.className = 'ad-body-text';
                        adCopyText.textContent = adSet.adCopy;
                        adCopyText.style.maxHeight = '120px';
                        adCopyText.style.overflow = 'auto';
                        adCopyText.style.fontSize = '14px';
                        adCopyText.style.color = '#475569';
                        adCopyText.style.lineHeight = '1.5';
                        adCopyText.style.wordWrap = 'break-word';
                        adCopyText.style.overflowWrap = 'break-word';
                        adCopyContainer.appendChild(adCopyText);
                    }
                    
                    copyWrapper.appendChild(adCopyContainer);
                } else {
                    const noText = document.createElement('div');
                    noText.className = 'no-text';
                    noText.textContent = 'No ad text added';
                    noText.style.color = '#94a3b8';
                    noText.style.fontStyle = 'italic';
                    noText.style.fontSize = '14px';
                    noText.style.padding = '10px 0';
                    
                    copyWrapper.appendChild(noText);
                }
                
                cardBody.appendChild(copyWrapper);
                
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
                
                // Add status section to each card
                const statusWrapper = document.createElement('div');
                statusWrapper.className = 'ad-status-row';
                statusWrapper.style.marginTop = '20px';
                statusWrapper.style.paddingTop = '15px';
                statusWrapper.style.borderTop = '1px solid #e2e8f0';
                
                // Pending status by default
                const statusIndicator = document.createElement('div');
                statusIndicator.className = 'ad-status-indicator pending';
                statusIndicator.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Processing...';
                statusIndicator.style.fontSize = '14px';
                statusIndicator.style.color = '#64748b';
                statusIndicator.style.padding = '10px';
                statusIndicator.style.borderRadius = '6px';
                statusIndicator.style.backgroundColor = '#f1f5f9';
                statusIndicator.style.textAlign = 'center';
                statusIndicator.style.display = 'none'; // Initially hidden until submission
                
                statusWrapper.appendChild(statusIndicator);
                cardBody.appendChild(statusWrapper);
                
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
        
        // Add the previous button to its container
        prevBtnContainer.appendChild(prevButton);
        
        // Add "Fix Errors" button (initially hidden, will be shown when errors are detected)
        const fixErrorsButton = document.createElement('button');
        fixErrorsButton.type = 'button';
        fixErrorsButton.id = 'fixErrorsBtn';
        fixErrorsButton.className = 'btn btn-warning';
        fixErrorsButton.innerHTML = '<i class="fas fa-wrench"></i> Fix Errors';
        fixErrorsButton.style.backgroundColor = '#f59e0b';
        fixErrorsButton.style.border = 'none';
        fixErrorsButton.style.color = '#ffffff';
        fixErrorsButton.style.padding = '12px 20px';
        fixErrorsButton.style.borderRadius = '8px';
        fixErrorsButton.style.fontSize = '15px';
        fixErrorsButton.style.marginLeft = '10px';
        fixErrorsButton.style.fontWeight = '500';
        fixErrorsButton.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.2)';
        fixErrorsButton.style.cursor = 'pointer';
        fixErrorsButton.style.transition = 'all 0.2s ease';
        fixErrorsButton.style.display = 'none'; // Initially hidden
        
        // Add hover effect for Fix Errors button
        fixErrorsButton.addEventListener('mouseenter', () => {
            fixErrorsButton.style.backgroundColor = '#d97706';
            fixErrorsButton.style.boxShadow = '0 6px 16px rgba(245, 158, 11, 0.25)';
        });
        
        fixErrorsButton.addEventListener('mouseleave', () => {
            fixErrorsButton.style.backgroundColor = '#f59e0b';
            fixErrorsButton.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.2)';
        });
        
        // Add event listener to navigate to Step 3 and filter adgroups
        fixErrorsButton.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Fix Errors button clicked');
            
            // Store a flag to indicate we're in "fix errors" mode
            window.fixErrorsMode = true;
            
            // Reset the fixed ads state since we're starting a new fix session
            window.fixedAds = {};
            
            // Go back to Step 3
            const currentStep = document.querySelector('.form-step[data-step="4"]');
            const step3 = document.querySelector('.form-step[data-step="3"]');
            const stepIndicators = document.querySelectorAll('.step-item');
            
            if (currentStep && step3) {
                // Hide Step 4
                currentStep.style.display = 'none';
                
                // Show Step 3
                step3.style.display = 'block';
                
                // Update step indicators
                stepIndicators.forEach(indicator => {
                    const stepNum = parseInt(indicator.dataset.step);
                    indicator.classList.remove('active');
                    
                    if (stepNum === 3) {
                        indicator.classList.add('active');
                    }
                });
                
                // Update application state
                if (typeof state === 'object') {
                    state.currentStep = 3;
                }
                
                // Execute after a short delay to ensure DOM is ready
                setTimeout(() => {
                    // Hide successful adgroups and show only the ones with errors
                    if (window.failedAdgroups && window.failedAdgroups.size > 0) {
                        console.log('Filtering adgroups to show only those with errors:', Array.from(window.failedAdgroups));
                        
                        const adsetItems = document.querySelectorAll('.adset-item');
                        adsetItems.forEach(adsetItem => {
                            const adsetId = adsetItem.dataset.adsetId;
                            
                            if (window.failedAdgroups.has(adsetId)) {
                                adsetItem.style.display = 'block';
                                console.log(`Showing adgroup ${adsetId} with errors`);
                                
                                // Now filter the ads within this adgroup to show only problematic ones
                                if (window.failedAds && window.failedAds[adsetId]) {
                                    console.log(`Filtering ads within adgroup ${adsetId} to show only problematic ones`);
                                    
                                    // Get all drop zones in this adset
                                    const dropZones = adsetItem.querySelectorAll('.asset-drop-zone');
                                    dropZones.forEach((dropZone, dzIndex) => {
                                        // Get the adset's ad creation container (parent of all ads)
                                        const adCreationContainer = dropZone.closest('.ad-creation-container');
                                        
                                        // Check if this ad (by index) is in the failed list
                                        const isFailedAd = window.failedAds[adsetId].has(dzIndex.toString());
                                        
                                        if (isFailedAd) {
                                            console.log(`Showing problematic ad at index ${dzIndex} in adgroup ${adsetId}`);
                                            
                                            // Show this ad and its container
                                            if (adCreationContainer) {
                                                adCreationContainer.style.display = 'block';
                                            }
                                            dropZone.style.display = 'flex';
                                        } else {
                                            console.log(`Hiding successful ad at index ${dzIndex} in adgroup ${adsetId}`);
                                            
                                            // Hide this ad and its container if it's not the only one
                                            if (adCreationContainer) {
                                                adCreationContainer.style.display = 'none';
                                            }
                                            dropZone.style.display = 'none';
                                        }
                                    });
                                    
                                    // Add a note about filtered ads
                                    const adsetHeader = adsetItem.querySelector('.adset-header');
                                    if (adsetHeader && !adsetHeader.querySelector('.filtered-ads-note')) {
                                        const filteredNote = document.createElement('div');
                                        filteredNote.className = 'filtered-ads-note';
                                        filteredNote.innerHTML = '<i class="fas fa-filter"></i> Showing only ads with errors';
                                        filteredNote.style.fontSize = '12px';
                                        filteredNote.style.color = '#f59e0b';
                                        filteredNote.style.marginLeft = '10px';
                                        adsetHeader.appendChild(filteredNote);
                                    }
                                }
                            } else {
                                adsetItem.style.display = 'none';
                                console.log(`Hiding adgroup ${adsetId} without errors`);
                            }
                        });
                        
                        // Add a message at the top to inform the user
                        const step3Container = document.querySelector('.form-step[data-step="3"]');
                        if (step3Container) {
                            const errorMessage = document.createElement('div');
                            errorMessage.id = 'fix-errors-message';
                            errorMessage.innerHTML = `
                                <div class="alert alert-warning" style="margin-bottom: 20px; border-left: 5px solid #f59e0b; padding: 15px; border-radius: 5px;">
                                    <i class="fas fa-exclamation-triangle"></i> Please fix the errors in the ads below. We're only showing ads that had errors.
                                    <button id="showAllAds" class="btn btn-sm btn-outline-warning" style="margin-left: 10px;">Show All Ads</button>
                                </div>
                            `;
                            
                            // Insert the message at the top of Step 3
                            const existingMessage = document.getElementById('fix-errors-message');
                            if (!existingMessage) {
                                step3Container.insertBefore(errorMessage, step3Container.firstChild);
                                
                                // Add event listener to the "Show All Ads" button
                                document.getElementById('showAllAds').addEventListener('click', function() {
                                    // Reset fix errors mode
                                    window.fixErrorsMode = false;
                                    window.failedAdgroups = new Set();
                                    window.failedAds = {};
                                    window.fixedAds = {};
                                    
                                    // Show all adgroups
                                    const adsetItems = document.querySelectorAll('.adset-item');
                                    adsetItems.forEach(adsetItem => {
                                        adsetItem.style.display = 'block';
                                        
                                        // Show all ads within each adgroup
                                        const dropZones = adsetItem.querySelectorAll('.asset-drop-zone');
                                        dropZones.forEach(dropZone => {
                                            dropZone.style.display = 'flex';
                                            
                                            // Show its container if it exists
                                            const adCreationContainer = dropZone.closest('.ad-creation-container');
                                            if (adCreationContainer) {
                                                adCreationContainer.style.display = 'block';
                                            }
                                        });
                                        
                                        // Remove any filtered notes
                                        const filteredNotes = adsetItem.querySelectorAll('.filtered-ads-note');
                                        filteredNotes.forEach(note => note.remove());
                                    });
                                    
                                    // Remove this message
                                    this.closest('#fix-errors-message').remove();
                                });
                            }
                        }
                    }
                }, 300);
                
                // Scroll to top of form
                const form = document.getElementById('adsBuilderForm');
                if (form) {
                    form.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
        
        prevBtnContainer.appendChild(fixErrorsButton);
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
        
        // Create a warnings container that will show potential issues
        const warningsContainer = document.createElement('div');
        warningsContainer.className = 'launch-warnings-container';
        warningsContainer.style.marginBottom = '15px';
        warningsContainer.style.width = '100%';
        warningsContainer.style.maxWidth = '500px';
        warningsContainer.style.display = 'none';
        launchBtnContainer.appendChild(warningsContainer);
        
        // Remove pre-click validation - we'll only validate on button click
        // This ensures validation only happens in Step 4 when user attempts to submit
        
        // Add click event to the launch button
        launchButton.addEventListener('click', function(e) {
            console.log('Launch button clicked');
            e.preventDefault();
            
            // Store the original button text
            const originalBtnText = launchButton.innerHTML;
            
            // Run validation checks on videos for TikTok ads
            const videoWarnings = validateTikTokVideos(adSets);
            if (videoWarnings.length > 0) {
                warningsContainer.style.display = 'block';
                warningsContainer.style.backgroundColor = '#fef3c7';
                warningsContainer.style.border = '1px solid #f59e0b';
                warningsContainer.style.borderRadius = '6px';
                warningsContainer.style.padding = '12px 16px';
                warningsContainer.style.color = '#92400e';
                warningsContainer.style.fontSize = '14px';
                
                let warningsHTML = `
                    <div style="font-weight: 600; margin-bottom: 8px;">
                        <i class="fas fa-exclamation-triangle" style="margin-right: 6px;"></i>
                        Some videos may not meet TikTok requirements:
                    </div>
                    <ul style="margin: 0; padding-left: 20px;">
                `;
                
                videoWarnings.forEach(warning => {
                    warningsHTML += `<li>${warning}</li>`;
                });
                
                warningsHTML += `</ul>`;
                warningsContainer.innerHTML = warningsHTML;
                
                // Show toast with warning
                showToast('Some videos may not meet TikTok requirements. Please review the warnings.', 'warning', 8000);
                
                // Return early to prevent form submission
                return;
            }
            
            // Update button to show loading state
            launchButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Creating Ads...';
            launchButton.disabled = true;
            
            try {
                // Get the form element
                const form = document.getElementById('adsBuilderForm');
                
                if (!form) {
                    console.error('Form element not found');
                    launchButton.innerHTML = originalBtnText;
                    launchButton.disabled = false;
                    return;
                }
                
                // Get all platform data by adgroup ID
                const adDataByAdset = {};
                
                // Reset any existing hidden inputs from a previous submission
                form.querySelectorAll('input[type="hidden"][name^="ad_"]').forEach(input => {
                    input.remove();
                });
                
                console.log('Collecting form data for submission...');
                
                // Get all adset items
                document.querySelectorAll('.adset-item').forEach(adsetItem => {
                    // Get adset information
                    const adsetId = adsetItem.dataset.adsetId;
                    const platform = adsetItem.dataset.platform;
                    const accountId = adsetItem.dataset.accountId;
                    
                    // Check if we're in fix errors mode, only include adgroups with errors
                    if (window.fixErrorsMode) {
                        // Prefer using fixedAds if available
                        if (window.fixedAds && Object.keys(window.fixedAds).length > 0) {
                            // Only show adgroups with fixed ads
                            if (!window.fixedAds[adsetId] || window.fixedAds[adsetId].size === 0) {
                                console.log(`Skipping adset ${adsetId} for form data collection (not in fixed ads)`);
                                return;
                            } 
                            // Fallback to old behavior if we don't have fixed ads
                            else if (window.failedAdgroups && !window.failedAdgroups.has(adsetId)) {
                                console.log(`Skipping adset ${adsetId} for form data collection (not in failed adgroups)`);
                                return;
                            }
                        }
                    }
                    
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
                        // In fix errors mode, only include fixed ads
                        if (window.fixErrorsMode) {
                            // Prefer using fixedAds if available
                            if (window.fixedAds && window.fixedAds[adsetId]) {
                                if (!window.fixedAds[adsetId].has(dzIndex.toString())) {
                                    console.log(`Skipping ad at index ${dzIndex} in adset ${adsetId} for form data collection (not in fixed ads)`);
                                    return;
                                }
                                console.log(`Including fixed ad at index ${dzIndex} in adset ${adsetId} for form submission`);
                            }
                            // Fallback to old behavior
                            else if (window.failedAds && window.failedAds[adsetId] && 
                                !window.failedAds[adsetId].has(dzIndex.toString())) {
                                console.log(`Skipping ad at index ${dzIndex} in adset ${adsetId} for form data collection (not in failed ads)`);
                                return;
                            }
                        }
                        
                        // Check if the drop zone has any asset data
                        console.log(`Checking drop zone ${dzIndex} in adset ${adsetId}, has assets:`, !!dropZone.dataset.assets);
                        if (dropZone.dataset.assets) {
                            console.log(`Raw assets data:`, dropZone.dataset.assets);
                        }
                        
                        // Get the ad name and headline inputs - prioritize the new field name format
                        const adCreationContainer = dropZone.closest('.ad-creation-container');
                        const adNameInput = adCreationContainer ? (
                            adCreationContainer.querySelector(`input[name="tiktok_ad_names[${adsetId}][0]"]`) || 
                            adCreationContainer.querySelector('input[name^="tiktok_ad_names"]') || 
                            adCreationContainer.querySelector('.ad-name-input input') ||
                            adCreationContainer.querySelector('input.ad-name-input')
                        ) : null;
                        
                        const headlineInput = adCreationContainer ? (
                            adCreationContainer.querySelector(`input[name="tiktok_ad_headlines[${adsetId}][0]"]`) || 
                            adCreationContainer.querySelector('input[name^="tiktok_ad_headlines"]') || 
                            adCreationContainer.querySelector('.headline-input input') ||
                            adCreationContainer.querySelector('input.headline-field')
                        ) : null;
                        
                        // Get ad name from the input field
                        const adNameValue = adNameInput ? adNameInput.value : '';
                        
                        // Get headline from the input field
                        const headlineValue = headlineInput ? headlineInput.value : '';
                        
                        console.log(`Ad name input found:`, adNameInput);
                        console.log(`Ad name value: "${adNameValue}", Headline value: "${headlineValue}"`);
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
                    
                    const responseData = event.detail.data || {};
                    
                    // Hide any existing global error/success containers
                    const existingErrorContainer = document.getElementById('adBuilderErrorContainer');
                    if (existingErrorContainer) {
                        existingErrorContainer.style.display = 'none';
                    }
                    
                    const existingSuccessContainer = document.getElementById('adBuilderSuccessContainer');
                    if (existingSuccessContainer) {
                        existingSuccessContainer.style.display = 'none';
                    }
                    
                    // Show all status indicators
                    document.querySelectorAll('.ad-status-indicator').forEach(indicator => {
                        indicator.style.display = 'block';
                    });
                    
                    if (event.detail.success) {
                        // Extract per-ad status information if available
                        const adStatuses = responseData.ads || {};
                        
                        // Check if we have platform-wide errors
                        const platformErrors = {};
                        const platformSuccesses = {};
                        
                        Object.entries(adStatuses).forEach(([key, value]) => {
                            // If the key is just a platform name like "tiktok" and not a specific ad identifier
                            if (!key.includes(':') && !key.includes('-')) {
                                // Check if this is an array of ad results
                                if (Array.isArray(value)) {
                                    // Extract successful and failed ads from the array
                                    const successes = value.filter(ad => ad && ad.success === true);
                                    const failures = value.filter(ad => ad && ad.success === false);
                                    
                                    // Store these for later use
                                    if (successes.length > 0) {
                                        platformSuccesses[key] = successes;
                                    }
                                    
                                    // Update platform errors to only contain actual failures
                                    if (failures.length > 0) {
                                        platformErrors[key] = failures;
                                    }
                                    
                                    console.log(`Platform ${key}: ${successes.length} successes, ${failures.length} failures`);
                                } else {
                                    // For non-array values, store as is
                                    platformErrors[key] = value;
                                }
                            }
                        });
                        
                        console.log('Platform-wide errors:', platformErrors);
                        console.log('Platform-wide successes:', platformSuccesses);
                        
                        // Update each ad card with its status
                        document.querySelectorAll('.ad-card').forEach((card, cardIndex) => {
                            const platform = card.dataset.platform;
                            const adsetId = card.dataset.adsetId;
                            const index = card.dataset.dropZoneIndex;
                            const statusIndicator = card.querySelector('.ad-status-indicator');
                            const adName = card.querySelector('.ad-detail-value')?.textContent || '';
                            
                            // Generate key formats that might match
                            const possibleKeys = [
                                // Try exact format
                                `${platform}:${adsetId}:${index}`,
                                // Try without index
                                `${platform}:${adsetId}`,
                                // Try numeric adset ID
                                `${platform}:${parseInt(adsetId)}:${index}`,
                                // Try as ad_id directly
                                card.dataset.adId
                            ];
                            
                            let adStatus = null;
                            
                            // Try to find a matching key
                            for (const key of possibleKeys) {
                                if (adStatuses[key]) {
                                    adStatus = adStatuses[key];
                                    break;
                                }
                            }
                            
                            if (adStatus) {
                                // We found a specific status for this ad
                                if (adStatus.success) {
                                    // Success status
                                    statusIndicator.className = 'ad-status-indicator success';
                                    statusIndicator.innerHTML = `<i class="fas fa-check-circle"></i> Success! Ad ID: <span class="ad-id-text">${adStatus.ad_id || 'Created'}</span> Created`;
                                    statusIndicator.style.backgroundColor = '#dcfce7';
                                    statusIndicator.style.color = '#15803d';
                                } else {
                                    // Error for this specific ad
                                    statusIndicator.className = 'ad-status-indicator error';
                                    statusIndicator.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Error: ${adStatus.error || 'Failed to create ad'}`;
                                    statusIndicator.style.backgroundColor = '#fee2e2';
                                    statusIndicator.style.color = '#b91c1c';
                                    
                                    // Track failed ads by adgroup and index for the Fix Errors functionality
                                    if (!window.failedAds) {
                                        window.failedAds = {};
                                    }
                                    
                                    if (adsetId) {
                                        // Store as object with adgroup ID as key and set of indices as value
                                        if (!window.failedAds[adsetId]) {
                                            window.failedAds[adsetId] = new Set();
                                        }
                                        
                                        // Add the drop zone index to the set for this adgroup
                                        if (index) {
                                            window.failedAds[adsetId].add(index);
                                            console.log(`Added failed ad at index ${index} in adgroup ${adsetId}`);
                                        }
                                        
                                        // Also maintain the old failedAdgroups for backward compatibility
                                        if (!window.failedAdgroups) {
                                            window.failedAdgroups = new Set();
                                        }
                                        window.failedAdgroups.add(adsetId);
                                    }
                                }
                            } else if (Array.isArray(responseData.ads?.[platform])) {
                                // Handle array of platform-specific results
                                const result = responseData.ads[platform][cardIndex];
                                if (result) {
                                    if (result.success) {
                                        // Success status
                                        statusIndicator.className = 'ad-status-indicator success';
                                        statusIndicator.innerHTML = `<i class="fas fa-check-circle"></i> Success! Ad ID: <span class="ad-id-text">${result.ad_id || 'Created'}</span> Created`;
                                        statusIndicator.style.backgroundColor = '#dcfce7';
                                        statusIndicator.style.color = '#15803d';
                                    } else {
                                        // Error status
                                        statusIndicator.className = 'ad-status-indicator error';
                                        statusIndicator.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Error: ${result.error || 'Failed to create ad'}`;
                                        statusIndicator.style.backgroundColor = '#fee2e2';
                                        statusIndicator.style.color = '#b91c1c';
                                        
                                        // Track failed ads by adgroup and index for the Fix Errors functionality
                                        if (!window.failedAds) {
                                            window.failedAds = {};
                                        }
                                        
                                        if (adsetId) {
                                            // Store as object with adgroup ID as key and set of indices as value
                                            if (!window.failedAds[adsetId]) {
                                                window.failedAds[adsetId] = new Set();
                                            }
                                            
                                            // Add the drop zone index to the set for this adgroup
                                            if (index) {
                                                window.failedAds[adsetId].add(index);
                                                console.log(`Added failed ad at index ${index} in adgroup ${adsetId}`);
                                            }
                                            
                                            // Also maintain the old failedAdgroups for backward compatibility
                                            if (!window.failedAdgroups) {
                                                window.failedAdgroups = new Set();
                                            }
                                            window.failedAdgroups.add(adsetId);
                                        }
                                    }
                                } else if (platformSuccesses[platform] && cardIndex < platformSuccesses[platform].length) {
                                    // More successes than this card's index, assume success
                                    statusIndicator.className = 'ad-status-indicator success';
                                    statusIndicator.innerHTML = `<i class="fas fa-check-circle"></i> Success! Ad ID: <span class="ad-id-text">${platformSuccesses[platform][cardIndex].ad_id || 'Created'}</span> Created`;
                                    statusIndicator.style.backgroundColor = '#dcfce7';
                                    statusIndicator.style.color = '#15803d';
                                } else if (platformErrors[platform]) {
                                    // Apply a platform error
                                    let errorMessage = 'Failed to create ad';
                                    if (Array.isArray(platformErrors[platform]) && platformErrors[platform].length > 0) {
                                        errorMessage = platformErrors[platform][0].error || errorMessage;
                                    } else if (typeof platformErrors[platform] === 'string') {
                                        errorMessage = platformErrors[platform];
                                    }
                                    
                                    statusIndicator.className = 'ad-status-indicator error';
                                    statusIndicator.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Error: ${errorMessage}`;
                                    statusIndicator.style.backgroundColor = '#fee2e2';
                                    statusIndicator.style.color = '#b91c1c';
                                    
                                    // Track failed ads by adgroup and index for the Fix Errors functionality
                                    if (!window.failedAds) {
                                        window.failedAds = {};
                                    }
                                    
                                    if (adsetId) {
                                        // Store as object with adgroup ID as key and set of indices as value
                                        if (!window.failedAds[adsetId]) {
                                            window.failedAds[adsetId] = new Set();
                                        }
                                        
                                        // Add the drop zone index to the set for this adgroup
                                        if (index) {
                                            window.failedAds[adsetId].add(index);
                                            console.log(`Added failed ad at index ${index} in adgroup ${adsetId}`);
                                        }
                                        
                                        // Also maintain the old failedAdgroups for backward compatibility
                                        if (!window.failedAdgroups) {
                                            window.failedAdgroups = new Set();
                                        }
                                        window.failedAdgroups.add(adsetId);
                                    }
                                } else {
                                    // Unknown status
                                    statusIndicator.className = 'ad-status-indicator unknown';
                                    statusIndicator.innerHTML = '<i class="fas fa-question-circle"></i> Status: Unknown';
                                    statusIndicator.style.backgroundColor = '#f1f5f9';
                                    statusIndicator.style.color = '#64748b';
                                }
                            } else if (platformErrors[platform]) {
                                // Apply platform-wide error to this card
                                let errorMessage = 'Failed to create ad';
                                if (typeof platformErrors[platform] === 'string') {
                                    errorMessage = platformErrors[platform];
                                }
                                
                                statusIndicator.className = 'ad-status-indicator error';
                                statusIndicator.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Error: ${errorMessage}`;
                                statusIndicator.style.backgroundColor = '#fee2e2';
                                statusIndicator.style.color = '#b91c1c';
                                
                                // Track failed ads by adgroup and index for the Fix Errors functionality
                                if (!window.failedAds) {
                                    window.failedAds = {};
                                }
                                
                                if (adsetId) {
                                    // Store as object with adgroup ID as key and set of indices as value
                                    if (!window.failedAds[adsetId]) {
                                        window.failedAds[adsetId] = new Set();
                                    }
                                    
                                    // Add the drop zone index to the set for this adgroup
                                    if (index) {
                                        window.failedAds[adsetId].add(index);
                                        console.log(`Added failed ad at index ${index} in adgroup ${adsetId}`);
                                    }
                                    
                                    // Also maintain the old failedAdgroups for backward compatibility
                                    if (!window.failedAdgroups) {
                                        window.failedAdgroups = new Set();
                                    }
                                    window.failedAdgroups.add(adsetId);
                                }
                            } else {
                                // No specific status found and no platform-wide error
                                // Default to "Unknown" state instead of success
                                statusIndicator.className = 'ad-status-indicator unknown';
                                statusIndicator.innerHTML = '<i class="fas fa-question-circle"></i> Status: Unknown';
                                statusIndicator.style.backgroundColor = '#f1f5f9';
                                statusIndicator.style.color = '#64748b';
                            }
                        });
                        
                        // Show the Fix Errors button if there are any failed adgroups
                        if (window.failedAdgroups && window.failedAdgroups.size > 0) {
                            console.log(`Found ${window.failedAdgroups.size} failed adgroups, showing Fix Errors button`);
                            
                            // Find and show the Fix Errors button
                            const fixErrorsBtn = document.getElementById('fixErrorsBtn');
                            if (fixErrorsBtn) {
                                fixErrorsBtn.style.display = 'inline-block';
                            }
                        }
                    } else {
                        // Global error - update all cards with error status
                        document.querySelectorAll('.ad-card').forEach(card => {
                            const statusIndicator = card.querySelector('.ad-status-indicator');
                            const adsetId = card.dataset.adsetId;
                            
                            statusIndicator.className = 'ad-status-indicator error';
                            statusIndicator.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Error: ${event.detail.error || 'Failed to create ads'}`;
                            statusIndicator.style.backgroundColor = '#fee2e2';
                            statusIndicator.style.color = '#b91c1c';
                            
                            // Track all adgroups as failed in this case
                            if (!window.failedAdgroups) {
                                window.failedAdgroups = new Set();
                            }
                            
                            if (adsetId) {
                                window.failedAdgroups.add(adsetId);
                            }
                        });
                        
                        // Show the Fix Errors button
                        const fixErrorsBtn = document.getElementById('fixErrorsBtn');
                        if (fixErrorsBtn) {
                            fixErrorsBtn.style.display = 'inline-block';
                        }
                    }
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
        
        // Check if we're in fix errors mode
        const isFixErrorsMode = window.fixErrorsMode === true;
        console.log(`Fix errors mode: ${isFixErrorsMode}`);
        
        // Get all drop zones that have assets
        const adsetItems = document.querySelectorAll('.adset-item');
        console.log(`Found ${adsetItems.length} adset items in the DOM`);
        
        adsetItems.forEach((adsetItem, index) => {
            // Extract adset information
            const adsetName = adsetItem.querySelector('.adset-name')?.textContent || `Ad Set ${index + 1}`;
            const adsetId = adsetItem.dataset.adsetId || `adset-${index}`;
            
            // In fix errors mode, only include adgroups that had errors and now have fixed ads
            if (isFixErrorsMode) {
                // First, check if we have fixed ads to process - if so, use that
                if (window.fixedAds && Object.keys(window.fixedAds).length > 0) {
                    // Only show adgroups with fixed ads
                    if (!window.fixedAds[adsetId] || window.fixedAds[adsetId].size === 0) {
                        console.log(`Skipping adset ${adsetId} as it has no fixed ads`);
                        return;
                    }
                } 
                // Fallback to old behavior if we don't have fixed ads
                else if (window.failedAdgroups && !window.failedAdgroups.has(adsetId)) {
                    console.log(`Skipping adset ${adsetId} as it didn't have errors in fix errors mode`);
                    return;
                }
            }
            
            // Get all drop zones within this adset that have assets
            const dropZones = adsetItem.querySelectorAll('.asset-drop-zone.has-asset');
            console.log(`Adset ${index+1} has ${dropZones.length} drop zones with assets`);
            
            if (dropZones.length > 0) {
                // Create an ad card for EACH drop zone that has assets (each ad)
                dropZones.forEach((dropZone, adIndex) => {
                    // In fix errors mode, only include fixed ads
                    if (isFixErrorsMode) {
                        // Prefer using fixedAds if available
                        if (window.fixedAds && window.fixedAds[adsetId]) {
                            if (!window.fixedAds[adsetId].has(adIndex.toString())) {
                                console.log(`Skipping ad at index ${adIndex} in adset ${adsetId} as it's not in fixed ads`);
                                return;
                            }
                        }
                        // Fallback to old behavior
                        else if (window.failedAds && window.failedAds[adsetId] && 
                            !window.failedAds[adsetId].has(adIndex.toString())) {
                            console.log(`Skipping ad at index ${adIndex} in adset ${adsetId} as it didn't have errors`);
                            return;
                        }
                    }
                    
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
                            adCopy: adCopy,
                            // Add identifier details for tracking status later
                            platform: adsetItem.dataset.platform,
                            adsetId: adsetId,
                            dropZoneIndex: adIndex
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

/**
 * Validate all TikTok videos in ad sets and return any warnings
 * @param {Array} adSets - Array of ad set objects
 * @returns {Array} Array of warning messages
 */
function validateTikTokVideos(adSets) {
    const warnings = [];
    
    // Process each adset to find TikTok videos
    adSets.forEach(adSet => {
        // Only check TikTok adsets
        if (adSet.platform !== 'tiktok') return;
        
        // Check each asset in the adset
        adSet.assets.forEach(asset => {
            // Only check video assets
            if (asset.type !== 'video') return;
            
            // Validate the video
            const validation = validateTikTokVideo(asset);
            if (validation.hasWarnings) {
                // For each warning, add an entry to the warnings array
                validation.messages.forEach(message => {
                    warnings.push(`Ad "${adSet.name}": ${message}`);
                });
            }
        });
    });
    
    return warnings;
} 