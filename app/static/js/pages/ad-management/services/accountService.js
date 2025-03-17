/**
 * Account service for handling advertiser accounts
 */

import { get } from './api.js';

// Fallback account data for development/testing
const fallbackAccounts = {
    meta: [
        { id: '570444632374496', name: 'Global Paid Ads - TR (TRY Account)' },
        { id: '380552088147594', name: 'Global Paid Ads - TR' },
        { id: '1411816200203267', name: 'Growth Product - TR' }
    ],
    tiktok: [
        { id: '7428582544423075856', name: 'OKX TR Official Ad Account' },
        { id: '7463377308125036561', name: 'OKX TR Growth Product Ad Account' },
        { id: '7463126039993188369', name: 'Global Offshore Team V2' }
    ]
};

/**
 * Fetch advertiser accounts for selected platforms
 * @param {string[]} platforms - Array of platform identifiers (e.g., 'meta', 'tiktok')
 * @returns {Promise<Array>} - Array of account objects
 */
export async function fetchAdvertiserAccounts(platforms) {
    if (platforms.length === 0) {
        return [];
    }
    
    try {
        // Make API call to get accounts for selected platforms
        const platformsParam = platforms.join(',');
        console.log(`Fetching accounts for platforms: ${platformsParam}`);
        const accountsData = await get(`/api/accounts?platforms=${platformsParam}`);
        console.log('Response from accounts API:', accountsData);
        
        return processAccountsResponse(accountsData, platforms);
    } catch (err) {
        console.error('API error, using fallback accounts:', err);
        return getFallbackAccounts(platforms);
    }
}

/**
 * Process the accounts API response
 * @param {Object} accountsData - Response data from the accounts API
 * @param {string[]} platforms - Array of platform identifiers
 * @returns {Array} - Processed accounts array
 */
function processAccountsResponse(accountsData, platforms) {
    let accounts = [];
    
    if (platforms.length === 1) {
        // Single platform - response should be a direct array
        if (Array.isArray(accountsData)) {
            accounts = accountsData.map(account => ({
                ...account,
                platform: platforms[0]
            }));
            console.log(`Single platform: found ${accounts.length} accounts (array format)`);
        } else if (accountsData && typeof accountsData === 'object') {
            // Handle case where response is an object even for single platform
            const platform = platforms[0];
            if (accountsData[platform] && Array.isArray(accountsData[platform])) {
                accounts = accountsData[platform].map(account => ({
                    ...account,
                    platform
                }));
                console.log(`Single platform: found ${accounts.length} accounts (object format)`);
            } else {
                // If we can't find accounts in the expected format, use fallback
                console.log(`Invalid single platform response, using fallbacks for ${platform}`);
                accounts = getFallbackAccountsForPlatform(platform);
            }
        }
    } else {
        // Multiple platforms - response should be an object with platform keys
        if (accountsData && typeof accountsData === 'object') {
            for (const platform of platforms) {
                if (accountsData[platform] && Array.isArray(accountsData[platform])) {
                    console.log(`Platform ${platform}: found ${accountsData[platform].length} accounts`);
                    const platformAccounts = accountsData[platform].map(account => ({
                        ...account,
                        name: `[${platform.toUpperCase()}] ${account.name}`,
                        platform
                    }));
                    accounts = accounts.concat(platformAccounts);
                } else {
                    // Use fallbacks if no accounts found for this platform
                    console.log(`No accounts found for ${platform}, using fallbacks`);
                    accounts = accounts.concat(getFallbackAccountsForPlatform(platform, true));
                }
            }
        } else {
            // Use fallbacks for all platforms
            console.log('Invalid multi-platform response, using fallbacks');
            accounts = getFallbackAccounts(platforms);
        }
    }
    
    return accounts;
}

/**
 * Get fallback accounts for multiple platforms
 * @param {string[]} platforms - Array of platform identifiers
 * @returns {Array} - Array of fallback account objects
 */
function getFallbackAccounts(platforms) {
    let accounts = [];
    
    for (const platform of platforms) {
        accounts = accounts.concat(getFallbackAccountsForPlatform(platform, platforms.length > 1));
    }
    
    return accounts;
}

/**
 * Get fallback accounts for a specific platform
 * @param {string} platform - Platform identifier
 * @param {boolean} addPlatformPrefix - Whether to add platform prefix to account name
 * @returns {Array} - Array of fallback account objects for the platform
 */
function getFallbackAccountsForPlatform(platform, addPlatformPrefix = false) {
    return (fallbackAccounts[platform] || []).map(account => ({
        ...account,
        name: addPlatformPrefix ? `[${platform.toUpperCase()}] ${account.name}` : account.name,
        platform
    }));
} 