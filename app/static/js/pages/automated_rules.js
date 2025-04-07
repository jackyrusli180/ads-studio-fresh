document.addEventListener('DOMContentLoaded', function() {
    const createRuleBtn = document.getElementById('createRule');
    const actionType = document.getElementById('actionType');
    const actionValue = document.querySelector('.action-value');
    const addConditionBtn = document.getElementById('addCondition');
    const conditionsContainer = document.getElementById('conditionsContainer');

    // Modified: Change the create rule button to redirect instead of showing modal
    createRuleBtn.addEventListener('click', () => {
        window.location.href = '/ad-management/automated-rules/create';
    });

    // Sample data for demonstration
    const sampleRules = [
        {
            id: 1,
            name: "High CPC Alert",
            status: "active",
            conditions: [
                { metric: "cpc", operator: "greater_than", value: 2.5 }
            ],
            action: { type: "turn_off", value: null },
            schedule: { frequency: "hourly", startTime: "09:00", endTime: "18:00" },
            lastRun: "2024-01-23T15:30:00"
        },
        {
            id: 2,
            name: "Low CTR Adjustment",
            status: "paused",
            conditions: [
                { metric: "ctr", operator: "less_than", value: 1.2 }
            ],
            action: { type: "adjust_bid", value: -20 },
            schedule: { frequency: "daily", startTime: "00:00", endTime: "23:59" },
            lastRun: "2024-01-23T00:00:00"
        }
    ];

    // Initialize rules table
    function initializeRulesTable() {
        const rulesList = document.getElementById('rulesList');
        rulesList.innerHTML = sampleRules.map(rule => `
            <tr>
                <td>
                    <div class="rule-name">${rule.name}</div>
                </td>
                <td>
                    <span class="rule-status status-${rule.status}">
                        ${rule.status.charAt(0).toUpperCase() + rule.status.slice(1)}
                    </span>
                </td>
                <td>
                    ${formatConditions(rule.conditions)}
                </td>
                <td>
                    ${formatAction(rule.action)}
                </td>
                <td>
                    ${formatSchedule(rule.schedule)}
                </td>
                <td>
                    ${formatDate(rule.lastRun)}
                </td>
                <td>
                    <div class="rule-actions">
                        <label class="toggle-switch">
                            <input type="checkbox" ${rule.status === 'active' ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                        <button class="btn btn-icon edit-rule" data-id="${rule.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-icon delete-rule" data-id="${rule.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Add event listeners to action buttons
        addRuleActionListeners();
    }

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
    saveRuleBtn.addEventListener('click', function(e) {
        e.preventDefault();
        const formData = collectFormData();
        // Here you would typically send the data to your backend
        console.log('Rule data:', formData);
        showToast('Rule saved successfully');
        ruleModal.style.display = 'none';
        // Refresh the rules table
        initializeRulesTable();
    });

    // Helper functions
    function formatConditions(conditions) {
        return conditions.map(c => 
            `${c.metric} ${formatOperator(c.operator)} ${c.value}`
        ).join(' AND ');
    }

    function formatOperator(operator) {
        const operators = {
            'greater_than': '>',
            'less_than': '<',
            'equals': '='
        };
        return operators[operator] || operator;
    }

    function formatAction(action) {
        if (action.type === 'turn_off') return 'Turn off ads';
        if (action.type === 'adjust_budget') return `Adjust budget by ${action.value}%`;
        if (action.type === 'adjust_bid') return `Adjust bid by ${action.value}%`;
        return action.type;
    }

    function formatSchedule(schedule) {
        return `${schedule.frequency} ${schedule.startTime} - ${schedule.endTime}`;
    }

    function formatDate(dateString) {
        return new Date(dateString).toLocaleString();
    }

    function collectFormData() {
        // Collect all form data and return as object
        // Implementation depends on your form structure
        return {
            name: document.getElementById('ruleName').value,
            // ... collect other fields
        };
    }

    function addRuleActionListeners() {
        // Add listeners for edit, delete, and toggle buttons
        document.querySelectorAll('.edit-rule').forEach(btn => {
            btn.addEventListener('click', function() {
                const ruleId = this.dataset.id;
                editRule(ruleId);
            });
        });

        document.querySelectorAll('.delete-rule').forEach(btn => {
            btn.addEventListener('click', function() {
                const ruleId = this.dataset.id;
                deleteRule(ruleId);
            });
        });

        document.querySelectorAll('.toggle-switch input').forEach(toggle => {
            toggle.addEventListener('change', function() {
                const ruleId = this.closest('tr').querySelector('.edit-rule').dataset.id;
                toggleRule(ruleId, this.checked);
            });
        });
    }

    // Remove the toggle behavior for template rules
    // Just keep the click handlers for template items
    const templateRulesContainer = document.getElementById('templateRulesContainer');
    
    if (templateRulesContainer) {
        console.log("Template container found, setting up item handlers");
        // Set up template item handlers
        document.querySelectorAll('.template-rule-item').forEach(item => {
            item.addEventListener('click', function() {
                const templateId = this.dataset.id;
                console.log("Selected template:", templateId);
                window.location.href = `/ad-management/automated-rules/create?template=${templateId}`;
            });
        });
    } else {
        console.error("Template rules container not found");
    }

    // Initialize the page
    initializeRulesTable();
    
    // Only call this if actionType exists (it's probably not on the main rules page)
    if (actionType) {
        updateActionValueInput(actionType.value);
    }
}); 