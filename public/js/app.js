// API Base URL
const API_BASE = '/api';

// State management
let tunnels = [];
let authProfiles = [];

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initForms();
    loadAuthProfiles();
    loadTunnels();

    // Auto-refresh tunnels every 10 seconds
    setInterval(loadTunnels, 10000);
});

// Tab functionality
function initTabs() {
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;

            // Remove active class from all tabs and contents
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(tc => tc.classList.remove('active'));

            // Add active class to clicked tab and corresponding content
            tab.classList.add('active');
            document.getElementById(`${targetTab}-tab`).classList.add('active');

            // Reload data when switching tabs
            if (targetTab === 'tunnels') {
                loadTunnels();
            } else if (targetTab === 'auth') {
                loadAuthProfiles();
            }
        });
    });
}

// Initialize forms
function initForms() {
    // Create tunnel form
    document.getElementById('create-tunnel-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await createTunnel();
    });

    // Create auth profile form
    document.getElementById('create-auth-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await createAuthProfile();
    });

    // Refresh tunnels button
    document.getElementById('refresh-tunnels').addEventListener('click', loadTunnels);
}

// Load auth profiles
async function loadAuthProfiles() {
    try {
        const response = await fetch(`${API_BASE}/auth-profiles`);
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error);
        }

        authProfiles = data.profiles;
        renderAuthProfiles();
        updateAuthProfileSelect();
    } catch (error) {
        showToast('Error loading auth profiles', error.message, 'error');
    }
}

// Render auth profiles list
function renderAuthProfiles() {
    const container = document.getElementById('auth-profiles-list');

    if (authProfiles.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg width="64" height="64" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
                <p>No auth profiles</p>
                <small>Create a profile to secure your tunnels</small>
            </div>
        `;
        return;
    }

    container.innerHTML = authProfiles.map(profile => `
        <div class="auth-profile-item">
            <div class="auth-profile-header">
                <div class="auth-profile-info">
                    <h3>${escapeHtml(profile.name)}</h3>
                    <div class="detail-item">
                        <span class="detail-label">Username</span>
                        <span class="detail-value">${escapeHtml(profile.username)}</span>
                    </div>
                </div>
                <button class="btn btn-danger btn-sm" onclick="deleteAuthProfile('${profile.id}')">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                    Delete
                </button>
            </div>
            <div class="tunnel-details">
                <div class="detail-item">
                    <span class="detail-label">Created</span>
                    <span class="detail-value">${formatDate(profile.created_at)}</span>
                </div>
                ${profile.last_used ? `
                    <div class="detail-item">
                        <span class="detail-label">Last Used</span>
                        <span class="detail-value">${formatDate(profile.last_used)}</span>
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// Update auth profile select dropdown
function updateAuthProfileSelect() {
    const select = document.getElementById('authProfileId');

    select.innerHTML = '<option value="">No Authentication</option>' +
        authProfiles.map(profile =>
            `<option value="${profile.id}">${escapeHtml(profile.name)} (${escapeHtml(profile.username)})</option>`
        ).join('');
}

// Create auth profile
async function createAuthProfile() {
    const form = document.getElementById('create-auth-form');
    const formData = new FormData(form);

    const password = formData.get('password');
    const passwordConfirm = formData.get('passwordConfirm');

    if (password !== passwordConfirm) {
        showToast('Validation Error', 'Passwords do not match', 'error');
        return;
    }

    const data = {
        name: formData.get('name'),
        username: formData.get('username'),
        password: password
    };

    try {
        const response = await fetch(`${API_BASE}/auth-profiles`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Failed to create auth profile');
        }

        showToast('Success', 'Auth profile created successfully', 'success');
        form.reset();
        await loadAuthProfiles();
    } catch (error) {
        showToast('Error', error.message, 'error');
    }
}

// Delete auth profile
async function deleteAuthProfile(id) {
    if (!confirm('Are you sure you want to delete this auth profile?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/auth-profiles/${id}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Failed to delete auth profile');
        }

        showToast('Success', 'Auth profile deleted successfully', 'success');
        await loadAuthProfiles();
    } catch (error) {
        showToast('Error', error.message, 'error');
    }
}

// Load tunnels
async function loadTunnels() {
    try {
        const response = await fetch(`${API_BASE}/tunnels`);
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error);
        }

        tunnels = data.tunnels;
        renderTunnels();
    } catch (error) {
        console.error('Error loading tunnels:', error);
        // Don't show error toast for auto-refresh failures
    }
}

// Render tunnels list
function renderTunnels() {
    const container = document.getElementById('tunnels-list');

    if (tunnels.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg width="64" height="64" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
                <p>No active tunnels</p>
                <small>Create a tunnel to get started</small>
            </div>
        `;
        return;
    }

    container.innerHTML = tunnels.map(tunnel => `
        <div class="tunnel-item">
            <div class="tunnel-header">
                <div class="tunnel-info">
                    <h3>Port ${tunnel.port}</h3>
                    ${tunnel.url ? `
                        <div class="tunnel-url">
                            <a href="${escapeHtml(tunnel.url)}" target="_blank" rel="noopener noreferrer">
                                ${escapeHtml(tunnel.url)}
                            </a>
                            <button class="copy-btn" onclick="copyToClipboard('${escapeHtml(tunnel.url)}')">
                                Copy
                            </button>
                        </div>
                    ` : ''}
                </div>
                <span class="status-badge ${tunnel.status}">
                    <span class="status-indicator"></span>
                    ${tunnel.status}
                </span>
            </div>
            <div class="tunnel-details">
                ${tunnel.subdomain ? `
                    <div class="detail-item">
                        <span class="detail-label">Subdomain</span>
                        <span class="detail-value">${escapeHtml(tunnel.subdomain)}</span>
                    </div>
                ` : ''}
                ${tunnel.auth_profile_name ? `
                    <div class="detail-item">
                        <span class="detail-label">Auth Profile</span>
                        <span class="detail-value">${escapeHtml(tunnel.auth_profile_name)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Username</span>
                        <span class="detail-value">${escapeHtml(tunnel.auth_username)}</span>
                    </div>
                ` : ''}
                <div class="detail-item">
                    <span class="detail-label">Created</span>
                    <span class="detail-value">${formatDate(tunnel.created_at)}</span>
                </div>
            </div>
            <div class="tunnel-actions">
                <button class="btn btn-danger btn-sm" onclick="closeTunnel('${tunnel.id}')">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                    Close Tunnel
                </button>
            </div>
        </div>
    `).join('');
}

// Create tunnel
async function createTunnel() {
    const form = document.getElementById('create-tunnel-form');
    const formData = new FormData(form);

    const data = {
        port: parseInt(formData.get('port')),
        subdomain: formData.get('subdomain') || undefined,
        authProfileId: formData.get('authProfileId') || undefined
    };

    try {
        const response = await fetch(`${API_BASE}/tunnels`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Failed to create tunnel');
        }

        showToast('Success', `Tunnel created: ${result.tunnel.url}`, 'success');
        form.reset();
        await loadTunnels();
    } catch (error) {
        showToast('Error', error.message, 'error');
    }
}

// Close tunnel
async function closeTunnel(id) {
    if (!confirm('Are you sure you want to close this tunnel?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/tunnels/${id}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Failed to close tunnel');
        }

        showToast('Success', 'Tunnel closed successfully', 'success');
        await loadTunnels();
    } catch (error) {
        showToast('Error', error.message, 'error');
    }
}

// Copy to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Copied', 'URL copied to clipboard', 'success');
    }).catch(err => {
        showToast('Error', 'Failed to copy to clipboard', 'error');
    });
}

// Show toast notification
function showToast(title, message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: '<svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" style="color: var(--success)"/></svg>',
        error: '<svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" style="color: var(--danger)"/></svg>',
        warning: '<svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" style="color: var(--warning)"/></svg>',
        info: '<svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" style="color: var(--info)"/></svg>'
    };

    toast.innerHTML = `
        <div class="toast-icon">${icons[type]}</div>
        <div class="toast-content">
            <div class="toast-title">${escapeHtml(title)}</div>
            <div class="toast-message">${escapeHtml(message)}</div>
        </div>
    `;

    container.appendChild(toast);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s reverse';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    // Less than 1 minute
    if (diff < 60000) {
        return 'Just now';
    }

    // Less than 1 hour
    if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000);
        return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    }

    // Less than 24 hours
    if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    }

    // More than 24 hours
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}
