/**
 * APIService - Handles all API communications
 * Single Responsibility: Managing API requests and responses
 */
class APIService {
    constructor() {
        this.baseUrl = 'localhost:3000';
        this.endpoints = {
            pack: '/pack',
            training: '/training',
            fake_data: '/fake_data',
            check_endpoint: '/check_endpoint'
        };
        this.timeout = 30000; // 30 seconds
    }

    /**
     * Set base URL for API
     */
    setBaseUrl(url) {
        this.baseUrl = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    }

    /**
     * Get base URL
     */
    getBaseUrl() {
        return this.baseUrl;
    }

    /**
     * Build full URL for endpoint
     */
    buildUrl(endpoint) {
        return `http://${this.baseUrl}${endpoint}`;
    }

    /**
     * Check if API endpoint is available
     */
    async checkEndpoint() {
        try {
            const requestData = {
                base_url: this.baseUrl
            };
            
            const response = await this.makeRequest(this.endpoints.check_endpoint, 'POST', requestData);
            
            if (response.success) {
                const data = response.data;
                return {
                    success: data.success || false,
                    message: data.message || 'Endpoint check completed',
                    endpointInfo: data.endpoint_info || null
                };
            } else {
                throw new Error(response.error || 'Request failed');
            }
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: 'Failed to check endpoint availability'
            };
        }
    }

    /**
     * Run packing algorithm
     */
    async runPacking(items, binSize, weights = null) {
        try {
            const requestData = {
                items: items,
                bin_size: binSize
            };

            // Add weights if provided
            if (weights) {
                requestData.algorithm_weights = weights;
            }

            const response = await this.makeRequest(this.endpoints.pack, 'POST', requestData);
            
            if (response.success) {
                return {
                    success: true,
                    data: response.data,
                    message: 'Packing completed successfully'
                };
            } else {
                throw new Error(response.error || 'Packing failed');
            }
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: 'Failed to run packing algorithm'
            };
        }
    }

    /**
     * Run training algorithm
     */
    async runTraining(trainingData, initialWeights, config) {
        try {
            const requestData = {
                training_data: trainingData,
                initial_weights: initialWeights,
                training_config: config
            };

            const response = await this.makeRequest(this.endpoints.training, 'POST', requestData);
            
            if (response.success) {
                return {
                    success: true,
                    data: response.data,
                    message: 'Training completed successfully'
                };
            } else {
                throw new Error(response.error || 'Training failed');
            }
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: 'Failed to run training algorithm'
            };
        }
    }

    /**
     * Generate fake training data
     */
    async generateFakeData(params) {
        try {
            const requestData = {
                num_items: params.numItems || 10,
                bin_size: params.binSize,
                n_unique: params.nUnique || 3,
                seed: params.seed || null,
                include_weights: params.includeWeights || false
            };

            const response = await this.makeRequest(this.endpoints.fake_data, 'POST', requestData);
            
            if (response.success) {
                return {
                    success: true,
                    data: response.data,
                    message: 'Fake data generated successfully'
                };
            } else {
                throw new Error(response.error || 'Fake data generation failed');
            }
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: 'Failed to generate fake data'
            };
        }
    }

    /**
     * Generic API request method
     */
    async makeRequest(endpoint, method = 'GET', data = null) {
        try {
            const url = this.buildUrl(endpoint);
            const options = {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                timeout: this.timeout
            };

            if (data && (method === 'POST' || method === 'PUT')) {
                options.body = JSON.stringify(data);
            }

            const response = await fetch(url, options);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                throw new Error(`Expected JSON response, got: ${contentType}. Response: ${text.substring(0, 200)}`);
            }

            const responseData = await response.json();
            
            return {
                success: true,
                data: responseData,
                status: response.status,
                statusText: response.statusText
            };
            
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Request timeout');
            }
            
            return {
                success: false,
                error: error.message,
                details: error
            };
        }
    }

    /**
     * Set request timeout
     */
    setTimeout(timeout) {
        this.timeout = timeout;
    }

    /**
     * Get request timeout
     */
    getTimeout() {
        return this.timeout;
    }

    /**
     * Validate API response structure
     */
    validatePackingResponse(response) {
        if (!response || typeof response !== 'object') {
            return { valid: false, error: 'Invalid response format' };
        }

        // Check for required fields in packing response
        const requiredFields = ['packed_items'];
        const missingFields = requiredFields.filter(field => !(field in response));
        
        if (missingFields.length > 0) {
            return { 
                valid: false, 
                error: `Missing required fields: ${missingFields.join(', ')}` 
            };
        }

        // Validate packed_items structure
        if (!Array.isArray(response.packed_items)) {
            return { 
                valid: false, 
                error: 'packed_items must be an array' 
            };
        }

        // Validate individual items
        for (let i = 0; i < response.packed_items.length; i++) {
            const item = response.packed_items[i];
            const requiredItemFields = ['id', 'length', 'width', 'height', 'x', 'y', 'z'];
            const missingItemFields = requiredItemFields.filter(field => !(field in item));
            
            if (missingItemFields.length > 0) {
                return { 
                    valid: false, 
                    error: `Item ${i} missing fields: ${missingItemFields.join(', ')}` 
                };
            }
        }

        return { valid: true };
    }

    /**
     * Validate training response structure
     */
    validateTrainingResponse(response) {
        if (!response || typeof response !== 'object') {
            return { valid: false, error: 'Invalid response format' };
        }

        // Check for required fields in training response
        const requiredFields = ['optimized_weights', 'training_history'];
        const missingFields = requiredFields.filter(field => !(field in response));
        
        if (missingFields.length > 0) {
            return { 
                valid: false, 
                error: `Missing required fields: ${missingFields.join(', ')}` 
            };
        }

        return { valid: true };
    }

    /**
     * Handle API errors with user-friendly messages
     */
    getErrorMessage(error) {
        if (typeof error === 'string') {
            return error;
        }

        if (error.message) {
            if (error.message.includes('fetch')) {
                return 'Unable to connect to the API server. Please check if the server is running and the URL is correct.';
            }
            if (error.message.includes('timeout')) {
                return 'Request timed out. The server may be busy or not responding.';
            }
            if (error.message.includes('404')) {
                return 'API endpoint not found. Please check the server configuration.';
            }
            if (error.message.includes('500')) {
                return 'Internal server error. Please check the server logs.';
            }
            return error.message;
        }

        return 'An unknown error occurred while communicating with the API.';
    }

    /**
     * Get endpoint status information
     */
    getEndpointInfo() {
        return {
            baseUrl: this.baseUrl,
            endpoints: this.endpoints,
            timeout: this.timeout,
            fullUrls: Object.fromEntries(
                Object.entries(this.endpoints).map(([key, endpoint]) => [
                    key, 
                    this.buildUrl(endpoint)
                ])
            )
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIService;
}
