document.addEventListener('DOMContentLoaded', function() {
    const ruleForm = document.getElementById('ruleForm');
    const actionType = document.getElementById('actionType');
    const actionValue = document.querySelector('.action-value');
    const addConditionBtn = document.getElementById('addCondition');
    const conditionsContainer = document.getElementById('conditionsContainer');
    const cancelRuleBtn = document.getElementById('cancelRule');
    const saveRuleBtn = document.getElementById('saveRule');

    // Cancel button goes back to rules list
    cancelRuleBtn.addEventListener('click', function() {
        window.location.href = '/automated-rules';
    });

    // Action type change handler
    actionType.addEventListener('change', function() {
        updateActionValueInput(this.value);
    });

    function updateActionValueInput(actionType) {
        switch(actionType) {
            case 'turn_off':
                actionValue.innerHTML = '';
                break;
            case 'adjust_budget':
                actionValue.innerHTML = `
                    <div class="adjustment-controls">
                        <select class="form-control">
                            <option value="increase">Increase by</option>
                            <option value="decrease">Decrease by</option>
                            <option value="set_to">Set to</option>
                        </select>
                        <input type="number" class="form-control" placeholder="Value">
                        <select class="form-control">
                            <option value="percentage">%</option>
                            <option value="amount">Fixed amount</option>
                        </select>
                    </div>
                `;
                break;
            case 'adjust_bid':
                actionValue.innerHTML = `
                    <div class="adjustment-controls">
                        <select class="form-control">
                            <option value="increase">Increase by</option>
                            <option value="decrease">Decrease by</option>
                        </select>
                        <input type="number" class="form-control" placeholder="Percentage">
                        <span>%</span>
                    </div>
                `;
                break;
        }
    }

    // Add condition handler
    addConditionBtn.addEventListener('click', function() {
        const newCondition = document.createElement('div');
        newCondition.className = 'condition-group';
        newCondition.innerHTML = `
            <div class="condition-row">
                <select class="form-control" name="metric">
                    <option value="spend">Spend</option>
                    <option value="cpc">Cost per Click</option>
                    <option value="ctr">CTR</option>
                    <option value="conversions">Conversions</option>
                </select>
                <select class="form-control" name="operator">
                    <option value="greater_than">Greater than</option>
                    <option value="less_than">Less than</option>
                    <option value="equals">Equals</option>
                </select>
                <input type="number" class="form-control" name="value">
                <button type="button" class="btn btn-icon remove-condition">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        conditionsContainer.appendChild(newCondition);
    });

    // Remove condition handler
    conditionsContainer.addEventListener('click', function(e) {
        if (e.target.closest('.remove-condition')) {
            e.target.closest('.condition-group').remove();
        }
    });

    // Save rule handler
    ruleForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = collectFormData();
        // Here you would typically send the data to your backend
        console.log('Rule data:', formData);
        
        // Show success message
        alert('Rule created successfully!');
        
        // Redirect back to rules list
        window.location.href = '/automated-rules';
    });

    function collectFormData() {
        // Collect all form data and return as object
        return {
            name: document.getElementById('ruleName').value,
            // Add all other fields
        };
    }

    // Initialize the form
    updateActionValueInput(actionType.value);

    // Check if we're creating from a template
    const urlParams = new URLSearchParams(window.location.search);
    const templateId = urlParams.get('template');
    
    if (templateId) {
        // Apply the selected template
        applyRuleTemplate(templateId);
    }
    
    // Function to apply rule templates
    function applyRuleTemplate(templateId) {
        // Define rule templates
        const templates = {
            'high-cpc': {
                name: 'High CPC Control',
                level: 'ad',
                conditions: [
                    { metric: 'cpc', operator: 'greater_than', value: 2 },
                    { metric: 'impressions', operator: 'greater_than', value: 1000 },
                    { metric: 'time_preset', operator: 'equal', value: 'LAST_3_DAYS' }
                ],
                action: { type: 'turn_off', value: null },
                schedule: { frequency: 'daily', startTime: '00:00', endTime: '23:59' }
            },
            'high-cpr': {
                name: 'High CPR Alert',
                level: 'campaign',
                conditions: [
                    { metric: 'cost_per_registration', operator: 'greater_than', value: 50 },
                    { metric: 'registrations', operator: 'greater_than', value: 10 },
                    { metric: 'time_preset', operator: 'equal', value: 'LAST_7_DAYS' }
                ],
                action: { type: 'turn_off', value: null },
                schedule: { frequency: 'daily', startTime: '00:00', endTime: '23:59' }
            },
            'high-cpa': {
                name: 'High CPA Control',
                level: 'adset',
                conditions: [
                    { metric: 'cost_per_action_type', operator: 'greater_than', value: 100 },
                    { metric: 'actions', operator: 'greater_than', value: 5 },
                    { metric: 'time_preset', operator: 'equal', value: 'LAST_7_DAYS' }
                ],
                action: { type: 'adjust_budget', value: { type: 'decrease', amount: 25, unit: 'percentage' } },
                schedule: { frequency: 'daily', startTime: '00:00', endTime: '23:59' }
            },
            'roas-budget-increase': {
                name: 'ROAS Budget Scaler',
                level: 'adset',
                conditions: [
                    { metric: 'website_purchase_roas', operator: 'greater_than', value: 2.0 },
                    { metric: 'time_preset', operator: 'equal', value: 'LAST_3_DAYS' },
                    { metric: 'attribution_window', operator: 'equal', value: '7D_CLICK' },
                    { metric: 'hours_since_creation', operator: 'greater_than', value: 72 }
                ],
                action: { type: 'adjust_budget', value: { type: 'increase', amount: 20, unit: 'percentage' } },
                schedule: { frequency: 'daily', startTime: '09:00', endTime: '17:00' }
            },
            'low-roas-alert': {
                name: 'Low ROAS Alert',
                level: 'campaign',
                conditions: [
                    { metric: 'website_purchase_roas', operator: 'less_than', value: 1.0 },
                    { metric: 'time_preset', operator: 'equal', value: 'LAST_7_DAYS' },
                    { metric: 'attribution_window', operator: 'equal', value: '28D_CLICK' },
                    { metric: 'hours_since_creation', operator: 'greater_than', value: 168 },
                    { metric: 'spent', operator: 'greater_than', value: 50 }
                ],
                action: { type: 'notification', value: null },
                schedule: { frequency: 'daily', startTime: '09:00', endTime: '17:00' }
            },
            'roas-bid-optimization': {
                name: 'ROAS Bid Optimizer',
                level: 'adset',
                conditions: [
                    { metric: 'website_purchase_roas', operator: 'not_in_range', value: [0.76, 0.84] },
                    { metric: 'time_preset', operator: 'equal', value: 'LAST_7_DAYS' },
                    { metric: 'attribution_window', operator: 'equal', value: '1D_VIEW_7D_CLICK' },
                    { metric: 'hours_since_creation', operator: 'greater_than', value: 48 }
                ],
                action: { type: 'adjust_bid', value: { target: 0.8, field: 'website_purchase_roas' } },
                schedule: { frequency: 'daily', startTime: '00:00', endTime: '23:59' }
            },
            'low-ctr-fix': {
                name: 'Low CTR Adjuster',
                level: 'ad',
                conditions: [
                    { metric: 'ctr', operator: 'less_than', value: 1.0 },
                    { metric: 'impressions', operator: 'greater_than', value: 3000 },
                    { metric: 'time_preset', operator: 'equal', value: 'LAST_3_DAYS' }
                ],
                action: { type: 'adjust_bid', value: { type: 'decrease', amount: 10, unit: 'percentage' } },
                schedule: { frequency: 'daily', startTime: '00:00', endTime: '23:59' }
            },
            'frequency-cap': {
                name: 'Frequency Cap',
                level: 'ad',
                conditions: [
                    { metric: 'frequency', operator: 'greater_than', value: 3 },
                    { metric: 'impressions', operator: 'greater_than', value: 5000 },
                    { metric: 'time_preset', operator: 'equal', value: 'LAST_7_DAYS' }
                ],
                action: { type: 'pause', value: null },
                schedule: { frequency: 'daily', startTime: '00:00', endTime: '23:59' }
            },
            'spend-milestone': {
                name: 'Spend Milestone Alert',
                level: 'campaign',
                conditions: [
                    { metric: 'spent', operator: 'greater_than', value: 1000 },
                    { metric: 'time_preset', operator: 'equal', value: 'LIFETIME' }
                ],
                action: { type: 'notification', value: null },
                schedule: { frequency: 'hourly', startTime: '00:00', endTime: '23:59' }
            }
        };
        
        // Get the selected template
        const template = templates[templateId];
        if (!template) return;
        
        // Apply template values to the form
        document.getElementById('ruleName').value = template.name;
        document.getElementById('ruleLevel').value = template.level;
        
        // Set conditions
        conditionsContainer.innerHTML = '';
        template.conditions.forEach(condition => {
            addCondition(condition.metric, condition.operator, condition.value);
        });
        
        // Set action
        document.getElementById('actionType').value = template.action.type;
        updateActionValueInput(template.action.type);
        
        // Set schedule
        document.getElementById('frequency').value = template.schedule.frequency;
        document.getElementById('startTime').value = template.schedule.startTime;
        document.getElementById('endTime').value = template.schedule.endTime;
    }
    
    // Helper function to add a condition
    function addCondition(metric, operator, value) {
        const newCondition = document.createElement('div');
        newCondition.className = 'condition-group';
        newCondition.innerHTML = `
            <div class="condition-row">
                <select class="form-control" name="metric">
                    <option value="spend" ${metric === 'spend' ? 'selected' : ''}>Spend</option>
                    <option value="cpc" ${metric === 'cpc' ? 'selected' : ''}>Cost per Click</option>
                    <option value="ctr" ${metric === 'ctr' ? 'selected' : ''}>CTR</option>
                    <option value="cost_per_registration" ${metric === 'cost_per_registration' ? 'selected' : ''}>Cost per Registration</option>
                    <option value="cost_per_action_type" ${metric === 'cost_per_action_type' ? 'selected' : ''}>Cost per Acquisition</option>
                    <option value="website_purchase_roas" ${metric === 'website_purchase_roas' ? 'selected' : ''}>ROAS</option>
                    <option value="impressions" ${metric === 'impressions' ? 'selected' : ''}>Impressions</option>
                    <option value="frequency" ${metric === 'frequency' ? 'selected' : ''}>Frequency</option>
                    <option value="registrations" ${metric === 'registrations' ? 'selected' : ''}>Registrations</option>
                    <option value="actions" ${metric === 'actions' ? 'selected' : ''}>Actions</option>
                    <option value="time_preset" ${metric === 'time_preset' ? 'selected' : ''}>Time Preset</option>
                    <option value="attribution_window" ${metric === 'attribution_window' ? 'selected' : ''}>Attribution Window</option>
                    <option value="hours_since_creation" ${metric === 'hours_since_creation' ? 'selected' : ''}>Hours Since Creation</option>
                </select>
                <select class="form-control" name="operator">
                    <option value="greater_than" ${operator === 'greater_than' ? 'selected' : ''}>Greater than</option>
                    <option value="less_than" ${operator === 'less_than' ? 'selected' : ''}>Less than</option>
                    <option value="equals" ${operator === 'equals' || operator === 'equal' ? 'selected' : ''}>Equals</option>
                    <option value="not_in_range" ${operator === 'not_in_range' ? 'selected' : ''}>Not in range</option>
                </select>
                <input type="text" class="form-control" name="value" value="${Array.isArray(value) ? value.join('-') : value}">
                <button type="button" class="btn btn-icon remove-condition">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        conditionsContainer.appendChild(newCondition);
    }
}); 