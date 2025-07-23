// Groups Management JavaScript
const API_BASE = 'http://127.0.0.1:5000/api';
const ADMIN_PIN = '1234';

let currentGroups = [];
let currentWorkers = [];
let currentGroupId = null;

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    loadGroups();
    loadWorkers();
    
    // Event listeners
    document.getElementById('addGroupBtn').addEventListener('click', showCreateGroupModal);
    document.getElementById('refreshBtn').addEventListener('click', refreshData);
    document.getElementById('groupForm').addEventListener('submit', handleGroupSubmit);
    document.getElementById('confirmDeleteBtn').addEventListener('click', handleDeleteGroup);
    
    // Event delegation for delete group buttons
    document.addEventListener('click', function(e) {
        if (e.target.closest('.delete-group-btn')) {
            e.preventDefault();
            const deleteBtn = e.target.closest('.delete-group-btn');
            const groupId = parseInt(deleteBtn.dataset.groupId);
            const groupName = deleteBtn.dataset.groupName;
            confirmDeleteGroup(groupId, groupName);
        }
    });
});

// Load all groups from API
async function loadGroups() {
    try {
        const response = await fetch(`${API_BASE}/groups`);
        const groups = await response.json();
        currentGroups = groups;
        renderGroups(groups);
        updateStatistics(groups);
    } catch (error) {
        console.error('Error loading groups:', error);
        showAlert('Error loading groups', 'danger');
    }
}

// Load all workers from API
async function loadWorkers() {
    try {
        const response = await fetch(`${API_BASE}/workers`);
        const workers = await response.json();
        currentWorkers = workers;
        populateTeamLeaderSelect(workers);
    } catch (error) {
        console.error('Error loading workers:', error);
    }
}

// Render groups as cards
function renderGroups(groups) {
    const container = document.getElementById('groupsContainer');
    const emptyState = document.getElementById('emptyState');
    
    if (groups.length === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    container.innerHTML = groups.map(group => `
        <div class="col-md-6 col-lg-4 mb-4">
            <div class="card group-card h-100">
                <div class="group-header p-3">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h5 class="card-title mb-1">${group.name}</h5>
                            <small class="opacity-75">Created: ${formatDate(group.created_at)}</small>
                        </div>
                        <div class="dropdown">
                            <button class="btn btn-link text-white p-0" data-bs-toggle="dropdown">
                                <i class="bi bi-three-dots-vertical"></i>
                            </button>
                            <ul class="dropdown-menu">
                                <li><a class="dropdown-item" href="#" onclick="editGroup(${group.id})">
                                    <i class="bi bi-pencil me-2"></i>Edit Group
                                </a></li>
                                <li><a class="dropdown-item" href="#" onclick="manageMembers(${group.id})">
                                    <i class="bi bi-people me-2"></i>Manage Members
                                </a></li>
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item text-danger delete-group-btn" href="#" data-group-id="${group.id}" data-group-name="${group.name}">
                                    <i class="bi bi-trash me-2"></i>Delete Group
                                </a></li>
                            </ul>
                        </div>
                    </div>
                </div>
                
                <div class="card-body">
                    <!-- Team Leader -->
                    <div class="d-flex align-items-center mb-3">
                        <div class="worker-avatar me-2">
                            ${group.team_leader_name ? group.team_leader_name.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div>
                            <small class="text-muted">Team Leader</small>
                            <div class="fw-bold">
                                ${group.team_leader_name || 'No leader assigned'}
                            </div>
                        </div>
                        ${group.team_leader_name ? `<span class="badge team-leader-badge ms-auto">Leader</span>` : ''}
                    </div>
                    
                    <!-- Members Count -->
                    <div class="d-flex align-items-center justify-content-between mb-3">
                        <div>
                            <small class="text-muted">Team Members</small>
                            <div class="fw-bold">${group.workers_count} members</div>
                        </div>
                        <span class="badge member-count-badge">${group.workers_count}</span>
                    </div>
                    
                    <!-- Progress bar for team completion -->
                    <div class="mb-3">
                        <small class="text-muted">Team Status</small>
                        <div class="progress mt-1" style="height: 8px;">
                            <div class="progress-bar ${getStatusColor(group)}" 
                                 style="width: ${getCompletionPercentage(group)}%">
                            </div>
                        </div>
                        <small class="text-muted">${getStatusText(group)}</small>
                    </div>
                </div>
                
                <div class="group-actions p-3">
                    <div class="btn-group w-100" role="group">
                        <button class="btn btn-outline-primary btn-sm" onclick="manageMembers(${group.id})">
                            <i class="bi bi-people me-1"></i>Members
                        </button>
                        <button class="btn btn-outline-secondary btn-sm" onclick="editGroup(${group.id})">
                            <i class="bi bi-pencil me-1"></i>Edit
                        </button>
                        <button class="btn btn-outline-info btn-sm" onclick="viewGroupDetails(${group.id})">
                            <i class="bi bi-eye me-1"></i>View
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Update statistics
function updateStatistics(groups) {
    const totalGroups = groups.length;
    const totalLeaders = groups.filter(g => g.team_leader_name).length;
    const totalMembers = groups.reduce((sum, g) => sum + g.workers_count, 0);
    const avgGroupSize = totalGroups > 0 ? (totalMembers / totalGroups).toFixed(1) : 0;
    
    document.getElementById('totalGroups').textContent = totalGroups;
    document.getElementById('totalLeaders').textContent = totalLeaders;
    document.getElementById('totalMembers').textContent = totalMembers;
    document.getElementById('avgGroupSize').textContent = avgGroupSize;
}

// Helper functions for group status
function getStatusColor(group) {
    if (!group.team_leader_name) return 'bg-warning';
    if (group.workers_count === 0) return 'bg-danger';
    if (group.workers_count < 3) return 'bg-info';
    return 'bg-success';
}

function getCompletionPercentage(group) {
    if (!group.team_leader_name) return 25;
    if (group.workers_count === 0) return 10;
    if (group.workers_count < 3) return 60;
    return 100;
}

function getStatusText(group) {
    if (!group.team_leader_name) return 'Needs team leader';
    if (group.workers_count === 0) return 'No members';
    if (group.workers_count < 3) return 'Small team';
    return 'Complete team';
}

// Populate team leader select dropdown
function populateTeamLeaderSelect(workers) {
    const select = document.getElementById('teamLeader');
    const availableLeaders = workers.filter(w => !w.is_team_leader);
    
    select.innerHTML = '<option value="">Select a team leader (optional)</option>';
    availableLeaders.forEach(worker => {
        select.innerHTML += `<option value="${worker.id}">${worker.name} (${worker.position})</option>`;
    });
}

// Show create group modal
function showCreateGroupModal() {
    document.getElementById('groupModalTitle').textContent = 'Create New Group';
    document.getElementById('groupForm').reset();
    currentGroupId = null;
    
    const modal = new bootstrap.Modal(document.getElementById('groupModal'));
    modal.show();
}

// Edit group
function editGroup(groupId) {
    const group = currentGroups.find(g => g.id === groupId);
    if (!group) return;
    
    document.getElementById('groupModalTitle').textContent = 'Edit Group';
    document.getElementById('groupName').value = group.name;
    document.getElementById('teamLeader').value = group.team_leader_id || '';
    currentGroupId = groupId;
    
    const modal = new bootstrap.Modal(document.getElementById('groupModal'));
    modal.show();
}

// Handle group form submission
async function handleGroupSubmit(e) {
    e.preventDefault();
    
    const formData = {
        name: document.getElementById('groupName').value,
        team_leader_id: document.getElementById('teamLeader').value || null
    };
    
    try {
        const url = currentGroupId 
            ? `${API_BASE}/groups/${currentGroupId}`
            : `${API_BASE}/groups`;
        
        const method = currentGroupId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'X-Admin-Pin': ADMIN_PIN
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showAlert(result.message, 'success');
            bootstrap.Modal.getInstance(document.getElementById('groupModal')).hide();
            refreshData();
        } else {
            showAlert(result.error, 'danger');
        }
    } catch (error) {
        console.error('Error saving group:', error);
        showAlert('Error saving group', 'danger');
    }
}

// Confirm delete group
function confirmDeleteGroup(groupId, groupName) {
    console.log('Confirming delete for group:', groupId, groupName);
    
    if (!groupId || !groupName) {
        showAlert('Invalid group data for deletion', 'danger');
        return;
    }
    
    document.getElementById('deleteGroupName').textContent = groupName;
    currentGroupId = groupId;
    
    const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
    modal.show();
}

// Handle delete group
async function handleDeleteGroup() {
    if (!currentGroupId) {
        showAlert('No group selected for deletion', 'danger');
        return;
    }
    
    try {
        // Show loading state
        const deleteBtn = document.getElementById('confirmDeleteBtn');
        const originalText = deleteBtn.innerHTML;
        deleteBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Deleting...';
        deleteBtn.disabled = true;
        
        console.log('Deleting group with ID:', currentGroupId);
        
        const response = await fetch(`${API_BASE}/groups/${currentGroupId}`, {
            method: 'DELETE',
            headers: {
                'X-Admin-Pin': ADMIN_PIN,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Delete response status:', response.status);
        
        const result = await response.json();
        console.log('Delete response body:', result);
        
        if (response.ok) {
            showAlert(result.message || 'Group deleted successfully', 'success');
            bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide();
            currentGroupId = null; // Reset after successful deletion
            refreshData();
        } else {
            showAlert(result.error || `Failed to delete group (Status: ${response.status})`, 'danger');
        }
        
    } catch (error) {
        console.error('Error deleting group:', error);
        showAlert('Network error while deleting group. Please check your connection.', 'danger');
    } finally {
        // Restore button state
        const deleteBtn = document.getElementById('confirmDeleteBtn');
        if (deleteBtn) {
            deleteBtn.innerHTML = '<i class="bi bi-trash me-2"></i>Delete Group';
            deleteBtn.disabled = false;
        }
    }
}

// Manage group members
async function manageMembers(groupId) {
    const group = currentGroups.find(g => g.id === groupId);
    if (!group) return;
    
    currentGroupId = groupId;
    document.getElementById('memberModalGroupName').textContent = group.name;
    
    try {
        // Load group members
        const membersResponse = await fetch(`${API_BASE}/groups/${groupId}/workers`);
        const members = await membersResponse.json();
        
        // Get available workers (not in any group)
        const availableWorkers = currentWorkers.filter(w => !w.group_id);
        
        renderAvailableWorkers(availableWorkers);
        renderGroupMembers(members);
        
        const modal = new bootstrap.Modal(document.getElementById('membersModal'));
        modal.show();
    } catch (error) {
        console.error('Error loading members:', error);
        showAlert('Error loading members', 'danger');
    }
}

// Render available workers list
function renderAvailableWorkers(workers) {
    const container = document.getElementById('availableWorkersList');
    
    if (workers.length === 0) {
        container.innerHTML = '<p class="text-muted">No available workers</p>';
        return;
    }
    
    container.innerHTML = workers.map(worker => `
        <div class="list-group-item d-flex justify-content-between align-items-center">
            <div class="d-flex align-items-center">
                <div class="worker-avatar me-2">${worker.name.charAt(0).toUpperCase()}</div>
                <div>
                    <div class="fw-bold">${worker.name}</div>
                    <small class="text-muted">${worker.position}</small>
                </div>
            </div>
            <button class="btn btn-sm btn-outline-primary" onclick="addWorkerToGroup(${worker.id})">
                <i class="bi bi-plus"></i>
            </button>
        </div>
    `).join('');
}

// Render group members list
function renderGroupMembers(members) {
    const container = document.getElementById('groupMembersList');
    
    if (members.length === 0) {
        container.innerHTML = '<p class="text-muted">No members in this group</p>';
        return;
    }
    
    container.innerHTML = members.map(member => `
        <div class="list-group-item d-flex justify-content-between align-items-center">
            <div class="d-flex align-items-center">
                <div class="worker-avatar me-2">${member.name.charAt(0).toUpperCase()}</div>
                <div>
                    <div class="fw-bold">
                        ${member.name}
                        ${member.is_team_leader ? '<span class="badge team-leader-badge ms-2">Leader</span>' : ''}
                    </div>
                    <small class="text-muted">${member.position}</small>
                </div>
            </div>
            ${!member.is_team_leader ? `
                <button class="btn btn-sm btn-outline-danger" onclick="removeWorkerFromGroup(${member.id})">
                    <i class="bi bi-dash"></i>
                </button>
            ` : ''}
        </div>
    `).join('');
}

// Add worker to group
async function addWorkerToGroup(workerId) {
    try {
        const response = await fetch(`${API_BASE}/groups/${currentGroupId}/add_worker`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Admin-Pin': ADMIN_PIN
            },
            body: JSON.stringify({ worker_id: workerId })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showAlert(result.message, 'success');
            // Refresh the members modal
            await loadWorkers();
            manageMembers(currentGroupId);
            loadGroups(); // Refresh groups to update counts
        } else {
            showAlert(result.error, 'danger');
        }
    } catch (error) {
        console.error('Error adding worker to group:', error);
        showAlert('Error adding worker to group', 'danger');
    }
}

// Remove worker from group
async function removeWorkerFromGroup(workerId) {
    try {
        const response = await fetch(`${API_BASE}/groups/${currentGroupId}/remove_worker`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Admin-Pin': ADMIN_PIN
            },
            body: JSON.stringify({ worker_id: workerId })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showAlert(result.message, 'success');
            // Refresh the members modal
            await loadWorkers();
            manageMembers(currentGroupId);
            loadGroups(); // Refresh groups to update counts
        } else {
            showAlert(result.error, 'danger');
        }
    } catch (error) {
        console.error('Error removing worker from group:', error);
        showAlert('Error removing worker from group', 'danger');
    }
}

// View group details (placeholder for future feature)
function viewGroupDetails(groupId) {
    const group = currentGroups.find(g => g.id === groupId);
    if (!group) return;
    
    showAlert(`Group Details for "${group.name}" - Feature coming soon!`, 'info');
}

// Refresh all data
async function refreshData() {
    await Promise.all([loadGroups(), loadWorkers()]);
    showAlert('Data refreshed successfully', 'success');
}

// Utility functions
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString();
}

function showAlert(message, type) {
    // Create and show Bootstrap alert
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.parentNode.removeChild(alertDiv);
        }
    }, 5000);
}
