/**
 * API service for handling network requests
 */

/**
 * Get the base URL for API requests that works across different ports
 * @returns {string} The base URL to use for API requests
 */
function getBaseUrl() {
    // Use the current window location to ensure API calls work on any port
    return window.location.origin;
}

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
        // Make sure URL is absolute by handling both relative and absolute URLs
        const fullUrl = url.startsWith('http') ? url : `${getBaseUrl()}${url.startsWith('/') ? '' : '/'}${url}`;
        
        const response = await fetch(fullUrl, {
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
        // Make sure URL is absolute by handling both relative and absolute URLs
        const fullUrl = url.startsWith('http') ? url : `${getBaseUrl()}${url.startsWith('/') ? '' : '/'}${url}`;
        console.log(`Making POST request to: ${fullUrl}`);
        
        // Determine if we're sending FormData or JSON
        const isFormData = data instanceof FormData;
        console.log(`Request type: ${isFormData ? 'FormData' : 'JSON'}`);
        
        if (isFormData) {
            console.log('FormData contents:');
            for (let [key, value] of data.entries()) {
                console.log(`  - ${key}: ${value}`);
            }
        } else {
            console.log('JSON request body:', data);
        }
        
        const headers = !isFormData ? {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        } : undefined; // Let the browser set the content-type for FormData
        
        console.log(`Request headers:`, headers);
        
        // Start the timer for the request
        const startTime = Date.now();
        console.log(`POST request started at: ${new Date(startTime).toISOString()}`);
        
        const response = await fetch(fullUrl, {
            method: 'POST',
            headers,
            body: isFormData ? data : JSON.stringify(data),
            ...options
        });
        
        // Log timing information
        const endTime = Date.now();
        const duration = endTime - startTime;
        console.log(`POST request completed in ${duration}ms (${duration/1000} seconds)`);
        console.log(`Response status: ${response.status} ${response.statusText}`);
        
        // Try to log the response content type
        const contentType = response.headers.get('content-type');
        console.log(`Response content type: ${contentType}`);
        
        const result = await handleResponse(response);
        console.log('Processed response data:', result);
        return result;
    } catch (error) {
        console.error('POST request failed:', error);
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        throw error;
    }
} 