document.addEventListener('DOMContentLoaded', function() {
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
  const vehicleModal = new bootstrap.Modal(document.getElementById('vehicle-modal'));
  const saveVehicleBtn = document.getElementById('save-vehicle-btn');
  const vehicleStatus = document.getElementById('vehicle-status');
  const reasonContainer = document.getElementById('reason-container');
  
  // State
  let currentUser = null;
  let vehicles = [];
  
  // Event Listeners
  loginTab.addEventListener('click', () => switchAuthTab('login'));
  registerTab.addEventListener('click', () => switchAuthTab('register'));
  loginForm.addEventListener('submit', handleLogin);
  registerForm.addEventListener('submit', handleRegister);
  logoutBtn.addEventListener('click', handleLogout);
  addVehicleBtn.addEventListener('click', () => showVehicleModal());
  saveVehicleBtn.addEventListener('click', handleSaveVehicle);
  vehicleStatus.addEventListener('change', toggleReasonField);
  
  // Initialize
  checkAuth();
  
  // Functions
  function switchAuthTab(tab) {
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
        currentUser = { token };
        showDashboard();
        loadVehicles();
      } else {
        localStorage.removeItem('token');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    }
  }
  
  async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      if (response.ok) {
        const { token } = await response.json();
        localStorage.setItem('token', token);
        currentUser = { token };
        showDashboard();
        loadVehicles();
      } else {
        alert('Login failed. Please check your credentials.');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('An error occurred during login.');
    }
  }
  
  async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('register-username').value;
    const password = document.getElementById('register-password').value;
    
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      if (response.ok) {
        alert('Registration successful! Please login.');
        switchAuthTab('login');
        document.getElementById('register-form').reset();
      } else {
        const { error } = await response.json();
        alert(`Registration failed: ${error}`);
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert('An error occurred during registration.');
    }
  }
  
  function handleLogout() {
    localStorage.removeItem('token');
    currentUser = null;
    showLogin();
  }
  
  function showLogin() {
    authSection.style.display = 'block';
    dashboardSection.style.display = 'none';
    document.getElementById('login-form').reset();
  }
  
  function showDashboard() {
    authSection.style.display = 'none';
    dashboardSection.style.display = 'block';
  }
  
  async function loadVehicles() {
    try {
      const response = await fetch('/api/vehicles', {
        headers: { 'Authorization': `Bearer ${currentUser.token}` }
      });
      
      if (response.ok) {
        vehicles = await response.json();
        renderVehicles();
      } else {
        alert('Failed to load vehicles.');
      }
    } catch (error) {
      console.error('Error loading vehicles:', error);
      alert('An error occurred while loading vehicles.');
    }
  }
  
  function renderVehicles() {
    vehiclesContainer.innerHTML = '';
    
    if (vehicles.length === 0) {
      vehiclesContainer.innerHTML = '<p>No vehicles found. Add your first vehicle.</p>';
      return;
    }
    
    vehicles.forEach(vehicle => {
      const today = new Date();
      const safetyDueDate = new Date(vehicle.safetyDue);
      const daysUntilSafety = Math.ceil((safetyDueDate - today) / (1000 * 60 * 60 * 24));
      
      // Determine oil change status
      let oilStatus, oilText;
      if (vehicle.oilChangeDue <= 1000) {
        oilStatus = 'oil-danger';
        oilText = 'Change NOW!';
      } else if (vehicle.oilChangeDue <= 2000) {
        oilStatus = 'oil-warning';
        oilText = 'Change soon';
      } else {
        oilStatus = 'oil-normal';
        oilText = 'Good';
      }
      
      // Determine safety check status
      let safetyStatus, safetyText;
      if (daysUntilSafety <= 30) {
        safetyStatus = 'safety-danger';
        safetyText = 'Due NOW!';
      } else if (daysUntilSafety <= 60) {
        safetyStatus = 'safety-warning';
        safetyText = 'Due soon';
      } else {
        safetyStatus = 'safety-normal';
        safetyText = 'Good';
      }
      
      const card = document.createElement('div');
      card.className = `vehicle-card status-${vehicle.status.replace(/\s+/g, '-')}`;
      card.innerHTML = `
        <div class="card h-100">
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
              <span class="${oilStatus}">${vehicle.oilChangeDue.toLocaleString()} km left (${oilText})</span>
            </p>
            <p class="card-text">
              <strong>Safety Check:</strong> 
              <span class="${safetyStatus}">${formatDate(vehicle.safetyDue)} (${safetyText})</span>
            </p>
            <div class="d-flex justify-content-between mt-3">
              <button class="btn btn-sm btn-outline-primary edit-btn" data-id="${vehicle._id}">Update</button>
              <button class="btn btn-sm btn-outline-secondary km-btn" data-id="${vehicle._id}">Add KM</button>
            </div>
          </div>
        </div>
      `;
      
      vehiclesContainer.appendChild(card);
    });
    
    // Add event listeners to buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const vehicleId = e.target.dataset.id;
        const vehicle = vehicles.find(v => v._id === vehicleId);
        showVehicleModal(vehicle);
      });
    });
    
    document.querySelectorAll('.km-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const vehicleId = e.target.dataset.id;
        const vehicle = vehicles.find(v => v._id === vehicleId);
        updateKilometers(vehicle);
      });
    });
  }
  
  function showVehicleModal(vehicle = null) {
    const modalTitle = document.getElementById('modal-title');
    const form = document.getElementById('vehicle-form');
    
    if (vehicle) {
      modalTitle.textContent = 'Update Vehicle';
      document.getElementById('vehicle-id').value = vehicle._id;
      document.getElementById('vehicle-name').value = vehicle.name;
      document.getElementById('vehicle-km').value = vehicle.kilometers;
      document.getElementById('vehicle-status').value = vehicle.status;
      document.getElementById('vehicle-reason').value = vehicle.statusReason || '';
      toggleReasonField();
    } else {
      modalTitle.textContent = 'Add Vehicle';
      form.reset();
      document.getElementById('vehicle-status').value = 'on road';
      reasonContainer.style.display = 'none';
    }
    
    vehicleModal.show();
  }
  
  function toggleReasonField() {
    const status = document.getElementById('vehicle-status').value;
    reasonContainer.style.display = (status !== 'on road') ? 'block' : 'none';
  }
  
  async function handleSaveVehicle() {
    const form = document.getElementById('vehicle-form');
    const vehicleId = document.getElementById('vehicle-id').value;
    const isUpdate = !!vehicleId;
    
    const vehicleData = {
      name: document.getElementById('vehicle-name').value,
      kilometers: parseInt(document.getElementById('vehicle-km').value),
      status: document.getElementById('vehicle-status').value,
      statusReason: document.getElementById('vehicle-reason').value || ''
    };
    
    try {
      const url = isUpdate ? `/api/vehicles/${vehicleId}` : '/api/vehicles';
      const method = isUpdate ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify(vehicleData)
      });
      
      if (response.ok) {
        vehicleModal.hide();
        loadVehicles();
      } else {
        const { error } = await response.json();
        alert(`Error: ${error}`);
      }
    } catch (error) {
      console.error('Error saving vehicle:', error);
      alert('An error occurred while saving the vehicle.');
    }
  }
  
  async function updateKilometers(vehicle) {
    const km = prompt(`Enter new kilometers for ${vehicle.name}:`, vehicle.kilometers);
    if (km === null) return;
    
    const newKm = parseInt(km);
    if (isNaN(newKm) {
      alert('Please enter a valid number');
      return;
    }
    
    const kmDriven = newKm - vehicle.kilometers;
    const newOilDue = vehicle.oilChangeDue - kmDriven;
    
    try {
      const response = await fetch(`/api/vehicles/${vehicle._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({
          kilometers: newKm,
          oilChangeDue: newOilDue
        })
      });
      
      if (response.ok) {
        loadVehicles();
      } else {
        const { error } = await response.json();
        alert(`Error: ${error}`);
      }
    } catch (error) {
      console.error('Error updating kilometers:', error);
      alert('An error occurred while updating kilometers.');
    }
  }
  
  function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  }
});
