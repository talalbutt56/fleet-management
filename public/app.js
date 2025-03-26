document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const loginSection = document.getElementById('login-section');
  const dashboardSection = document.getElementById('dashboard-section');
  const loginForm = document.getElementById('login-form');
  const logoutBtn = document.getElementById('logout-btn');
  const addVehicleBtn = document.getElementById('add-vehicle-btn');
  const vehiclesContainer = document.getElementById('vehicles-container');

  let authToken = null;

  // Event Listeners
  loginForm.addEventListener('submit', handleLogin);
  logoutBtn.addEventListener('click', handleLogout);
  addVehicleBtn.addEventListener('click', showAddVehicleForm);

  // Check existing session
  checkAuth();

  // Functions
  async function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch('/api/vehicles', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        authToken = token;
        showDashboard();
        loadVehicles();
      } else {
        localStorage.removeItem('token');
      }
    } catch (err) {
      console.error('Auth check failed:', err);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    const username = loginForm.querySelector('input[type="text"]').value;
    const password = loginForm.querySelector('input[type="password"]').value;

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (response.ok) {
        const { token } = await response.json();
        localStorage.setItem('token', token);
        authToken = token;
        showDashboard();
        loadVehicles();
      } else {
        alert('Invalid credentials');
      }
    } catch (err) {
      console.error('Login error:', err);
      alert('Login failed');
    }
  }

  function handleLogout() {
    localStorage.removeItem('token');
    authToken = null;
    showLogin();
  }

  function showLogin() {
    loginSection.style.display = 'block';
    dashboardSection.style.display = 'none';
    loginForm.reset();
  }

  function showDashboard() {
    loginSection.style.display = 'none';
    dashboardSection.style.display = 'block';
  }

  async function loadVehicles() {
    try {
      const response = await fetch('/api/vehicles', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      if (response.ok) {
        const vehicles = await response.json();
        renderVehicles(vehicles);
      } else {
        alert('Failed to load vehicles');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Network error');
    }
  }

  function renderVehicles(vehicles) {
    vehiclesContainer.innerHTML = '';

    if (vehicles.length === 0) {
      vehiclesContainer.innerHTML = '<p class="text-center">No vehicles found</p>';
      return;
    }

    vehicles.forEach(vehicle => {
      const today = new Date();
      const safetyDueDate = new Date(vehicle.safetyDue);
      const daysUntilSafety = Math.ceil((safetyDueDate - today) / (1000 * 60 * 60 * 24));

      // Oil change alerts
      let oilStatus = '';
      if (vehicle.oilChangeDue <= 1000) oilStatus = 'oil-danger';
      else if (vehicle.oilChangeDue <= 2000) oilStatus = 'oil-warning';

      // Safety check alerts
      let safetyStatus = '';
      if (daysUntilSafety <= 30) safetyStatus = 'safety-danger';
      else if (daysUntilSafety <= 60) safetyStatus = 'safety-warning';

      const card = document.createElement('div');
      card.className = 'col-md-6 col-lg-4';
      card.innerHTML = `
        <div class="card vehicle-card status-${vehicle.status.replace(/\s/g, '-')}">
          <div class="card-body">
            <h5>${vehicle.name}</h5>
            <p><strong>Status:</strong> ${vehicle.status} ${vehicle.statusReason ? `<br><small>${vehicle.statusReason}</small>` : ''}</p>
            <p><strong>KM:</strong> ${vehicle.kilometers.toLocaleString()}</p>
            <p><strong>Oil Due:</strong> 
              <span class="${oilStatus}">${vehicle.oilChangeDue.toLocaleString()} km</span>
            </p>
            <p><strong>Safety Due:</strong> 
              <span class="${safetyStatus}">${formatDate(vehicle.safetyDue)}</span>
            </p>
          </div>
        </div>
      `;
      vehiclesContainer.appendChild(card);
    });
  }

  function showAddVehicleForm() {
    const name = prompt('Vehicle Name:');
    if (!name) return;

    const km = parseInt(prompt('Current Kilometers:', '0'));
    if (isNaN(km)) return alert('Invalid number');

    const status = prompt('Status (on road/in shop/out of service):', 'on road');
    if (!['on road', 'in shop', 'out of service'].includes(status)) {
      return alert('Invalid status');
    }

    let reason = '';
    if (status !== 'on road') {
      reason = prompt('Status reason:') || '';
    }

    addVehicle({
      name,
      kilometers: km,
      status,
      statusReason: reason
    });
  }

  async function addVehicle(vehicleData) {
    try {
      const response = await fetch('/api/vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(vehicleData)
      });

      if (response.ok) {
        loadVehicles();
      } else {
        alert('Failed to add vehicle');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Network error');
    }
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString();
  }
});
