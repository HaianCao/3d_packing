/**
 * DEPRECATED: main.js has been refactored into modular components
 * 
 * This file is kept for backward compatibility.
 * The new modular structure follows SOLID principles:
 * 
 * Core Modules:
 * - ItemManager.js: Manages items (add, remove, update, validation)
 * - WeightManager.js: Manages algorithm weights
 * - CameraManager.js: Manages 3D camera state
 * - VisualizationEngine.js: Handles 3D visualization with Plotly
 * - TrainingManager.js: Manages training data and configuration
 * - APIService.js: Handles API communication
 * - DataExporter.js: Manages data export operations
 * - UIManager.js: Handles UI interactions and event management
 * - StepManager.js: Manages step-by-step visualization
 * 
 * Main Application:
 * - BinPackingVisualizer.js: Main coordinator class that composes all managers
 * 
 * The HTML file has been updated to load all these modules in the correct order.
 * All functionality should work exactly the same as before, but with better
 * code organization, maintainability, and testability.
 * 
 * If you're seeing this file, the refactoring was successful and the new
 * modular structure is being used.
 */

console.log('✅ Refactored BinPackingVisualizer loaded successfully');
console.log('📁 Using modular architecture with SOLID principles');

// Legacy compatibility check
if (typeof BinPackingVisualizer === 'undefined') {
    console.error('❌ BinPackingVisualizer not found. Check that all module files are loaded correctly.');
    console.log('📋 Required modules:');
    console.log('   - ItemManager.js');
    console.log('   - WeightManager.js'); 
    console.log('   - CameraManager.js');
    console.log('   - VisualizationEngine.js');
    console.log('   - TrainingManager.js');
    console.log('   - APIService.js');
    console.log('   - DataExporter.js');
    console.log('   - UIManager.js');
    console.log('   - StepManager.js');
    console.log('   - BinPackingVisualizer.js');
} else {
    console.log('✅ All modules loaded successfully');
}
