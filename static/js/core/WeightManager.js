/**
 * WeightManager - Handles algorithm weights management
 * Single Responsibility: Managing algorithm weights (get, set, reset, validate)
 */
class WeightManager {
    constructor() {
        this.weights = null;
        this.defaultWeights = {
            "W_lifo": 10.0,
            "W_sim_l": -1.0,
            "W_sim_w": -1.0,
            "W_sim_h": 0.0,
            "W_leftover_l_ratio": -5.0,
            "W_leftover_w_ratio": -5.0,
            "W_packable_l": -0.5,
            "W_packable_w": -0.5
        };
        
        // Initialize with default weights
        this.resetToDefaults();
    }

    /**
     * Get current weights
     */
    getWeights() {
        return { ...this.weights }; // Return copy to prevent external modification
    }

    /**
     * Set weights from external data
     */
    setWeights(weights) {
        if (!weights || typeof weights !== 'object') {
            throw new Error('Invalid weights data');
        }

        // Validate weight keys
        const validKeys = Object.keys(this.defaultWeights);
        const providedKeys = Object.keys(weights);
        
        const invalidKeys = providedKeys.filter(key => !validKeys.includes(key));
        if (invalidKeys.length > 0) {
            console.warn(`Invalid weight keys found: ${invalidKeys.join(', ')}`);
        }

        // Set only valid weights
        this.weights = {};
        validKeys.forEach(key => {
            this.weights[key] = weights[key] !== undefined ? weights[key] : this.defaultWeights[key];
        });

        return {
            success: true,
            message: 'Weights updated successfully',
            invalidKeys: invalidKeys
        };
    }

    /**
     * Update a single weight
     */
    updateWeight(key, value) {
        if (!this.defaultWeights.hasOwnProperty(key)) {
            throw new Error(`Invalid weight key: ${key}`);
        }

        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
            throw new Error(`Invalid weight value: ${value}`);
        }

        this.weights[key] = numValue;
        return {
            success: true,
            message: `Weight ${key} updated to ${numValue}`,
            key: key,
            value: numValue
        };
    }

    /**
     * Reset to default weights
     */
    resetToDefaults() {
        this.weights = { ...this.defaultWeights };
        return {
            success: true,
            message: 'Weights reset to default values'
        };
    }

    /**
     * Get default weights
     */
    getDefaultWeights() {
        return { ...this.defaultWeights };
    }

    /**
     * Check if weights are set to defaults
     */
    isDefaultWeights() {
        if (!this.weights) return false;
        
        for (const key in this.defaultWeights) {
            if (this.weights[key] !== this.defaultWeights[key]) {
                return false;
            }
        }
        return true;
    }

    /**
     * Validate weights
     */
    validateWeights(weights = this.weights) {
        if (!weights || typeof weights !== 'object') {
            return {
                valid: false,
                errors: ['Weights must be an object']
            };
        }

        const errors = [];
        const requiredKeys = Object.keys(this.defaultWeights);
        
        // Check for missing keys
        const missingKeys = requiredKeys.filter(key => !(key in weights));
        if (missingKeys.length > 0) {
            errors.push(`Missing weight keys: ${missingKeys.join(', ')}`);
        }

        // Check for invalid values
        Object.entries(weights).forEach(([key, value]) => {
            if (requiredKeys.includes(key)) {
                if (typeof value !== 'number' || isNaN(value)) {
                    errors.push(`Invalid value for ${key}: must be a number`);
                }
            }
        });

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Export weights for API or file export
     */
    exportWeights() {
        return {
            algorithm_weights: { ...this.weights }
        };
    }

    /**
     * Import weights from external source
     */
    importWeights(data) {
        let weights = null;
        
        // Try different data structures
        if (data.algorithm_weights) {
            weights = data.algorithm_weights;
        } else if (data.weights) {
            weights = data.weights;
        } else if (data.parameters && data.parameters.weights) {
            weights = data.parameters.weights;
        } else if (data.parameters && data.parameters.algorithm_weights) {
            weights = data.parameters.algorithm_weights;
        } else {
            // Assume the data itself contains weights
            weights = data;
        }

        if (weights) {
            return this.setWeights(weights);
        }

        return {
            success: false,
            message: 'No valid weights found in imported data'
        };
    }

    /**
     * Get weights table data for UI display
     */
    getWeightsTableData() {
        return Object.entries(this.weights).map(([key, value]) => ({
            key: key,
            value: value,
            isDefault: value === this.defaultWeights[key]
        }));
    }

    /**
     * Apply random modifications to weights (for training purposes)
     */
    getRandomizedWeights(maxChange = 0.3, seed = null) {
        if (seed !== null) {
            // Simple seeded random function
            Math.seedrandom = function(seed) {
                let m = 0x80000000;
                let a = 1103515245;
                let c = 12345;
                let state = seed ? seed : Math.floor(Math.random() * (m - 1));
                return function() {
                    state = (a * state + c) % m;
                    return state / (m - 1);
                };
            };
            const seededRandom = Math.seedrandom(seed);
            
            const randomizedWeights = {};
            Object.entries(this.weights).forEach(([key, value]) => {
                const change = (seededRandom() - 0.5) * 2 * maxChange; // -maxChange to +maxChange
                randomizedWeights[key] = value * (1 + change);
            });
            return randomizedWeights;
        } else {
            const randomizedWeights = {};
            Object.entries(this.weights).forEach(([key, value]) => {
                const change = (Math.random() - 0.5) * 2 * maxChange; // -maxChange to +maxChange
                randomizedWeights[key] = value * (1 + change);
            });
            return randomizedWeights;
        }
    }

    /**
     * Compare two weight configurations
     */
    compareWeights(otherWeights) {
        const differences = [];
        const allKeys = new Set([...Object.keys(this.weights), ...Object.keys(otherWeights)]);
        
        allKeys.forEach(key => {
            const currentValue = this.weights[key];
            const otherValue = otherWeights[key];
            
            if (currentValue !== otherValue) {
                differences.push({
                    key: key,
                    current: currentValue,
                    other: otherValue,
                    difference: otherValue - currentValue
                });
            }
        });

        return {
            identical: differences.length === 0,
            differences: differences,
            summary: `${differences.length} differences found`
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WeightManager;
}
