/**
 * Ad Display Module
 * Handles fetching and displaying ads for adsets
 */

import { metaService, tiktokService } from '../../services/platformService.js';

/**
 * Fetch existing ads for an adset
 * @param {string} platform - The platform (meta or tiktok)
 * @param {string} accountId - The account ID
 * @param {string} adsetId - The adset ID
 * @returns {Promise<Object>} - The ads data
 */
export async function fetchExistingAds(platform, accountId, adsetId) {
    try {
        if (platform === 'meta') {
            return await metaService.fetchAds(accountId, adsetId);
        } else if (platform === 'tiktok') {
            return await tiktokService.fetchAds(accountId, adsetId);
        }
        
        throw new Error(`Unsupported platform: ${platform}`);
    } catch (error) {
        console.error(`Error fetching ${platform} ads for adset ${adsetId}:`, error);
        throw error;
    }
}

/**
 * Render a list of ads
 * @param {HTMLElement} container - The container to append ads to
 * @param {Object} adsData - The ads data
 * @param {string} platform - The platform (meta or tiktok)
 */
export function renderAdsList(container, adsData, platform) {
    if (!container) return;
    
    // Clear any existing content
    container.innerHTML = '';
    
    // Check if there are any ads
    if (!adsData || !adsData.ads || adsData.ads.length === 0) {
        container.innerHTML = '<div class="no-ads">No ads found</div>';
        return;
    }
    
    // Create a list for ads
    const adsList = document.createElement('div');
    adsList.className = 'ads-list';
    
    adsData.ads.forEach(ad => {
        const adItem = document.createElement('div');
        adItem.className = 'ad-item';
        adItem.dataset.adId = ad.id;
        
        // Determine preview content based on creative type
        let previewContent = '';
        if (ad.creative && ad.creative.image_url) {
            previewContent = `<img src="${ad.creative.image_url}" alt="${ad.name}" class="ad-preview-img">`;
        } else {
            previewContent = '<div class="ad-no-preview">No preview available</div>';
        }
        
        // Map status to readable format
        let adStatus = ad.status || 'Unknown';
        let statusClass = 'unknown';
        
        if (platform === 'meta') {
            // Meta ad status mapping
            if (ad.status === 'ACTIVE') {
                statusClass = 'active';
            } else if (ad.status === 'PAUSED') {
                statusClass = 'paused';
            } else if (ad.status === 'DELETED' || ad.status === 'ARCHIVED') {
                statusClass = 'deleted';
            }
        } else if (platform === 'tiktok') {
            // TikTok ad status mapping
            if (ad.status === 'AD_STATUS_DELIVERY_OK') {
                adStatus = 'Active';
                statusClass = 'active';
            } else if (ad.status === 'AD_STATUS_DISABLE') {
                adStatus = 'Paused';
                statusClass = 'paused';
            } else if (ad.status.includes('REJECT')) {
                adStatus = 'Rejected';
                statusClass = 'rejected';
            } else if (ad.status.includes('AUDIT')) {
                adStatus = 'In Review';
                statusClass = 'review';
            }
        }
        
        adItem.innerHTML = `
            <div class="ad-header">
                <h6 class="ad-name">${ad.name}</h6>
                <span class="ad-status ${statusClass}">${adStatus}</span>
            </div>
            <div class="ad-preview">
                ${previewContent}
            </div>
            <div class="ad-details">
                ${platform === 'meta' ? 
                  (ad.creative?.title ? `<div class="ad-title"><strong>Title:</strong> ${ad.creative.title}</div>` : '') +
                  (ad.creative?.body ? `<div class="ad-body"><strong>Body:</strong> ${ad.creative.body}</div>` : '')
                  : 
                  (ad.creative?.title ? `<div class="ad-title"><strong>Title:</strong> ${ad.creative.title}</div>` : '') +
                  (ad.creative?.description ? `<div class="ad-body"><strong>Description:</strong> ${ad.creative.description}</div>` : '')
                }
            </div>
        `;
        
        adsList.appendChild(adItem);
    });
    
    container.appendChild(adsList);
} 