/**
 * Step Navigation Component
 * Manages the navigation between steps in the multi-step form
 */

/**
 * Initialize the Step Navigation component
 * @param {Object} elements - DOM elements object
 * @param {Object} state - Application state object
 * @param {Function} validateStepFn - Function to validate the current step
 * @param {Function} prepareStepFn - Function to prepare a step before displaying
 * @returns {Object} - Step Navigation methods
 */
export function initStepNavigation(elements, state, validateStepFn, prepareStepFn) {
    /**
     * Set up event listeners for navigation
     */
    function setupEventListeners() {
        elements.nextButtons.forEach(button => {
            button.addEventListener('click', handleNextStep);
        });
        
        elements.prevButtons.forEach(button => {
            button.addEventListener('click', handlePrevStep);
        });
    }
    
    /**
     * Handle click on Next button
     * @param {Event} event - The click event
     */
    function handleNextStep(event) {
        event.preventDefault();
        
        // Validate current step before proceeding
        if (!validateStepFn(state.currentStep)) {
            return;
        }
        
        // Move to next step
        navigateToStep(state.currentStep + 1);
    }
    
    /**
     * Handle click on Previous button
     * @param {Event} event - The click event
     */
    function handlePrevStep(event) {
        event.preventDefault();
        
        // Move to previous step if possible
        if (state.currentStep > 1) {
            navigateToStep(state.currentStep - 1);
        }
    }
    
    /**
     * Navigate to a specific step
     * @param {number} step - The step number to navigate to
     */
    function navigateToStep(step) {
        if (step < 1 || step > elements.formSteps.length) {
            return;
        }
        
        // Hide all steps
        elements.formSteps.forEach(stepElement => {
            stepElement.style.display = 'none';
        });
        
        // Update step indicators
        elements.stepIndicators.forEach((indicator, index) => {
            indicator.classList.remove('active');
            
            if (index + 1 < step) {
                indicator.classList.add('completed');
            } else if (index + 1 === step) {
                indicator.classList.add('active');
            } else {
                indicator.classList.remove('completed');
            }
        });
        
        // Show the target step
        elements.formSteps.forEach(stepElement => {
            if (parseInt(stepElement.dataset.step) === step) {
                stepElement.style.display = 'block';
            }
        });
        
        // Update current step in state
        state.currentStep = step;
        
        // Prepare the step
        if (prepareStepFn) {
            prepareStepFn(step);
        }
        
        // Scroll to top of the form
        elements.form.scrollIntoView({ behavior: 'smooth' });
    }
    
    return {
        setupEventListeners,
        navigateToStep
    };
} 