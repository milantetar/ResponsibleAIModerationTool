// Application State
class AppState {
    constructor() {
        this.user = null;
        this.freeScansUsed = parseInt(localStorage.getItem('freeScansUsed') || '0');
        this.lastModerationResult = null;
        this.currentView = 'moderation';
    }

    updateFreeScans(count) {
        this.freeScansUsed = count;
        localStorage.setItem('freeScansUsed', count.toString());
        this.updateUsageIndicator();
    }

    updateUsageIndicator() {
        const remainingScans = Math.max(0, 5 - this.freeScansUsed);
        const usageText = document.getElementById('usageText');
        const remainingSpan = document.getElementById('remainingScans');
        const usageProgress = document.getElementById('usageProgress');

        if (this.user) {
            usageText.innerHTML = 'Logged in: <strong>Unlimited</strong> scans';
            usageProgress.style.width = '100%';
        } else {
            remainingSpan.textContent = remainingScans;
            const progressPercent = ((5 - remainingScans) / 5) * 100;
            usageProgress.style.width = `${progressPercent}%`;
        }
    }

    setUser(user) {
        this.user = user;
        this.updateUI();
        this.updateUsageIndicator();
    }

    clearUser() {
        this.user = null;
        this.updateUI();
        this.updateUsageIndicator();
    }

    updateUI() {
        const authSection = document.getElementById('authSection');
        const userSection = document.getElementById('userSection');
        const userEmail = document.getElementById('userEmail');
        const dashboardBtn = document.getElementById('dashboardBtn');

        if (this.user) {
            authSection.style.display = 'none';
            userSection.style.display = 'flex';
            userEmail.textContent = this.user.email;
            dashboardBtn.style.display = 'inline-flex';
        } else {
            authSection.style.display = 'flex';
            userSection.style.display = 'none';
        }
    }

    switchView(view) {
        this.currentView = view;
        const moderationSection = document.getElementById('moderationSection');
        const dashboardSection = document.getElementById('dashboardSection');
        const heroSection = document.getElementById('heroSection');

        // Hide all sections
        moderationSection.style.display = 'none';
        dashboardSection.style.display = 'none';
        heroSection.style.display = 'none';

        // Show selected section
        if (view === 'moderation') {
            moderationSection.style.display = 'block';
            heroSection.style.display = 'block';
        } else if (view === 'dashboard') {
            dashboardSection.style.display = 'block';
        }
    }
}

// API Service
class APIService {
    constructor() {
        this.baseURL = '/api';
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            credentials: 'include',
            ...options
        };

        if (options.body && typeof options.body === 'object') {
            config.body = JSON.stringify(options.body);
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // Auth methods
    async register(email, password) {
        return this.request('/auth/register', {
            method: 'POST',
            body: { email, password }
        });
    }

    async login(email, password) {
        return this.request('/auth/login', {
            method: 'POST',
            body: { email, password }
        });
    }

    async logout() {
        return this.request('/auth/logout', {
            method: 'POST'
        });
    }

    async getCurrentUser() {
        return this.request('/auth/me');
    }

    // Moderation methods
    async moderateContent(content) {
        return this.request('/moderate', {
            method: 'POST',
            body: { content }
        });
    }

    async getStats() {
        return this.request('/stats');
    }

    async submitFeedback(moderationLogId, feedbackType, comment) {
        return this.request('/feedback', {
            method: 'POST',
            body: { moderationLogId, feedbackType, comment }
        });
    }
}

// UI Components
class UIComponents {
    static showModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    static hideModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }

    static showLoading() {
        document.getElementById('loadingOverlay').style.display = 'flex';
    }

    static hideLoading() {
        document.getElementById('loadingOverlay').style.display = 'none';
    }

    static showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const iconMap = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle'
        };

        toast.innerHTML = `
            <i class="toast-icon ${iconMap[type]}"></i>
            <span class="toast-message">${message}</span>
            <button class="toast-close">&times;</button>
        `;

        container.appendChild(toast);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 5000);

        // Manual close
        toast.querySelector('.toast-close').addEventListener('click', () => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        });
    }

    static renderModerationResult(result) {
        const resultSection = document.getElementById('resultSection');
        const resultContent = document.getElementById('resultContent');

        const statusClass = result.flagged ? 'flagged' : 'safe';
        const statusIcon = result.flagged ? 'fas fa-exclamation-triangle' : 'fas fa-check-circle';
        const statusText = result.flagged ? 'Content Flagged' : 'Content Safe';

        const confidencePercent = Math.round(result.confidence * 100);
        let confidenceClass = 'confidence-low';
        if (confidencePercent >= 70) confidenceClass = 'confidence-high';
        else if (confidencePercent >= 40) confidenceClass = 'confidence-medium';

        resultContent.innerHTML = `
            <div class="result-status ${statusClass}">
                <i class="${statusIcon}"></i>
                ${statusText}
            </div>
            <div class="result-details">
                <div class="result-item">
                    <span class="result-label">Confidence</span>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <div class="confidence-bar">
                            <div class="confidence-fill ${confidenceClass}" style="width: ${confidencePercent}%"></div>
                        </div>
                        <span class="result-value">${confidencePercent}%</span>
                    </div>
                </div>
                <div class="result-item">
                    <span class="result-label">Method</span>
                    <span class="result-value">${result.method || 'Unknown'}</span>
                </div>
                ${result.categories && result.categories.length > 0 ? `
                <div class="result-item">
                    <span class="result-label">Categories</span>
                    <span class="result-value">${result.categories.join(', ')}</span>
                </div>
                ` : ''}
                <div class="result-item">
                    <span class="result-label">Reason</span>
                    <span class="result-value">${result.reason}</span>
                </div>
                <div class="result-item">
                    <span class="result-label">Timestamp</span>
                    <span class="result-value">${new Date(result.timestamp).toLocaleString()}</span>
                </div>
            </div>
        `;

        resultSection.style.display = 'block';
    }

    static updateDashboard(stats) {
        const totalScans = stats.reduce((sum, day) => sum + day.total_scans, 0);
        const flaggedContent = stats.reduce((sum, day) => sum + day.flagged_content, 0);
        const avgConfidence = stats.length > 0 
            ? Math.round(stats.reduce((sum, day) => sum + (day.avg_confidence || 0), 0) / stats.length * 100)
            : 0;

        document.getElementById('totalScans').textContent = totalScans;
        document.getElementById('flaggedContent').textContent = flaggedContent;
        document.getElementById('avgConfidence').textContent = `${avgConfidence}%`;

        // Simple activity chart (could be enhanced with a real charting library)
        const chartContainer = document.getElementById('activityChart');
        if (stats.length > 0) {
            const maxScans = Math.max(...stats.map(day => day.total_scans));
            chartContainer.innerHTML = `
                <div style="display: flex; align-items: end; gap: 4px; height: 150px; justify-content: center;">
                    ${stats.slice(0, 14).reverse().map(day => {
                        const height = maxScans > 0 ? (day.total_scans / maxScans) * 100 : 0;
                        return `
                            <div style="
                                width: 20px;
                                height: ${height}%;
                                background: var(--gradient-primary);
                                border-radius: 2px;
                                min-height: 2px;
                                position: relative;
                            " title="${day.date}: ${day.total_scans} scans"></div>
                        `;
                    }).join('')}
                </div>
                <p style="text-align: center; margin-top: 1rem; color: var(--text-muted); font-size: 0.875rem;">
                    Last 14 days activity
                </p>
            `;
        }
    }
}

// Main Application
class FilterwaveApp {
    constructor() {
        this.state = new AppState();
        this.api = new APIService();
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.updateCharCounter();
        await this.checkAuthStatus();
        this.state.updateUsageIndicator();
    }

    async checkAuthStatus() {
        try {
            const response = await this.api.getCurrentUser();
            this.state.setUser(response.user);
        } catch (error) {
            // User not authenticated, that's fine
            this.state.clearUser();
        }
    }

    setupEventListeners() {
        // Navigation
        document.getElementById('loginBtn').addEventListener('click', () => {
            UIComponents.showModal('loginModal');
        });

        document.getElementById('signupBtn').addEventListener('click', () => {
            UIComponents.showModal('signupModal');
        });

        document.getElementById('dashboardBtn').addEventListener('click', () => {
            this.showDashboard();
        });

        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.logout();
        });

        // Modal controls
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                UIComponents.hideModal(modal.id);
            });
        });

        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    UIComponents.hideModal(modal.id);
                }
            });
        });

        // Auth form switches
        document.getElementById('switchToSignup').addEventListener('click', (e) => {
            e.preventDefault();
            UIComponents.hideModal('loginModal');
            UIComponents.showModal('signupModal');
        });

        document.getElementById('switchToLogin').addEventListener('click', (e) => {
            e.preventDefault();
            UIComponents.hideModal('signupModal');
            UIComponents.showModal('loginModal');
        });

        // Limit modal buttons
        document.getElementById('limitSignupBtn').addEventListener('click', () => {
            UIComponents.hideModal('limitModal');
            UIComponents.showModal('signupModal');
        });

        document.getElementById('limitLoginBtn').addEventListener('click', () => {
            UIComponents.hideModal('limitModal');
            UIComponents.showModal('loginModal');
        });

        // Forms
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            this.handleLogin(e);
        });

        document.getElementById('signupForm').addEventListener('submit', (e) => {
            this.handleSignup(e);
        });

        document.getElementById('feedbackForm').addEventListener('submit', (e) => {
            this.handleFeedback(e);
        });

        // Moderation
        document.getElementById('moderateBtn').addEventListener('click', () => {
            this.moderateContent();
        });

        document.getElementById('feedbackBtn').addEventListener('click', () => {
            UIComponents.showModal('feedbackModal');
        });

        // Content input
        document.getElementById('contentInput').addEventListener('input', () => {
            this.updateCharCounter();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal.show').forEach(modal => {
                    UIComponents.hideModal(modal.id);
                });
            }
        });
    }

    updateCharCounter() {
        const input = document.getElementById('contentInput');
        const counter = document.getElementById('charCount');
        const length = input.value.length;
        counter.textContent = `${length} / 5000`;
        
        if (length > 4500) {
            counter.style.color = 'var(--warning)';
        } else if (length === 5000) {
            counter.style.color = 'var(--error)';
        } else {
            counter.style.color = 'var(--text-muted)';
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            UIComponents.showLoading();
            const response = await this.api.login(email, password);
            this.state.setUser(response.user);
            UIComponents.hideModal('loginModal');
            UIComponents.showToast('Login successful!');
            
            // Reset form
            document.getElementById('loginForm').reset();
        } catch (error) {
            UIComponents.showToast(error.message, 'error');
        } finally {
            UIComponents.hideLoading();
        }
    }

    async handleSignup(e) {
        e.preventDefault();
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;

        try {
            UIComponents.showLoading();
            const response = await this.api.register(email, password);
            this.state.setUser(response.user);
            UIComponents.hideModal('signupModal');
            UIComponents.showToast('Account created successfully!');
            
            // Reset form
            document.getElementById('signupForm').reset();
        } catch (error) {
            UIComponents.showToast(error.message, 'error');
        } finally {
            UIComponents.hideLoading();
        }
    }

    async logout() {
        try {
            await this.api.logout();
            this.state.clearUser();
            this.state.switchView('moderation');
            UIComponents.showToast('Logged out successfully');
        } catch (error) {
            UIComponents.showToast('Logout failed', 'error');
        }
    }

    async moderateContent() {
        const content = document.getElementById('contentInput').value.trim();
        
        if (!content) {
            UIComponents.showToast('Please enter some content to moderate', 'warning');
            return;
        }

        // Check free tier limits
        if (!this.state.user && this.state.freeScansUsed >= 5) {
            UIComponents.showModal('limitModal');
            return;
        }

        try {
            UIComponents.showLoading();
            const result = await this.api.moderateContent(content);
            
            // Update free scan counter for anonymous users
            if (!this.state.user) {
                this.state.updateFreeScans(this.state.freeScansUsed + 1);
            }

            this.state.lastModerationResult = result;
            UIComponents.renderModerationResult(result);
            
            // Show appropriate toast
            if (result.flagged) {
                UIComponents.showToast('Content flagged for review', 'warning');
            } else {
                UIComponents.showToast('Content appears safe', 'success');
            }
        } catch (error) {
            UIComponents.showToast(error.message, 'error');
        } finally {
            UIComponents.hideLoading();
        }
    }

    async handleFeedback(e) {
        e.preventDefault();
        
        if (!this.state.lastModerationResult) {
            UIComponents.showToast('No recent moderation result to provide feedback on', 'warning');
            return;
        }

        const feedbackType = document.querySelector('input[name="feedbackType"]:checked')?.value;
        const comment = document.getElementById('feedbackComment').value;

        if (!feedbackType) {
            UIComponents.showToast('Please select a feedback option', 'warning');
            return;
        }

        try {
            await this.api.submitFeedback(
                this.state.lastModerationResult.id || 'unknown',
                feedbackType,
                comment
            );
            
            UIComponents.hideModal('feedbackModal');
            UIComponents.showToast('Thank you for your feedback!');
            
            // Reset form
            document.getElementById('feedbackForm').reset();
        } catch (error) {
            UIComponents.showToast('Failed to submit feedback', 'error');
        }
    }

    async showDashboard() {
        if (!this.state.user) {
            UIComponents.showToast('Please login to view dashboard', 'warning');
            return;
        }

        this.state.switchView('dashboard');

        try {
            const response = await this.api.getStats();
            UIComponents.updateDashboard(response.stats);
        } catch (error) {
            UIComponents.showToast('Failed to load dashboard data', 'error');
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.filterwave = new FilterwaveApp();
});