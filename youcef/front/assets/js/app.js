// GPLAST Factory Management - JavaScript Application

// Configuration
const API_BASE_URL = 'http://127.0.0.1:5000/api';
const ADMIN_PIN = '1234'; // This should match your backend config
const REFRESH_INTERVAL = 30000; // 30 seconds

// Global State
let workers = [];
let payrollData = null;
let refreshTimer = null;

// Helper function to get current date
function getCurrentDate() {
    return new Date();
}

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
        const now = getCurrentDate();
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
        lastUpdateEl.textContent = getCurrentDate().toLocaleTimeString('fr-FR');
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
        
        // Load workers due for payment today
        await loadPaymentDueWorkers(workersData);
        
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

        // Total Advances This Month
        const totalAdvancesEl = document.getElementById('totalAdvances');
        if (totalAdvancesEl) {
            totalAdvancesEl.textContent = formatCurrency(payrollData.totals.total_advances_this_month);
        }

        // Total Spent This Month (Total company expenditure this month)
        // = Advances given this month + Loans given this month + Actual salary payments made this month
        // (Salary payments exclude hire month and are calculated as salary minus all advances since last payment)
        const finalPaymentsEl = document.getElementById('totalFinalPayments');
        if (finalPaymentsEl) {
            const t = payrollData.totals;
            const finalPayments = (t.total_advances_this_month || 0) + (t.total_loans_this_month || 0) + (t.total_paid_to_workers_this_month || 0);
            finalPaymentsEl.textContent = formatCurrency(finalPayments);
        }

        // Total Loans Given (All Time)
        const totalLoansGivenEl = document.getElementById('totalLoansGiven');
        if (totalLoansGivenEl) {
            totalLoansGivenEl.textContent = formatCurrency(payrollData.totals.total_loans_given);
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

// Load workers due for payment today
async function loadPaymentDueWorkers(workers) {
    const tbody = document.getElementById('paymentDueTableBody');
    const countBadge = document.getElementById('paymentDueCount');
    const noPaymentsDiv = document.getElementById('noPaymentsDue');
    const tableDiv = document.querySelector('#paymentDueTable').parentElement;
    
    if (!tbody) return;

    try {
        // Get today's date in YYYY-MM-DD format
        const today = getCurrentDate().toISOString().split('T')[0];
        
        // Filter workers whose next_payment is today or overdue
        const workersDueToday = workers.filter(worker => 
            worker.next_payment && worker.next_payment <= today
        );

        // Update count badge
        if (countBadge) {
            countBadge.textContent = workersDueToday.length;
        }

        if (workersDueToday.length === 0) {
            // Show no payments message
            if (tableDiv) tableDiv.style.display = 'none';
            if (noPaymentsDiv) noPaymentsDiv.style.display = 'block';
            return;
        }

        // Show table and hide no payments message
        if (tableDiv) tableDiv.style.display = 'block';
        if (noPaymentsDiv) noPaymentsDiv.style.display = 'none';

        // Get advances for calculation
        const allAdvances = await apiCall('/advances');
        
        // Generate table rows
        const rows = await Promise.all(workersDueToday.map(async worker => {
            // Calculate unpaid advances for this worker
            const workerAdvances = allAdvances.filter(a => 
                a.worker_id === worker.id && !a.is_paid_back
            );
            const totalAdvances = workerAdvances.reduce((sum, a) => sum + a.amount, 0);
            const netPay = worker.salary - totalAdvances;

            return `
                <tr>
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="avatar-circle me-2" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; width: 35px; height: 35px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.8rem; text-transform: uppercase;">
                                ${getWorkerInitials(worker.name)}
                            </div>
                            <div>
                                <strong>${worker.name}</strong>
                                <br><small class="text-muted">${worker.code}</small>
                            </div>
                        </div>
                    </td>
                    <td>${worker.position}</td>
                    <td class="text-success fw-bold">${formatCurrency(worker.salary)}</td>
                    <td class="${totalAdvances > 0 ? 'text-warning' : 'text-muted'} fw-bold">
                        ${formatCurrency(totalAdvances)}
                    </td>
                    <td class="text-primary fw-bold">${formatCurrency(netPay)}</td>
                    <td>
                        <button class="btn btn-success btn-sm" onclick="giveSalaryModal(${worker.id}, '${worker.name.replace(/'/g, "\\'")}', ${worker.salary}, '${worker.next_payment}')">
                            <i class="bi bi-currency-dollar me-1"></i>Pay Salary
                        </button>
                    </td>
                </tr>
            `;
        }));

        tbody.innerHTML = rows.join('');

    } catch (error) {
        console.error('Error loading payment due workers:', error);
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error loading payment data</td></tr>';
    }
}

// Refresh Dashboard Function
async function refreshDashboard() {
    try {
        showAlert('Refreshing dashboard...', 'info', 2000);
        await testAPIConnection();
        await loadDashboardData();
        showAlert('Dashboard refreshed successfully', 'success', 3000);
    } catch (error) {
        console.error('Error refreshing dashboard:', error);
        showAlert('Failed to refresh dashboard', 'danger');
    }
}

// Make refreshDashboard available globally
window.refreshDashboard = refreshDashboard;

// Workers Management Functions
async function loadWorkersTable() {
    const workers = await fetchWorkers();
    const tbody = document.getElementById('workersTableBody');
    
    if (!tbody) return;

    if (workers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No workers found</td></tr>';
        return;
    }

    const today = getCurrentDate();
    tbody.innerHTML = workers.map(worker => {
        const nextPayment = worker.next_payment ? new Date(worker.next_payment) : null;
        let salaryBtnClass = 'btn-outline-success';
        if (nextPayment && getCurrentDate() >= nextPayment) {
            salaryBtnClass = 'btn-danger';
        }
        return `
        <tr>
            <td><span class="badge bg-primary">${worker.code}</span></td>
            <td><div class="d-flex align-items-center"><div class="avatar-circle me-2" style="background-color: #2c5aa0 !important; background-image: linear-gradient(135deg, #2c5aa0, #1e3f73) !important; color: white !important; width: 32px !important; height: 32px !important; border-radius: 50% !important; display: flex !important; align-items: center !important; justify-content: center !important; font-weight: 600 !important; font-size: 0.75rem !important; text-transform: uppercase !important; cursor: pointer !important;" data-bg="blue" onclick="showWorkerProfile(${worker.id})" title="View worker profile">${getWorkerInitials(worker.name)}</div><div><strong>${worker.name}</strong>${worker.is_team_leader ? '<br><span class="badge badge-sm bg-gradient-danger">Team Leader</span>' : ''}</div></div></td>
            <td>${worker.group_name ? `<span class="badge bg-info">${worker.group_name}</span>` : '<span class="text-muted">No group</span>'}</td>
            <td>${worker.phone || '-'}</td>
            <td><strong>${formatCurrency(worker.salary)}</strong></td>
            <td>${formatDate(worker.hire_date)}</td>
            <td><div class="btn-group" role="group" aria-label="Worker Actions">
                <button type="button" class="btn btn-outline-info btn-sm" onclick="editWorker(${worker.id})" title="Edit Worker"><i class="bi bi-pencil me-1"></i>Edit</button>
                <button type="button" class="btn btn-outline-warning btn-sm" onclick="giveAdvanceModal(${worker.id}, '${worker.name.replace(/'/g, "\\'")}', ${worker.salary})" title="Give Salary Advance (Massarif)"><i class="bi bi-cash me-1"></i>Massarif</button>
                <button type="button" class="btn btn-outline-danger btn-sm" onclick="showLoanOptions(${worker.id}, '${worker.name.replace(/'/g, "\\'")}', ${worker.salary})" title="Loan Operations (New Loan or Pay Existing)"><i class="bi bi-credit-card me-1"></i>Douyoun</button>
                <button type="button" class="btn ${salaryBtnClass} btn-sm" onclick="giveSalaryModal(${worker.id}, '${worker.name.replace(/'/g, "\\'")}', ${worker.salary}, '${worker.next_payment}')" title="Pay Salary"><i class="bi bi-wallet2 me-1"></i>Salary</button>
                <button type="button" class="btn btn-outline-secondary btn-sm" onclick="confirmDeleteWorker(${worker.id}, '${worker.name.replace(/'/g, "\\'")}', '${worker.code}', '${worker.position.replace(/'/g, "\\'")}')" title="Delete Worker"><i class="bi bi-trash me-1"></i>Delete</button>
            </div></td>
        </tr>
        `;
    }).join('');
}

// Helper function to get worker initials for avatar
function getWorkerInitials(name) {
    if (!name) return '??';
    const words = name.trim().split(' ');
    if (words.length === 1) {
        return words[0].substring(0, 2).toUpperCase();
    }
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

// Load groups for worker form dropdown
async function loadGroupsForWorkerForm() {
    try {
        const groups = await apiCall('/groups');
        const groupSelect = document.getElementById('workerGroup');
        
        if (!groupSelect) return;
        
        groupSelect.innerHTML = '<option value="">No group assigned</option>';
        groups.forEach(group => {
            groupSelect.innerHTML += `<option value="${group.id}">${group.name}</option>`;
        });
    } catch (error) {
        console.error('Error loading groups for worker form:', error);
    }
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
        loadGroupsForWorkerForm();
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
window.editWorker = async function(workerId) {
    try {
        showAlert('Loading worker data...', 'info');
        
        // Fetch worker data
        const response = await fetch(`${API_BASE_URL}/workers/${workerId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch worker data');
        }
        
        const worker = await response.json();
        
        // Populate edit form
        document.getElementById('editWorkerId').value = worker.id;
        document.getElementById('editWorkerName').value = worker.name;
        document.getElementById('editWorkerPhone').value = worker.phone || '';
        document.getElementById('editWorkerPosition').value = worker.position || '';
        document.getElementById('editWorkerSalary').value = worker.salary;
        
        // Load groups for selection
        await loadGroupsForEdit(worker.group_id);
        
        // Show modal
        const editModal = new bootstrap.Modal(document.getElementById('editWorkerModal'));
        editModal.show();
        
        // Clear any previous alerts
        setTimeout(() => {
            const alertElement = document.querySelector('.alert');
            if (alertElement) {
                alertElement.remove();
            }
        }, 1000);
        
    } catch (error) {
        console.error('Error loading worker data:', error);
        showAlert('Error loading worker data. Please try again.', 'danger');
    }
};

// Load groups for edit modal
async function loadGroupsForEdit(currentGroupId = null) {
    try {
        // Check if we have a group dropdown in edit modal
        let groupSelect = document.getElementById('editWorkerGroup');
        if (!groupSelect) {
            // If not, we'll add it dynamically
            const positionField = document.getElementById('editWorkerPosition').parentElement;
            const groupDiv = document.createElement('div');
            groupDiv.className = 'mb-3';
            groupDiv.innerHTML = `
                <label for="editWorkerGroup" class="form-label">Group</label>
                <select class="form-select" id="editWorkerGroup">
                    <option value="">No group assigned</option>
                </select>
                <div class="form-text">You can change the worker's group assignment</div>
            `;
            positionField.insertAdjacentElement('afterend', groupDiv);
            groupSelect = document.getElementById('editWorkerGroup');
        }
        
        const groups = await fetchGroups();
        groupSelect.innerHTML = '<option value="">No group assigned</option>';
        groups.forEach(group => {
            const selected = group.id === currentGroupId ? 'selected' : '';
            groupSelect.innerHTML += `<option value="${group.id}" ${selected}>${group.name}</option>`;
        });
    } catch (error) {
        console.error('Error loading groups:', error);
    }
}

// Update Worker Function
window.updateWorker = async function() {
    try {
        const form = document.getElementById('editWorkerForm');
        const workerId = document.getElementById('editWorkerId').value;
        const name = document.getElementById('editWorkerName').value.trim();
        const phone = document.getElementById('editWorkerPhone').value.trim();
        const position = document.getElementById('editWorkerPosition').value.trim();
        const salary = parseFloat(document.getElementById('editWorkerSalary').value);
        const groupId = document.getElementById('editWorkerGroup')?.value || null;
        const adminPin = document.getElementById('editWorkerPin').value.trim();
        
        // Clear previous validation states
        form.querySelectorAll('.form-control').forEach(input => {
            input.classList.remove('is-valid', 'is-invalid');
        });
        
        // Validation
        let isValid = true;
        
        if (!name || name.length < 2) {
            document.getElementById('editWorkerName').classList.add('is-invalid');
            isValid = false;
        } else {
            document.getElementById('editWorkerName').classList.add('is-valid');
        }
        
        if (!position || position.length < 2) {
            document.getElementById('editWorkerPosition').classList.add('is-invalid');
            isValid = false;
        } else {
            document.getElementById('editWorkerPosition').classList.add('is-valid');
        }
        
        if (!salary || salary <= 0 || salary > 1000000) {
            document.getElementById('editWorkerSalary').classList.add('is-invalid');
            isValid = false;
        } else {
            document.getElementById('editWorkerSalary').classList.add('is-valid');
        }
        
        // Validate phone if provided
        if (phone && phone.length > 0) {
            const phoneRegex = /^[0-9+\-\s()]{8,15}$/;
            if (!phoneRegex.test(phone)) {
                document.getElementById('editWorkerPhone').classList.add('is-invalid');
                isValid = false;
            } else {
                document.getElementById('editWorkerPhone').classList.add('is-valid');
            }
        } else {
            document.getElementById('editWorkerPhone').classList.add('is-valid');
        }
        
        // Validate admin PIN
        if (!adminPin || adminPin.length !== 4 || !/^\d{4}$/.test(adminPin)) {
            document.getElementById('editWorkerPin').classList.add('is-invalid');
            isValid = false;
        } else {
            document.getElementById('editWorkerPin').classList.add('is-valid');
        }
        
        if (!isValid) {
            showAlert('Please correct the highlighted fields before updating.', 'warning');
            return;
        }
        
        // Show loading state
        const updateBtn = document.querySelector('#editWorkerModal .btn-primary');
        const originalText = updateBtn.innerHTML;
        updateBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Updating...';
        updateBtn.disabled = true;
        
        // Prepare update data
        const updateData = {
            name: name,
            phone: phone || null,
            position: position,
            salary: salary,
            group_id: groupId ? parseInt(groupId) : null,
            admin_pin: adminPin
        };
        
        // Send update request
        const response = await fetch(`${API_BASE_URL}/workers/${workerId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // Success - mark all fields as valid
            form.querySelectorAll('.form-control').forEach(input => {
                input.classList.remove('is-invalid');
                input.classList.add('is-valid');
            });
            
            showAlert(`✅ Worker "${name}" updated successfully!`, 'success');
            
            // Close modal after a brief delay
            setTimeout(() => {
                const editModal = bootstrap.Modal.getInstance(document.getElementById('editWorkerModal'));
                editModal.hide();
            }, 1500);
            
            // Reload workers table
            await loadWorkersTable();
            
        } else {
            throw new Error(result.error || 'Failed to update worker');
        }
        
    } catch (error) {
        console.error('Error updating worker:', error);
        showAlert('❌ Error updating worker: ' + error.message, 'danger');
    } finally {
        // Reset button state
        const updateBtn = document.querySelector('#editWorkerModal .btn-primary');
        if (updateBtn) {
            updateBtn.innerHTML = '<i class="bi bi-check-circle me-1"></i>Update Worker';
            updateBtn.disabled = false;
        }
    }
};

// Fetch Groups function
async function fetchGroups() {
    try {
        const response = await fetch(`${API_BASE_URL}/groups`);
        if (!response.ok) {
            throw new Error('Failed to fetch groups');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching groups:', error);
        return [];
    }
}

window.giveAdvanceModal = function(workerId, workerName, workerSalary) {
    // Populate modal fields
    document.getElementById('advanceWorkerId').value = workerId;
    document.getElementById('advanceWorkerName').value = workerName;
    document.getElementById('advanceWorkerSalary').value = formatCurrency(workerSalary);
    
    // Clear previous form data and validation states
    document.getElementById('advanceAmount').value = '';
    document.getElementById('advanceReason').value = '';
    document.getElementById('advancePin').value = '';
    
    // Clear validation states
    const form = document.getElementById('giveAdvanceForm');
    form.querySelectorAll('.form-control').forEach(input => {
        input.classList.remove('is-valid', 'is-invalid');
    });
    
    // Show modal
    const advanceModal = new bootstrap.Modal(document.getElementById('giveAdvanceModal'));
    advanceModal.show();
};

// Process Advance Payment Function
window.processAdvance = async function() {
    try {
        const form = document.getElementById('giveAdvanceForm');
        const workerId = document.getElementById('advanceWorkerId').value;
        const workerName = document.getElementById('advanceWorkerName').value;
        const workerSalary = parseFloat(document.getElementById('advanceWorkerSalary').value.replace(/[^0-9.-]+/g, ""));
        const amount = parseFloat(document.getElementById('advanceAmount').value);
        const reason = document.getElementById('advanceReason').value.trim();
        const adminPin = document.getElementById('advancePin').value.trim();
        
        // Clear previous validation states
        form.querySelectorAll('.form-control').forEach(input => {
            input.classList.remove('is-valid', 'is-invalid');
        });
        
        // Validation
        let isValid = true;
        
        // Validate amount against worker salary (Massarif rule)
        if (!amount || amount <= 0) {
            document.getElementById('advanceAmount').classList.add('is-invalid');
            showAlert('❌ Please enter a valid advance amount.', 'error');
            isValid = false;
        } else if (amount > workerSalary) {
            document.getElementById('advanceAmount').classList.add('is-invalid');
            showAlert(`❌ Massarif amount (${formatCurrency(amount)}) cannot exceed worker salary (${formatCurrency(workerSalary)}).`, 'error');
            isValid = false;
        } else {
            document.getElementById('advanceAmount').classList.add('is-valid');
        }
        
        // Validate admin PIN
        if (!adminPin || adminPin.length !== 4 || !/^\d{4}$/.test(adminPin)) {
            document.getElementById('advancePin').classList.add('is-invalid');
            isValid = false;
        } else {
            document.getElementById('advancePin').classList.add('is-valid');
        }
        
        // Mark reason as valid (optional field)
        document.getElementById('advanceReason').classList.add('is-valid');
        
        if (!isValid) {
            return;
        }
        
        // Show loading state
        const processBtn = document.querySelector('#giveAdvanceModal .btn-warning');
        const originalText = processBtn.innerHTML;
        processBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Processing...';
        processBtn.disabled = true;
        
        // Prepare advance data
        const advanceData = {
            worker_id: parseInt(workerId),
            amount: amount,
            reason: reason || null,
            admin_pin: adminPin
        };
        
        // Send advance request
        const response = await fetch(`${API_BASE_URL}/advances`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(advanceData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // Success - mark all fields as valid
            form.querySelectorAll('.form-control').forEach(input => {
                input.classList.remove('is-invalid');
                input.classList.add('is-valid');
            });
            
            showAlert(`✅ Advance of ${formatCurrency(amount)} given to ${workerName} successfully!`, 'success');
            
            // Close modal after a short delay
            setTimeout(() => {
                const modal = bootstrap.Modal.getInstance(document.getElementById('giveAdvanceModal'));
                modal.hide();
                
                // Refresh workers table to show updated data
                loadWorkers();
            }, 1500);
            
        } else {
            // Error from server
            showAlert(`❌ Error processing advance: ${result.error || 'Unknown error'}`, 'error');
        }
        
    } catch (error) {
        console.error('Error processing advance:', error);
        showAlert('❌ Error processing advance. Please check your connection and try again.', 'error');
    } finally {
        // Restore button state
        const processBtn = document.querySelector('#giveAdvanceModal .btn-warning');
        if (processBtn) {
            processBtn.innerHTML = '<i class="bi bi-check-circle me-1"></i>Give Massarif';
            processBtn.disabled = false;
        }
    }
};

// LOAN OPTIONS (NEW LOAN OR PAY EXISTING LOANS)

window.showLoanOptions = function(workerId, workerName, workerSalary) {
    console.log('Showing loan options for:', workerId, workerName, workerSalary);
    
    // Create a modal with two options
    const modalHtml = `
        <div class="modal fade" id="loanOptionsModal" tabindex="-1" aria-labelledby="loanOptionsModalLabel" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="loanOptionsModalLabel">
                            <i class="bi bi-credit-card me-2"></i>Loan Options for ${workerName}
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <p class="text-muted mb-4">Choose what type of loan operation you want to perform:</p>
                        
                        <div class="row g-3">
                            <div class="col-md-6">
                                <div class="card h-100 border-danger">
                                    <div class="card-body text-center">
                                        <i class="bi bi-plus-circle fs-1 text-danger mb-3"></i>
                                        <h5 class="card-title">New Loan</h5>
                                        <p class="card-text text-muted">Give a new loan to worker (independent from salary)</p>
                                        <button class="btn btn-danger" onclick="giveLoanModal(${workerId}, '${workerName.replace(/'/g, "\\'")}', ${workerSalary}); closeLoanOptions()">
                                            <i class="bi bi-plus-circle me-1"></i>Give New Loan
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="col-md-6">
                                <div class="card h-100 border-success">
                                    <div class="card-body text-center">
                                        <i class="bi bi-arrow-down-circle fs-1 text-success mb-3"></i>
                                        <h5 class="card-title">Loan Payment</h5>
                                        <p class="card-text text-muted">Make payment towards existing loans</p>
                                        <button class="btn btn-success" onclick="showLoanPaymentModal(${workerId}, '${workerName.replace(/'/g, "\\'")}'); closeLoanOptions()">
                                            <i class="bi bi-arrow-down-circle me-1"></i>Pay Loans
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('loanOptionsModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to DOM
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('loanOptionsModal'));
    modal.show();
};

window.closeLoanOptions = function() {
    const modal = bootstrap.Modal.getInstance(document.getElementById('loanOptionsModal'));
    if (modal) {
        modal.hide();
    }
};

// LOAN PAYMENT FUNCTIONS

window.showLoanPaymentModal = async function(workerId, workerName) {
    console.log('Showing loan payment modal for:', workerId, workerName);
    
    try {
        // Fetch worker's loans
        const allLoans = await apiCall('/loans');
        const workerLoans = allLoans.filter(loan => loan.worker_id === workerId && !loan.is_fully_paid);
        
        if (workerLoans.length === 0) {
            showAlert(`${workerName} has no outstanding loans to pay.`, 'info');
            return;
        }
        
        // Create loan payment modal
        const modalHtml = `
            <div class="modal fade" id="loanPaymentModal" tabindex="-1" aria-labelledby="loanPaymentModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="loanPaymentModalLabel">
                                <i class="bi bi-credit-card me-2"></i>Pay Loan for ${workerName}
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <form id="loanPaymentForm" novalidate>
                                <input type="hidden" id="paymentWorkerId" value="${workerId}">
                                <input type="hidden" id="paymentWorkerName" value="${workerName}">
                                
                                <div class="mb-3">
                                    <label for="paymentLoanSelect" class="form-label">
                                        <i class="bi bi-list me-1"></i>Select Loan to Pay
                                    </label>
                                    <select class="form-select" id="paymentLoanSelect" required>
                                        <option value="">Choose a loan...</option>
                                        ${workerLoans.map(loan => `
                                            <option value="${loan.id}" data-remaining="${loan.remaining_balance}">
                                                Loan #${loan.id} - ${formatCurrency(loan.remaining_balance)} remaining 
                                                (Total: ${formatCurrency(loan.total_amount)})
                                            </option>
                                        `).join('')}
                                    </select>
                                    <div class="form-text">Select which loan you want to make a payment towards</div>
                                </div>
                                
                                <div class="mb-3">
                                    <label for="paymentAmount" class="form-label">
                                        <i class="bi bi-currency-dollar me-1"></i>Payment Amount (DA) <span class="text-danger">*</span>
                                    </label>
                                    <input type="number" class="form-control" id="paymentAmount" step="0.01" min="0" required placeholder="Enter payment amount">
                                    <div class="invalid-feedback">Please provide a valid payment amount.</div>
                                    <div class="form-text" id="paymentAmountHelp">Maximum payment will be shown when you select a loan</div>
                                </div>
                                
                                <div class="mb-3">
                                    <label for="paymentNotes" class="form-label">
                                        <i class="bi bi-chat-left-text me-1"></i>Payment Notes
                                    </label>
                                    <textarea class="form-control" id="paymentNotes" rows="3" placeholder="Optional notes about this payment"></textarea>
                                    <div class="form-text">Add any notes about this payment (optional)</div>
                                </div>
                                
                                <div class="mb-3">
                                    <label for="paymentPin" class="form-label">
                                        <i class="bi bi-shield-lock me-1"></i>Admin PIN <span class="text-danger">*</span>
                                    </label>
                                    <input type="password" class="form-control" id="paymentPin" maxlength="4" required placeholder="Enter 4-digit PIN">
                                    <div class="invalid-feedback">Admin PIN is required to process loan payment.</div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-success" onclick="processLoanPayment()">
                                <i class="bi bi-check-circle me-1"></i>Process Payment
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal if any
        const existingModal = document.getElementById('loanPaymentModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Add modal to DOM
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Add event listener for loan selection
        document.getElementById('paymentLoanSelect').addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            const remainingBalance = selectedOption.getAttribute('data-remaining');
            const helpText = document.getElementById('paymentAmountHelp');
            
            if (remainingBalance) {
                helpText.textContent = `Maximum payment: ${formatCurrency(parseFloat(remainingBalance))}`;
                helpText.className = 'form-text text-info';
            } else {
                helpText.textContent = 'Maximum payment will be shown when you select a loan';
                helpText.className = 'form-text';
            }
        });
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('loanPaymentModal'));
        modal.show();
        
    } catch (error) {
        console.error('Error loading loan payment modal:', error);
        showAlert('Failed to load loan information. Please try again.', 'danger');
    }
};

window.processLoanPayment = async function() {
    console.log('Processing loan payment...');
    
    try {
        const form = document.getElementById('loanPaymentForm');
        const workerId = document.getElementById('paymentWorkerId').value;
        const workerName = document.getElementById('paymentWorkerName').value;
        const loanId = document.getElementById('paymentLoanSelect').value;
        const amount = parseFloat(document.getElementById('paymentAmount').value);
        const notes = document.getElementById('paymentNotes').value.trim();
        const adminPin = document.getElementById('paymentPin').value.trim();
        
        // Clear previous validation states
        form.querySelectorAll('.form-control').forEach(input => {
            input.classList.remove('is-valid', 'is-invalid');
        });
        
        // Validation
        let isValid = true;
        
        // Validate loan selection
        if (!loanId) {
            document.getElementById('paymentLoanSelect').classList.add('is-invalid');
            isValid = false;
        } else {
            document.getElementById('paymentLoanSelect').classList.add('is-valid');
        }
        
        // Validate payment amount
        if (!amount || amount <= 0) {
            document.getElementById('paymentAmount').classList.add('is-invalid');
            showAlert('❌ Please enter a valid payment amount.', 'error');
            isValid = false;
        } else {
            // Check if amount doesn't exceed remaining balance
            const selectedOption = document.getElementById('paymentLoanSelect').options[document.getElementById('paymentLoanSelect').selectedIndex];
            const remainingBalance = parseFloat(selectedOption.getAttribute('data-remaining'));
            
            if (amount > remainingBalance) {
                document.getElementById('paymentAmount').classList.add('is-invalid');
                showAlert(`❌ Payment amount (${formatCurrency(amount)}) cannot exceed remaining balance (${formatCurrency(remainingBalance)}).`, 'error');
                isValid = false;
            } else {
                document.getElementById('paymentAmount').classList.add('is-valid');
            }
        }
        
        // Validate admin PIN
        if (!adminPin || adminPin.length !== 4 || !/^\d{4}$/.test(adminPin)) {
            document.getElementById('paymentPin').classList.add('is-invalid');
            isValid = false;
        } else {
            document.getElementById('paymentPin').classList.add('is-valid');
        }
        
        // Mark notes as valid (optional field)
        document.getElementById('paymentNotes').classList.add('is-valid');
        
        if (!isValid) {
            return;
        }
        
        // Show loading state
        const processBtn = document.querySelector('#loanPaymentModal .btn-success');
        const originalText = processBtn.innerHTML;
        processBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Processing...';
        processBtn.disabled = true;
        
        // Prepare payment data
        const paymentData = {
            payment_amount: amount,
            notes: notes || null,
            admin_pin: adminPin
        };
        
        // Send payment request
        const response = await fetch(`${API_BASE_URL}/loans/${loanId}/payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(paymentData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // Success - mark all fields as valid
            form.querySelectorAll('.form-control').forEach(input => {
                input.classList.remove('is-invalid');
                input.classList.add('is-valid');
            });
            
            showAlert(`✅ Payment of ${formatCurrency(amount)} processed successfully for ${workerName}!`, 'success');
            
            // Close modal after a short delay
            setTimeout(() => {
                const modal = bootstrap.Modal.getInstance(document.getElementById('loanPaymentModal'));
                modal.hide();
                
                // Refresh workers table to show updated data
                loadWorkersTable();
            }, 1500);
            
        } else {
            // Error from server
            showAlert(`❌ Error processing payment: ${result.error || 'Unknown error'}`, 'error');
        }
        
    } catch (error) {
        console.error('Error processing loan payment:', error);
        showAlert('❌ Error processing payment. Please check your connection and try again.', 'error');
    } finally {
        // Restore button state
        const processBtn = document.querySelector('#loanPaymentModal .btn-success');
        if (processBtn) {
            processBtn.innerHTML = '<i class="bi bi-check-circle me-1"></i>Process Payment';
            processBtn.disabled = false;
        }
    }
};

// NEW LOAN CREATION FUNCTIONS (DOUYOUN)

window.giveLoanModal = function(workerId, workerName, workerSalary) {
    console.log('Opening loan modal for:', workerId, workerName, workerSalary);
    
    // Clear previous data
    document.getElementById('loanWorkerId').value = workerId;
    document.getElementById('loanWorkerName').value = workerName;
    document.getElementById('loanWorkerSalary').value = formatCurrency(workerSalary);
    document.getElementById('loanAmount').value = '';
    document.getElementById('loanReason').value = '';
    document.getElementById('loanPin').value = '';
    
    // Clear validation states
    const form = document.getElementById('giveLoanForm');
    form.classList.remove('was-validated');
    
    // Show modal
    const loanModal = new bootstrap.Modal(document.getElementById('giveLoanModal'));
    loanModal.show();
};

window.processLoan = async function() {
    console.log('Processing loan...');
    
    // Get form data
    const workerId = document.getElementById('loanWorkerId').value;
    const workerName = document.getElementById('loanWorkerName').value;
    const amount = parseFloat(document.getElementById('loanAmount').value);
    const reason = document.getElementById('loanReason').value.trim();
    const adminPin = document.getElementById('loanPin').value.trim();
    
    // Validate form
    const form = document.getElementById('giveLoanForm');
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        showAlert('❌ Please fill in all required fields correctly.', 'error');
        return;
    }
    
    // Additional validations
    if (!amount || amount <= 0) {
        showAlert('❌ Please enter a valid loan amount.', 'error');
        return;
    }
    
    if (!adminPin || adminPin.length !== 4) {
        showAlert('❌ Please enter a valid 4-digit admin PIN.', 'error');
        return;
    }
    
    // Update button state
    const processBtn = document.querySelector('#giveLoanModal .btn-danger');
    if (processBtn) {
        processBtn.innerHTML = '<i class="spinner-border spinner-border-sm me-2"></i>Processing...';
        processBtn.disabled = true;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/loans`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Admin-Pin': adminPin
            },
            body: JSON.stringify({
                worker_id: parseInt(workerId),
                amount: amount,
                reason: reason || null
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // Success
            console.log('Loan processed successfully:', result);
            
            // Clear form
            document.getElementById('giveLoanForm').reset();
            document.getElementById('giveLoanForm').classList.remove('was-validated');
            
            showAlert(`✅ Loan of ${formatCurrency(amount)} given to ${workerName} successfully!`, 'success');
            
            // Close modal after a short delay
            setTimeout(() => {
                const modal = bootstrap.Modal.getInstance(document.getElementById('giveLoanModal'));
                modal.hide();
                
                // Refresh workers table to show updated data
                loadWorkers();
            }, 1500);
            
        } else {
            // Error from server
            showAlert(`❌ Error processing loan: ${result.error || 'Unknown error'}`, 'error');
        }
        
    } catch (error) {
        console.error('Error processing loan:', error);
        showAlert('❌ Error processing loan. Please check your connection and try again.', 'error');
    } finally {
        // Restore button state
        const processBtn = document.querySelector('#giveLoanModal .btn-danger');
        if (processBtn) {
            processBtn.innerHTML = '<i class="bi bi-check-circle me-1"></i>Give Loan';
            processBtn.disabled = false;
        }
    }
};

function showSalaryModal(workerName, salary, massarif, amountToPay, workerId, nextPayment) {
    document.getElementById('salaryModalWorkerName').textContent = workerName;
    document.getElementById('salaryModalSalary').textContent = formatCurrency(salary);
    document.getElementById('salaryModalMassarif').textContent = formatCurrency(massarif);
    document.getElementById('salaryModalAmountToPay').textContent = formatCurrency(amountToPay);
    // Show Pay button only if workerId and nextPayment are provided
    const payBtn = document.getElementById('salaryModalPayBtn');
    if (payBtn) {
        payBtn.style.display = (workerId && nextPayment) ? 'inline-block' : 'none';
        payBtn.onclick = async function() {
            await paySalaryAndUpdateNext(workerId, nextPayment);
        };
    }
    const modal = new bootstrap.Modal(document.getElementById('salaryModal'));
    modal.show();
}

async function paySalaryAndUpdateNext(workerId, currentNextPayment) {
    // Calculate next month's date
    const current = new Date(currentNextPayment);
    const next = new Date(current);
    next.setMonth(current.getMonth() + 1);
    // Adjust for month overflow (e.g., Jan 31 -> Feb 28)
    if (next.getDate() !== current.getDate()) {
        next.setDate(0);
    }
    const nextPaymentStr = next.toISOString().split('T')[0];
    try {
        await updateWorkerNextPayment(workerId, nextPaymentStr);
        showAlert('Salary paid and next payment date updated!<br>Next payment: <b>' + formatDate(nextPaymentStr) + '</b>', 'success', 7000);
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('salaryModal'));
        if (modal) modal.hide();
        // Refresh table
        await loadWorkersTable();
    } catch (e) {
        showAlert('Failed to update next payment date.', 'danger');
    }
}

async function updateWorkerNextPayment(workerId, nextPaymentStr) {
    await apiCall(`/workers/${workerId}`, {
        method: 'PUT',
        headers: { 'X-Admin-Pin': ADMIN_PIN, 'Content-Type': 'application/json' },
        body: JSON.stringify({ next_payment: nextPaymentStr })
    });
}

// Update giveSalaryModal to pass workerId and nextPayment
window.giveSalaryModal = async function(workerId, workerName, workerSalary, nextPaymentStr) {
    const today = getCurrentDate();
    const nextPayment = nextPaymentStr ? new Date(nextPaymentStr) : null;
    if (!nextPayment) {
        showAlert('Next payment date not set for this worker.', 'warning');
        return;
    }
    if (today < nextPayment) {
        showAlert("Payment date didn't come yet", 'info');
        return;
    }
    if (today >= nextPayment) {
        let advances = [];
        try {
            const allAdvances = await apiCall('/advances');
            
            // Filter unpaid advances for this worker (using is_paid_back attribute)
            advances = allAdvances.filter(a => {
                return a.worker_id === workerId && !a.is_paid_back;
            });
        } catch (e) {
            showAlert('Failed to fetch advances for this worker.', 'danger');
            return;
        }
        const massarif = advances.reduce((sum, a) => sum + a.amount, 0);
        const amountToPay = workerSalary - massarif;
        showSalaryModal(workerName, workerSalary, massarif, amountToPay, workerId, nextPaymentStr);
        return;
    }
};

window.handleAddWorker = function() {
    console.log('handleAddWorker function called');
    
    // Get form data
    const code = document.getElementById('workerCode').value.trim();
    const name = document.getElementById('workerName').value.trim();
    const phone = document.getElementById('workerPhone').value.trim();
    const birthday = document.getElementById('workerBirthday').value;
    const position = document.getElementById('workerPosition').value.trim();
    const groupId = document.getElementById('workerGroup').value;
    const salary = parseFloat(document.getElementById('workerSalary').value);
    const hireDate = document.getElementById('workerHireDate').value;
    const adminPin = document.getElementById('adminPin').value.trim();
    
    console.log('Form data:', { code, name, phone, birthday, position, groupId, salary, hireDate, adminPin: '***' });
    
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
    
    // Prepare worker data with new fields
    const workerData = {
        code: code,
        name: name,
        position: position,
        salary: salary,
        hire_date: hireDate,
        phone: phone || null,
        birthday: birthday || null,
        group_id: groupId ? parseInt(groupId) : null
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
    const today = getCurrentDate().toISOString().split('T')[0];
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

// DELETE WORKER FUNCTIONS

// Global variable to store worker data for deletion
let currentDeleteWorkerId = null;

// Show delete confirmation modal
window.confirmDeleteWorker = function(workerId, workerName, workerCode, workerPosition) {
    console.log('Delete button clicked! Confirming delete for worker:', workerId, workerName, workerCode, workerPosition);
    alert('Delete button clicked for worker: ' + workerName); // Temporary debug alert
    
    // Store worker data for deletion
    currentDeleteWorkerId = workerId;
    
    // Populate delete modal with worker information
    document.getElementById('deleteWorkerName').textContent = workerName;
    document.getElementById('deleteWorkerCode').textContent = workerCode;
    document.getElementById('deleteWorkerPosition').textContent = workerPosition;
    
    // Show delete confirmation modal
    const deleteModal = new bootstrap.Modal(document.getElementById('deleteWorkerModal'));
    deleteModal.show();
};

// Request PIN for delete action
window.requestDeletePin = function() {
    // Hide delete confirmation modal
    const deleteModal = bootstrap.Modal.getInstance(document.getElementById('deleteWorkerModal'));
    if (deleteModal) {
        deleteModal.hide();
    }
    
    // Clear PIN input and error message
    document.getElementById('pinModalAdminPin').value = '';
    document.getElementById('deletePinError').classList.add('d-none');
    
    // Show PIN modal
    const pinModal = new bootstrap.Modal(document.getElementById('deletePinModal'));
    pinModal.show();
};

// Handle worker deletion with PIN verification
window.handleDeleteWorker = async function() {
    const adminPin = document.getElementById('pinModalAdminPin').value.trim();
    const errorDiv = document.getElementById('deletePinError');
    
    // Clear previous error
    errorDiv.classList.add('d-none');
    
    // Validate PIN
    if (!adminPin || adminPin.length !== 4) {
        errorDiv.textContent = 'Please enter a valid 4-digit PIN';
        errorDiv.classList.remove('d-none');
        return;
    }
    
    if (!currentDeleteWorkerId) {
        errorDiv.textContent = 'No worker selected for deletion';
        errorDiv.classList.remove('d-none');
        return;
    }
    
    try {
        // Show loading state
        const deleteBtn = document.querySelector('#deletePinModal .btn-danger');
        const originalText = deleteBtn.innerHTML;
        deleteBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Deleting...';
        deleteBtn.disabled = true;
        
        // Send delete request
        const response = await fetch(`${API_BASE_URL}/workers/${currentDeleteWorkerId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-Admin-Pin': adminPin
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // Success - close modals
            const pinModal = bootstrap.Modal.getInstance(document.getElementById('deletePinModal'));
            if (pinModal) {
                pinModal.hide();
            }
            
            // Reset state
            currentDeleteWorkerId = null;
            
            // Reload workers table
            await loadWorkersTable();
            
            // Show success message
            showAlert('✅ Worker deleted successfully!', 'success');
            
        } else {
            // Handle errors
            if (response.status === 401) {
                errorDiv.textContent = 'Invalid admin PIN. Please try again.';
            } else if (response.status === 404) {
                errorDiv.textContent = 'Worker not found.';
            } else {
                errorDiv.textContent = result.error || 'Failed to delete worker. Please try again.';
            }
            errorDiv.classList.remove('d-none');
        }
        
    } catch (error) {
        console.error('Error deleting worker:', error);
        errorDiv.textContent = 'Network error. Please check your connection and try again.';
        errorDiv.classList.remove('d-none');
    } finally {
        // Reset button state
        const deleteBtn = document.querySelector('#deletePinModal .btn-danger');
        if (deleteBtn) {
            deleteBtn.innerHTML = '<i class="bi bi-trash me-1"></i>Confirm Delete';
            deleteBtn.disabled = false;
        }
    }
};

// WORKER PROFILE FUNCTIONS

window.showWorkerProfile = async function(workerId) {
    console.log('Loading worker profile for ID:', workerId);
    
    try {
        // Show modal with loading state
        const modal = new bootstrap.Modal(document.getElementById('workerProfileModal'));
        modal.show();
        
        // Load worker data and history
        const [worker, advances, loans] = await Promise.all([
            fetchWorkerById(workerId),
            fetchWorkerAdvances(workerId),
            fetchWorkerLoans(workerId)
        ]);
        
        // Display worker profile
        displayWorkerProfile(worker, advances, loans);
        
        // Setup action buttons
        setupProfileActionButtons(worker);
        
    } catch (error) {
        console.error('Error loading worker profile:', error);
        document.getElementById('workerProfileContent').innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle me-2"></i>
                Failed to load worker profile. Please try again.
            </div>
        `;
    }
};

async function fetchWorkerById(workerId) {
    try {
        const response = await fetch(`${API_BASE_URL}/workers/${workerId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch worker data');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching worker:', error);
        throw error;
    }
}

async function fetchWorkerAdvances(workerId) {
    try {
        const allAdvances = await apiCall('/advances');
        return allAdvances.filter(advance => advance.worker_id === workerId)
                         .sort((a, b) => new Date(b.date_given) - new Date(a.date_given));
    } catch (error) {
        console.error('Error fetching worker advances:', error);
        return [];
    }
}

async function fetchWorkerLoans(workerId) {
    try {
        const allLoans = await apiCall('/loans');
        const workerLoans = allLoans.filter(loan => loan.worker_id === workerId)
                                  .sort((a, b) => new Date(b.date_given) - new Date(a.date_given));
        
        // Fetch payments for each loan
        for (let loan of workerLoans) {
            try {
                const paymentResponse = await apiCall(`/loans/${loan.id}/payments`);
                // The backend returns { loan: {...}, payments: [...] }
                loan.payments = paymentResponse.payments || [];
                // Sort payments chronologically (oldest first) for better payment history view
                loan.payments.sort((a, b) => new Date(a.payment_date) - new Date(b.payment_date));
            } catch (error) {
                console.error(`Error fetching payments for loan ${loan.id}:`, error);
                loan.payments = [];
            }
        }
        
        return workerLoans;
    } catch (error) {
        console.error('Error fetching worker loans:', error);
        return [];
    }
}

function displayWorkerProfile(worker, advances, loans) {
    const profileContent = document.getElementById('workerProfileContent');
    
    // Calculate totals
    const totalAdvances = advances.reduce((sum, advance) => sum + advance.amount, 0);
    const unpaidAdvances = advances.filter(a => !a.is_paid_back).reduce((sum, a) => sum + a.amount, 0);
    const totalLoans = loans.reduce((sum, loan) => sum + loan.total_amount, 0);
    const unpaidLoans = loans.filter(l => !l.is_fully_paid).reduce((sum, l) => sum + (l.remaining_balance || 0), 0);
    
    profileContent.innerHTML = `
        <!-- Worker Info Section -->
        <div class="row mb-4">
            <div class="col-md-4 text-center">
                <div class="avatar-circle mx-auto mb-3" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 1.5rem; text-transform: uppercase;">
                    ${getWorkerInitials(worker.name)}
                </div>
                <h4 class="mb-1">${worker.name}</h4>
                <p class="text-muted mb-0">${worker.code}</p>
                ${worker.is_team_leader ? '<span class="badge bg-danger">Team Leader</span>' : ''}
            </div>
            <div class="col-md-8">
                <div class="row g-3">
                    <div class="col-sm-6">
                        <label class="form-label text-muted small">Position</label>
                        <p class="fw-bold mb-0">${worker.position}</p>
                    </div>
                    <div class="col-sm-6">
                        <label class="form-label text-muted small">Monthly Salary</label>
                        <p class="fw-bold mb-0 text-success">${formatCurrency(worker.salary)}</p>
                    </div>
                    <div class="col-sm-6">
                        <label class="form-label text-muted small">Phone</label>
                        <p class="fw-bold mb-0">${worker.phone || '-'}</p>
                    </div>
                    <div class="col-sm-6">
                        <label class="form-label text-muted small">Group</label>
                        <p class="fw-bold mb-0">${worker.group_name ? `<span class="badge bg-info">${worker.group_name}</span>` : '<span class="text-muted">No group</span>'}</p>
                    </div>
                    <div class="col-sm-6">
                        <label class="form-label text-muted small">Hire Date</label>
                        <p class="fw-bold mb-0">${formatDate(worker.hire_date)}</p>
                    </div>
                    <div class="col-sm-6">
                        <label class="form-label text-muted small">Birthday</label>
                        <p class="fw-bold mb-0">${worker.birthday ? formatDate(worker.birthday) : '-'}</p>
                    </div>
                    <div class="col-sm-6">
                        <label class="form-label text-muted small">Next Payment</label>
                        <p class="fw-bold mb-0">${worker.next_payment ? formatDate(worker.next_payment) : '-'}</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Financial Summary -->
        <div class="row mb-4">
            <div class="col-md-3">
                <div class="card bg-light">
                    <div class="card-body text-center">
                        <i class="bi bi-cash-stack fs-1 text-warning mb-2"></i>
                        <h6 class="card-title">Total Advances</h6>
                        <h5 class="text-warning">${formatCurrency(totalAdvances)}</h5>
                        <small class="text-muted">Unpaid: ${formatCurrency(unpaidAdvances)}</small>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card bg-light">
                    <div class="card-body text-center">
                        <i class="bi bi-credit-card fs-1 text-danger mb-2"></i>
                        <h6 class="card-title">Total Loans</h6>
                        <h5 class="text-danger">${formatCurrency(totalLoans)}</h5>
                        <small class="text-muted">Unpaid: ${formatCurrency(unpaidLoans)}</small>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card bg-light">
                    <div class="card-body text-center">
                        <i class="bi bi-wallet2 fs-1 text-success mb-2"></i>
                        <h6 class="card-title">Net Salary</h6>
                        <h5 class="text-success">${formatCurrency(Math.max(0, worker.salary - unpaidAdvances))}</h5>
                        <small class="text-muted">Salary minus advances only</small>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card bg-light">
                    <div class="card-body text-center">
                        <i class="bi bi-calendar-check fs-1 text-info mb-2"></i>
                        <h6 class="card-title">Work Duration</h6>
                        <h5 class="text-info">${calculateWorkDuration(worker.hire_date)}</h5>
                        <small class="text-muted">Months</small>
                    </div>
                </div>
            </div>
        </div>

        <!-- Tabs for History -->
        <ul class="nav nav-tabs" id="historyTabs" role="tablist">
            <li class="nav-item" role="presentation">
                <button class="nav-link active" id="advances-tab" data-bs-toggle="tab" data-bs-target="#advances" type="button" role="tab" aria-controls="advances" aria-selected="true">
                    <i class="bi bi-cash-stack me-1"></i>Advances History (${advances.length})
                </button>
            </li>
            <li class="nav-item" role="presentation">
                <button class="nav-link" id="loans-tab" data-bs-toggle="tab" data-bs-target="#loans" type="button" role="tab" aria-controls="loans" aria-selected="false">
                    <i class="bi bi-credit-card me-1"></i>Loans History (${loans.length})
                </button>
            </li>
        </ul>
        <div class="tab-content mt-3" id="historyTabContent">
            <!-- Advances Tab -->
            <div class="tab-pane fade show active" id="advances" role="tabpanel" aria-labelledby="advances-tab">
                ${generateAdvancesTable(advances)}
            </div>
            <!-- Loans Tab -->
            <div class="tab-pane fade" id="loans" role="tabpanel" aria-labelledby="loans-tab">
                ${generateLoansTable(loans)}
            </div>
        </div>
    `;
}

function generateAdvancesTable(advances) {
    if (advances.length === 0) {
        return '<div class="text-center text-muted py-4">No advances found for this worker.</div>';
    }

    return `
        <div class="table-responsive">
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Reason</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${advances.map(advance => `
                        <tr>
                            <td>${formatDate(advance.date_given)}</td>
                            <td><strong>${formatCurrency(advance.amount)}</strong></td>
                            <td>${advance.reason || '-'}</td>
                            <td>
                                <span class="badge ${advance.is_paid_back ? 'bg-success' : 'bg-warning'}">
                                    ${advance.is_paid_back ? 'Paid Back' : 'Pending'}
                                </span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function generateLoansTable(loans) {
    if (loans.length === 0) {
        return '<div class="text-center text-muted py-4">No loans found for this worker.</div>';
    }

    return `
        <div class="table-responsive">
            ${loans.map(loan => {
                const paidAmount = loan.amount_paid_back || 0;
                const remaining = loan.remaining_balance || 0;
                const payments = loan.payments || [];
                
                return `
                    <div class="card mb-3">
                        <div class="card-header">
                            <div class="row align-items-center">
                                <div class="col">
                                    <h6 class="mb-0">
                                        <i class="bi bi-credit-card me-2"></i>Loan #${loan.id} 
                                        <small class="text-muted">(${formatDate(loan.date_given)})</small>
                                    </h6>
                                </div>
                                <div class="col-auto">
                                    <span class="badge ${loan.is_fully_paid ? 'bg-success' : 'bg-danger'}">
                                        ${loan.is_fully_paid ? 'Fully Paid' : 'Outstanding'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div class="card-body">
                            <!-- Loan Summary -->
                            <div class="row mb-3">
                                <div class="col-md-3">
                                    <small class="text-muted">Total Amount</small>
                                    <div class="fw-bold text-danger">${formatCurrency(loan.total_amount)}</div>
                                </div>
                                <div class="col-md-3">
                                    <small class="text-muted">Paid Amount</small>
                                    <div class="fw-bold text-success">${formatCurrency(paidAmount)}</div>
                                </div>
                                <div class="col-md-3">
                                    <small class="text-muted">Remaining</small>
                                    <div class="fw-bold ${remaining > 0 ? 'text-warning' : 'text-success'}">${formatCurrency(remaining)}</div>
                                </div>
                                <div class="col-md-3">
                                    <small class="text-muted">Reason</small>
                                    <div class="fw-bold">${loan.reason || '-'}</div>
                                </div>
                            </div>
                            
                            ${payments.length > 0 ? `
                                <!-- Payment History -->
                                <h6 class="mb-2">
                                    <i class="bi bi-clock-history me-1"></i>Payment History (${payments.length} payments)
                                </h6>
                                <div class="table-responsive">
                                    <table class="table table-sm table-striped">
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Amount</th>
                                                <th>Notes</th>
                                                <th>Remaining After</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${payments.map((payment, index) => {
                                                // Calculate remaining balance after this payment
                                                // Since payments are now sorted chronologically (oldest first), we can calculate directly
                                                const totalPaidUpToThisPoint = payments.slice(0, index + 1).reduce((sum, p) => sum + p.payment_amount, 0);
                                                const remainingAfterPayment = loan.total_amount - totalPaidUpToThisPoint;
                                                
                                                return `
                                                    <tr>
                                                        <td>${formatDate(payment.payment_date)}</td>
                                                        <td class="text-success fw-bold">${formatCurrency(payment.payment_amount)}</td>
                                                        <td>${payment.notes || '-'}</td>
                                                        <td class="${remainingAfterPayment > 0 ? 'text-warning' : 'text-success'} fw-bold">
                                                            ${formatCurrency(Math.max(0, remainingAfterPayment))}
                                                        </td>
                                                    </tr>
                                                `;
                                            }).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            ` : `
                                <div class="text-center text-muted py-2">
                                    <i class="bi bi-info-circle me-1"></i>No payments made yet
                                </div>
                            `}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function calculateWorkDuration(hireDate) {
    const hire = new Date(hireDate);
    const now = new Date();
    const months = (now.getFullYear() - hire.getFullYear()) * 12 + (now.getMonth() - hire.getMonth());
    return Math.max(0, months);
}

function setupProfileActionButtons(worker) {
    // Edit Worker button
    document.getElementById('editWorkerFromProfile').onclick = function() {
        const modal = bootstrap.Modal.getInstance(document.getElementById('workerProfileModal'));
        modal.hide();
        setTimeout(() => editWorker(worker.id), 300);
    };
    
    // Give Advance button (Massarif)
    document.getElementById('giveAdvanceFromProfile').onclick = function() {
        const modal = bootstrap.Modal.getInstance(document.getElementById('workerProfileModal'));
        modal.hide();
        setTimeout(() => giveAdvanceModal(worker.id, worker.name, worker.salary), 300);
    };
    
    // Loan Options button (New Loan or Pay Existing)
    document.getElementById('giveLoanFromProfile').onclick = function() {
        const modal = bootstrap.Modal.getInstance(document.getElementById('workerProfileModal'));
        modal.hide();
        setTimeout(() => showLoanOptions(worker.id, worker.name, worker.salary), 300);
    };
}
