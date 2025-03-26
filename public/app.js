let currentToken = null;

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const authSection = document.getElementById('auth-section');
  const dashboardSection = document.getElementById('dashboard-section');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const loginTab = document.getElementById('login-tab');
  const registerTab = document.getElementById('register-tab');
  const logoutBtn = document.getElementById('logout-btn');
  const addVehicleBtn = document.getElementById('add-vehicle-btn');
  const vehiclesContainer = document.getElementById('vehicles-container');

  // Event Listeners
  loginTab.addEventListener('click', () => switchTab('login'));
  registerTab.addEventListener('click', () => switchTab('register'));
  loginForm.addEventListener('submit', handleLogin);
  registerForm.addEventListener('submit', handleRegister);
  logoutBtn.addEventListener('click', handleLogout);
  addVehicleBtn.addEventListener('click', showAddVehicleModal);

  // Check if user is already logged in
  checkAuth();

  function switchTab(tab) {
    if (tab === 'login') {
      loginForm.style.display = 'block';
      registerForm.style.display = 'none';
      loginTab.classList.add('active');
      registerTab.classList.remove('active');
    } else {
      loginForm.style.display = 'none';
      registerForm.style.display = 'block';
      loginTab.classList.remove('active');
      registerTab.classList.add('active');
    }
  }

  async function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch('/api/vehicles', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        currentToken = token;
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
        currentToken = token;
        showDashboard();
        loadVehicles();
      } else {
        alert('Login failed. Please check your credentials.');
      }
    } catch (err) {
      console.error('Login error:', err);
      alert('An error occurred during login.');
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    const username = registerForm.querySelector('input[type="text"]').value;
    const password = registerForm.querySelector('input[type="password"]').value;

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (response.ok) {
        const { token } = await response.json();
        localStorage.setItem('token', token);
        currentToken = token;
        showDashboard();
        loadVehicles();
      } else {
        const { error } = await response.json();
        alert(`Registration failed: ${error}`);
      }
    } catch (err) {
      console.error('Registration error:', err);
      alert('An error occurred during registration.');
    }
  }

  function handleLogout() {
    localStorage.removeItem('token');
    currentToken = null;
    showAuth();
  }

  function showAuth() {
    authSection.style.display = 'block';
    dashboardSection.style.display = 'none';
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
    loginForm.reset();
    registerForm.reset();
  }

  function showDashboard() {
    authSection.style.display = 'none';
    dashboardSection.style.display = 'block';
  }

  async function loadVehicles() {
    try {
      const response = await fetch('/api/vehicles', {
        headers: { 'Authorization': `Bearer ${currentToken}` }
      });
      
      if (response.ok) {
        const vehicles = await response.json();
        renderVehicles(vehicles);
      } else {
        alert('Failed to load vehicles.');
      }
    } catch (err) {
      console.error('Error loading vehicles:', err);
      alert('An error occurred while loading vehicles.');
    }
  }

  function renderVehicles(vehicles) {
    vehiclesContainer.innerHTML = '';
    
    if (vehicles.length === 0) {
      vehiclesContainer.innerHTML = '<p>No vehicles found. Add your first vehicle.</p>';
      return;
    }
    
    vehicles.forEach(vehicle => {
      const today = new Date();
      const safetyDueDate = new Date(vehicle.safetyDue);
      const daysUntilSafety = Math.ceil((safetyDueDate - today) / (1000 * 60 * 60 * 24));
      
      // Oil change status
      let oilStatus = '';
      let oilText = '';
      if (vehicle.oilChangeDue <= 1000) {
        oilStatus = 'oil-danger';
        oilText = 'CHANGE NOW!';
      } else if (vehicle.oilChangeDue <= 2000) {
        oilStatus = 'oil-warning';
        oilText = 'Change soon';
      }
      
      // Safety check status
      let safetyStatus = '';
      let safetyText = '';
      if (daysUntilSafety <= 30) {
        safetyStatus = 'safety-danger';
        safetyText = 'DUE NOW!';
      } else if (daysUntilSafety <= 60) {
        safetyStatus = 'safety-warning';
        safetyText = 'Due soon';
      }
      
      const card = document.createElement('div');
      card.className = 'col-md-6 col-lg-4';
      card.innerHTML = `
        <div class="card vehicle-card status-${vehicle.status.replace(/\s+/g, '-')} h-100">
          <div class="card-body">
            <h5 class="card-title">${vehicle.name}</h5>
            <p class="card-text">
              <strong>Status:</strong> ${vehicle.status.charAt(0).toUpperCase() + vehicle.status.slice(1)}
              ${vehicle.statusReason ? `<br><small>${vehicle.statusReason}</small>` : ''}
            </p>
            <p class="card-text">
              <strong>Kilometers:</strong> ${vehicle.kilometers.toLocaleString()} km
            </p>
            <p class="card-text">
              <strong>Oil Change:</strong> 
              ${oilStatus ? `<span class="${oilStatus}">${vehicle.oilChangeDue.toLocaleString()} km left (${oilText})</span>` : 
                `${vehicle.oilChangeDue.toLocaleString()} km left`}
            </p>
            <p class="card-text">
              <strong>Safety Check:</strong> 
              ${safetyStatus ? `<span class="${safetyStatus}">${formatDate(vehicle.safetyDue)} (${safetyText})</span>` : 
                formatDate(vehicle.safetyDue)}
            </p>
          </div>
        </div>
      `;
      vehiclesContainer.appendChild(card);
    });
  }

  function showAddVehicleModal() {
    const name = prompt('Enter vehicle name:');
    if (!name) return;

    const km = parseInt(prompt('Enter current kilometers:', '0'));
    if (isNaN(km)) return alert('Invalid kilometers value');

    const status = prompt('Enter status (on road/in shop/out of service):', 'on road');
    if (!['on road', 'in shop', 'out of service'].includes(status)) return alert('Invalid status');

    let reason = '';
    if (status !== 'on road') {
      reason = prompt('Enter reason:') || '';
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
          'Authorization': `Bearer ${currentToken}`
        },
        body: JSON.stringify(vehicleData)
      });

      if (response.ok) {
        loadVehicles();
      } else {
        const { error } = await response.json();
        alert(`Error: ${error}`);
      }
    } catch (err) {
      console.error('Error adding vehicle:', err);
      alert('An error occurred while adding the vehicle.');
    }
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString();
  }
});
