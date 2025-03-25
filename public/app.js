// Cloud-optimized application
class FleetApp {
  constructor() {
    this.API_BASE = window.location.origin;
    this.socket = io(this.API_BASE);
    this.currentUser = null;
    this.vehicles = [];
    
    this.init();
  }

  async init() {
    this.checkAuth();
    this.setupSocket();
    this.render();
    
    if (this.currentUser) {
      await this.loadVehicles();
    }
  }

  checkAuth() {
    const userData = localStorage.getItem('fleetUser');
    if (userData) {
      this.currentUser = JSON.parse(userData);
    }
  }

  setupSocket() {
    this.socket.on('vehicle-update', () => {
      this.loadVehicles();
    });
  }

  async loadVehicles() {
    try {
      const response = await fetch(`${this.API_BASE}/api/vehicles`);
      this.vehicles = await response.json();
      this.render();
    } catch (error) {
      console.error('Failed to load vehicles:', error);
    }
  }

  render() {
    const appEl = document.getElementById('app');
    
    if (!this.currentUser) {
      appEl.innerHTML = this.renderLogin();
      document.getElementById('login-form')?.addEventListener('submit', this.handleLogin.bind(this));
      return;
    }
    
    appEl.innerHTML = this.renderDashboard();
    document.getElementById('logout-btn')?.addEventListener('click', this.handleLogout.bind(this));
    document.getElementById('status-filter')?.addEventListener('change', () => this.render());
  }

  renderLogin() {
    return `
      <div class="login-container">
        <div class="login-box">
          <h2>St. Thomas Transit</h2>
          <form id="login-form">
            <div class="form-group">
              <label for="username">Username</label>
              <input type="text" id="username" required>
            </div>
            <div class="form-group">
              <label for="password">Password</label>
              <input type="password" id="password" required>
            </div>
            <button type="submit" class="btn">Login</button>
            <div id="login-error" class="error-message"></div>
          </form>
        </div>
      </div>
    `;
  }

  renderDashboard() {
    const filteredVehicles = this.filterVehicles();
    
    return `
      <div class="dashboard">
        <header>
          <h1>Fleet Management Dashboard</h1>
          <div class="header-controls">
            <div id="current-time">${new Date().toLocaleString()}</div>
            <div>Logged in as: ${this.currentUser.username}</div>
            <button id="logout-btn" class="btn btn-danger">Logout</button>
          </div>
        </header>
        <main>
          <div class="vehicle-list">
            ${filteredVehicles.map(vehicle => this.renderVehicleCard(vehicle)).join('')}
          </div>
        </main>
      </div>
    `;
  }

  renderVehicleCard(vehicle) {
    return `
      <div class="vehicle-card" data-id="${vehicle._id}">
        <h3>${vehicle.name}</h3>
        <div class="status status-${vehicle.status}">
          ${vehicle.status.toUpperCase().replace('-', ' ')}
        </div>
        <div class="vehicle-property">
          <strong>KM:</strong> ${vehicle.km.toLocaleString()}
        </div>
        <div class="vehicle-property">
          <strong>Oil Change Due:</strong> ${vehicle.oilChangeDue.toLocaleString()} KM
        </div>
        <div class="vehicle-property">
          <strong>Safety Due:</strong> ${new Date(vehicle.safetyDue).toLocaleDateString()}
        </div>
        <div class="vehicle-property">
          <strong>Drivers:</strong> ${vehicle.drivers.join(', ')}
        </div>
        ${vehicle.comment ? `
          <div class="vehicle-property">
            <strong>Comment:</strong> ${vehicle.comment}
          </div>
        ` : ''}
      </div>
    `;
  }

  filterVehicles() {
    const statusFilter = document.getElementById('status-filter')?.value || 'all';
    return statusFilter === 'all' 
      ? this.vehicles 
      : this.vehicles.filter(v => v.status === statusFilter);
  }

  async handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
      const response = await fetch(`${this.API_BASE}/api/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (response.ok) {
        this.currentUser = await response.json();
        localStorage.setItem('fleetUser', JSON.stringify(this.currentUser));
        await this.loadVehicles();
      } else {
        this.showError('Invalid credentials');
      }
    } catch (error) {
      this.showError('Login failed. Please try again.');
    }
  }

  handleLogout() {
    localStorage.removeItem('fleetUser');
    this.currentUser = null;
    this.render();
  }

  showError(message) {
    const errorEl = document.getElementById('login-error');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
      setTimeout(() => errorEl.style.display = 'none', 3000);
    }
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new FleetApp();
  
  // Update time every second
  setInterval(() => {
    const timeEl = document.getElementById('current-time');
    if (timeEl) timeEl.textContent = new Date().toLocaleString();
  }, 1000);
});
