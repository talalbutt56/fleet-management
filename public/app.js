// Configuration
const API_BASE_URL = window.location.origin + '/api';

// DOM Elements
const loginContainer = document.getElementById('login-container');
const dashboardContainer = document.getElementById('dashboard-container');

// Initialize app
document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
  try {
    const isAuthenticated = await checkAuth();
    if (isAuthenticated) {
      showDashboard();
      loadVehicles();
    } else {
      showLogin();
      setupLoginForm();
    }
    setupLogoutButton();
  } catch (error) {
    console.error('Initialization error:', error);
    showError('Failed to initialize application');
  }
}

// Authentication functions
async function checkAuth() {
  const response = await fetch(`${API_BASE_URL}/auth/status`, {
    credentials: 'include'
  });
  return response.ok;
}

// UI Functions
function showLogin() {
  loginContainer.style.display = 'block';
  dashboardContainer.style.display = 'none';
  loginContainer.innerHTML = `
    <div class="row justify-content-center mt-5">
      <div class="col-md-6 col-lg-4">
        <div class="card shadow">
          <div class="card-body">
            <h2 class="card-title text-center mb-4">Fleet Management Login</h2>
            <form id="loginForm">
              <div class="mb-3">
                <input type="text" class="form-control" placeholder="Username" required>
              </div>
              <div class="mb-3">
                <input type="password" class="form-control" placeholder="Password" required>
              </div>
              <button type="submit" class="btn btn-primary w-100">Login</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  `;
}

function showDashboard() {
  loginContainer.style.display = 'none';
  dashboardContainer.style.display = 'block';
  dashboardContainer.innerHTML = `
    <nav class="navbar navbar-expand-lg navbar-dark bg-primary mb-4">
      <div class="container">
        <span class="navbar-brand">Fleet Management</span>
        <button id="logoutBtn" class="btn btn-outline-light">Logout</button>
      </div>
    </nav>
    <div class="container">
      <div class="d-flex justify-content-between mb-4">
        <h2>Vehicle Fleet</h2>
        <button id="addVehicleBtn" class="btn btn-success">Add Vehicle</button>
      </div>
      <div id="vehicles-container"></div>
    </div>
  `;
}

// Vehicle functions
async function loadVehicles() {
  try {
    const response = await fetch(`${API_BASE_URL}/vehicles`, {
      credentials: 'include'
    });
    
    if (response.ok) {
      const vehicles = await response.json();
      renderVehicles(vehicles);
    } else {
      showError('Failed to load vehicles');
    }
  } catch (error) {
    console.error('Error loading vehicles:', error);
    showError('Network error occurred');
  }
}

function renderVehicles(vehicles) {
  const container = document.getElementById('vehicles-container');
  container.innerHTML = vehicles.length === 0 ? 
    '<p class="text-center">No vehicles found. Add your first vehicle.</p>' :
    vehicles.map(vehicle => createVehicleCard(vehicle)).join('');
}

function createVehicleCard(vehicle) {
  const today = new Date();
  const oilDueDate = new Date(vehicle.oilChangeDue);
  const safetyDueDate = new Date(vehicle.safetyDue);
  
  const oilStatus = getDueStatus(oilDueDate, today);
  const safetyStatus = getDueStatus(safetyDueDate, today);

  return `
    <div class="card vehicle-card status-${vehicle.status.replace(/\s/g, '-')} mb-3">
      <div class="card-body">
        <h5 class="card-title">${vehicle.name}</h5>
        <p class="card-text">
          <strong>Status:</strong> <span class="text-capitalize">${vehicle.status}</span><br>
          <strong>Mileage:</strong> ${vehicle.kilometers.toLocaleString()} km<br>
          <strong>Oil Change:</strong> <span class="${oilStatus.class}">${formatDate(vehicle.oilChangeDue)} ${oilStatus.text}</span><br>
          <strong>Safety Check:</strong> <span class="${safetyStatus.class}">${formatDate(vehicle.safetyDue)} ${safetyStatus.text}</span>
        </p>
        <div class="d-flex justify-content-end">
          <button class="btn btn-sm btn-outline-primary me-2">Edit</button>
          <button class="btn btn-sm btn-outline-danger">Delete</button>
        </div>
      </div>
    </div>
  `;
}

// Helper functions
function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString();
}

function getDueStatus(dueDate, today) {
  const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return { class: 'overdue', text: '(Overdue)' };
  if (diffDays < 30) return { class: 'due-soon', text: '(Due soon)' };
  return { class: '', text: '' };
}

function showError(message) {
  alert(message); // In a real app, you'd use a better notification system
}
