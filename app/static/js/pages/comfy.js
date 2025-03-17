document.addEventListener('DOMContentLoaded', function() {
    const comfyUI = document.getElementById('comfyUI');
    
    // Load the default template when page loads
    fetch('/api/comfy/load_template')
        .then(response => response.json())
        .then(template => {
            // Initialize ComfyUI with the template
            // TODO: Add ComfyUI initialization code here
            console.log('Loaded template:', template);
        })
        .catch(error => {
            console.error('Failed to load template:', error);
        });

    // Handle save workflow
    document.getElementById('saveWorkflow').addEventListener('click', function() {
        // TODO: Add save workflow functionality
        console.log('Save workflow clicked');
    });

    // Handle load workflow
    document.getElementById('loadWorkflow').addEventListener('click', function() {
        // TODO: Add load workflow functionality
        console.log('Load workflow clicked');
    });
}); 