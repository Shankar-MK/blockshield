// API Configuration
const API_BASE_URL = window.location.origin;
let currentUser = null;
let authToken = null;
let selectedSimulation = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    // Check for saved token
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('currentUser');
    
    if (savedToken && savedUser) {
        authToken = savedToken;
        currentUser = JSON.parse(savedUser);
        updateUIForAuthenticatedUser();
        showPage('dashboard');
        loadDashboardData();
    } else {
        showPage('landing');
    }
});

// Page Management
function showPage(pageName) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show selected page
    const pageMap = {
        'landing': 'landingPage',
        'register': 'registerPage',
        'login': 'loginPage',
        'dashboard': 'dashboardPage'
    };
    
    const pageId = pageMap[pageName];
    if (pageId) {
        document.getElementById(pageId).classList.add('active');
    }
    
    // Update navigation
    updateNavigation(pageName);
}

function updateNavigation(currentPage) {
    const isAuthenticated = authToken !== null;
    
    // Show/hide nav links
    document.getElementById('navHome').style.display = isAuthenticated ? 'none' : 'block';
    document.getElementById('navLogin').style.display = isAuthenticated ? 'none' : 'block';
    document.getElementById('navRegister').style.display = isAuthenticated ? 'none' : 'block';
    document.getElementById('navLogout').style.display = isAuthenticated ? 'block' : 'none';
    document.getElementById('userInfo').style.display = isAuthenticated ? 'flex' : 'none';
    
    if (isAuthenticated && currentUser) {
        document.getElementById('userName').textContent = currentUser.name;
    }
}

function updateUIForAuthenticatedUser() {
    updateNavigation('dashboard');
}

// Authentication Functions
async function handleRegister(event) {
    event.preventDefault();
    
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    
    const messageEl = document.getElementById('registerMessage');
    messageEl.className = 'auth-message';
    messageEl.style.display = 'none';
    
    showLoading(true);
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            messageEl.textContent = data.message + ' Redirecting to login...';
            messageEl.className = 'auth-message success';
            
            // Clear form
            document.getElementById('registerForm').reset();
            
            // Redirect to login after 2 seconds
            setTimeout(() => {
                showPage('login');
                // Pre-fill email
                document.getElementById('loginEmail').value = email;
            }, 2000);
        } else {
            messageEl.textContent = data.message;
            messageEl.className = 'auth-message error';
        }
    } catch (error) {
        console.error('Registration error:', error);
        messageEl.textContent = 'Network error. Please try again.';
        messageEl.className = 'auth-message error';
    } finally {
        showLoading(false);
    }
}

async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    const messageEl = document.getElementById('loginMessage');
    messageEl.className = 'auth-message';
    messageEl.style.display = 'none';
    
    showLoading(true);
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Save authentication data
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            // Update UI
            updateUIForAuthenticatedUser();
            
            // Clear form
            document.getElementById('loginForm').reset();
            
            // Show dashboard
            showPage('dashboard');
            loadDashboardData();
        } else {
            messageEl.textContent = data.message;
            messageEl.className = 'auth-message error';
        }
    } catch (error) {
        console.error('Login error:', error);
        messageEl.textContent = 'Network error. Please try again.';
        messageEl.className = 'auth-message error';
    } finally {
        showLoading(false);
    }
}

function logout() {
    // Clear authentication data
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    
    // Update UI
    updateNavigation('landing');
    showPage('landing');
}

// Dashboard Functions
async function loadDashboardData() {
    await Promise.all([
        loadStats(),
        loadSimulations(),
        loadResults(),
        loadLogs()
    ]);
}

async function loadStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/dashboard/stats`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const stats = await response.json();
            
            document.getElementById('statCompleted').textContent = stats.completedSimulations;
            document.getElementById('statAvgScore').textContent = stats.averageScore + '%';
            
            // Convert seconds to hours
            const hours = Math.floor(stats.totalTimeSpent / 3600);
            const minutes = Math.floor((stats.totalTimeSpent % 3600) / 60);
            document.getElementById('statTime').textContent = 
                hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadSimulations() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/simulations`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const simulations = await response.json();
            displaySimulations(simulations);
        }
    } catch (error) {
        console.error('Error loading simulations:', error);
    }
}

function displaySimulations(simulations) {
    const grid = document.getElementById('simulationsGrid');
    grid.innerHTML = '';
    
    // Group by category
    const categories = {};
    simulations.forEach(sim => {
        if (!categories[sim.category]) {
            categories[sim.category] = [];
        }
        categories[sim.category].push(sim);
    });
    
    // Display all simulations
    simulations.forEach(sim => {
        const card = document.createElement('div');
        card.className = 'simulation-card';
        card.onclick = () => showSimulationModal(sim);
        
        card.innerHTML = `
            <div class="simulation-header">
                <div>
                    <h3>${sim.name}</h3>
                    <div class="simulation-meta">
                        <span>📂 ${sim.category}</span>
                        <span>⏱️ ${sim.estimated_time}</span>
                    </div>
                </div>
                <span class="difficulty-badge ${sim.difficulty.toLowerCase()}">${sim.difficulty}</span>
            </div>
            <p>${sim.description}</p>
        `;
        
        grid.appendChild(card);
    });
}

function showSimulationModal(simulation) {
    selectedSimulation = simulation;
    
    const modal = document.getElementById('simulationModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    modalTitle.textContent = simulation.name;
    
    modalBody.innerHTML = `
        <div style="margin-bottom: 1.5rem;">
            <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
                <span class="difficulty-badge ${simulation.difficulty.toLowerCase()}">${simulation.difficulty}</span>
                <span class="status-badge" style="background: rgba(0, 212, 255, 0.2); color: var(--accent);">
                    ${simulation.category}
                </span>
            </div>
            <p style="color: var(--text-secondary); line-height: 1.6; margin-bottom: 1rem;">
                ${simulation.description}
            </p>
            <div style="padding: 1rem; background: var(--dark-bg); border-radius: 8px; border-left: 3px solid var(--primary);">
                <strong style="color: var(--primary);">⏱️ Estimated Time:</strong>
                <span style="color: var(--text-secondary);"> ${simulation.estimated_time}</span>
            </div>
        </div>
        
        <div style="padding: 1rem; background: rgba(255, 187, 0, 0.1); border: 1px solid var(--warning); border-radius: 8px;">
            <strong style="color: var(--warning);">⚠️ Important:</strong>
            <p style="color: var(--text-secondary); margin-top: 0.5rem; line-height: 1.6;">
                This simulation is for educational purposes only. Use it responsibly in controlled environments.
                The target system is isolated and designed for training.
            </p>
        </div>
        
        <div style="margin-top: 1.5rem; padding: 1rem; background: var(--dark-bg); border-radius: 8px;">
            <h4 style="color: var(--primary); margin-bottom: 0.5rem;">🎯 Learning Objectives:</h4>
            <ul style="color: var(--text-secondary); line-height: 1.8; margin-left: 1.5rem;">
                <li>Understand attack methodology and techniques</li>
                <li>Learn defensive strategies and countermeasures</li>
                <li>Gain hands-on experience with security tools</li>
                <li>Develop threat detection capabilities</li>
            </ul>
        </div>
        
        <div style="margin-top: 1.5rem; padding: 1rem; background: var(--dark-bg); border-radius: 8px;">
            <h4 style="color: var(--primary); margin-bottom: 0.5rem;">🛠️ Tools You May Use:</h4>
            <p style="color: var(--text-secondary);">
                Kali Linux, Hydra, Metasploit, Nmap, Burp Suite, or any penetration testing tools
            </p>
        </div>
    `;
    
    modal.classList.add('active');
}

function closeModal() {
    document.getElementById('simulationModal').classList.remove('active');
    selectedSimulation = null;
}

async function startSimulation() {
    if (!selectedSimulation) return;
    
    showLoading(true);
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/simulations/${selectedSimulation.id}/start`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            
            // Close modal
            closeModal();
            
            // Show success message
            alert(`Simulation "${selectedSimulation.name}" started successfully!\n\nYou can now perform your attacks from Kali Linux.\n\nTarget: ${window.location.origin}\nSimulation ID: ${data.resultId}`);
            
            // Reload data
            await loadDashboardData();
        } else {
            const data = await response.json();
            alert('Error starting simulation: ' + data.message);
        }
    } catch (error) {
        console.error('Error starting simulation:', error);
        alert('Network error. Please try again.');
    } finally {
        showLoading(false);
    }
}

async function loadResults() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/results`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const results = await response.json();
            displayResults(results);
        }
    } catch (error) {
        console.error('Error loading results:', error);
    }
}

function displayResults(results) {
    const tbody = document.getElementById('resultsTableBody');
    tbody.innerHTML = '';
    
    if (results.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                    No results yet. Start a simulation to see your results here.
                </td>
            </tr>
        `;
        return;
    }
    
    results.forEach(result => {
        const row = document.createElement('tr');
        
        const duration = result.duration_seconds 
            ? formatDuration(result.duration_seconds)
            : 'In Progress';
        
        const date = new Date(result.started_at).toLocaleDateString();
        
        row.innerHTML = `
            <td>${result.simulation_name}</td>
            <td>${result.category}</td>
            <td><span class="status-badge ${result.status}">${result.status}</span></td>
            <td>${result.score || '-'}</td>
            <td>${duration}</td>
            <td>${date}</td>
        `;
        
        tbody.appendChild(row);
    });
}

async function loadLogs() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/attack-logs`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const logs = await response.json();
            displayLogs(logs);
        }
    } catch (error) {
        console.error('Error loading logs:', error);
    }
}

function displayLogs(logs) {
    const tbody = document.getElementById('logsTableBody');
    tbody.innerHTML = '';
    
    if (logs.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                    No attack logs yet.
                </td>
            </tr>
        `;
        return;
    }
    
    logs.forEach(log => {
        const row = document.createElement('tr');
        
        const timestamp = new Date(log.timestamp).toLocaleString();
        const status = log.success ? 'success' : 'failed';
        
        row.innerHTML = `
            <td>${timestamp}</td>
            <td>${log.email || '-'}</td>
            <td>${log.ip_address || '-'}</td>
            <td>${log.attack_type}</td>
            <td><span class="status-badge ${status}">${status}</span></td>
            <td>${log.details || '-'}</td>
        `;
        
        tbody.appendChild(row);
    });
}

// Tab Management
function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    const tabMap = {
        'simulations': 'simulationsTab',
        'results': 'resultsTab',
        'logs': 'logsTab'
    };
    
    const tabId = tabMap[tabName];
    if (tabId) {
        document.getElementById(tabId).classList.add('active');
    }
    
    // Add active class to clicked button
    event.target.classList.add('active');
}

// Utility Functions
function showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    spinner.style.display = show ? 'flex' : 'none';
}

function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    } else {
        return `${secs}s`;
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('simulationModal');
    if (event.target === modal) {
        closeModal();
    }
}
