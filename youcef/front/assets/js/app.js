// GPLAST Factory Management - JavaScript Application

// Configuration
const API_BASE_URL = 'http://127.0.0.1:5000/api';
const ADMIN_PIN = '1234'; // This should match your backend config
const REFRESH_INTERVAL = 30000; // 30 seconds

// Global State
let workers = [];
let payrollData = null;
let refreshTimer = null;

// Utility Functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('fr-DZ', {
        style: 'currency',
        currency: 'DZD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function formatTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatHours(hours) {
    if (hours === null || hours === undefined) return '-';
    return `${hours.toFixed(1)}h`;
}

function getPaymentStatusText(status) {
    const statusMap = {
        'completed_no_advances': 'Completed',
        'completed_with_advances': 'Completed with Advances',
        'incomplete_no_advances': 'In Progress',
        'incomplete_with_advances': 'In Progress with Advances',
        'debt_exceeds_earnings': 'Debt Exceeds Earnings'
    };
    return statusMap[status] || status;
}

function getPaymentStatusClass(status) {
    const classMap = {
        'completed_no_advances': 'status-completed',
        'completed_with_advances': 'status-completed',
        'incomplete_no_advances': 'status-incomplete',
        'incomplete_with_advances': 'status-incomplete',
        'debt_exceeds_earnings': 'status-debt'
    };
    return classMap[status] || 'bg-secondary';
}

// API Functions
async function apiCall(endpoint, options = {}) {
    const fullUrl = `${API_BASE_URL}${endpoint}`;
    console.log('Making API call to:', fullUrl);
    
    try {
        const response = await fetch(fullUrl, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        console.log('Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('API response:', data);
        return data;
    } catch (error) {
        console.error(`API call failed for ${endpoint}:`, error);
        showAlert('API connection failed. Please check the server.', 'danger');
        throw error;
    }
}

async function testAPIConnection() {
    console.log('Testing API connection to:', API_BASE_URL + '/test');
    try {
        const response = await apiCall('/test');
        console.log('API connection successful:', response);
        updateServerStatus('Connected', 'success');
        updateSystemStatus('apiStatus', 'Connected', 'success');
        updateSystemStatus('dbStatus', 'Connected', 'success');
        return true;
    } catch (error) {
        console.error('API connection failed:', error);
        updateServerStatus('Disconnected', 'danger');
        updateSystemStatus('apiStatus', 'Disconnected', 'danger');
        updateSystemStatus('dbStatus', 'Unknown', 'secondary');
        return false;
    }
}

async function fetchWorkers() {
    try {
        workers = await apiCall('/workers');
        return workers;
    } catch (error) {
        workers = [];
        return [];
    }
}

async function fetchPayrollSummary() {
    try {
        payrollData = await apiCall('/payments/summary');
        return payrollData;
    } catch (error) {
        payrollData = null;
        return null;
    }
}

async function fetchRecentSessions() {
    try {
        return await apiCall('/sessions');
    } catch (error) {
        return [];
    }
}

async function addWorkerAPI(workerData, adminPin) {
    console.log('addWorkerAPI called with:', { workerData, adminPin });
    console.log('Making API call to POST /workers');
    
    const requestOptions = {
        method: 'POST',
        headers: {
            'X-Admin-Pin': adminPin
        },
        body: JSON.stringify(workerData)
    };
    
    console.log('Request options:', requestOptions);
    
    try {
        const result = await apiCall('/workers', requestOptions);
        console.log('addWorkerAPI result:', result);
        return result;
    } catch (error) {
        console.error('addWorkerAPI error:', error);
        throw error;
    }
}

async function updateWorker(workerId, workerData, adminPin) {
    return await apiCall(`/workers/${workerId}`, {
        method: 'PUT',
        headers: {
            'X-Admin-Pin': adminPin
        },
        body: JSON.stringify(workerData)
    });
}

async function giveAdvance(workerId, amount, reason, adminPin) {
    return await apiCall('/advances', {
        method: 'POST',
        headers: {
            'X-Admin-Pin': adminPin
        },
        body: JSON.stringify({
            worker_id: workerId,
            amount: amount,
            reason: reason
        })
    });
}

// UI Update Functions
function updateServerStatus(status, type) {
    const statusEl = document.getElementById('serverStatus');
    if (statusEl) {
        statusEl.textContent = status;
        statusEl.className = `badge bg-${type}`;
    }
}

function updateSystemStatus(elementId, status, type) {
    const statusEl = document.getElementById(elementId);
    const badgeEl = document.getElementById(elementId + 'Badge');
    
    if (statusEl) statusEl.textContent = status;
    if (badgeEl) badgeEl.className = `badge bg-${type}`;
}

function updateCurrentDate() {
    const dateEl = document.getElementById('currentDate');
    if (dateEl) {
        const now = new Date();
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };
        dateEl.textContent = now.toLocaleDateString('fr-FR', options);
    }
}

function updateLastUpdateTime() {
    const lastUpdateEl = document.getElementById('lastUpdate');
    if (lastUpdateEl) {
        lastUpdateEl.textContent = new Date().toLocaleTimeString('fr-FR');
    }
}

function showAlert(message, type = 'info', duration = 5000) {
    // Create alert element
    const alertEl = document.createElement('div');
    alertEl.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertEl.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertEl.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(alertEl);

    // Auto-remove after duration
    setTimeout(() => {
        if (alertEl.parentNode) {
            alertEl.remove();
        }
    }, duration);
}

// Dashboard Functions
async function initializeDashboard() {
    console.log('Initializing dashboard...');
    updateCurrentDate();
    await testAPIConnection();
    await loadDashboardData();
    startAutoRefresh();
    console.log('Dashboard initialized successfully');
}

async function loadDashboardData() {
    try {
        // Load all data
        const [workersData, payrollSummary, recentSessions] = await Promise.all([
            fetchWorkers(),
            fetchPayrollSummary(),
            fetchRecentSessions()
        ]);

        // Update metrics
        updateDashboardMetrics(workersData, payrollSummary);
        
        // Update recent sessions
        updateRecentSessions(recentSessions);
        
        updateLastUpdateTime();
    } catch (error) {
        console.error('Failed to load dashboard data:', error);
    }
}

function updateDashboardMetrics(workers, payrollData) {
    // Total Workers
    const totalWorkersEl = document.getElementById('totalWorkers');
    if (totalWorkersEl) {
        totalWorkersEl.textContent = workers.length;
    }

    if (payrollData) {
        // Total Earned Payroll
        const totalPayrollEl = document.getElementById('totalEarnedPayroll');
        if (totalPayrollEl) {
            totalPayrollEl.textContent = formatCurrency(payrollData.totals.total_earned_payroll);
        }

        // Total Advances
        const totalAdvancesEl = document.getElementById('totalAdvances');
        if (totalAdvancesEl) {
            totalAdvancesEl.textContent = formatCurrency(payrollData.totals.total_advances_given);
        }

        // Final Payments
        const finalPaymentsEl = document.getElementById('totalFinalPayments');
        if (finalPaymentsEl) {
            finalPaymentsEl.textContent = formatCurrency(payrollData.totals.total_final_payments);
        }
    }
}

function updateRecentSessions(sessions) {
    const tbody = document.getElementById('recentSessions');
    if (!tbody) return;

    if (sessions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No recent sessions</td></tr>';
        return;
    }

    tbody.innerHTML = sessions.slice(0, 10).map(session => `
        <tr>
            <td>
                <strong>${session.worker_name || 'Unknown'}</strong>
            </td>
            <td>${formatDate(session.date)}</td>
            <td>${formatTime(session.clock_in)}</td>
            <td>${formatTime(session.clock_out)}</td>
            <td>
                <span class="badge bg-primary">
                    ${formatHours(session.hours_worked)}
                </span>
            </td>
        </tr>
    `).join('');
}

// Workers Management Functions
async function loadWorkersTable() {
    const workers = await fetchWorkers();
    const tbody = document.getElementById('workersTableBody');
    
    if (!tbody) return;

    if (workers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No workers found</td></tr>';
        return;
    }

    tbody.innerHTML = workers.map(worker => `
        <tr>
            <td>
                <input class="form-check-input" type="checkbox" value="${worker.id}">
            </td>
            <td>
                <span class="badge bg-primary">${worker.code}</span>
            </td>
            <td>
                <strong>${worker.name}</strong>
            </td>
            <td>${worker.phone || '-'}</td>
            <td>${formatCurrency(worker.salary)}</td>
            <td>${formatDate(worker.hire_date)}</td>
            <td>
                <div class="dropdown">
                    <button class="btn btn-sm btn-outline-primary dropdown-toggle" type="button" data-bs-toggle="dropdown">
                        Action
                    </button>
                    <ul class="dropdown-menu">
                        <li>
                            <a class="dropdown-item" href="#" onclick="editWorker(${worker.id})">
                                <i class="bi bi-pencil me-2"></i>Edit Info
                            </a>
                        </li>
                        <li>
                            <a class="dropdown-item" href="#" onclick="giveAdvanceModal(${worker.id}, '${worker.name}')">
                                <i class="bi bi-cash me-2"></i>Give Advance
                            </a>
                        </li>
                        <li>
                            <a class="dropdown-item" href="#" onclick="giveSalaryModal(${worker.id}, '${worker.name}')">
                                <i class="bi bi-wallet2 me-2"></i>Give Salary
                            </a>
                        </li>
                    </ul>
                </div>
            </td>
        </tr>
    `).join('');
}

// Modal Functions
function showPayrollModal() {
    const modal = new bootstrap.Modal(document.getElementById('payrollModal'));
    modal.show();
    loadPayrollData();
}

async function loadPayrollData() {
    const contentEl = document.getElementById('payrollContent');
    if (!contentEl) return;

    // Show loading
    contentEl.innerHTML = `
        <div class="text-center">
            <div class="spinner-border" role="status">
                <span class="visually-hidden">Loading payroll data...</span>
            </div>
        </div>
    `;

    try {
        const payrollData = await fetchPayrollSummary();
        
        if (!payrollData || !payrollData.workers) {
            contentEl.innerHTML = '<div class="alert alert-warning">No payroll data available</div>';
            return;
        }

        // Generate payroll table
        contentEl.innerHTML = `
            <div class="row mb-3">
                <div class="col-md-3">
                    <div class="card border-start-success">
                        <div class="card-body">
                            <h6 class="card-title">Total Earned</h6>
                            <h4 class="text-success">${formatCurrency(payrollData.totals.total_earned_payroll)}</h4>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card border-start-warning">
                        <div class="card-body">
                            <h6 class="card-title">Total Advances</h6>
                            <h4 class="text-warning">${formatCurrency(payrollData.totals.total_advances_given)}</h4>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card border-start-info">
                        <div class="card-body">
                            <h6 class="card-title">Final Payments</h6>
                            <h4 class="text-info">${formatCurrency(payrollData.totals.total_final_payments)}</h4>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card border-start-primary">
                        <div class="card-body">
                            <h6 class="card-title">Total Workers</h6>
                            <h4 class="text-primary">${payrollData.totals.total_workers}</h4>
                        </div>
                    </div>
                </div>
            </div>
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>Worker</th>
                            <th>Hours Worked</th>
                            <th>Completion %</th>
                            <th>Earned Salary</th>
                            <th>Advances</th>
                            <th>Final Payment</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${payrollData.workers.map(workerData => `
                            <tr>
                                <td>
                                    <strong>${workerData.worker.name}</strong>
                                    <br>
                                    <small class="text-muted">${workerData.worker.code}</small>
                                </td>
                                <td>
                                    ${formatHours(workerData.work_progress.hours_worked)}
                                    <small class="text-muted">/ 160h</small>
                                </td>
                                <td>
                                    <div class="progress" style="height: 8px;">
                                        <div class="progress-bar" role="progressbar" 
                                             style="width: ${workerData.work_progress.completion_percentage}%">
                                        </div>
                                    </div>
                                    <small>${workerData.work_progress.completion_percentage}%</small>
                                </td>
                                <td>${formatCurrency(workerData.salary_calculation.earned_salary)}</td>
                                <td>${formatCurrency(workerData.salary_calculation.advances_taken)}</td>
                                <td>
                                    <strong>${formatCurrency(workerData.salary_calculation.final_payment)}</strong>
                                </td>
                                <td>
                                    <span class="badge ${getPaymentStatusClass(workerData.payment_status)}">
                                        ${getPaymentStatusText(workerData.payment_status)}
                                    </span>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        contentEl.innerHTML = '<div class="alert alert-danger">Failed to load payroll data</div>';
    }
}

// PIN Authentication Modal
function showPinModal(action, callback) {
    console.log('showPinModal called with action:', action);
    
    // Use existing PIN modal from HTML
    const pinModal = document.getElementById('pinModal');
    if (!pinModal) {
        console.error('PIN modal not found in HTML');
        return;
    }

    // Update modal title
    const titleElement = pinModal.querySelector('.modal-title');
    if (titleElement) {
        titleElement.textContent = `Admin Authentication Required`;
    }
    
    // Update label text to include action
    const labelElement = pinModal.querySelector('label[for="adminPin"]');
    if (labelElement) {
        labelElement.textContent = `Enter Admin PIN to ${action}:`;
    }
    
    // Clear any previous errors
    const errorElement = pinModal.querySelector('#pinError');
    if (errorElement) {
        errorElement.classList.add('d-none');
        errorElement.textContent = '';
    }
    
    // Clear the PIN input
    const pinInput = document.getElementById('adminPin');
    if (pinInput) {
        pinInput.value = '';
    }
    
    // Store callback
    window.currentPinCallback = callback;
    
    // Show modal
    const modal = new bootstrap.Modal(pinModal);
    modal.show();
    
    // Focus on input after modal is shown
    setTimeout(() => {
        if (pinInput) {
            pinInput.focus();
        }
    }, 500);
    
    console.log('PIN modal shown successfully');
}

function verifyPin() {
    const input = document.getElementById('adminPin'); // Use correct ID from HTML
    const errorEl = document.getElementById('pinError');
    const pin = input ? input.value : '';
    
    console.log('verifyPin called, pin value:', pin);
    
    if (pin === ADMIN_PIN) {
        console.log('PIN verified successfully');
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('pinModal'));
        if (modal) {
            modal.hide();
        }
        
        // Execute callback
        if (window.currentPinCallback) {
            console.log('Executing PIN callback');
            window.currentPinCallback(pin);
        }
    } else {
        console.log('PIN verification failed');
        if (errorEl) {
            errorEl.textContent = 'Invalid PIN. Please try again.';
            errorEl.classList.remove('d-none');
        }
        if (input) {
            input.value = '';
            input.focus();
        }
    }
}

// Refresh Functions
function startAutoRefresh() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
    }
    
    refreshTimer = setInterval(async () => {
        await loadDashboardData();
        
        // If on workers page, refresh workers table
        if (document.getElementById('workersTableBody')) {
            await loadWorkersTable();
        }
    }, REFRESH_INTERVAL);
}

async function refreshData() {
    await testAPIConnection();
    await loadDashboardData();
    
    if (document.getElementById('workersTableBody')) {
        await loadWorkersTable();
    }
    
    showAlert('Data refreshed successfully', 'success', 3000);
}

async function refreshPayrollData() {
    await loadPayrollData();
    showAlert('Payroll data refreshed', 'success', 3000);
}

// Page-specific initialization
document.addEventListener('DOMContentLoaded', function() {
    // Initialize based on current page
    if (document.getElementById('totalWorkers')) {
        // Dashboard page
        initializeDashboard();
    } else if (document.getElementById('workersTableBody')) {
        // Workers page
        testAPIConnection();
        loadWorkersTable();
        startAutoRefresh();
        
        // Add event listener for submit button
        const submitBtn = document.getElementById('submitWorkerBtn');
        if (submitBtn) {
            submitBtn.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('Submit button clicked');
                handleAddWorker();
            });
        }
    }
    
    updateCurrentDate();
});

// Export functions for global access
window.showPayrollModal = showPayrollModal;
window.refreshData = refreshData;
window.refreshPayrollData = refreshPayrollData;
window.verifyPin = verifyPin;

// Additional functions that might be called from HTML
window.editWorker = function(workerId) {
    showAlert('Edit worker functionality - Under development', 'info');
};

window.giveAdvanceModal = function(workerId, workerName) {
    showAlert('Give advance functionality - Under development', 'info');
};

window.giveSalaryModal = function(workerId, workerName) {
    showAlert('Give salary functionality - Under development', 'info');
};

window.handleAddWorker = function() {
    console.log('handleAddWorker function called');
    
    // Get form data
    const code = document.getElementById('workerCode').value.trim();
    const name = document.getElementById('workerName').value.trim();
    const phone = document.getElementById('workerPhone').value.trim();
    const position = document.getElementById('workerPosition').value.trim();
    const salary = parseFloat(document.getElementById('workerSalary').value);
    const hireDate = document.getElementById('workerHireDate').value;
    const adminPin = document.getElementById('adminPin').value.trim();
    
    console.log('Form data:', { code, name, phone, position, salary, hireDate, adminPin: '***' });
    
    // Validate required fields
    if (!code || !name || !position || !salary || !hireDate || !adminPin) {
        console.log('Validation failed: missing required fields');
        showAlert('Please fill in all required fields including Admin PIN', 'warning');
        return;
    }
    
    // Validate salary
    if (salary <= 0) {
        console.log('Validation failed: invalid salary');
        showAlert('Salary must be greater than 0', 'warning');
        return;
    }
    
    // Prepare worker data exactly like the PowerShell command
    const workerData = {
        code: code,
        name: name,
        position: position,
        salary: salary,
        hire_date: hireDate,
        phone: phone || null
    };
    
    console.log('Worker data prepared:', workerData);
    
    // Call API with admin PIN from form
    addWorkerDirectly(workerData, adminPin);
};

async function addWorkerDirectly(workerData, adminPin) {
    console.log('addWorkerDirectly called with:', workerData);
    
    const requestOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Admin-Pin': adminPin
        },
        body: JSON.stringify(workerData)
    };
    
    console.log('Request options (PIN hidden):', {
        ...requestOptions,
        headers: { ...requestOptions.headers, 'X-Admin-Pin': '***' }
    });
    console.log('Making request to:', `${API_BASE_URL}/workers`);
    
    try {
        const response = await fetch(`${API_BASE_URL}/workers`, requestOptions);
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        
        const result = await response.json();
        console.log('Success response:', result);
        
        // Check if response has the expected structure
        if (!result || !result.worker) {
            console.error('Unexpected response structure:', result);
            throw new Error('Invalid response from server');
        }
        
        // Close the modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('addWorkerModal'));
        if (modal) {
            modal.hide();
        }
        
        // Clear form
        document.getElementById('addWorkerForm').reset();
        
        // Refresh workers table
        await loadWorkersTable();
        
        // Show success message
        showAlert(`Worker ${result.worker.name} added successfully!`, 'success');
        
    } catch (error) {
        console.error('Error adding worker:', error);
        
        if (error.message.includes('400')) {
            showAlert('Worker code already exists. Please use a different code.', 'danger');
        } else if (error.message.includes('401')) {
            showAlert('Invalid admin PIN. Please check and try again.', 'danger');
        } else {
            showAlert(`Failed to add worker: ${error.message}`, 'danger');
        }
    }
}

// Alias for HTML onclick compatibility
window.addWorker = window.handleAddWorker;

window.showAddWorkerModal = function() {
    console.log('showAddWorkerModal function called');
    
    const modal = new bootstrap.Modal(document.getElementById('addWorkerModal'));
    
    // Generate next worker code
    generateNextWorkerCode();
    
    // Set default hire date to today
    const today = new Date().toISOString().split('T')[0];
    const hireDateElement = document.getElementById('workerHireDate');
    if (hireDateElement) {
        hireDateElement.value = today;
    }
    
    modal.show();
};

// Generate next available worker code
async function generateNextWorkerCode() {
    try {
        const workers = await fetchWorkers();
        
        // Extract existing codes and find the highest number
        const existingCodes = workers
            .map(w => w.code)
            .filter(code => code.startsWith('W'))
            .map(code => parseInt(code.substring(1)))
            .filter(num => !isNaN(num));
        
        const maxCode = existingCodes.length > 0 ? Math.max(...existingCodes) : 0;
        const nextCode = `W${String(maxCode + 1).padStart(3, '0')}`;
        
        const codeInput = document.getElementById('workerCode');
        if (codeInput) {
            codeInput.value = nextCode;
        }
    } catch (error) {
        console.error('Failed to generate worker code:', error);
        // Fallback to manual entry
        const codeInput = document.getElementById('workerCode');
        if (codeInput) {
            codeInput.value = '';
            codeInput.placeholder = 'Enter worker code (e.g., W001)';
        }
    }
}

window.clockInOut = function() {
    showAlert('Clock In/Out functionality - Under development', 'info');
};
