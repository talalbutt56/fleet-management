class FleetApp {
  constructor() {
    this.API_BASE = window.location.origin;
    this.socket = io(this.API_BASE, {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    this.currentUser = null;
    this.vehicles = [];
    
    this.initElements();
    this.initEventListeners();
    this.checkAuth();
    this.updateCurrentTime();
    setInterval(() => this.updateCurrentTime(), 1000);
  }

  initElements() {
    this.elements = {
      authContainer: document.getElementById('auth-container'),
      dashboardContainer: document.getElementById('dashboard-container'),
      loginForm: document.getElementById('login-form'),
      usernameInput: document.getElementById('username'),
      passwordInput: document.getElementById('password'),
      loginError: document.getElementById('login-error'),
      logoutBtn: document.getElementById('logout-btn'),
      currentTime: document.getElementById('current-time'),
      userInfo: document.getElementById('user-info'),
      vehicleGrid: document.getElementById('vehicle-grid'),
      statusFilter: document.getElementById('status-filter'),
      searchInput: document.getElementById('search-input'),
      refreshBtn: document.getElementById('refresh-btn')
    };
  }

  initEventListeners() {
    this.elements.loginForm?.addEventListener('submit', (e) => this.handleLogin(e));
    this.elements.logoutBtn?.addEventListener('click', () => this.handleLogout());
    this.elements.statusFilter?.addEventListener('change', () => this.renderVehicles());
    this.elements.searchInput?.addEventListener('input', () => this.renderVehicles());
    this.elements.refreshBtn?.addEventListener('click', () => this.loadVehicles());
    
    this.socket.on('connect', () => {
      console.log('Socket connected');
    });
    
    this.socket.on('vehicle-update', () => {
      console.log('Received vehicle update');
      this.loadVehicles();
    });
  }

  checkAuth() {
    const userData = localStorage.getItem('fleetUser');
    if (userData) {
      try {
        this.currentUser = JSON.parse(userData);
        this.toggleViews();
        this.loadVehicles();
      } catch (e) {
        localStorage.removeItem('fleetUser');
      }
    }
  }

  toggleViews() {
    this.elements.authContainer.style.display = this.currentUser ? 'none' : 'flex';
    this.elements.dashboardContainer.style.display = this.currentUser ? 'block' : 'none';
    
    if (this.currentUser) {
      this.elements.userInfo.textContent = `${this.currentUser.username} (${this.currentUser.role})`;
    }
  }

  async handleLogin(e) {
    e.preventDefault();
    const username = this.elements.usernameInput.value.trim();
    const password = this.elements.passwordInput.value.trim();

    if (!username || !password) {
      this.showError('Please enter both username and password');
      return;
    }

    try {
      const response = await fetch(`${this.API_BASE}/api/auth`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      this.currentUser = data;
      localStorage.setItem('fleetUser', JSON.stringify(this.currentUser));
      this.toggleViews();
      await this.loadVehicles();
      
      // Clear form
      this.elements.usernameInput.value = '';
      this.elements.passwordInput.value = '';
      
    } catch (error) {
      console.error('Login error:', error);
      this.showError(error.message || 'Login failed. Please try again.');
    }
  }

  handleLogout() {
    localStorage.removeItem('fleetUser');
    this.currentUser = null;
    this.toggleViews();
  }

  async loadVehicles() {
    try {
      console.log('Loading vehicles...');
      const response = await fetch(`${this.API_BASE}/api/vehicles`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch vehicles');
      }
      
      this.vehicles = await response.json();
      console.log(`Loaded ${this.vehicles.length} vehicles`);
      this.renderVehicles();
    } catch (error) {
      console.error('Failed to load vehicles:', error);
    }
  }

  renderVehicles() {
    if (!Array.isArray(this.vehicles)) {
      console.error('Vehicles data is not an array');
      return;
    }

    const statusFilter = this.elements.statusFilter?.value || 'all';
    const searchQuery = (this.elements.searchInput?.value || '').toLowerCase();

    const filteredVehicles = this.vehicles.filter(vehicle => {
      const statusMatch = statusFilter === 'all' || vehicle.status === statusFilter;
      const searchMatch = 
        vehicle.name.toLowerCase().includes(searchQuery) ||
        (vehicle.drivers || []).some(driver => 
          driver.toLowerCase().includes(searchQuery)
      );
      return statusMatch && searchMatch;
    });

    this.elements.vehicleGrid.innerHTML = filteredVehicles.length > 0
      ? filteredVehicles.map(vehicle => this.renderVehicleCard(vehicle)).join('')
      : '<div class="no-vehicles">No vehicles found</div>';
  }

  renderVehicleCard(vehicle) {
    const remainingKm = vehicle.oilChangeDue - vehicle.km;
    const remainingDays = Math.max(0, Math.ceil(
      (new Date(vehicle.safetyDue) - new Date()) / (1000 * 60 * 60 * 24)
    );

    const oilStatus = remainingKm <= 1000 ? 'danger' : remainingKm <= 2000 ? 'warning' : 'safe';
    const safetyStatus = remainingDays <= 30 ? 'danger' : remainingDays <= 60 ? 'warning' : 'safe';

    return `
      <div class="vehicle-card">
        <div class="vehicle-header">
          <h3>${vehicle.name}</h3>
          <span class="vehicle-status status-${vehicle.status.replace(' ', '-')}">
            ${vehicle.status.replace('-', ' ').toUpperCase()}
          </span>
        </div>
        
        <div class="vehicle-details">
          <div class="vehicle-detail">
            <span class="vehicle-detail-label">Current KM:</span>
            <span>${vehicle.km.toLocaleString()}</span>
          </div>
          
          <div class="progress-container">
            <div class="progress-label">
              <span>Oil Change Due:</span>
              <span>${vehicle.oilChangeDue.toLocaleString()} KM</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill progress-${oilStatus}" 
                   style="width: ${Math.min(100, (vehicle.km / vehicle.oilChangeDue) * 100)}%"></div>
            </div>
            <div class="progress-label">
              <span>Remaining:</span>
              <span>${remainingKm.toLocaleString()} KM</span>
            </div>
          </div>
          
          <div class="progress-container">
            <div class="progress-label">
              <span>Safety Due:</span>
              <span>${new Date(vehicle.safetyDue).toLocaleDateString()}</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill progress-${safetyStatus}" 
                   style="width: ${Math.min(100, (1 - (remainingDays / 90)) * 100}%"></div>
            </div>
            <div class="progress-label">
              <span>Remaining:</span>
              <span>${remainingDays} days</span>
            </div>
          </div>
          
          <div class="vehicle-detail">
            <span class="vehicle-detail-label">Drivers:</span>
            <span>${(vehicle.drivers || []).join(', ')}</span>
          </div>
          
          ${vehicle.comment ? `
            <div class="vehicle-detail">
              <span class="vehicle-detail-label">Notes:</span>
              <span>${vehicle.comment}</span>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  showError(message) {
    if (!this.elements.loginError) return;
    
    this.elements.loginError.textContent = message;
    this.elements.loginError.style.display = 'block';
    setTimeout(() => {
      if (this.elements.loginError) {
        this.elements.loginError.style.display = 'none';
      }
    }, 3000);
  }

  updateCurrentTime() {
    if (!this.elements.currentTime) return;
    
    const now = new Date();
    this.elements.currentTime.textContent = now.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  new FleetApp();
});
