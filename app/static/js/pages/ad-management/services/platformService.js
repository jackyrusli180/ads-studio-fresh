/**
 * Platform services for Meta and TikTok API interactions
 */

import { get } from './api.js';

/**
 * Meta platform service
 */
export const metaService = {
    /**
     * Fetch Meta campaigns for an account
     * @param {string} accountId - Meta account ID
     * @returns {Promise<Object>} - Campaigns data
     */
    async fetchCampaigns(accountId) {
        try {
            console.log(`Fetching Meta campaigns for account ID: ${accountId}`);
            const apiUrl = `/api/meta/campaigns?account_id=${accountId}`;
            return await get(apiUrl);
        } catch (error) {
            console.error('Error fetching Meta campaigns:', error);
            // Return mock data for development
            return {
                campaigns: [
                    { id: 'camp_123', name: 'Brand Awareness Q2' },
                    { id: 'camp_456', name: 'App Installs Campaign' },
                    { id: 'camp_789', name: 'Conversion Campaign' }
                ]
            };
        }
    },
    
    /**
     * Fetch Meta adsets for a campaign
     * @param {string} accountId - Meta account ID
     * @param {string} campaignId - Meta campaign ID
     * @returns {Promise<Object>} - Adsets data
     */
    async fetchAdsets(accountId, campaignId) {
        try {
            console.log(`Fetching Meta adsets for account ID: ${accountId}, campaign ID: ${campaignId}`);
            const apiUrl = `/api/meta/adsets?account_id=${accountId}&campaign_id=${campaignId}`;
            return await get(apiUrl);
        } catch (error) {
            console.error('Error fetching Meta adsets:', error);
            // Return mock data for development
            return {
                adsets: [
                    { id: `adset_${campaignId}_1`, name: 'US Market - 25-34' },
                    { id: `adset_${campaignId}_2`, name: 'EU Market - All Ages' },
                    { id: `adset_${campaignId}_3`, name: 'APAC Region - 18-24' }
                ]
            };
        }
    },
    
    /**
     * Fetch Meta ads for an adset
     * @param {string} accountId - Meta account ID
     * @param {string} adsetId - Meta adset ID
     * @returns {Promise<Object>} - Ads data
     */
    async fetchAds(accountId, adsetId) {
        try {
            console.log(`Fetching Meta ads for account ID: ${accountId}, adset ID: ${adsetId}`);
            const apiUrl = `/api/meta/ads?account_id=${accountId}&adset_id=${adsetId}`;
            return await get(apiUrl);
        } catch (error) {
            console.error('Error fetching Meta ads:', error);
            // Return mock data for development
            return {
                ads: [
                    { 
                        id: `ad_${adsetId}_1`, 
                        name: 'Creative A - Summer Sale',
                        status: 'ACTIVE',
                        preview_url: 'https://www.facebook.com/ads/archive/render_ad/',
                        creative: {
                            id: 'cr_123',
                            image_url: '/static/uploads/thumb_regenerated_20250304_130144_8fb048f9.jpg',
                            title: 'Special Summer Offer',
                            body: 'Get 50% off on all products'
                        }
                    },
                    { 
                        id: `ad_${adsetId}_2`, 
                        name: 'Creative B - New Products',
                        status: 'ACTIVE',
                        preview_url: 'https://www.facebook.com/ads/archive/render_ad/',
                        creative: {
                            id: 'cr_456',
                            image_url: '/static/uploads/thumb_regenerated_20250304_082049_790e5301.jpg',
                            title: 'New Collection',
                            body: 'Check out our latest products'
                        }
                    }
                ]
            };
        }
    }
};

/**
 * TikTok platform service
 */
export const tiktokService = {
    /**
     * Fetch TikTok campaigns for an account
     * @param {string} accountId - TikTok account ID
     * @returns {Promise<Object>} - Campaigns data
     */
    async fetchCampaigns(accountId) {
        try {
            // Be specific about the desired advertiser ID
            const advertiserId = accountId || '7437092357411225617'; // Use the ID you want to see campaigns for
            console.log(`Fetching TikTok campaigns for account ID: ${advertiserId}`);
            
            // Changed to use advertiser_id which is what the backend expects
            const apiUrl = `/api/tiktok/campaigns?advertiser_id=${advertiserId}`;
            const response = await get(apiUrl);
            
            // Add detailed logging of the response
            console.log('TikTok campaigns API response:', response);
            
            // Check if response has the expected structure
            if (response && response.campaigns) {
                console.log(`Found ${response.campaigns.length} TikTok campaigns`);
                
                // Map TikTok campaign fields to standardized format
                const standardizedCampaigns = response.campaigns.map(campaign => ({
                    id: campaign.campaign_id || campaign.id,
                    name: campaign.campaign_name || campaign.name,
                    status: campaign.operation_status || campaign.status,
                    // Preserve the original data for reference
                    original: campaign
                }));
                
                return { campaigns: standardizedCampaigns };
            } else if (response && response.data) {
                console.log(`Found ${response.data.length} TikTok campaigns (data format)`);
                // Convert data response to expected object format with standardized fields
                const standardizedCampaigns = response.data.map(campaign => ({
                    id: campaign.campaign_id || campaign.id,
                    name: campaign.campaign_name || campaign.name,
                    status: campaign.operation_status || campaign.status,
                    original: campaign
                }));
                return { campaigns: standardizedCampaigns };
            } else if (response && Array.isArray(response)) {
                console.log(`Found ${response.length} TikTok campaigns (array format)`);
                // Convert array response to expected object format with standardized fields
                const standardizedCampaigns = response.map(campaign => ({
                    id: campaign.campaign_id || campaign.id,
                    name: campaign.campaign_name || campaign.name,
                    status: campaign.operation_status || campaign.status,
                    original: campaign
                }));
                return { campaigns: standardizedCampaigns };
            } else {
                console.warn('TikTok campaigns response format is unexpected:', response);
            }
            
            return response;
        } catch (error) {
            console.error('Error fetching TikTok campaigns:', error);
            // Return mock data for development
            return {
                campaigns: [
                    { id: 'tt_camp_123', name: 'TikTok Reach Campaign' },
                    { id: 'tt_camp_456', name: 'TikTok App Promotion' },
                    { id: 'tt_camp_789', name: 'TikTok Brand Awareness' }
                ]
            };
        }
    },
    
    /**
     * Fetch TikTok adsets for a campaign
     * @param {string} accountId - TikTok account ID
     * @param {string} campaignId - TikTok campaign ID
     * @returns {Promise<Object>} - Adsets data
     */
    async fetchAdsets(accountId, campaignId) {
        try {
            console.log(`Fetching TikTok adsets for account ID: ${accountId}, campaign ID: ${campaignId}`);
            // Changed to use advertiser_id which is what the backend expects
            const apiUrl = `/api/tiktok/adsets?advertiser_id=${accountId}&campaign_id=${campaignId}`;
            const response = await get(apiUrl);
            
            // Log the raw response to debug status fields
            console.log('TikTok adsets API raw response:', response);
            
            // Process the response to ensure consistent field names
            if (response && response.adsets && Array.isArray(response.adsets)) {
                // Standardize field names - TikTok uses adgroup_id and adgroup_name
                response.adsets = response.adsets.map(adset => {
                    // The priority order for status is: secondary_status > operation_status
                    // secondary_status has more detailed information about why an adgroup might be paused or inactive
                    const statusField = adset.secondary_status || adset.operation_status || adset.status || adset.adgroup_status;
                    
                    console.log(`Adset ${adset.adgroup_name || adset.name}: Status fields:`, { 
                        status: adset.status,
                        secondary_status: adset.secondary_status,
                        operation_status: adset.operation_status,
                        adgroup_status: adset.adgroup_status,
                        selected: statusField
                    });
                    
                    return {
                        ...adset,
                        // Ensure id and name are always present
                        id: adset.id || adset.adgroup_id,
                        name: adset.name || adset.adgroup_name || 'Unnamed Adset',
                        // Ensure status is always present and uses the most informative status available
                        status: statusField || 'UNKNOWN'
                    };
                });
            }
            
            return response;
        } catch (error) {
            console.error('Error fetching TikTok adsets:', error);
            // Return mock data for development
            return {
                adsets: [
                    { id: `adset_${campaignId}_1`, name: 'TikTok US Market - 25-34' },
                    { id: `adset_${campaignId}_2`, name: 'TikTok EU Market - All Ages' },
                    { id: `adset_${campaignId}_3`, name: 'TikTok APAC Region - 18-24' }
                ]
            };
        }
    },
    
    /**
     * Fetch TikTok ads for an adgroup (adset)
     * @param {string} accountId - TikTok account ID (advertiser_id)
     * @param {string} adgroupId - TikTok adgroup ID
     * @returns {Promise<Object>} - Ads data
     */
    async fetchAds(accountId, adgroupId) {
        try {
            console.log(`Fetching TikTok ads for account ID: ${accountId}, adgroup ID: ${adgroupId}`);
            // Use advertiser_id which is what the backend expects
            const apiUrl = `/api/tiktok/ads?advertiser_id=${accountId}&adgroup_id=${adgroupId}`;
            return await get(apiUrl);
        } catch (error) {
            console.error('Error fetching TikTok ads:', error);
            // Return mock data for development
            return {
                ads: [
                    { 
                        id: `ad_${adgroupId}_1`, 
                        name: 'TikTok Ad 1',
                        status: 'AD_STATUS_DELIVERY_OK',
                        material_status: 'MATERIAL_STATUS_AUDIT_PASS',
                        creative: {
                            id: 'ttcr_123',
                            image_url: '/static/uploads/thumb_20250304_130111_a_futuristic__dark_metallic_security_robot_stands____.png',
                            title: 'Check this out',
                            description: 'Trending now on TikTok'
                        }
                    },
                    { 
                        id: `ad_${adgroupId}_2`, 
                        name: 'TikTok Ad 2',
                        status: 'AD_STATUS_DELIVERY_OK',
                        material_status: 'MATERIAL_STATUS_AUDIT_PASS',
                        creative: {
                            id: 'ttcr_456',
                            image_url: '/static/uploads/thumb_20250304_125705_a_futuristic__dark_metallic_security_robot_stands____.png',
                            title: 'New and exciting',
                            description: 'Don\'t miss out'
                        }
                    }
                ]
            };
        }
    }
}; 