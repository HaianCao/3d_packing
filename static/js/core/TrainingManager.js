/**
 * TrainingManager - Handles training data and configuration
 * Single Responsibility: Managing training data, configuration, and fake data generation
 */
class TrainingManager {
    constructor() {
        this.trainingData = null;
        this.trainingConfig = {
            num_steps: 3,
            max_change: 0.3,
            evaluation_metric: 'efficiency'
        };
    }

    /**
     * Get training data
     */
    getTrainingData() {
        return this.trainingData ? [...this.trainingData] : null;
    }

    /**
     * Get training configuration
     */
    getTrainingConfig() {
        return { ...this.trainingConfig };
    }

    /**
     * Update training configuration
     */
    updateTrainingConfig(config) {
        const validMetrics = ['efficiency', 'utilization', 'cost'];
        
        if (config.num_steps !== undefined) {
            const steps = parseInt(config.num_steps);
            if (steps < 1 || steps > 20) {
                throw new Error('Training steps must be between 1 and 20');
            }
            this.trainingConfig.num_steps = steps;
        }

        if (config.max_change !== undefined) {
            const change = parseFloat(config.max_change);
            if (change < 0.1 || change > 1.0) {
                throw new Error('Max change must be between 0.1 and 1.0');
            }
            this.trainingConfig.max_change = change;
        }

        if (config.evaluation_metric !== undefined) {
            if (!validMetrics.includes(config.evaluation_metric)) {
                throw new Error(`Evaluation metric must be one of: ${validMetrics.join(', ')}`);
            }
            this.trainingConfig.evaluation_metric = config.evaluation_metric;
        }

        return {
            success: true,
            message: 'Training configuration updated',
            config: this.getTrainingConfig()
        };
    }

    /**
     * Load training data from JSON
     */
    loadTrainingData(jsonData) {
        // Validate training data structure
        const validation = this.validateTrainingData(jsonData);
        if (!validation.valid) {
            throw new Error(`Invalid training data: ${validation.errors.join(', ')}`);
        }

        // Extract training scenarios
        let scenarios = [];
        
        if (jsonData.training_data && Array.isArray(jsonData.training_data)) {
            scenarios = jsonData.training_data;
        } else if (Array.isArray(jsonData)) {
            scenarios = jsonData;
        } else {
            throw new Error('Training data must contain an array of scenarios');
        }

        this.trainingData = scenarios;

        // Update training config if provided
        if (jsonData.training_config) {
            this.updateTrainingConfig(jsonData.training_config);
        }

        return {
            success: true,
            scenarioCount: scenarios.length,
            message: `Successfully loaded ${scenarios.length} training scenarios`
        };
    }

    /**
     * Validate training data structure
     */
    validateTrainingData(data) {
        const errors = [];

        if (!data || typeof data !== 'object') {
            return { valid: false, errors: ['Training data must be an object or array'] };
        }

        let scenarios = [];
        if (data.training_data && Array.isArray(data.training_data)) {
            scenarios = data.training_data;
        } else if (Array.isArray(data)) {
            scenarios = data;
        } else {
            return { valid: false, errors: ['No valid training scenarios found'] };
        }

        // Validate each scenario
        scenarios.forEach((scenario, index) => {
            if (!scenario.items || !Array.isArray(scenario.items)) {
                errors.push(`Scenario ${index}: items array is required`);
            }

            if (!scenario.bin_size || typeof scenario.bin_size !== 'object') {
                errors.push(`Scenario ${index}: bin_size object is required`);
            } else {
                const { length, width, height } = scenario.bin_size;
                if (!length || !width || !height) {
                    errors.push(`Scenario ${index}: bin_size must have length, width, and height`);
                }
            }

            // Validate items structure
            if (scenario.items && Array.isArray(scenario.items)) {
                scenario.items.forEach((item, itemIndex) => {
                    if (!item.length || !item.width || !item.height) {
                        errors.push(`Scenario ${index}, Item ${itemIndex}: length, width, and height are required`);
                    }
                    if (!item.request_id) {
                        errors.push(`Scenario ${index}, Item ${itemIndex}: request_id is required`);
                    }
                });
            }
        });

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Generate training data example
     */
    generateTrainingExample() {
        return {
            training_data: [
                {
                    items: [
                        {
                            length: 3,
                            width: 2,
                            height: 1,
                            request_id: 1,
                            quantity: 2,
                            number_axis: 2
                        },
                        {
                            length: 2,
                            width: 2,
                            height: 2,
                            request_id: 2,
                            quantity: 1,
                            number_axis: 6
                        }
                    ],
                    bin_size: {
                        length: 10,
                        width: 8,
                        height: 6
                    }
                },
                {
                    items: [
                        {
                            length: 4,
                            width: 3,
                            height: 2,
                            request_id: 1,
                            quantity: 1,
                            number_axis: 2
                        },
                        {
                            length: 1,
                            width: 1,
                            height: 1,
                            request_id: 2,
                            quantity: 5,
                            number_axis: 6
                        }
                    ],
                    bin_size: {
                        length: 10,
                        width: 8,
                        height: 6
                    }
                }
            ],
            training_config: {
                num_steps: 3,
                max_change: 0.3,
                evaluation_metric: "efficiency"
            }
        };
    }

    /**
     * Generate fake training data parameters
     */
    generateFakeDataParams(scenarios, itemsPerScenario, uniqueTypes, seed, binSize, includeWeights = false) {
        const params = {
            scenarios: parseInt(scenarios) || 3,
            numItems: parseInt(itemsPerScenario) || 10,
            nUnique: parseInt(uniqueTypes) || 3,
            binSize: binSize,
            includeWeights: includeWeights
        };

        if (seed && !isNaN(parseInt(seed))) {
            params.seed = parseInt(seed);
        }

        // Validate parameters
        if (params.scenarios < 1 || params.scenarios > 50) {
            throw new Error('Number of scenarios must be between 1 and 50');
        }

        if (params.numItems < 1 || params.numItems > 100) {
            throw new Error('Items per scenario must be between 1 and 100');
        }

        if (params.nUnique < 1 || params.nUnique > 20) {
            throw new Error('Unique item types must be between 1 and 20');
        }

        if (params.nUnique > params.numItems) {
            throw new Error('Unique item types cannot exceed total items per scenario');
        }

        return params;
    }

    /**
     * Process fake data API response
     */
    processFakeDataResponse(apiResponse) {
        if (!apiResponse || !apiResponse.success) {
            throw new Error('Invalid API response for fake data generation');
        }

        const data = apiResponse.data;
        
        // The API returns training data in the expected format
        if (data.training_data) {
            this.trainingData = data.training_data;
            
            // Update training config if provided
            if (data.training_config) {
                this.updateTrainingConfig(data.training_config);
            }

            return {
                success: true,
                scenarioCount: data.training_data.length,
                message: `Successfully generated ${data.training_data.length} fake training scenarios`,
                data: data
            };
        } else {
            throw new Error('API response does not contain training_data');
        }
    }

    /**
     * Export training data
     */
    exportTrainingData() {
        if (!this.trainingData) {
            throw new Error('No training data to export');
        }

        return {
            training_data: [...this.trainingData],
            training_config: { ...this.trainingConfig }
        };
    }

    /**
     * Clear training data
     */
    clearTrainingData() {
        this.trainingData = null;
        return {
            success: true,
            message: 'Training data cleared'
        };
    }

    /**
     * Get training data statistics
     */
    getTrainingStats() {
        if (!this.trainingData) {
            return {
                scenarioCount: 0,
                totalItems: 0,
                averageItemsPerScenario: 0,
                uniqueRequestIds: 0
            };
        }

        const totalItems = this.trainingData.reduce((sum, scenario) => sum + scenario.items.length, 0);
        const averageItemsPerScenario = totalItems / this.trainingData.length;
        
        const allRequestIds = new Set();
        this.trainingData.forEach(scenario => {
            scenario.items.forEach(item => {
                allRequestIds.add(item.request_id);
            });
        });

        return {
            scenarioCount: this.trainingData.length,
            totalItems: totalItems,
            averageItemsPerScenario: Math.round(averageItemsPerScenario * 10) / 10,
            uniqueRequestIds: allRequestIds.size
        };
    }

    /**
     * Validate training scenario for API
     */
    validateScenarioForAPI(scenario) {
        const errors = [];

        if (!scenario.items || !Array.isArray(scenario.items) || scenario.items.length === 0) {
            errors.push('Scenario must have at least one item');
        }

        if (!scenario.bin_size) {
            errors.push('Scenario must have bin_size');
        } else {
            const { length, width, height } = scenario.bin_size;
            if (!length || !width || !height || length <= 0 || width <= 0 || height <= 0) {
                errors.push('bin_size must have positive length, width, and height');
            }
        }

        if (scenario.items) {
            scenario.items.forEach((item, index) => {
                if (!item.length || !item.width || !item.height || 
                    item.length <= 0 || item.width <= 0 || item.height <= 0) {
                    errors.push(`Item ${index} must have positive dimensions`);
                }
                if (!item.request_id) {
                    errors.push(`Item ${index} must have request_id`);
                }
            });
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Prepare training data for API
     */
    prepareForAPI() {
        if (!this.trainingData) {
            throw new Error('No training data available');
        }

        // Validate all scenarios
        for (let i = 0; i < this.trainingData.length; i++) {
            const validation = this.validateScenarioForAPI(this.trainingData[i]);
            if (!validation.valid) {
                throw new Error(`Scenario ${i}: ${validation.errors.join(', ')}`);
            }
        }

        return {
            training_data: [...this.trainingData],
            training_config: { ...this.trainingConfig }
        };
    }

    /**
     * Get training data count
     */
    getTrainingDataCount() {
        return this.trainingData ? this.trainingData.length : 0;
    }

    /**
     * Check if training data is loaded
     */
    hasTrainingData() {
        return this.trainingData && this.trainingData.length > 0;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TrainingManager;
}
