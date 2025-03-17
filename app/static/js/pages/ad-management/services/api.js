/**
 * API service for handling network requests
 */

/**
 * Handle API response based on content type
 * @param {Response} response - Fetch response object
 * @returns {Promise<any>} - Parsed response data
 */
async function handleResponse(response) {
    const contentType = response.headers.get('content-type');
    
    // Handle JSON response
    if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        
        if (!response.ok) {
            const error = data.error || data.message || 'An unknown error occurred';
            throw new Error(error);
        }
        
        return data;
    }
    
    // Handle text response
    if (contentType && contentType.includes('text/')) {
        const text = await response.text();
        
        if (!response.ok) {
            throw new Error(text || 'An unknown error occurred');
        }
        
        return text;
    }
    
    // Handle other response types
    if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
    }
    
    return response;
}

/**
 * Perform a GET request
 * @param {string} url - The URL to fetch from
 * @param {Object} options - Fetch options
 * @returns {Promise<any>} - Parsed response data
 */
export async function get(url, options = {}) {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            },
            ...options
        });
        
        return await handleResponse(response);
    } catch (error) {
        console.error('GET request failed:', error);
        throw error;
    }
}

/**
 * Perform a POST request
 * @param {string} url - The URL to post to
 * @param {Object|FormData} data - The data to send
 * @param {Object} options - Fetch options
 * @returns {Promise<any>} - Parsed response data
 */
export async function post(url, data, options = {}) {
    try {
        // Determine if we're sending FormData or JSON
        const isFormData = data instanceof FormData;
        
        const headers = !isFormData ? {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        } : undefined; // Let the browser set the content-type for FormData
        
        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: isFormData ? data : JSON.stringify(data),
            ...options
        });
        
        return await handleResponse(response);
    } catch (error) {
        console.error('POST request failed:', error);
        throw error;
    }
} 