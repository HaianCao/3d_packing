/**
 * StepManager - Handles step-by-step visualization controls
 * Single Responsibility: Managing step-by-step packing visualization and animation
 */
class StepManager {
    constructor(visualizationEngine) {
        this.visualizationEngine = visualizationEngine;
        this.packingSteps = [];
        this.currentStepIndex = -1;
        this.isPlaying = false;
        this.playInterval = null;
        this.stepSpeed = 1000; // ms
        this.stepControlsVisible = false;
    }

    /**
     * Initialize step controls
     */
    initializeStepControls() {
        this.setupStepEventListeners();
        this.updateStepControls();
    }

    /**
     * Set packing steps data
     */
    setPackingSteps(steps) {
        this.packingSteps = Array.isArray(steps) ? [...steps] : [];
        this.currentStepIndex = -1;
        this.pauseAnimation();
        this.updateStepControls();
        
        if (this.packingSteps.length > 0) {
            this.showStepControlPanel();
        } else {
            this.hideStepControlPanel();
        }
    }

    /**
     * Get current step data
     */
    getCurrentStep() {
        if (this.currentStepIndex >= 0 && this.currentStepIndex < this.packingSteps.length) {
            return this.packingSteps[this.currentStepIndex];
        }
        return null;
    }

    /**
     * Get total steps count
     */
    getTotalSteps() {
        return this.packingSteps.length;
    }

    /**
     * Go to previous step
     */
    previousStep() {
        if (this.currentStepIndex > 0) {
            this.currentStepIndex--;
            this.showStepVisualization(this.currentStepIndex);
            this.updateStepControls();
            return true;
        }
        return false;
    }

    /**
     * Go to next step
     */
    nextStep() {
        if (this.currentStepIndex < this.packingSteps.length - 1) {
            this.currentStepIndex++;
            this.showStepVisualization(this.currentStepIndex);
            this.updateStepControls();
            return true;
        }
        return false;
    }

    /**
     * Go to specific step
     */
    goToStep(stepIndex) {
        if (stepIndex >= 0 && stepIndex < this.packingSteps.length) {
            this.currentStepIndex = stepIndex;
            this.showStepVisualization(this.currentStepIndex);
            this.updateStepControls();
            return true;
        }
        return false;
    }

    /**
     * Toggle play/pause animation
     */
    togglePlayPause() {
        if (this.isPlaying) {
            this.pauseAnimation();
        } else {
            this.playAnimation();
        }
    }

    /**
     * Start playing animation
     */
    playAnimation() {
        if (this.packingSteps.length === 0) return;
        
        this.isPlaying = true;
        this.updatePlayPauseButton();
        
        // If at the end, restart from beginning
        if (this.currentStepIndex >= this.packingSteps.length - 1) {
            this.currentStepIndex = -1;
        }
        
        this.playInterval = setInterval(() => {
            if (this.nextStep()) {
                // Continue playing
            } else {
                // Reached the end, stop playing
                this.pauseAnimation();
            }
        }, this.stepSpeed);
    }

    /**
     * Pause animation
     */
    pauseAnimation() {
        this.isPlaying = false;
        if (this.playInterval) {
            clearInterval(this.playInterval);
            this.playInterval = null;
        }
        this.updatePlayPauseButton();
    }

    /**
     * Update step speed
     */
    updateStepSpeed() {
        const speedInput = document.getElementById('stepSpeed');
        if (speedInput) {
            this.stepSpeed = parseInt(speedInput.value) || 1000;
            
            // If currently playing, restart with new speed
            if (this.isPlaying) {
                this.pauseAnimation();
                this.playAnimation();
            }
        }
    }

    /**
     * Show step visualization
     */
    showStepVisualization(stepIndex) {
        if (stepIndex < 0 || stepIndex >= this.packingSteps.length) return;
        
        const stepData = this.packingSteps[stepIndex];
        this.visualizationEngine.visualizeStep(stepData, stepIndex, this.packingSteps.length);
    }

    /**
     * Update step controls UI
     */
    updateStepControls() {
        const prevBtn = document.getElementById('prevStep');
        const nextBtn = document.getElementById('nextStep');
        const stepInfo = document.getElementById('stepInfo');
        
        if (prevBtn) {
            prevBtn.disabled = this.currentStepIndex <= 0;
        }
        
        if (nextBtn) {
            nextBtn.disabled = this.currentStepIndex >= this.packingSteps.length - 1;
        }
        
        if (stepInfo) {
            const currentStep = this.currentStepIndex + 1;
            const totalSteps = this.packingSteps.length;
            stepInfo.textContent = totalSteps > 0 ? 
                `Step ${Math.max(1, currentStep)} of ${totalSteps}` : 
                'No steps available';
        }

        this.updatePlayPauseButton();
    }

    /**
     * Update play/pause button
     */
    updatePlayPauseButton() {
        const playPauseBtn = document.getElementById('playPause');
        if (!playPauseBtn) return;
        
        const icon = playPauseBtn.querySelector('i');
        
        if (this.isPlaying) {
            playPauseBtn.innerHTML = '<i class="fas fa-pause me-1"></i> Pause';
            playPauseBtn.className = 'btn btn-warning btn-sm';
        } else {
            playPauseBtn.innerHTML = '<i class="fas fa-play me-1"></i> Play';
            playPauseBtn.className = 'btn btn-success btn-sm';
        }
        
        playPauseBtn.disabled = this.packingSteps.length === 0;
    }

    /**
     * Show step control panel
     */
    showStepControlPanel() {
        const panel = document.getElementById('stepControlPanel');
        const showBtn = document.getElementById('showStepControlsBtn');
        
        if (panel) {
            panel.style.display = 'block';
            this.stepControlsVisible = true;
        }
        
        if (showBtn) {
            showBtn.style.display = 'none';
        }
    }

    /**
     * Hide step control panel
     */
    hideStepControlPanel() {
        const panel = document.getElementById('stepControlPanel');
        const showBtn = document.getElementById('showStepControlsBtn');
        
        if (panel) {
            panel.style.display = 'none';
            this.stepControlsVisible = false;
        }
        
        if (showBtn && this.packingSteps.length > 0) {
            showBtn.style.display = 'block';
        }
    }

    /**
     * Toggle step control panel visibility
     */
    toggleStepControlPanel() {
        if (this.stepControlsVisible) {
            this.collapseStepPanel();
        } else {
            this.expandStepPanel();
        }
    }

    /**
     * Expand step control panel
     */
    expandStepPanel() {
        this.showStepControlPanel();
        const toggleBtn = document.getElementById('toggleStepPanel');
        if (toggleBtn) {
            const icon = toggleBtn.querySelector('i');
            if (icon) {
                icon.className = 'fas fa-chevron-down';
            }
        }
    }

    /**
     * Collapse step control panel
     */
    collapseStepPanel() {
        this.hideStepControlPanel();
        const toggleBtn = document.getElementById('toggleStepPanel');
        if (toggleBtn) {
            const icon = toggleBtn.querySelector('i');
            if (icon) {
                icon.className = 'fas fa-chevron-up';
            }
        }
    }

    /**
     * Setup event listeners for step controls
     */
    setupStepEventListeners() {
        // Previous step button
        const prevBtn = document.getElementById('prevStep');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.previousStep());
        }

        // Next step button
        const nextBtn = document.getElementById('nextStep');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextStep());
        }

        // Play/pause button
        const playPauseBtn = document.getElementById('playPause');
        if (playPauseBtn) {
            playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        }

        // Step speed slider
        const speedSlider = document.getElementById('stepSpeed');
        if (speedSlider) {
            speedSlider.addEventListener('input', () => this.updateStepSpeed());
        }

        // Toggle panel button
        const toggleBtn = document.getElementById('toggleStepPanel');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleStepControlPanel());
        }

        // Show controls button
        const showBtn = document.getElementById('showStepControlsBtn');
        if (showBtn) {
            showBtn.addEventListener('click', () => this.showStepControlPanel());
        }
    }

    /**
     * Reset step manager state
     */
    reset() {
        this.pauseAnimation();
        this.packingSteps = [];
        this.currentStepIndex = -1;
        this.hideStepControlPanel();
        this.updateStepControls();
    }

    /**
     * Get step statistics
     */
    getStepStatistics() {
        if (this.packingSteps.length === 0) {
            return {
                totalSteps: 0,
                currentStep: 0,
                progress: 0,
                itemsPlaced: 0
            };
        }

        const currentStep = Math.max(0, this.currentStepIndex);
        const itemsPlaced = currentStep >= 0 && currentStep < this.packingSteps.length ? 
            this.packingSteps[currentStep].length : 0;

        return {
            totalSteps: this.packingSteps.length,
            currentStep: currentStep + 1,
            progress: ((currentStep + 1) / this.packingSteps.length) * 100,
            itemsPlaced: itemsPlaced
        };
    }

    /**
     * Export step data
     */
    exportStepData() {
        return {
            steps: [...this.packingSteps],
            currentStep: this.currentStepIndex,
            totalSteps: this.packingSteps.length,
            stepSpeed: this.stepSpeed,
            isPlaying: this.isPlaying
        };
    }

    /**
     * Import step data
     */
    importStepData(stepData) {
        if (!stepData || !Array.isArray(stepData.steps)) {
            throw new Error('Invalid step data format');
        }

        this.setPackingSteps(stepData.steps);
        
        if (stepData.stepSpeed) {
            this.stepSpeed = stepData.stepSpeed;
            const speedInput = document.getElementById('stepSpeed');
            if (speedInput) {
                speedInput.value = this.stepSpeed;
            }
        }

        if (stepData.currentStep !== undefined && stepData.currentStep >= 0) {
            this.goToStep(stepData.currentStep);
        }

        return {
            success: true,
            message: `Imported ${this.packingSteps.length} packing steps`
        };
    }

    /**
     * Jump to first step
     */
    goToFirstStep() {
        return this.goToStep(0);
    }

    /**
     * Jump to last step
     */
    goToLastStep() {
        return this.goToStep(this.packingSteps.length - 1);
    }

    /**
     * Check if at first step
     */
    isAtFirstStep() {
        return this.currentStepIndex === 0;
    }

    /**
     * Check if at last step
     */
    isAtLastStep() {
        return this.currentStepIndex === this.packingSteps.length - 1;
    }

    /**
     * Clean up resources
     */
    destroy() {
        this.pauseAnimation();
        this.reset();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StepManager;
}
