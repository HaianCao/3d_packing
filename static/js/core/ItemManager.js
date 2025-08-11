/**
 * ItemManager - Handles all item-related operations
 * Single Responsibility: Managing items (add, remove, update, validation)
 */
class ItemManager {
    constructor() {
        this.items = [];
        this.nextItemId = 1;
        this.originalInputData = null;
    }

    /**
     * Add a new item with validation
     */
    addItem(length, width, height, id, numberAxis, quantity) {
        // Validation
        if (!length || !width || !height || !id || !quantity) {
            throw new Error('All fields are required');
        }
        
        if (length < 1 || width < 1 || height < 1 || id < 1 || quantity < 1) {
            throw new Error('All values must be greater than 0');
        }
        
        // Check if request_id already exists
        if (this.items.some(item => item.request_id === id)) {
            throw new Error(`Item with ID ${id} already exists`);
        }
        
        // Add individual items for each quantity using nextItemId for unique IDs
        const addedItems = [];
        for (let i = 0; i < quantity; i++) {
            const item = {
                id: this.nextItemId++,
                length: length,
                width: width,
                height: height,
                request_id: id,
                number_axis: numberAxis
            };
            this.items.push(item);
            addedItems.push(item);
        }
        
        return {
            addedItems,
            message: quantity === 1 ? 
                `Item ${id} added successfully!` : 
                `${quantity} items added with request ID ${id} (expanded from 1 unique item)`
        };
    }

    /**
     * Remove item by ID
     */
    removeItem(id) {
        const initialLength = this.items.length;
        this.items = this.items.filter(item => item.id !== id);
        const removed = initialLength > this.items.length;
        
        if (removed) {
            return { success: true, message: `Item ${id} removed` };
        }
        return { success: false, message: `Item ${id} not found` };
    }

    /**
     * Remove all items with the same request_id
     */
    removeItemGroup(requestId) {
        const itemsToRemove = this.items.filter(item => item.request_id === requestId);
        const count = itemsToRemove.length;
        
        this.items = this.items.filter(item => item.request_id !== requestId);
        
        const message = count === 1 ? 
            `Item ${requestId} removed` : 
            `${count} items with request ID ${requestId} removed`;
        
        return { success: true, message, count };
    }

    /**
     * Clear all items
     */
    clearItems() {
        this.items = [];
        this.originalInputData = null;
        return { success: true, message: 'All items cleared' };
    }

    /**
     * Get all items
     */
    getItems() {
        return [...this.items]; // Return copy to prevent external modification
    }

    /**
     * Get items count
     */
    getItemsCount() {
        return this.items.length;
    }

    /**
     * Get next item ID
     */
    getNextItemId() {
        return this.nextItemId;
    }

    /**
     * Update next item ID
     */
    updateNextItemId(id) {
        this.nextItemId = Math.max(this.nextItemId, id);
    }

    /**
     * Set original input data
     */
    setOriginalInputData(data) {
        this.originalInputData = data;
    }

    /**
     * Get original input data
     */
    getOriginalInputData() {
        return this.originalInputData;
    }

    /**
     * Group items by request_id for display
     */
    getGroupedItems() {
        const groupedItems = {};
        this.items.forEach(item => {
            const requestId = item.request_id;
            if (!groupedItems[requestId]) {
                groupedItems[requestId] = {
                    request_id: requestId,
                    items: [],
                    count: 0,
                    dimensions: null
                };
            }
            groupedItems[requestId].items.push(item);
            groupedItems[requestId].count++;
            
            // Set dimensions from first item (they should all be the same for a request_id)
            if (!groupedItems[requestId].dimensions) {
                groupedItems[requestId].dimensions = {
                    length: item.length,
                    width: item.width,
                    height: item.height,
                    number_axis: item.number_axis
                };
            }
        });
        return groupedItems;
    }

    /**
     * Load items from JSON data
     */
    loadFromJson(jsonData) {
        // Clear existing items
        this.clearItems();

        // Set original input data
        this.setOriginalInputData(jsonData);

        // Validate required fields
        if (!jsonData.items || !Array.isArray(jsonData.items)) {
            throw new Error('Invalid JSON: items array is required');
        }

        // Process items
        let itemsAdded = 0;
        jsonData.items.forEach(itemData => {
            // Support both new format (length, width, height) and old format (L, W, H)
            const length = itemData.length || itemData.L;
            const width = itemData.width || itemData.W;
            const height = itemData.height || itemData.H;
            const requestId = itemData.request_id !== undefined ? itemData.request_id : itemData.id;
            
            // Validate item data
            if (!length || !width || !height || requestId === undefined) {
                throw new Error('Invalid item data: length/L, width/W, height/H, and request_id are required');
            }

            const quantity = itemData.quantity || 1;
            // Support both number_axis and num_axis
            const numberAxis = itemData.number_axis || itemData.num_axis || 2;

            // Add items
            for (let i = 0; i < quantity; i++) {
                const item = {
                    id: this.nextItemId++,
                    length: length,
                    width: width,
                    height: height,
                    request_id: requestId,
                    number_axis: numberAxis
                };
                this.items.push(item);
                itemsAdded++;
            }
        });

        return {
            success: true,
            itemsAdded,
            totalItems: this.items.length,
            message: `Successfully loaded ${itemsAdded} items from JSON`
        };
    }

    /**
     * Export items to JSON format
     */
    exportToJson() {
        const groupedItems = this.getGroupedItems();
        
        const exportData = {
            items: Object.values(groupedItems).map(group => ({
                length: group.dimensions.length,
                width: group.dimensions.width,
                height: group.dimensions.height,
                request_id: group.request_id,
                quantity: group.count,
                number_axis: group.dimensions.number_axis
            }))
        };

        return exportData;
    }

    /**
     * Validate item dimensions against bin size
     */
    validateItemsAgainstBin(binSize) {
        const oversizedItems = this.items.filter(item => 
            item.length > binSize.length || 
            item.width > binSize.width || 
            item.height > binSize.height
        );

        return {
            valid: oversizedItems.length === 0,
            oversizedItems: oversizedItems,
            message: oversizedItems.length > 0 ? 
                `${oversizedItems.length} items are larger than the bin size` : 
                'All items fit within bin dimensions'
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ItemManager;
}
